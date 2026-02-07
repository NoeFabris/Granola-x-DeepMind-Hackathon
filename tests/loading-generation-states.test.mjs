import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();

const requiredFiles = [
  "src/components/GeneratingState.tsx",
  "src/components/ProgressIndicator.tsx",
  "src/components/ErrorState.tsx",
];

test("loading state task creates required component files", () => {
  for (const relativePath of requiredFiles) {
    assert.ok(existsSync(join(root, relativePath)), `${relativePath} should exist`);
  }
});

test("VideoFeed tracks generation progress steps and polling", async () => {
  const source = await readFile(join(root, "src/components/VideoFeed.tsx"), "utf8");

  assert.match(source, /GeneratingState/);
  assert.match(source, /ErrorState/);
  assert.match(source, /ProgressIndicator/);
  assert.match(source, /setGenerationProgressByMeeting/);
  assert.match(source, /runId/);
  assert.match(source, /\/api\/generate-video\?runId=/);
  assert.match(source, /Generating script/);
  assert.match(source, /Creating clips/);
  assert.match(source, /Stitching video/);
});

test("GeneratingState renders animated placeholder and progress copy", async () => {
  const source = await readFile(join(root, "src/components/GeneratingState.tsx"), "utf8");

  assert.match(source, /ProgressIndicator/);
  assert.match(source, /Generating recap/i);
  assert.match(source, /animate-pulse|animate-spin|animate-\[/);
});

test("ErrorState includes retry button for failures", async () => {
  const source = await readFile(join(root, "src/components/ErrorState.tsx"), "utf8");

  assert.match(source, /onRetry/);
  assert.match(source, /Retry/);
  assert.match(source, /button/);
});

test("ProgressIndicator defines and renders step statuses", async () => {
  const source = await readFile(join(root, "src/components/ProgressIndicator.tsx"), "utf8");

  assert.match(source, /pending/);
  assert.match(source, /running/);
  assert.match(source, /completed/);
  assert.match(source, /failed/);
  assert.match(source, /Generating script/);
  assert.match(source, /Creating clips/);
  assert.match(source, /Stitching video/);
});
