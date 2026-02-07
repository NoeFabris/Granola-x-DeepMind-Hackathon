import { NextRequest, NextResponse } from "next/server";
import {
  GRANOLA_SESSION_COOKIE_NAME,
  completeGranolaAuthorization,
} from "@/lib/mcp-client";

export const runtime = "nodejs";

function buildAppRedirect(request: NextRequest, status: string, error?: string): URL {
  const redirectUrl = new URL("/", request.nextUrl.origin);
  redirectUrl.searchParams.set("granola", status);

  if (error) {
    redirectUrl.searchParams.set("error", error);
  }

  return redirectUrl;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(buildAppRedirect(request, "error", oauthError));
  }

  if (!code) {
    return NextResponse.redirect(
      buildAppRedirect(request, "error", "missing_authorization_code")
    );
  }

  const sessionIdFromCookie = request.cookies.get(GRANOLA_SESSION_COOKIE_NAME)?.value;

  try {
    const sessionId = await completeGranolaAuthorization({
      callbackBaseUrl: request.nextUrl.origin,
      code,
      sessionId: sessionIdFromCookie,
      state,
    });

    const response = NextResponse.redirect(buildAppRedirect(request, "connected"));

    if (!sessionIdFromCookie || sessionIdFromCookie !== sessionId) {
      response.cookies.set({
        name: GRANOLA_SESSION_COOKIE_NAME,
        value: sessionId,
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
      });
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "oauth_completion_failed";

    return NextResponse.redirect(buildAppRedirect(request, "error", message));
  }
}
