const TARGET_CHUNK_SECONDS = 8;

export function buildScriptPrompt(summary: string): string {
  return [
    "You convert meeting summaries into short video scripts for an AI presenter.",
    "Return JSON only. No markdown and no prose outside JSON.",
    "",
    "Output schema:",
    "{",
    '  "chunks": [',
    "    {",
    '      "index": 1,',
    `      "durationSeconds": ${TARGET_CHUNK_SECONDS},`,
    '      "narration": "spoken line for the presenter",',
    '      "visualPrompt": "self-contained Veo scene with presenter gesture, background, and camera framing",',
    '      "textOverlay": "short on-screen text"',
    "    }",
    "  ]",
    "}",
    "",
    "Requirements:",
    "- Each chunk is approximately 8-second narration.",
    "- Keep each chunk self-contained. Avoid transitions between chunks.",
    "- Focus on key decisions, action items, and outcomes.",
    "- Every visualPrompt must include presenter behavior and text overlay context.",
    "",
    "Meeting summary:",
    summary.trim(),
  ].join("\n");
}
