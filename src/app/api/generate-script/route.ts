import { NextRequest, NextResponse } from "next/server";
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
    const script = await generateMeetingScript({ meetingId, accessToken });
    return NextResponse.json(script.chunks);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown script generation error.";

    if (isAuthErrorMessage(message)) {
      return NextResponse.json(
        {
          error: "Invalid Granola access token. Please reconnect and try again.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}
