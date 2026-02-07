import type { ScriptChunk } from "@/types/script";
import type {
  GenerateVeoClipsOptions,
  VeoAspectRatio,
  VeoGeneratedClip,
  VeoOperationStatus,
} from "@/types/video";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_VEO_MODEL = process.env.VEO_MODEL ?? "veo-3.1-fast-generate-001";
const DEFAULT_ASPECT_RATIO: VeoAspectRatio = "9:16";
const DEFAULT_POLL_INTERVAL_MS = 3_000;
const DEFAULT_TIMEOUT_MS = 180_000;

interface StartOperationOptions {
  apiKey: string;
  model: string;
  chunk: ScriptChunk;
  aspectRatio: VeoAspectRatio;
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

function normalizePositiveNumber(value: number | undefined, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  return fallback;
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

export function buildVeoPrompt(chunk: ScriptChunk): string {
  const lines = [
    "Create an 8-second social clip using an AI avatar presenter.",
    "Use a 9:16 portrait composition optimized for TikTok.",
    `Narration: ${chunk.narration.trim()}`,
    `Scene direction: ${chunk.visualPrompt.trim()}`,
    `Target duration: ${chunk.durationSeconds} seconds.`,
  ];

  if (chunk.textOverlay?.trim()) {
    lines.push(`On-screen text overlay: ${chunk.textOverlay.trim()}`);
  }

  return lines.join("\n");
}

async function startOperation(options: StartOperationOptions): Promise<string> {
  const endpoint = `${GEMINI_BASE_URL}/models/${options.model}:generateVideos?key=${encodeURIComponent(options.apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: buildVeoPrompt(options.chunk),
      config: {
        aspectRatio: options.aspectRatio,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Veo generateVideos request failed: ${response.status} ${errorText}`);
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
      const generatedVideos = extractGeneratedVideos(operation.payload);
      const firstVideo = generatedVideos[0];
      const asset = extractVideoAsset(firstVideo);

      if (!asset.url && !asset.bufferBase64) {
        throw new Error("Veo operation completed without returning a video URL or buffer.");
      }

      return asset;
    }

    await sleep(options.pollIntervalMs);
  }

  throw new Error(`Veo operation timed out after ${options.timeoutMs}ms.`);
}

export async function generateVeoClips(
  options: GenerateVeoClipsOptions
): Promise<VeoGeneratedClip[]> {
  if (!Array.isArray(options.chunks) || options.chunks.length === 0) {
    throw new Error("At least one script chunk is required for clip generation.");
  }

  const apiKey = getApiKey();
  const model = options.model?.trim() || DEFAULT_VEO_MODEL;
  const aspectRatio = options.aspectRatio ?? DEFAULT_ASPECT_RATIO;
  const pollIntervalMs = normalizePositiveNumber(
    options.pollIntervalMs,
    DEFAULT_POLL_INTERVAL_MS
  );
  const timeoutMs = normalizePositiveNumber(options.timeoutMs, DEFAULT_TIMEOUT_MS);

  return Promise.all(
    options.chunks.map(async (chunk, index) => {
      const operationName = await startOperation({
        apiKey,
        model,
        chunk,
        aspectRatio,
      });
      const clipAsset = await pollForVideo({
        apiKey,
        operationName,
        pollIntervalMs,
        timeoutMs,
      });

      return {
        index: chunk.index ?? index + 1,
        durationSeconds: chunk.durationSeconds,
        prompt: buildVeoPrompt(chunk),
        url: clipAsset.url,
        bufferBase64: clipAsset.bufferBase64,
        mimeType: clipAsset.mimeType,
      };
    })
  );
}
