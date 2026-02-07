import { NextRequest, NextResponse } from "next/server";
import { generateVeoClips } from "@/lib/veo";
import type { ScriptChunk } from "@/types/script";

export const runtime = "nodejs";

const DEFAULT_CHUNK_SECONDS = 8;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeChunk(entry: unknown, index: number): ScriptChunk | undefined {
  if (!isRecord(entry)) {
    return undefined;
  }

  const narration = entry.narration;
  const visualPrompt = entry.visualPrompt;

  if (typeof narration !== "string" || typeof visualPrompt !== "string") {
    return undefined;
  }

  const parsedIndex = Number(entry.index);
  const parsedDurationSeconds = Number(entry.durationSeconds);

  return {
    index: Number.isFinite(parsedIndex) && parsedIndex > 0 ? Math.round(parsedIndex) : index + 1,
    durationSeconds:
      Number.isFinite(parsedDurationSeconds) && parsedDurationSeconds > 0
        ? Math.round(parsedDurationSeconds)
        : DEFAULT_CHUNK_SECONDS,
    narration: narration.trim(),
    visualPrompt: visualPrompt.trim(),
    textOverlay: typeof entry.textOverlay === "string" ? entry.textOverlay.trim() : undefined,
  };
}

function readChunks(payload: unknown): ScriptChunk[] {
  const chunkList = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.chunks)
      ? payload.chunks
      : [];

  return chunkList
    .map((entry, index) => normalizeChunk(entry, index))
    .filter((entry): entry is ScriptChunk => Boolean(entry));
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

  const chunks = readChunks(payload);

  if (chunks.length === 0) {
    return NextResponse.json(
      {
        error: "chunks is required and must include narration and visualPrompt values.",
      },
      { status: 400 }
    );
  }

  try {
    const clips = await generateVeoClips({
      chunks,
      aspectRatio: "9:16",
    });
    const videoUrls = clips
      .map((clip) => clip.url ?? clip.bufferBase64)
      .filter((value): value is string => Boolean(value));

    if (videoUrls.length !== clips.length) {
      throw new Error("Veo did not return video URLs/buffers for every generated clip.");
    }

    return NextResponse.json(videoUrls);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown clip generation error.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}
