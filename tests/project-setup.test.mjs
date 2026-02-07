import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();

const requiredFiles = [
  "package.json",
  "next.config.js",
  "tsconfig.json",
  "tailwind.config.ts",
  "postcss.config.js",
  "src/app/layout.tsx",
  "src/app/page.tsx",
  ".env.local.example",
];

test("project setup creates required files", () => {
  for (const relativePath of requiredFiles) {
    assert.ok(
      existsSync(join(root, relativePath)),
      `${relativePath} should exist`
    );
  }
});

test("homepage contains placeholder message", async () => {
  const page = await readFile(join(root, "src/app/page.tsx"), "utf8");
  assert.match(page, /Meeting Recap Feed/i);
});

test("env example includes Google AI API key template", async () => {
  const envExample = await readFile(join(root, ".env.local.example"), "utf8");
  assert.match(envExample, /GOOGLE_AI_API_KEY=/);
});
