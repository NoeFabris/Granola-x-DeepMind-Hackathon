import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();

test("vercel deployment task adds required config files", () => {
  const requiredFiles = ["vercel.json", "next.config.js", ".env.local.example"];

  for (const relativePath of requiredFiles) {
    assert.ok(existsSync(join(root, relativePath)), `${relativePath} should exist`);
  }
});

test("env template documents required production environment variables", async () => {
  const source = await readFile(join(root, ".env.local.example"), "utf8");

  assert.match(source, /^\s*GOOGLE_AI_API_KEY=/m);
  assert.match(source, /GEMINI_SCRIPT_MODEL/);
  assert.match(source, /VEO_MODEL/);
  assert.match(source, /\/api\/auth\/granola/);
});

test("vercel.json configures function durations for long-running routes", async () => {
  const source = await readFile(join(root, "vercel.json"), "utf8");

  assert.match(source, /\"\$schema\"\s*:/);
  assert.match(source, /\"functions\"\s*:/);
  assert.match(source, /generate-video\/route\.ts/);
  assert.match(source, /generate-clips\/route\.ts/);
  assert.match(source, /stitch-video\/route\.ts/);
  assert.match(source, /maxDuration/);
});

test("next config forces ffmpeg binaries into serverless bundle", async () => {
  const source = await readFile(join(root, "next.config.js"), "utf8");

  assert.match(source, /outputFileTracingIncludes/);
  assert.match(source, /ffmpeg-static/);
  assert.match(source, /ffprobe-static/);
});
