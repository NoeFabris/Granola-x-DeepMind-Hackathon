## 2026-02-07
- Used the minimal dependency set needed for Next.js + TypeScript + Tailwind + MCP SDK.
- Used a static placeholder page for initial verification to keep task scope focused on setup.

## 2026-02-07 (Task 02)
- Implemented Granola OAuth with the official MCP SDK flow (`beginGranolaOAuth` + `completeGranolaAuthorization`) instead of any custom OAuth implementation.
- Stored OAuth session state in server-memory maps keyed by an HTTP-only `granola_session` cookie to avoid persisting raw credentials.
- Added tool-name fallbacks (`get_meetings`/`get_all_meetings` and `get_document_summary`/`get_meeting_by_id`) to tolerate MCP server tool naming differences.

## 2026-02-07 (Task 03)
- Chose direct Gemini REST calls (no additional SDK dependency) for script generation to keep MVP integration lightweight and easy to deploy on Vercel.
- Kept prompt construction in `src/lib/prompts.ts` and parsing/generation in `src/lib/script-generator.ts` to keep route logic thin and focused on request/response handling.
