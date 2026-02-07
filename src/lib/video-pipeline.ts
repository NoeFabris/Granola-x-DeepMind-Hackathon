import { randomUUID } from "node:crypto";
import { generateMeetingScript } from "@/lib/script-generator";
import { generateVeoClips } from "@/lib/veo";
import { stitchVideoClips } from "@/lib/video-stitcher";

const RUN_TTL_MS = 60 * 60 * 1000;
const VIDEO_TTL_MS = 30 * 60 * 1000;

export type VideoPipelineRunStatus = "running" | "completed" | "failed";

export type VideoPipelineStep =
  | "pipeline"
  | "script"
  | "clips"
  | "stitching"
  | "video_storage";

export type VideoPipelineStepStatus = "running" | "completed" | "failed";

export interface VideoPipelineProgressEvent {
  step: VideoPipelineStep;
  status: VideoPipelineStepStatus;
  message: string;
  timestamp: string;
}

export interface VideoGenerationRun {
  runId: string;
  meetingId: string;
  status: VideoPipelineRunStatus;
  progress: VideoPipelineProgressEvent[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  videoId?: string;
  videoUrl?: string;
  mimeType?: string;
  error?: string;
}

export interface StoredVideoAsset {
  videoId: string;
  mimeType: string;
  buffer: Buffer;
  createdAt: string;
  expiresAt: string;
}

interface StoredVideoPlayback {
  videoId: string;
  videoUrl: string;
  mimeType: string;
  expiresAt: string;
}

interface GenerateMeetingVideoOptions {
  meetingId: string;
  runId?: string;
}

export interface GeneratedMeetingVideo {
  runId: string;
  meetingId: string;
  videoId: string;
  videoUrl: string;
  mimeType: string;
  expiresAt: string;
  progress: VideoPipelineProgressEvent[];
}

export type GenerateMeetingVideoResult =
  | {
      status: "ok";
      data: GeneratedMeetingVideo;
    }
  | {
      status: "failed";
      runId: string;
      error: string;
      progress: VideoPipelineProgressEvent[];
    };

const pipelineRuns = new Map<string, VideoGenerationRun>();
const temporaryVideoAssets = new Map<string, StoredVideoAsset>();

function nowIso(): string {
  return new Date().toISOString();
}

function toIsoFromNow(deltaMs: number): string {
  return new Date(Date.now() + deltaMs).toISOString();
}

function parseExpiry(value: string): number {
  return Number.parseInt(String(new Date(value).getTime()), 10);
}

function cleanupExpiredEntries(): void {
  const now = Date.now();

  for (const [runId, run] of pipelineRuns.entries()) {
    const expiresAt = parseExpiry(run.expiresAt);

    if (!Number.isFinite(expiresAt) || expiresAt <= now) {
      pipelineRuns.delete(runId);
    }
  }

  for (const [videoId, videoAsset] of temporaryVideoAssets.entries()) {
    const expiresAt = parseExpiry(videoAsset.expiresAt);

    if (!Number.isFinite(expiresAt) || expiresAt <= now) {
      temporaryVideoAssets.delete(videoId);
    }
  }
}

function sanitizeOptionalIdentifier(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  if (!normalized) {
    return undefined;
  }

  return normalized;
}

function ensureUniqueRunId(preferredRunId?: string): string {
  const normalizedPreferred = sanitizeOptionalIdentifier(preferredRunId);

  if (normalizedPreferred && !pipelineRuns.has(normalizedPreferred)) {
    return normalizedPreferred;
  }

  let generated = randomUUID();

  while (pipelineRuns.has(generated)) {
    generated = randomUUID();
  }

  return generated;
}

function cloneProgress(progress: VideoPipelineProgressEvent[]): VideoPipelineProgressEvent[] {
  return progress.map((event) => ({ ...event }));
}

function cloneRun(run: VideoGenerationRun): VideoGenerationRun {
  return {
    ...run,
    progress: cloneProgress(run.progress),
  };
}

function createRun(meetingId: string, preferredRunId?: string): VideoGenerationRun {
  cleanupExpiredEntries();

  const timestamp = nowIso();
  const run: VideoGenerationRun = {
    runId: ensureUniqueRunId(preferredRunId),
    meetingId,
    status: "running",
    progress: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    expiresAt: toIsoFromNow(RUN_TTL_MS),
  };

  pipelineRuns.set(run.runId, run);
  appendProgress(run, "pipeline", "running", "Video generation started.");

  return run;
}

function appendProgress(
  run: VideoGenerationRun,
  step: VideoPipelineStep,
  status: VideoPipelineStepStatus,
  message: string
): void {
  const timestamp = nowIso();
  run.progress.push({
    step,
    status,
    message,
    timestamp,
  });
  run.updatedAt = timestamp;
}

function markRunFailed(run: VideoGenerationRun, message: string): void {
  run.status = "failed";
  run.error = message;
  appendProgress(run, "pipeline", "failed", message);
}

function parseStitchedVideoDataUrl(
  stitchedVideoUrl: string,
  fallbackMimeType: string
): { mimeType: string; buffer: Buffer } {
  const matched = stitchedVideoUrl.match(/^data:([^;,]+);base64,([\s\S]+)$/);

  if (!matched) {
    throw new Error("Stitched video must be returned as a base64 data URL.");
  }

  const mimeType = matched[1]?.trim() || fallbackMimeType;
  const base64Payload = matched[2]?.trim();

  if (!base64Payload) {
    throw new Error("Stitched video data URL is missing payload data.");
  }

  return {
    mimeType,
    buffer: Buffer.from(base64Payload, "base64"),
  };
}

function storeTemporaryVideo(stitchedVideoUrl: string, fallbackMimeType: string): StoredVideoPlayback {
  cleanupExpiredEntries();

  const parsedVideo = parseStitchedVideoDataUrl(stitchedVideoUrl, fallbackMimeType);
  const videoId = randomUUID();
  const createdAt = nowIso();
  const expiresAt = toIsoFromNow(VIDEO_TTL_MS);

  temporaryVideoAssets.set(videoId, {
    videoId,
    mimeType: parsedVideo.mimeType,
    buffer: parsedVideo.buffer,
    createdAt,
    expiresAt,
  });

  return {
    videoId,
    videoUrl: `/api/generate-video?videoId=${encodeURIComponent(videoId)}`,
    mimeType: parsedVideo.mimeType,
    expiresAt,
  };
}

function extractHostedClipUrls(clips: Awaited<ReturnType<typeof generateVeoClips>>): string[] {
  const hostedUrls = clips
    .map((clip) => clip.url)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  if (hostedUrls.length !== clips.length) {
    throw new Error("Veo did not return hosted clip URLs for every generated chunk.");
  }

  return hostedUrls;
}

export async function generateMeetingVideo(
  options: GenerateMeetingVideoOptions
): Promise<GenerateMeetingVideoResult> {
  const run = createRun(options.meetingId, options.runId);

  try {
    appendProgress(run, "script", "running", "Generating meeting recap script.");
    const scriptResult = await generateMeetingScript({
      meetingId: options.meetingId,
    });

    appendProgress(
      run,
      "script",
      "completed",
      `Generated ${scriptResult.chunks.length} script chunks.`
    );

    appendProgress(run, "clips", "running", "Generating Veo clips from script chunks.");
    const clips = await generateVeoClips({
      chunks: scriptResult.chunks,
      aspectRatio: "9:16",
    });
    const clipUrls = extractHostedClipUrls(clips);

    appendProgress(run, "clips", "completed", `Generated ${clipUrls.length} video clips.`);

    appendProgress(run, "stitching", "running", "Stitching clips into one recap video.");
    const stitchedVideo = await stitchVideoClips({
      clipUrls,
    });
    appendProgress(run, "stitching", "completed", "Finished stitching recap video.");

    appendProgress(
      run,
      "video_storage",
      "running",
      "Caching generated video for temporary playback."
    );
    const storedVideo = storeTemporaryVideo(stitchedVideo.videoUrl, stitchedVideo.mimeType);
    run.videoId = storedVideo.videoId;
    run.videoUrl = storedVideo.videoUrl;
    run.mimeType = storedVideo.mimeType;
    run.expiresAt = storedVideo.expiresAt;
    appendProgress(run, "video_storage", "completed", "Generated video is ready for playback.");

    run.status = "completed";
    appendProgress(run, "pipeline", "completed", "Video generation finished successfully.");

    return {
      status: "ok",
      data: {
        runId: run.runId,
        meetingId: run.meetingId,
        videoId: storedVideo.videoId,
        videoUrl: storedVideo.videoUrl,
        mimeType: storedVideo.mimeType,
        expiresAt: storedVideo.expiresAt,
        progress: cloneProgress(run.progress),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown video generation error.";
    markRunFailed(run, message);

    return {
      status: "failed",
      runId: run.runId,
      error: message,
      progress: cloneProgress(run.progress),
    };
  }
}

export function getVideoGenerationRun(runId: string): VideoGenerationRun | undefined {
  cleanupExpiredEntries();

  const normalizedRunId = sanitizeOptionalIdentifier(runId);

  if (!normalizedRunId) {
    return undefined;
  }

  const run = pipelineRuns.get(normalizedRunId);

  if (!run) {
    return undefined;
  }

  return cloneRun(run);
}

export function getStoredVideoAsset(videoId: string): StoredVideoAsset | undefined {
  cleanupExpiredEntries();

  const normalizedVideoId = sanitizeOptionalIdentifier(videoId);

  if (!normalizedVideoId) {
    return undefined;
  }

  return temporaryVideoAssets.get(normalizedVideoId);
}
