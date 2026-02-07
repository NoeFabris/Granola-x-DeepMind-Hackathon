# Task: 02-granola-mcp-client-integration

## Feature: meeting-recap-feed

## Dependencies

- **1. project-setup** (01-project-setup)

## Plan Section

### 2. Granola MCP Client Integration
**Depends on**: 1
**Files**:
- Create: `src/lib/mcp-client.ts` (MCP client wrapper)
- Create: `src/lib/granola.ts` (Granola-specific MCP tools)
- Create: `src/types/granola.ts` (TypeScript types for meetings)
- Create: `src/app/api/auth/granola/route.ts` (OAuth callback handler)
- Create: `src/app/api/auth/granola/connect/route.ts` (initiate connection)
- Create: `src/app/api/meetings/route.ts` (proxy to MCP tools)
**What**: Implement MCP client using `@modelcontextprotocol/sdk`. Connect to `https://mcp.granola.ai/mcp`. Handle OAuth flow: detect auth requirement → redirect to authUrl → handle callback → establish connection. Wrap MCP tools (get_meetings, get_document_summary) in API routes.
**Must NOT**: Build custom OAuth, store raw credentials
**References**: 
- MCP TypeScript SDK docs
- Official Granola MCP at https://mcp.granola.ai/mcp
**Verify**: User can click "Connect Granola" → OAuth flow → meetings returned

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
