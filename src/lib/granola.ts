import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { withGranolaClient } from "@/lib/mcp-client";
import type {
  GranolaClientContext,
  GranolaDocumentSummaryResponse,
  GranolaMeeting,
  GranolaMeetingsResponse,
  GranolaProxyResult,
} from "@/types/granola";

type ListedTool = Awaited<ReturnType<Client["listTools"]>>["tools"][number];
type ToolResult = Awaited<ReturnType<Client["callTool"]>>;

const MEETING_TOOL_CANDIDATES = [
  "get_meetings",
  "get_all_meetings",
  "get_recent_meetings",
  "get_todays_meetings",
] as const;

const SUMMARY_TOOL_CANDIDATES = [
  "get_document_summary",
  "get_meeting_by_id",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getTextContent(toolResult: ToolResult): string {
  if (!isRecord(toolResult) || !Array.isArray(toolResult.content)) {
    return "";
  }

  const segments: string[] = [];

  for (const content of toolResult.content) {
    if (
      isRecord(content) &&
      content.type === "text" &&
      typeof content.text === "string"
    ) {
      segments.push(content.text);
    }
  }

  return segments.join("\n").trim();
}

function extractJsonFromText(text: string): unknown {
  if (!text) {
    return text;
  }

  try {
    return JSON.parse(text);
  } catch {
    const fencedJsonMatch = text.match(/```json\s*([\s\S]*?)```/i);

    if (fencedJsonMatch?.[1]) {
      try {
        return JSON.parse(fencedJsonMatch[1]);
      } catch {
        return text;
      }
    }

    return text;
  }
}

function extractToolPayload(toolResult: ToolResult): unknown {
  if (isRecord(toolResult) && toolResult.structuredContent !== undefined) {
    return toolResult.structuredContent;
  }

  return extractJsonFromText(getTextContent(toolResult));
}

function isToolError(toolResult: ToolResult): boolean {
  return isRecord(toolResult) && toolResult.isError === true;
}

function pickToolByName(
  tools: ListedTool[],
  candidates: readonly string[]
): ListedTool | undefined {
  for (const candidate of candidates) {
    const tool = tools.find((entry) => entry.name === candidate);
    if (tool) {
      return tool;
    }
  }

  return undefined;
}

function filterArgsBySchema(
  tool: ListedTool,
  defaults: Record<string, unknown>
): Record<string, unknown> {
  const properties = tool.inputSchema.properties;

  if (!properties) {
    return {};
  }

  const propertySet = new Set(Object.keys(properties));
  const args: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(defaults)) {
    if (propertySet.has(key)) {
      args[key] = value;
    }
  }

  return args;
}

function normalizeMeeting(item: Record<string, unknown>): GranolaMeeting {
  const idValue =
    item.document_id ?? item.documentId ?? item.id ?? item.meeting_id ?? item.meetingId;
  const titleValue = item.title ?? item.name ?? item.topic;
  const summaryValue =
    item.summary ?? item.document_summary ?? item.meeting_summary ?? item.brief;

  return {
    ...item,
    id: typeof idValue === "string" ? idValue : "unknown",
    title: typeof titleValue === "string" ? titleValue : "Untitled meeting",
    startedAt: typeof item.started_at === "string" ? item.started_at : undefined,
    endedAt: typeof item.ended_at === "string" ? item.ended_at : undefined,
    summary: typeof summaryValue === "string" ? summaryValue : undefined,
  };
}

function normalizeMeetings(payload: unknown): GranolaMeeting[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord).map(normalizeMeeting);
  }

  if (!isRecord(payload)) {
    return [];
  }

  const candidates = [payload.meetings, payload.documents, payload.items];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord).map(normalizeMeeting);
    }
  }

  return [];
}

function buildSummaryArgs(tool: ListedTool, documentId: string): Record<string, unknown> {
  const properties = Object.keys(tool.inputSchema.properties ?? {});
  const preferredKeys = [
    "document_id",
    "documentId",
    "id",
    "meeting_id",
    "meetingId",
  ];

  const key =
    preferredKeys.find((candidate) => properties.includes(candidate)) ??
    properties.find((candidate) => /id$/i.test(candidate)) ??
    properties[0] ??
    "document_id";

  return {
    [key]: documentId,
  };
}

function summaryFromPayload(payload: unknown): string {
  if (typeof payload === "string") {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map((entry) => JSON.stringify(entry)).join("\n");
  }

  if (!isRecord(payload)) {
    return "";
  }

  const summaryCandidate =
    payload.summary ??
    payload.document_summary ??
    payload.meeting_summary ??
    payload.text;

  if (typeof summaryCandidate === "string") {
    return summaryCandidate;
  }

  return JSON.stringify(payload);
}

interface GetMeetingsOptions extends GranolaClientContext {
  limit?: number;
}

export async function getMeetings(
  options: GetMeetingsOptions
): Promise<GranolaProxyResult<GranolaMeetingsResponse>> {
  return withGranolaClient(options, async (client) => {
    const listedTools = await client.listTools();
    const selectedTool = pickToolByName(listedTools.tools, MEETING_TOOL_CANDIDATES);

    if (!selectedTool) {
      throw new Error("No Granola meetings tool is available on the MCP server.");
    }

    const defaultArgs: Record<string, unknown> = {};

    if (typeof options.limit === "number" && Number.isFinite(options.limit)) {
      defaultArgs.limit = options.limit;
    }

    const toolArgs = filterArgsBySchema(selectedTool, defaultArgs);
    const toolResult = await client.callTool({
      name: selectedTool.name,
      arguments: toolArgs,
    });

    if (isToolError(toolResult)) {
      throw new Error(getTextContent(toolResult) || "Granola meeting lookup failed.");
    }

    const payload = extractToolPayload(toolResult);

    return {
      toolName: selectedTool.name,
      meetings: normalizeMeetings(payload),
      raw: payload,
    };
  });
}

interface GetDocumentSummaryOptions extends GranolaClientContext {
  documentId: string;
}

export async function getDocumentSummary(
  options: GetDocumentSummaryOptions
): Promise<GranolaProxyResult<GranolaDocumentSummaryResponse>> {
  return withGranolaClient(options, async (client) => {
    const listedTools = await client.listTools();
    const selectedTool = pickToolByName(listedTools.tools, SUMMARY_TOOL_CANDIDATES);

    if (!selectedTool) {
      throw new Error("No Granola summary tool is available on the MCP server.");
    }

    const toolResult = await client.callTool({
      name: selectedTool.name,
      arguments: buildSummaryArgs(selectedTool, options.documentId),
    });

    if (isToolError(toolResult)) {
      throw new Error(getTextContent(toolResult) || "Granola summary lookup failed.");
    }

    const payload = extractToolPayload(toolResult);

    return {
      toolName: selectedTool.name,
      documentId: options.documentId,
      summary: summaryFromPayload(payload),
      raw: payload,
    };
  });
}
