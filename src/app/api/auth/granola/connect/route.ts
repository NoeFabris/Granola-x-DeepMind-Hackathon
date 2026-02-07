import { NextRequest, NextResponse } from "next/server";
import {
  GRANOLA_SESSION_COOKIE_NAME,
  beginGranolaOAuth,
  createGranolaSessionId,
} from "@/lib/mcp-client";

export const runtime = "nodejs";

function getOrCreateSessionId(request: NextRequest): {
  sessionId: string;
  shouldSetCookie: boolean;
} {
  const existingSessionId = request.cookies.get(GRANOLA_SESSION_COOKIE_NAME)?.value;

  if (existingSessionId) {
    return {
      sessionId: existingSessionId,
      shouldSetCookie: false,
    };
  }

  return {
    sessionId: createGranolaSessionId(),
    shouldSetCookie: true,
  };
}

function attachSessionCookie(
  request: NextRequest,
  response: NextResponse,
  sessionId: string
): void {
  response.cookies.set({
    name: GRANOLA_SESSION_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { sessionId, shouldSetCookie } = getOrCreateSessionId(request);

  try {
    const result = await beginGranolaOAuth({
      sessionId,
      callbackBaseUrl: request.nextUrl.origin,
    });

    if (result.status === "auth_required") {
      const redirectResponse = NextResponse.redirect(result.authUrl);

      if (shouldSetCookie) {
        attachSessionCookie(request, redirectResponse, sessionId);
      }

      return redirectResponse;
    }

    const successResponse = NextResponse.json({ connected: true });

    if (shouldSetCookie) {
      attachSessionCookie(request, successResponse, sessionId);
    }

    return successResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Granola error.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}
