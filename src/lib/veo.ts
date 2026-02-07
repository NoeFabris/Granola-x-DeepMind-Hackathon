import type {
  VeoAspectRatio,
  VeoOperationStatus,
} from "@/types/video";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_VEO_MODEL = process.env.VEO_MODEL ?? "veo-3.1-generate-preview";
const DEFAULT_ASPECT_RATIO: VeoAspectRatio = "9:16";
const DEFAULT_POLL_INTERVAL_MS = 3_000;
const DEFAULT_TIMEOUT_MS = 180_000;

interface StartRawOperationOptions {
  apiKey: string;
  model: string;
  prompt: string;
  aspectRatio: VeoAspectRatio;
}

export interface GenerateSingleVideoOptions {
  prompt: string;
  aspectRatio?: VeoAspectRatio;
}

export interface SingleVideoResult {
  url?: string;
  bufferBase64?: string;
  mimeType?: string;
}

interface PollOperationOptions {
  apiKey: string;
  operationName: string;
  pollIntervalMs: number;
  timeoutMs: number;
}

interface VideoAsset {
  url?: string;
  bufferBase64?: string;
  mimeType?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getApiKey(): string {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GOOGLE_AI_API_KEY environment variable.");
  }

  return apiKey;
}

function extractOperationName(payload: unknown): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  if (typeof payload.name === "string" && payload.name.trim()) {
    return payload.name.trim();
  }

  if (isRecord(payload.operation) && typeof payload.operation.name === "string") {
    return payload.operation.name.trim();
  }

  return undefined;
}

function extractOperationError(payload: unknown): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  const errorValue = payload.error;

  if (!isRecord(errorValue)) {
    return undefined;
  }

  if (typeof errorValue.message === "string" && errorValue.message.trim()) {
    return errorValue.message;
  }

  return undefined;
}

function extractGeneratedVideos(payload: unknown): unknown[] {
  if (!isRecord(payload)) {
    return [];
  }

  const response = isRecord(payload.response) ? payload.response : payload;

  // predictLongRunning format: response.generateVideoResponse.generatedSamples
  if (isRecord(response.generateVideoResponse)) {
    const samples = (response.generateVideoResponse as Record<string, unknown>).generatedSamples;
    if (Array.isArray(samples)) {
      return samples;
    }
  }

  // Legacy generateVideos format
  const generatedVideos = response.generatedVideos ?? response.generated_videos;
  if (Array.isArray(generatedVideos)) {
    return generatedVideos;
  }

  return [];
}

function extractVideoAsset(generatedVideo: unknown): VideoAsset {
  if (!isRecord(generatedVideo)) {
    return {};
  }

  const videoCandidate = isRecord(generatedVideo.video)
    ? generatedVideo.video
    : generatedVideo;

  const urlCandidate =
    generatedVideo.url ??
    generatedVideo.uri ??
    generatedVideo.downloadUri ??
    generatedVideo.download_uri ??
    videoCandidate.url ??
    videoCandidate.uri ??
    videoCandidate.downloadUri ??
    videoCandidate.download_uri ??
    videoCandidate.gcsUri ??
    videoCandidate.gcs_uri;

  const bufferCandidate =
    generatedVideo.bufferBase64 ??
    generatedVideo.bytesBase64 ??
    generatedVideo.bytes ??
    generatedVideo.data ??
    videoCandidate.bufferBase64 ??
    videoCandidate.bytesBase64 ??
    videoCandidate.bytes ??
    videoCandidate.data;

  const mimeTypeCandidate =
    generatedVideo.mimeType ?? generatedVideo.mime_type ?? videoCandidate.mimeType;

  return {
    url: typeof urlCandidate === "string" ? urlCandidate : undefined,
    bufferBase64: typeof bufferCandidate === "string" ? bufferCandidate : undefined,
    mimeType: typeof mimeTypeCandidate === "string" ? mimeTypeCandidate : undefined,
  };
}

function buildOperationEndpoint(operationName: string, apiKey: string): string {
  return `${GEMINI_BASE_URL}/${operationName}?key=${encodeURIComponent(apiKey)}`;
}

async function startRawOperation(options: StartRawOperationOptions): Promise<string> {
  const endpoint = `${GEMINI_BASE_URL}/models/${options.model}:predictLongRunning?key=${encodeURIComponent(options.apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      instances: [{ prompt: options.prompt }],
      parameters: { aspectRatio: options.aspectRatio },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Veo predictLongRunning request failed: ${response.status} ${errorText}`);
  }

  const payload: unknown = await response.json();
  const operationName = extractOperationName(payload);

  if (!operationName) {
    throw new Error("Veo did not return an operation name.");
  }

  return operationName;
}

async function getOperationStatus(
  operationName: string,
  apiKey: string
): Promise<VeoOperationStatus> {
  const endpoint = buildOperationEndpoint(operationName, apiKey);
  const response = await fetch(endpoint, {
    method: "GET",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Veo operation polling failed: ${response.status} ${errorText}`);
  }

  const payload: unknown = await response.json();

  return {
    done: isRecord(payload) && payload.done === true,
    errorMessage: extractOperationError(payload),
    payload,
  };
}

async function pollForVideo(options: PollOperationOptions): Promise<VideoAsset> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < options.timeoutMs) {
    const operation = await getOperationStatus(options.operationName, options.apiKey);

    if (operation.errorMessage) {
      throw new Error(`Veo operation failed: ${operation.errorMessage}`);
    }

    if (operation.done) {
      console.log("[veo] operation payload:", JSON.stringify(operation.payload, null, 2));
      const generatedVideos = extractGeneratedVideos(operation.payload);
      console.log("[veo] extracted videos:", JSON.stringify(generatedVideos, null, 2));
      const firstVideo = generatedVideos[0];
      console.log("[veo] first video:", JSON.stringify(firstVideo, null, 2));
      const asset = extractVideoAsset(firstVideo);
      console.log("[veo] extracted asset:", JSON.stringify(asset, null, 2));

      if (!asset.url && !asset.bufferBase64) {
        throw new Error("Veo operation completed without returning a video URL or buffer.");
      }

      return asset;
    }

    await sleep(options.pollIntervalMs);
  }

  throw new Error(`Veo operation timed out after ${options.timeoutMs}ms.`);
}

export async function generateSingleVideo(
  options: GenerateSingleVideoOptions
): Promise<SingleVideoResult> {
  const apiKey = getApiKey();
  const model = DEFAULT_VEO_MODEL;
  const aspectRatio = options.aspectRatio ?? DEFAULT_ASPECT_RATIO;

  const operationName = await startRawOperation({
    apiKey,
    model,
    prompt: options.prompt,
    aspectRatio,
  });

  const asset = await pollForVideo({
    apiKey,
    operationName,
    pollIntervalMs: DEFAULT_POLL_INTERVAL_MS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  });

  return {
    url: asset.url,
    bufferBase64: asset.bufferBase64,
    mimeType: asset.mimeType,
  };
}
