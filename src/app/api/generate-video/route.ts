import { NextRequest, NextResponse } from "next/server";
import { isGranolaConfigured } from "@/lib/granola";
import {
  generateMeetingVideo,
  getStoredVideoAsset,
  getVideoGenerationRun,
} from "@/lib/video-pipeline";

export const runtime = "nodejs";

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

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isGranolaConfigured()) {
    return NextResponse.json(
      {
        error: "Granola is not configured. Set the GRANOLA_API_TOKEN environment variable.",
      },
      { status: 503 }
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
    runId: readOptionalRunId(payload),
  });

  if (generationResult.status === "failed") {
    return NextResponse.json(
      {
        error: generationResult.error,
        runId: generationResult.runId,
        progress: generationResult.progress,
      },
      { status: 500 }
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
