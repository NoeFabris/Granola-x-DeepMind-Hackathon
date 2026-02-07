import { NextRequest, NextResponse } from "next/server";
import { stitchVideoClips } from "@/lib/video-stitcher";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readClipUrls(payload: unknown): string[] {
  const list = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.clipUrls)
      ? payload.clipUrls
      : isRecord(payload) && Array.isArray(payload.clips)
        ? payload.clips
        : [];

  return list
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function readTransitionDurationSeconds(payload: unknown): number | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  const parsed = Number(payload.transitionDurationSeconds);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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

  const clipUrls = readClipUrls(payload);

  if (clipUrls.length === 0) {
    return NextResponse.json(
      {
        error: "clipUrls is required and must include at least one URL.",
      },
      { status: 400 }
    );
  }

  try {
    const stitchedVideo = await stitchVideoClips({
      clipUrls,
      transitionDurationSeconds: readTransitionDurationSeconds(payload),
    });

    return NextResponse.json({
      videoUrl: stitchedVideo.videoUrl,
      mimeType: stitchedVideo.mimeType,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown video stitching error.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}
