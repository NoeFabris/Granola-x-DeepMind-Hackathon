import { NextRequest, NextResponse } from "next/server";
import {
  generateMeetingVideo,
  getStoredVideoAsset,
  getVideoGenerationRun,
} from "@/lib/video-pipeline";

export const runtime = "nodejs";
const isVercelDeployment = process.env.VERCEL === "1" || process.env.VERCEL === "true";
const VERCEL_DISABLED_ERROR =
  "Video generation is disabled in Vercel deployments. Run locally for generation.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readRequiredMeetingId(payload: unknown): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  if (typeof payload.meetingId === "string" && payload.meetingId.trim()) {
    return payload.meetingId.trim();
  }

  return undefined;
}

function readOptionalRunId(payload: unknown): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  if (typeof payload.runId === "string" && payload.runId.trim()) {
    return payload.runId.trim();
  }

  return undefined;
}

function readAccessToken(request: NextRequest): string | undefined {
  const authorization = request.headers.get("authorization");

  if (typeof authorization === "string" && authorization.toLowerCase().startsWith("bearer ")) {
    const bearerToken = authorization.slice(7).trim();

    if (bearerToken) {
      return bearerToken;
    }
  }

  const headerToken = request.headers.get("x-granola-token")?.trim();

  if (headerToken) {
    return headerToken;
  }

  return undefined;
}

function isAuthErrorMessage(errorMessage: string): boolean {
  const normalized = errorMessage.toLowerCase();

  return (
    normalized.includes("401") ||
    normalized.includes("unauthorized") ||
    normalized.includes("forbidden") ||
    normalized.includes("invalid token")
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (isVercelDeployment) {
    return NextResponse.json(
      {
        error: VERCEL_DISABLED_ERROR,
      },
      { status: 501 }
    );
  }

  const accessToken = readAccessToken(request);

  if (!accessToken) {
    return NextResponse.json(
      {
        error: "Granola access token is required. Please connect your Granola account.",
      },
      { status: 401 }
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Request body must be valid JSON.",
      },
      { status: 400 }
    );
  }

  const meetingId = readRequiredMeetingId(payload);

  if (!meetingId) {
    return NextResponse.json(
      {
        error: "meetingId is required.",
      },
      { status: 400 }
    );
  }

  const generationResult = await generateMeetingVideo({
    meetingId,
    accessToken,
    runId: readOptionalRunId(payload),
  });

  if (generationResult.status === "failed") {
    const status = isAuthErrorMessage(generationResult.error) ? 401 : 500;

    return NextResponse.json(
      {
        error: generationResult.error,
        runId: generationResult.runId,
        progress: generationResult.progress,
      },
      { status }
    );
  }

  return NextResponse.json({
    runId: generationResult.data.runId,
    meetingId: generationResult.data.meetingId,
    videoId: generationResult.data.videoId,
    videoUrl: generationResult.data.videoUrl,
    mimeType: generationResult.data.mimeType,
    expiresAt: generationResult.data.expiresAt,
    progress: generationResult.data.progress,
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (isVercelDeployment) {
    return NextResponse.json(
      {
        error: VERCEL_DISABLED_ERROR,
      },
      { status: 501 }
    );
  }

  const runId = request.nextUrl.searchParams.get("runId");

  if (runId) {
    const run = getVideoGenerationRun(runId);

    if (!run) {
      return NextResponse.json(
        {
          error: "No video generation run found for the provided runId.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(run);
  }

  const videoId = request.nextUrl.searchParams.get("videoId");

  if (videoId) {
    const videoAsset = getStoredVideoAsset(videoId);

    if (!videoAsset) {
      return NextResponse.json(
        {
          error: "Video not found or expired.",
        },
        { status: 404 }
      );
    }

    const videoPayload = new Uint8Array(
      videoAsset.buffer.buffer,
      videoAsset.buffer.byteOffset,
      videoAsset.buffer.byteLength
    );
    const body = new ArrayBuffer(videoPayload.byteLength);
    new Uint8Array(body).set(videoPayload);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": videoAsset.mimeType,
        "Cache-Control": "private, max-age=300",
        "Content-Length": String(videoAsset.buffer.byteLength),
      },
    });
  }

  return NextResponse.json(
    {
      error: "Provide runId for progress or videoId for playback.",
    },
    { status: 400 }
  );
}
