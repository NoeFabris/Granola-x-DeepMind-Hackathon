import { getDocumentSummary } from "@/lib/granola";
import { buildScriptPrompt } from "@/lib/prompts";
import type { GeneratedMeetingScript, ScriptChunk } from "@/types/script";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = process.env.GEMINI_SCRIPT_MODEL ?? "gemini-2.0-flash";
const DEFAULT_CHUNK_SECONDS = 8;

interface GenerateMeetingScriptOptions {
  meetingId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractJsonFromText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const fencedJson = text.match(/```json\s*([\s\S]*?)```/i);

    if (fencedJson?.[1]) {
      try {
        return JSON.parse(fencedJson[1]);
      } catch {
        return undefined;
      }
    }

    return undefined;
  }
}

function extractGeminiText(payload: unknown): string {
  if (!isRecord(payload) || !Array.isArray(payload.candidates)) {
    return "";
  }

  const collected: string[] = [];

  for (const candidate of payload.candidates) {
    if (!isRecord(candidate) || !isRecord(candidate.content)) {
      continue;
    }

    const parts = candidate.content.parts;

    if (!Array.isArray(parts)) {
      continue;
    }

    for (const part of parts) {
      if (isRecord(part) && typeof part.text === "string") {
        collected.push(part.text);
      }
    }
  }

  return collected.join("\n").trim();
}

function normalizeChunk(entry: unknown, index: number): ScriptChunk | undefined {
  if (!isRecord(entry)) {
    return undefined;
  }

  const narrationCandidate = entry.narration ?? entry.voiceover ?? entry.voiceOver;
  const visualCandidate =
    entry.visualPrompt ?? entry.visual ?? entry.scene ?? entry.sceneDescription;

  if (typeof narrationCandidate !== "string" || typeof visualCandidate !== "string") {
    return undefined;
  }

  const parsedDuration = Number(entry.durationSeconds);
  const durationSeconds =
    Number.isFinite(parsedDuration) && parsedDuration > 0
      ? Math.round(parsedDuration)
      : DEFAULT_CHUNK_SECONDS;
  const parsedIndex = Number(entry.index);

  return {
    index: Number.isFinite(parsedIndex) && parsedIndex > 0 ? Math.round(parsedIndex) : index + 1,
    durationSeconds,
    narration: narrationCandidate.trim(),
    visualPrompt: visualCandidate.trim(),
    textOverlay: typeof entry.textOverlay === "string" ? entry.textOverlay.trim() : undefined,
  };
}

function parseScriptChunks(payload: unknown): ScriptChunk[] {
  let list: unknown[] = [];

  if (Array.isArray(payload)) {
    list = payload;
  } else if (isRecord(payload)) {
    const candidates = [payload.chunks, payload.script, payload.scenes];
    const firstArray = candidates.find((entry) => Array.isArray(entry));

    if (Array.isArray(firstArray)) {
      list = firstArray;
    }
  }

  const normalized = list
    .map((entry, index) => normalizeChunk(entry, index))
    .filter((entry): entry is ScriptChunk => Boolean(entry));

  return normalized;
}

function getApiKey(): string {
  const value = process.env.GOOGLE_AI_API_KEY;

  if (!value) {
    throw new Error("Missing GOOGLE_AI_API_KEY environment variable.");
  }

  return value;
}

export async function generateScriptFromSummary(summary: string): Promise<ScriptChunk[]> {
  const normalizedSummary = summary.trim();

  if (!normalizedSummary) {
    throw new Error("Cannot generate script from an empty meeting summary.");
  }

  const apiKey = getApiKey();
  const endpoint = `${GEMINI_BASE_URL}/models/${DEFAULT_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const prompt = buildScriptPrompt(normalizedSummary);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini script generation failed: ${response.status} ${errorText}`);
  }

  const responseBody: unknown = await response.json();
  const modelText = extractGeminiText(responseBody);

  if (!modelText) {
    throw new Error("Gemini did not return script content.");
  }

  const parsed = extractJsonFromText(modelText);
  const chunks = parseScriptChunks(parsed);

  if (chunks.length === 0) {
    throw new Error("Gemini returned script content in an unexpected format.");
  }

  return chunks;
}

export async function generateVideoPrompt(summary: string): Promise<string> {
  const normalizedSummary = summary.trim();

  if (!normalizedSummary) {
    throw new Error("Cannot generate video prompt from an empty meeting summary.");
  }

  const apiKey = getApiKey();
  const endpoint = `${GEMINI_BASE_URL}/models/${DEFAULT_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const prompt = [
    "You are a creative director for short-form video content.",
    "Given a meeting summary, write a single video generation prompt for Google Veo.",
    "The prompt should describe an engaging, fun 8-second vertical (9:16) video that recaps the meeting highlights.",
    "Include visual style, camera movement, colors, and energy level.",
    "Keep it to one concise paragraph (3-5 sentences). Return ONLY the prompt text, no JSON, no markdown.",
    "",
    "Meeting summary:",
    normalizedSummary,
  ].join("\n");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini video prompt generation failed: ${response.status} ${errorText}`);
  }

  const responseBody: unknown = await response.json();
  const modelText = extractGeminiText(responseBody);

  if (!modelText) {
    throw new Error("Gemini did not return video prompt content.");
  }

  return modelText;
}

export async function generateMeetingScript(
  options: GenerateMeetingScriptOptions
): Promise<GeneratedMeetingScript> {
  const summaryResult = await getDocumentSummary({
    documentId: options.meetingId,
  });

  const chunks = await generateScriptFromSummary(summaryResult.summary);

  return {
    meetingId: options.meetingId,
    summary: summaryResult.summary,
    chunks,
  };
}
