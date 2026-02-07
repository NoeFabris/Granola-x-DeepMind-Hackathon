import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();

const integrationFiles = [
  "src/lib/mcp-client.ts",
  "src/lib/granola.ts",
  "src/types/granola.ts",
  "src/app/api/auth/granola/route.ts",
  "src/app/api/auth/granola/connect/route.ts",
  "src/app/api/meetings/route.ts",
];

test("granola MCP integration creates required files", () => {
  for (const relativePath of integrationFiles) {
    assert.ok(
      existsSync(join(root, relativePath)),
      `${relativePath} should exist`
    );
  }
});

test("MCP client wrapper configures granola endpoint and OAuth helpers", async () => {
  const clientSource = await readFile(join(root, "src/lib/mcp-client.ts"), "utf8");

  assert.match(clientSource, /https:\/\/mcp\.granola\.ai\/mcp/);
  assert.match(clientSource, /UnauthorizedError/);
  assert.match(clientSource, /withGranolaClient/);
  assert.match(clientSource, /completeGranolaAuthorization/);
});

test("Granola tool wrappers provide meetings and summary helpers", async () => {
  const granolaSource = await readFile(join(root, "src/lib/granola.ts"), "utf8");

  assert.match(granolaSource, /getMeetings/);
  assert.match(granolaSource, /getDocumentSummary/);
  assert.match(granolaSource, /get_document_summary/);
  assert.match(granolaSource, /get_meetings|get_all_meetings/);
});

test("Auth routes expose connect and callback handlers", async () => {
  const connectRoute = await readFile(
    join(root, "src/app/api/auth/granola/connect/route.ts"),
    "utf8"
  );
  const callbackRoute = await readFile(
    join(root, "src/app/api/auth/granola/route.ts"),
    "utf8"
  );

  assert.match(connectRoute, /export\s+async\s+function\s+GET/);
  assert.match(connectRoute, /beginGranolaOAuth/);
  assert.match(callbackRoute, /export\s+async\s+function\s+GET/);
  assert.match(callbackRoute, /completeGranolaAuthorization/);
});

test("Meetings API route proxies MCP tools", async () => {
  const meetingsRoute = await readFile(
    join(root, "src/app/api/meetings/route.ts"),
    "utf8"
  );

  assert.match(meetingsRoute, /getMeetings/);
  assert.match(meetingsRoute, /getDocumentSummary/);
  assert.match(meetingsRoute, /documentId/);
});
