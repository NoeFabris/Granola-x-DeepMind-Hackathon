import { GranolaClient } from "granola-ts-client";
import type {
  GranolaDocumentSummaryResponse,
  GranolaMeeting,
  GranolaMeetingsResponse,
} from "@/types/granola";

const clientCache = new Map<string, InstanceType<typeof GranolaClient>>();

function getClient(token: string): InstanceType<typeof GranolaClient> {
  const existing = clientCache.get(token);
  if (existing) {
    return existing;
  }

  const client = new GranolaClient(token);
  clientCache.set(token, client);
  return client;
}

interface GetMeetingsOptions {
  accessToken: string;
  limit?: number;
}

export async function getMeetings(
  options: GetMeetingsOptions
): Promise<GranolaMeetingsResponse> {
  const client = getClient(options.accessToken);

  const workspaces = await client.getWorkspaces();
  const workspaceId = workspaces.workspaces?.[0]?.workspace?.workspace_id;

  const requestOptions: Record<string, unknown> = {};

  if (workspaceId) {
    requestOptions.workspace_id = workspaceId;
  }

  if (typeof options?.limit === "number" && Number.isFinite(options.limit)) {
    requestOptions.limit = options.limit;
  }

  const response = await client.getDocuments(requestOptions);
  const docs = response.docs ?? [];

  const meetings: GranolaMeeting[] = docs.map((doc) => ({
    id: doc.id ?? "unknown",
    title: doc.title ?? "Untitled meeting",
    startedAt: doc.created_at,
    endedAt: doc.updated_at,
    summary: doc.summary ?? doc.notes_plain ?? undefined,
  }));

  return { meetings };
}

interface GetDocumentSummaryOptions {
  accessToken: string;
  documentId: string;
}

export async function getDocumentSummary(
  options: GetDocumentSummaryOptions
): Promise<GranolaDocumentSummaryResponse> {
  const client = getClient(options.accessToken);

  const transcript = await client.getDocumentTranscript(options.documentId);

  const workspaces = await client.getWorkspaces();
  const workspaceId = workspaces.workspaces?.[0]?.workspace?.workspace_id;

  let summary: string | undefined;

  if (workspaceId) {
    const docsResponse = await client.getDocuments({
      workspace_id: workspaceId,
      limit: 100,
    });

    const matchingDoc = docsResponse.docs?.find(
      (doc) => doc.id === options.documentId
    );

    if (matchingDoc) {
      summary =
        matchingDoc.summary ??
        matchingDoc.notes_plain ??
        matchingDoc.notes_markdown ??
        undefined;
    }
  }

  if (!summary) {
    const transcriptText = transcript
      .map((segment) => segment.text ?? "")
      .filter(Boolean)
      .join(" ")
      .trim();

    summary = transcriptText || "No summary available for this meeting.";
  }

  return {
    documentId: options.documentId,
    summary,
  };
}
