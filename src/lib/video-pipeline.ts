import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { getDocumentSummary } from "@/lib/granola";
import { generateVideoPrompt } from "@/lib/script-generator";
import { generateSingleVideo } from "@/lib/veo";

const RUN_TTL_MS = 60 * 60 * 1000;

export type VideoPipelineRunStatus = "running" | "completed" | "failed";

export type VideoPipelineStep =
  | "pipeline"
  | "summary"
  | "prompt"
  | "video"
  | "saving";

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
  videoUrl?: string;
  error?: string;
}

interface GenerateMeetingVideoOptions {
  meetingId: string;
  runId?: string;
}

export interface GeneratedMeetingVideo {
  runId: string;
  meetingId: string;
  videoUrl: string;
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

const globalForPipeline = globalThis as unknown as {
  _pipelineRuns?: Map<string, VideoGenerationRun>;
};
const pipelineRuns = globalForPipeline._pipelineRuns ?? new Map<string, VideoGenerationRun>();
globalForPipeline._pipelineRuns = pipelineRuns;

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

async function downloadAndSave(url: string, meetingId: string): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const videosDir = join(process.cwd(), "public", "videos");
  await mkdir(videosDir, { recursive: true });

  const filename = `${meetingId}.mp4`;
  const filePath = join(videosDir, filename);
  await writeFile(filePath, buffer);

  return `/videos/${filename}`;
}

export async function generateMeetingVideo(
  options: GenerateMeetingVideoOptions
): Promise<GenerateMeetingVideoResult> {
  const run = createRun(options.meetingId, options.runId);

  try {
    appendProgress(run, "summary", "running", "Fetching meeting summary from Granola.");
    const summaryResult = await getDocumentSummary({
      documentId: options.meetingId,
    });
    appendProgress(run, "summary", "completed", "Meeting summary retrieved.");

    appendProgress(run, "prompt", "running", "Generating video prompt from summary.");
    const videoPrompt = await generateVideoPrompt(summaryResult.summary);
    appendProgress(run, "prompt", "completed", "Video prompt generated.");

    appendProgress(run, "video", "running", "Generating video with Veo (this may take a while).");
    const videoResult = await generateSingleVideo({
      prompt: videoPrompt,
      aspectRatio: "9:16",
    });
    appendProgress(run, "video", "completed", "Video generated successfully.");

    if (!videoResult.url) {
      throw new Error("Veo did not return a video URL.");
    }

    appendProgress(run, "saving", "running", "Downloading and saving video to disk.");
    const staticPath = await downloadAndSave(videoResult.url, options.meetingId);
    appendProgress(run, "saving", "completed", "Video saved.");

    run.videoUrl = staticPath;
    run.status = "completed";
    appendProgress(run, "pipeline", "completed", "Video generation finished successfully.");

    return {
      status: "ok",
      data: {
        runId: run.runId,
        meetingId: run.meetingId,
        videoUrl: staticPath,
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
