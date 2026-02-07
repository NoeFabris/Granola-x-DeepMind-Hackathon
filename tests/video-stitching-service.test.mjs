import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();

const requiredFiles = [
  "src/lib/video-stitcher.ts",
  "src/app/api/stitch-video/route.ts",
];

test("video stitching task creates required files", () => {
  for (const relativePath of requiredFiles) {
    assert.ok(existsSync(join(root, relativePath)), `${relativePath} should exist`);
  }
});

test("video stitcher uses ffmpeg crossfades and temp cleanup", async () => {
  const source = await readFile(join(root, "src/lib/video-stitcher.ts"), "utf8");

  assert.match(source, /fluent-ffmpeg|ffmpeg/i);
  assert.match(source, /xfade|crossfade/i);
  assert.match(source, /\.mp4/i);
  assert.match(source, /mkdtemp|tmpdir/);
  assert.match(source, /rm\(/);
});

test("stitch-video route accepts clip urls and returns single video url", async () => {
  const source = await readFile(join(root, "src/app/api/stitch-video/route.ts"), "utf8");

  assert.match(source, /export\s+async\s+function\s+POST/);
  assert.match(source, /clipUrls|clips/);
  assert.match(source, /stitchVideo/);
  assert.match(source, /videoUrl/);
  assert.match(source, /NextResponse\.json\(/);
});
