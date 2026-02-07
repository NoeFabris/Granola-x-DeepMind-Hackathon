import { NextRequest, NextResponse } from "next/server";
import { getDocumentSummary, getMeetings } from "@/lib/granola";
import { GRANOLA_SESSION_COOKIE_NAME } from "@/lib/mcp-client";

export const runtime = "nodejs";

function parseLimit(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
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

  try {
    const documentId = request.nextUrl.searchParams.get("documentId");

    if (documentId) {
      const summaryResult = await getDocumentSummary({
        sessionId,
        callbackBaseUrl: request.nextUrl.origin,
        documentId,
      });

      if (summaryResult.status === "auth_required") {
        return NextResponse.json(
          {
            error: "Granola authorization is required.",
            authUrl: summaryResult.authUrl,
          },
          { status: 401 }
        );
      }

      return NextResponse.json(summaryResult.data);
    }

    const meetingsResult = await getMeetings({
      sessionId,
      callbackBaseUrl: request.nextUrl.origin,
      limit: parseLimit(request.nextUrl.searchParams.get("limit")),
    });

    if (meetingsResult.status === "auth_required") {
      return NextResponse.json(
        {
          error: "Granola authorization is required.",
          authUrl: meetingsResult.authUrl,
        },
        { status: 401 }
      );
    }

    return NextResponse.json(meetingsResult.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown meetings error.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}
