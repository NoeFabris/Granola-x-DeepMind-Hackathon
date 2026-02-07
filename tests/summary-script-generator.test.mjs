import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();

const scriptGeneratorFiles = [
  "src/lib/script-generator.ts",
  "src/lib/prompts.ts",
  "src/types/script.ts",
  "src/app/api/generate-script/route.ts",
];

test("summary script generator task creates required files", () => {
  for (const relativePath of scriptGeneratorFiles) {
    assert.ok(
      existsSync(join(root, relativePath)),
      `${relativePath} should exist`
    );
  }
});

test("script generator uses Gemini generateContent JSON flow", async () => {
  const source = await readFile(join(root, "src/lib/script-generator.ts"), "utf8");

  assert.match(source, /generativelanguage\.googleapis\.com/);
  assert.match(source, /generateContent/);
  assert.match(source, /GOOGLE_AI_API_KEY/);
  assert.match(source, /responseMimeType\s*:\s*"application\/json"/);
});

test("prompt template asks for timed 8 second chunks", async () => {
  const source = await readFile(join(root, "src/lib/prompts.ts"), "utf8");

  assert.match(source, /8[- ]second/i);
  assert.match(source, /JSON/i);
  assert.match(source, /visual/i);
  assert.match(source, /overlay/i);
});

test("generate-script route accepts POST with meeting id", async () => {
  const source = await readFile(
    join(root, "src/app/api/generate-script/route.ts"),
    "utf8"
  );

  assert.match(source, /export\s+async\s+function\s+POST/);
  assert.match(source, /meetingId/);
  assert.match(source, /GRANOLA_SESSION_COOKIE_NAME/);
  assert.match(source, /generateMeetingScript/);
});
