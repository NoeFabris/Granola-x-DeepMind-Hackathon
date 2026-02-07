import { NextRequest, NextResponse } from "next/server";
import { getDocumentSummary, getMeetings } from "@/lib/granola";

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const accessToken = readAccessToken(request);

  if (!accessToken) {
    return NextResponse.json(
      {
        error: "Granola access token is required. Please connect your Granola account.",
      },
      { status: 401 }
    );
  }

  try {
    const documentId = request.nextUrl.searchParams.get("documentId");

    if (documentId) {
      const summaryResult = await getDocumentSummary({ accessToken, documentId });
      return NextResponse.json(summaryResult);
    }

    const meetingsResult = await getMeetings({
      accessToken,
      limit: parseLimit(request.nextUrl.searchParams.get("limit")),
    });

    return NextResponse.json(meetingsResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown meetings error.";

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
