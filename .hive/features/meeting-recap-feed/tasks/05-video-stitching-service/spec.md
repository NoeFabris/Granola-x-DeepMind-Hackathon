# Task: 05-video-stitching-service

## Feature: meeting-recap-feed

## Dependencies

- **4. veo-31-video-generation-service** (04-veo-31-video-generation-service)

## Plan Section

### 5. Video Stitching Service
**Depends on**: 4
**Files**:
- Create: `src/lib/video-stitcher.ts` (FFmpeg wrapper)
- Create: `src/app/api/stitch-video/route.ts` (stitching endpoint)
**What**: Use fluent-ffmpeg or similar to stitch multiple Veo clips into one seamless video. Add smooth transitions between clips (crossfade). Output as MP4 for web playback. Handle temporary file cleanup.
**Must NOT**: Add complex effects, implement cloud storage yet
**References**: fluent-ffmpeg docs
**Verify**: POST to `/api/stitch-video` with clip URLs returns single video URL

## Context

## research-findings

# Research Findings

## User Preferences
- **Video Style**: AI Avatar (using Veo 3.1)
- **Frontend Stack**: Next.js + React
- **MVP Scope**: Functional MVP (full flow with feed UI, multiple meetings, basic styling)
- **Granola Integration**: Official MCP Server (OAuth-based)
- **Video Length**: Variable (scales with meeting length)
- **Deployment**: Vercel

## Veo 3.1 API (Google DeepMind)

**Access via Gemini API:**
```python
from google import genai
client = genai.Client()
operation = client.models.generate_videos(
    model="veo-3.1-generate-001",  # or veo-3.1-fast-generate-001 for speed
    prompt="Your prompt here"
)
```

**Key Features:**
- 8-second clips at 720p/1080p (4K available)
- Native audio generation (dialogue, sound effects)
- Aspect ratios: 16:9 (landscape), 9:16 (portrait/TikTok style)
- Fast variant for rapid iteration
- Requires Google AI API key from aistudio.google.com

## Granola MCP Server

**Using pavitarsaini/granola-mcp (Cloudflare Workers + OAuth):**

Tools available:
- `get_all_meetings` - List recent meetings (default limit 20)
- `get_meeting_by_id` - Single meeting by document ID
- `get_recent_meetings` - Meetings from last N days
- `search_meetings` - Search by keyword
- `get_document_summary` - Full summary for a document
- `get_todays_meetings` - Today's meetings

Auth: Google OAuth on first use

## Architecture Decision
Since this is a web app (not an MCP client), we need to either:
1. Call the Granola MCP server directly from our backend (if it exposes HTTP endpoints)
2. Use the Granola API directly (reverse-engineered endpoints)
3. Build a lightweight backend that acts as MCP client

**Recommendation**: Use the Granola API directly via a Next.js API route, since MCP is designed for AI assistants, not web apps.


---

## granola-mcp-official

# Official Granola MCP

**URL:** `https://mcp.granola.ai/mcp`

## What It Is
- Official MCP server hosted by Granola
- Works with Claude, ChatGPT, Cursor, Claude Code, and any MCP client
- OAuth authentication via Granola account
- Requires paid Granola plan

## Authentication Flow
1. User connects their Granola account
2. OAuth flow authenticates
3. MCP client can then access meeting notes

## Integration Options
1. **Native MCP Clients** (Claude, ChatGPT, Cursor) - Just add the URL
2. **Custom MCP Client** - Connect to `https://mcp.granola.ai/mcp`

## For Our Web App
Since we're building a web app (not an MCP client), we have two options:
1. **Build as MCP Client** - Implement MCP protocol in our backend
2. **Use MCP-to-HTTP bridge** - Create a service that acts as MCP client and exposes HTTP API

## Enterprise
- Available in early access beta for Enterprise plans
- Off by default, admins enable in Settings > Security


---

## task-01-project-setup

2026-02-07
- Initialized Next.js 14 App Router app with TypeScript and Tailwind CSS.
- Added @modelcontextprotocol/sdk dependency.
- Added env template (.env.local.example) with GOOGLE_AI_API_KEY placeholder.
- Added baseline setup test at tests/project-setup.test.mjs.
- Verification run: npm test, npm run build, npm run dev + homepage check, npx tsc --noEmit.

## Completed Tasks

- 01-project-setup: Initialized a Next.js 14 App Router project with TypeScript and Tailwind CSS, added @modelcontextprotocol/sdk, created required setup files including src/app layout/page and .env.local.example, added a baseline setup test, and verified with npm test, npm run build, npm run dev (homepage placeholder check), and npx tsc --noEmit.
- 02-granola-mcp-client-integration: Implemented Granola MCP integration with SDK-based OAuth session handling, tool wrappers, and API routes. Added `src/lib/mcp-client.ts`, `src/lib/granola.ts`, `src/types/granola.ts`, auth connect/callback routes, and meetings proxy route, plus a new integration test suite and updated `npm test` to run all tests. Verification: `npm test && npm run build` both pass (8/8 tests, Next.js build successful).
- 03-summary-script-generator: Implemented Gemini-based summary script generation for meeting recaps. Added `src/lib/script-generator.ts`, `src/lib/prompts.ts`, `src/types/script.ts`, and `src/app/api/generate-script/route.ts` with POST handling that returns a script chunk array for a `meetingId`, including Granola auth/session handling and JSON parsing/validation. Added TDD coverage in `tests/summary-script-generator.test.mjs` (initially failing, now passing). Verification: `npm test` (12/12 passing), `npm run build` (Next.js build successful), and `npx tsc --noEmit` (no errors). Also appended task learnings/decisions/issues to feature notepads.
- 04-veo-31-video-generation-service: Implemented Veo 3.1 clip generation via new `src/lib/veo.ts` with `Promise.all` parallel jobs, async operation polling, and 9:16 defaults; added `src/types/video.ts`; and created `src/app/api/generate-clips/route.ts` POST handler that validates script chunks and returns an array of video URL/buffer strings. Added RED→GREEN coverage in `tests/veo-video-generation-service.test.mjs` and appended Task 04 entries to feature notepads. Verification completed: `node --test tests/veo-video-generation-service.test.mjs` (4/4 pass) plus `npm test && npm run build && npx tsc --noEmit` (21/21 tests pass, Next.js build + typecheck succeed).
- 07-meeting-list-component: Implemented Granola meeting list UI with new `MeetingList`, `MeetingCard`, and `ConnectGranola` components, and updated `src/app/page.tsx` to pass OAuth callback query state (`granola=connected`) into the client list. Added task-specific RED->GREEN test coverage in `tests/meeting-list-component.test.mjs` and documented learnings/decisions/issues in feature notepads. Verification completed: `node --test tests/meeting-list-component.test.mjs`, then `npm test && npm run build && npx tsc --noEmit` all passed.
