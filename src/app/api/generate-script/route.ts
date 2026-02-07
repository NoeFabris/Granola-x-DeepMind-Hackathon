import { NextRequest, NextResponse } from "next/server";
import { isGranolaConfigured } from "@/lib/granola";
import { generateMeetingScript } from "@/lib/script-generator";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readMeetingId(payload: unknown): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  if (typeof payload.meetingId === "string" && payload.meetingId.trim()) {
    return payload.meetingId.trim();
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

  const meetingId = readMeetingId(payload);

  if (!meetingId) {
    return NextResponse.json(
      {
        error: "meetingId is required.",
      },
      { status: 400 }
    );
  }

  try {
    const script = await generateMeetingScript({ meetingId });
    return NextResponse.json(script.chunks);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown script generation error.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}
