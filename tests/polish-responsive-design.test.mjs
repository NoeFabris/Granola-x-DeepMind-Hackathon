import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();

test("polish task creates Header component", () => {
  assert.ok(
    existsSync(join(root, "src/components/Header.tsx")),
    "src/components/Header.tsx should exist"
  );
});

test("homepage renders Header with branding overlay", async () => {
  const source = await readFile(join(root, "src/app/page.tsx"), "utf8");

  assert.match(source, /Header/);
  assert.match(source, /@\/components\/Header|components\/Header/);
});

test("globals.css defines safe-area variables and dark mode defaults", async () => {
  const source = await readFile(join(root, "src/app/globals.css"), "utf8");

  assert.match(source, /safe-area-inset-top/);
  assert.match(source, /prefers-color-scheme|color-scheme/);
});

test("VideoFeed uses dynamic viewport height for mobile browsers", async () => {
  const source = await readFile(join(root, "src/components/VideoFeed.tsx"), "utf8");

  assert.match(source, /100dvh/);
});
