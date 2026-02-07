import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();

const requiredFiles = [
  "src/lib/veo.ts",
  "src/types/video.ts",
  "src/app/api/generate-clips/route.ts",
];

test("veo video generation task creates required files", () => {
  for (const relativePath of requiredFiles) {
    assert.ok(existsSync(join(root, relativePath)), `${relativePath} should exist`);
  }
});

test("veo service configures 3.1 model with portrait aspect ratio", async () => {
  const source = await readFile(join(root, "src/lib/veo.ts"), "utf8");

  assert.match(source, /veo-3\.1/);
  assert.match(source, /9:16/);
  assert.match(source, /generateVideos|generate_videos/);
});

test("veo service starts async jobs and polls until completion", async () => {
  const source = await readFile(join(root, "src/lib/veo.ts"), "utf8");

  assert.match(source, /Promise\.all/);
  assert.match(source, /while\s*\(/);
  assert.match(source, /done/);
  assert.match(source, /operations?/i);
});

test("generate clips route accepts chunks and returns video URLs", async () => {
  const source = await readFile(join(root, "src/app/api/generate-clips/route.ts"), "utf8");

  assert.match(source, /export\s+async\s+function\s+POST/);
  assert.match(source, /chunks/);
  assert.match(source, /generateVeoClips/);
  assert.match(source, /NextResponse\.json\(/);
  assert.match(source, /url/i);
});
