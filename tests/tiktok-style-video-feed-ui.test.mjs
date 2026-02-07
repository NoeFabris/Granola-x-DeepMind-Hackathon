import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();

const requiredFiles = [
  "src/components/VideoFeed.tsx",
  "src/components/VideoPlayer.tsx",
  "src/components/VideoControls.tsx",
];

test("tiktok feed task creates required component files", () => {
  for (const relativePath of requiredFiles) {
    assert.ok(existsSync(join(root, relativePath)), `${relativePath} should exist`);
  }
});

test("VideoFeed implements vertical snap scrolling and active slide tracking", async () => {
  const source = await readFile(join(root, "src/components/VideoFeed.tsx"), "utf8");

  assert.match(source, /snap-y/);
  assert.match(source, /snap-(start|center)/);
  assert.match(source, /overflow-y-(auto|scroll)/);
  assert.match(source, /active(Index|Video)/);
  assert.match(source, /IntersectionObserver|onScroll/);
  assert.match(source, /VideoPlayer/);
  assert.match(source, /VideoControls/);
});

test("VideoPlayer auto-plays active video and pauses inactive videos", async () => {
  const source = await readFile(join(root, "src/components/VideoPlayer.tsx"), "utf8");

  assert.match(source, /<video/);
  assert.match(source, /isActive/);
  assert.match(source, /useEffect/);
  assert.match(source, /\.play\(/);
  assert.match(source, /\.pause\(/);
  assert.match(source, /playsInline/);
  assert.match(source, /muted/);
});

test("VideoControls only includes playback and generation actions", async () => {
  const source = await readFile(join(root, "src/components/VideoControls.tsx"), "utf8");

  assert.match(source, /Play|Pause/);
  assert.match(source, /Generate (video|recap)|Regenerate/);
  assert.doesNotMatch(source, /comment/i);
  assert.doesNotMatch(source, /like/i);
  assert.doesNotMatch(source, /share/i);
});

test("homepage integrates VideoFeed and passes Granola callback state", async () => {
  const source = await readFile(join(root, "src/app/page.tsx"), "utf8");

  assert.match(source, /VideoFeed/);
  assert.match(source, /searchParams/);
  assert.match(source, /granola/);
  assert.match(source, /initialConnected/);
});
