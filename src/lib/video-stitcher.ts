import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import ffmpeg from "fluent-ffmpeg";

const DEFAULT_TRANSITION_DURATION_SECONDS = 0.35;
const MIN_TRANSITION_DURATION_SECONDS = 0.1;
const isVercelDeployment = process.env.VERCEL === "1" || process.env.VERCEL === "true";
const runtimeRequire = createRequire(import.meta.url);

function loadOptionalLocalModule(moduleName: string): unknown {
  if (isVercelDeployment) {
    return undefined;
  }

  try {
    return runtimeRequire(moduleName);
  } catch {
    return undefined;
  }
}

function readModuleStringExport(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (
    value !== null &&
    typeof value === "object" &&
    "default" in value &&
    typeof value.default === "string" &&
    value.default.trim()
  ) {
    return value.default;
  }

  return undefined;
}

function readModulePathExport(value: unknown): string | undefined {
  if (
    value !== null &&
    typeof value === "object" &&
    "path" in value &&
    typeof value.path === "string" &&
    value.path.trim()
  ) {
    return value.path;
  }

  if (
    value !== null &&
    typeof value === "object" &&
    "default" in value &&
    value.default !== null &&
    typeof value.default === "object" &&
    "path" in value.default &&
    typeof value.default.path === "string" &&
    value.default.path.trim()
  ) {
    return value.default.path;
  }

  return undefined;
}

const ffmpegPackageName = ["ffmpeg", "static"].join("-");
const ffprobePackageName = ["ffprobe", "static"].join("-");
const ffmpegStaticPath = readModuleStringExport(loadOptionalLocalModule(ffmpegPackageName));
const ffprobeStaticPath = readModulePathExport(loadOptionalLocalModule(ffprobePackageName));

if (ffmpegStaticPath) {
  ffmpeg.setFfmpegPath(ffmpegStaticPath);
}

if (ffprobeStaticPath) {
  ffmpeg.setFfprobePath(ffprobeStaticPath);
}

export interface StitchVideoOptions {
  clipUrls: string[];
  transitionDurationSeconds?: number;
}

export interface StitchVideoResult {
  videoUrl: string;
  mimeType: "video/mp4";
}

function normalizePositiveNumber(value: number | undefined, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  return fallback;
}

function normalizeClipUrl(value: string): string {
  const url = new URL(value.trim());

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Unsupported clip URL protocol: ${url.protocol}`);
  }

  return url.toString();
}

function chooseTransitionDuration(
  durations: number[],
  requestedDurationSeconds: number | undefined
): number {
  const requested = normalizePositiveNumber(
    requestedDurationSeconds,
    DEFAULT_TRANSITION_DURATION_SECONDS
  );
  const shortestDuration = Math.min(...durations);
  const maxAllowed = Math.max(shortestDuration / 2, MIN_TRANSITION_DURATION_SECONDS);

  return Math.min(requested, maxAllowed);
}

function probeDurationSeconds(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (error, metadata) => {
      if (error) {
        reject(error);
        return;
      }

      const duration = metadata.format.duration;

      if (typeof duration !== "number" || !Number.isFinite(duration) || duration <= 0) {
        reject(new Error(`Could not determine duration for ${filePath}`));
        return;
      }

      resolve(duration);
    });
  });
}

async function downloadClip(url: string, destinationPath: string): Promise<void> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download clip ${url}: ${response.status} ${response.statusText}`);
  }

  const payload = await response.arrayBuffer();
  await writeFile(destinationPath, Buffer.from(payload));
}

function createCommand(inputPaths: string[]): ffmpeg.FfmpegCommand {
  const command = ffmpeg();

  for (const inputPath of inputPaths) {
    command.input(inputPath);
  }

  return command;
}

function runFfmpeg(command: ffmpeg.FfmpegCommand, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    command
      .on("end", () => {
        resolve();
      })
      .on("error", (error) => {
        reject(new Error(`FFmpeg stitching failed: ${error.message}`));
      })
      .save(outputPath);
  });
}

function buildVideoCrossfadeFilters(durations: number[], transitionDurationSeconds: number): {
  filters: string[];
  videoLabel: string;
} {
  const filters: string[] = [];

  for (let index = 0; index < durations.length; index += 1) {
    filters.push(`[${index}:v]settb=AVTB,format=yuv420p[v${index}]`);
  }

  let currentVideo = "v0";
  let elapsed = durations[0];

  for (let index = 1; index < durations.length; index += 1) {
    const outputLabel = `vx${index}`;
    const offsetSeconds = Math.max(elapsed - transitionDurationSeconds, 0);
    filters.push(
      `[${currentVideo}][v${index}]xfade=transition=fade:duration=${transitionDurationSeconds}:offset=${offsetSeconds}[${outputLabel}]`
    );
    currentVideo = outputLabel;
    elapsed += durations[index] - transitionDurationSeconds;
  }

  return {
    filters,
    videoLabel: currentVideo,
  };
}

async function stitchWithCrossfades(
  inputPaths: string[],
  outputPath: string,
  requestedTransitionDurationSeconds: number | undefined
): Promise<void> {
  const durations = await Promise.all(inputPaths.map((inputPath) => probeDurationSeconds(inputPath)));
  const transitionDurationSeconds = chooseTransitionDuration(
    durations,
    requestedTransitionDurationSeconds
  );
  const { filters, videoLabel } = buildVideoCrossfadeFilters(
    durations,
    transitionDurationSeconds
  );

  const command = createCommand(inputPaths);
  command
    .complexFilter(filters)
    .outputOptions([
      `-map [${videoLabel}]`,
      "-c:v libx264",
      "-pix_fmt yuv420p",
      "-preset veryfast",
      "-movflags +faststart",
      "-an",
    ]);

  await runFfmpeg(command, outputPath);
}

async function stitchSingleClip(inputPath: string, outputPath: string): Promise<void> {
  const command = createCommand([inputPath]);
  command.outputOptions([
    "-c:v libx264",
    "-pix_fmt yuv420p",
    "-preset veryfast",
    "-movflags +faststart",
    "-an",
  ]);

  await runFfmpeg(command, outputPath);
}

export async function stitchVideoClips(options: StitchVideoOptions): Promise<StitchVideoResult> {
  if (isVercelDeployment) {
    throw new Error("Video stitching is disabled on Vercel deployments.");
  }

  if (!Array.isArray(options.clipUrls) || options.clipUrls.length === 0) {
    throw new Error("At least one clip URL is required for stitching.");
  }

  const normalizedClipUrls = options.clipUrls.map((clipUrl) => normalizeClipUrl(clipUrl));
  const tempDirectory = await mkdtemp(join(tmpdir(), "meeting-recap-stitch-"));
  const outputPath = join(tempDirectory, `${randomUUID()}.mp4`);

  try {
    const inputPaths = await Promise.all(
      normalizedClipUrls.map(async (clipUrl, index) => {
        const parsedUrl = new URL(clipUrl);
        const extension = extname(parsedUrl.pathname) || ".mp4";
        const clipPath = join(tempDirectory, `${String(index + 1).padStart(2, "0")}${extension}`);
        await downloadClip(clipUrl, clipPath);
        return clipPath;
      })
    );

    if (inputPaths.length === 1) {
      await stitchSingleClip(inputPaths[0], outputPath);
    } else {
      await stitchWithCrossfades(
        inputPaths,
        outputPath,
        options.transitionDurationSeconds
      );
    }

    const stitchedBuffer = await readFile(outputPath);

    return {
      videoUrl: `data:video/mp4;base64,${stitchedBuffer.toString("base64")}`,
      mimeType: "video/mp4",
    };
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}
