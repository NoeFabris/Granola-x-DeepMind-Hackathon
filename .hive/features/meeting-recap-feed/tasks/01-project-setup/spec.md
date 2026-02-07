# Task: 01-project-setup

## Feature: meeting-recap-feed

## Dependencies

_None_

## Plan Section

### 1. Project Setup
**Depends on**: none
**Files**:
- Create: `package.json`, `next.config.js`, `tsconfig.json`
- Create: `tailwind.config.ts`, `postcss.config.js`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`
- Create: `.env.local.example`
**What**: Initialize Next.js 14+ project with TypeScript, Tailwind CSS, and App Router. Set up project structure and environment variable templates for Google AI API key. Install MCP SDK: `@modelcontextprotocol/sdk`.
**Must NOT**: Install unnecessary dependencies, add custom auth libraries
**References**: Next.js docs for App Router setup
**Verify**: `npm run dev` starts without errors, localhost:3000 shows placeholder

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

