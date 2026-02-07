import { NextRequest, NextResponse } from "next/server";
import { GRANOLA_SESSION_COOKIE_NAME } from "@/lib/mcp-client";
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
  const sessionId = request.cookies.get(GRANOLA_SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return NextResponse.json(
      {
        error: "Granola is not connected.",
        connectUrl: "/api/auth/granola/connect",
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
    const scriptResult = await generateMeetingScript({
      sessionId,
      callbackBaseUrl: request.nextUrl.origin,
      meetingId,
    });

    if (scriptResult.status === "auth_required") {
      return NextResponse.json(
        {
          error: "Granola authorization is required.",
          authUrl: scriptResult.authUrl,
        },
        { status: 401 }
      );
    }

    return NextResponse.json(scriptResult.data.chunks);
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
