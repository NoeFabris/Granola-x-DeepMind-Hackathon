import { NextRequest, NextResponse } from "next/server";
import { getDocumentSummary, getMeetings, isGranolaConfigured } from "@/lib/granola";

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
  if (!isGranolaConfigured()) {
    return NextResponse.json(
      {
        error: "Granola is not configured. Set the GRANOLA_API_TOKEN environment variable.",
      },
      { status: 503 }
    );
  }

  try {
    const documentId = request.nextUrl.searchParams.get("documentId");

    if (documentId) {
      const summaryResult = await getDocumentSummary({ documentId });
      return NextResponse.json(summaryResult);
    }

    const meetingsResult = await getMeetings({
      limit: parseLimit(request.nextUrl.searchParams.get("limit")),
    });

    return NextResponse.json(meetingsResult);
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
