import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();

const componentFiles = [
  "src/components/MeetingList.tsx",
  "src/components/MeetingCard.tsx",
  "src/components/ConnectGranola.tsx",
];

test("meeting list task creates component files", () => {
  for (const relativePath of componentFiles) {
    assert.ok(existsSync(join(root, relativePath)), `${relativePath} should exist`);
  }
});

test("MeetingList fetches meetings with loading state handling", async () => {
  const source = await readFile(join(root, "src/components/MeetingList.tsx"), "utf8");

  assert.match(source, /fetch\(["'`]\/api\/meetings/);
  assert.match(source, /setIsLoadingMeetings\(true\)/);
  assert.match(source, /setIsLoadingMeetings\(false\)/);
  assert.match(source, /setMeetings\(/);
});

test("ConnectGranola redirects to OAuth and renders connecting label", async () => {
  const source = await readFile(join(root, "src/components/ConnectGranola.tsx"), "utf8");

  assert.match(source, /window\.location\.assign/);
  assert.match(source, /Connecting\.\.\./);
  assert.match(source, /Connect Granola/);
});

test("MeetingCard includes title date and participants", async () => {
  const source = await readFile(join(root, "src/components/MeetingCard.tsx"), "utf8");

  assert.match(source, /meeting\.title/);
  assert.match(source, /participants/i);
  assert.match(source, /Intl\.DateTimeFormat|toLocaleDateString/);
});

test("homepage renders MeetingList with Granola query state", async () => {
  const source = await readFile(join(root, "src/app/page.tsx"), "utf8");

  assert.match(source, /MeetingList/);
  assert.match(source, /searchParams/);
  assert.match(source, /granola/);
});
