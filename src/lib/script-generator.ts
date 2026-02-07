const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = process.env.GEMINI_SCRIPT_MODEL ?? "gemini-2.0-flash";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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

function getApiKey(): string {
  const value = process.env.GOOGLE_AI_API_KEY;

  if (!value) {
    throw new Error("Missing GOOGLE_AI_API_KEY environment variable.");
  }

  return value;
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
