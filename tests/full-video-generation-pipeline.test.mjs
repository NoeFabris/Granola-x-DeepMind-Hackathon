import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();

const requiredFiles = [
  "src/lib/video-pipeline.ts",
  "src/app/api/generate-video/route.ts",
];

test("full video generation pipeline task creates required files", () => {
  for (const relativePath of requiredFiles) {
    assert.ok(existsSync(join(root, relativePath)), `${relativePath} should exist`);
  }
});

test("video pipeline orchestrates script clips and stitching with progress tracking", async () => {
  const source = await readFile(join(root, "src/lib/video-pipeline.ts"), "utf8");

  assert.match(source, /generateMeetingScript/);
  assert.match(source, /generateVeoClips/);
  assert.match(source, /stitchVideoClips/);
  assert.match(source, /progress/i);
  assert.match(source, /runId/);
  assert.match(source, /new Map/);
});

test("generate-video route handles POST meetingId and returns final video URL", async () => {
  const source = await readFile(join(root, "src/app/api/generate-video/route.ts"), "utf8");

  assert.match(source, /export\s+async\s+function\s+POST/);
  assert.match(source, /meetingId/);
  assert.match(source, /GRANOLA_SESSION_COOKIE_NAME/);
  assert.match(source, /generateMeetingVideo/);
  assert.match(source, /videoUrl/);
});

test("generate-video route exposes GET for progress polling and playback", async () => {
  const source = await readFile(join(root, "src/app/api/generate-video/route.ts"), "utf8");

  assert.match(source, /export\s+async\s+function\s+GET/);
  assert.match(source, /runId/);
  assert.match(source, /videoId/);
  assert.match(source, /Content-Type|mimeType/);
});
