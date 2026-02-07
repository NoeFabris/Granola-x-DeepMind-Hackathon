# Meeting Recap Feed

## Discovery

**Q: How do you envision the video generation?**
A: AI Avatar using Veo 3.1 (Google DeepMind's video generation model)

**Q: What's your preferred tech stack?**
A: Next.js + React

**Q: What's the scope?**
A: Functional MVP - full flow with feed UI, multiple meetings, basic styling

**Q: How to connect to Granola?**
A: Official Granola MCP at `https://mcp.granola.ai/mcp` with OAuth

**Q: How long should recap videos be?**
A: Variable (scales with meeting length) using **Clip Chaining**

**Q: Deployment target?**
A: Vercel

**Research Findings:**
- Veo 3.1 available via Gemini API (`veo-3.1-generate-001` or `veo-3.1-fast-generate-001`)
- Generates 8-second clips with native audio at 720p/1080p
- 9:16 aspect ratio perfect for TikTok-style vertical feed
- Official Granola MCP at `https://mcp.granola.ai/mcp` - OAuth flow required
- MCP TypeScript SDK (`@modelcontextprotocol/sdk`) handles OAuth automatically

**Video Length Strategy - Clip Chaining:**
- Generate multiple 8-second Veo clips per meeting
- Use AI to split meeting summary into scriptable chunks
- Generate clips in parallel for speed
- Stitch together using FFmpeg into one seamless video
- Formula: ~2 seconds of video per minute of meeting (30-min meeting → 60-sec video)

**Auth Strategy - MCP Client:**
- Use `@modelcontextprotocol/sdk` to connect to Granola MCP
- Handle OAuth flow: server returns authUrl → redirect user → callback → connected
- Store MCP connection/session for subsequent API calls

## Non-Goals

- Custom authentication (using Granola OAuth via MCP)
- Video caching/persistence (regenerate on demand)
- Sharing features
- Mobile native app
- Real-time meeting streaming
- Custom avatar selection

## Ghost Diffs (Rejected Alternatives)

1. **HeyGen/D-ID** - Rejected in favor of Veo 3.1 per user preference
2. **Local Granola cache** - User wants official MCP integration
3. **Simple text cards** - User wants AI-generated avatar videos
4. **Segmented summaries** - User prefers one cohesive video per meeting
5. **TTS + motion graphics** - User prefers full AI avatar approach
6. **Third-party Granola MCP** - Using official `mcp.granola.ai` instead

---

## Tasks

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

### 3. Summary Script Generator
**Depends on**: 2
**Files**:
- Create: `src/lib/script-generator.ts` (AI script generation)
- Create: `src/lib/prompts.ts` (prompt templates)
- Create: `src/types/script.ts` (TypeScript types)
- Create: `src/app/api/generate-script/route.ts` (API endpoint)
**What**: Use Gemini to transform meeting summary into a video script. Split into timed chunks (~8 seconds of speech each). Each chunk should be a self-contained scene description for Veo. Include visual prompts (presenter gestures, background, key text overlays).
**Must NOT**: Over-engineer prompt templates, add complex scene transitions
**References**: Gemini API for text generation
**Verify**: POST to `/api/generate-script` with meeting ID returns array of script chunks

### 4. Veo 3.1 Video Generation Service
**Depends on**: 3
**Files**:
- Create: `src/lib/veo.ts` (Veo API client)
- Create: `src/types/video.ts` (TypeScript types)
- Create: `src/app/api/generate-clips/route.ts` (clip generation endpoint)
**What**: Create service that takes script chunks and generates Veo clips in parallel. Use 9:16 aspect ratio for TikTok-style format. Handle async generation with polling for completion. Return array of video URLs/buffers.
**Must NOT**: Implement caching yet, add watermarks
**References**: Google AI API docs for Veo 3.1, Vertex AI video generation
**Verify**: POST to `/api/generate-clips` with script chunks returns array of video URLs

### 5. Video Stitching Service
**Depends on**: 4
**Files**:
- Create: `src/lib/video-stitcher.ts` (FFmpeg wrapper)
- Create: `src/app/api/stitch-video/route.ts` (stitching endpoint)
**What**: Use fluent-ffmpeg or similar to stitch multiple Veo clips into one seamless video. Add smooth transitions between clips (crossfade). Output as MP4 for web playback. Handle temporary file cleanup.
**Must NOT**: Add complex effects, implement cloud storage yet
**References**: fluent-ffmpeg docs
**Verify**: POST to `/api/stitch-video` with clip URLs returns single video URL

### 6. Full Video Generation Pipeline
**Depends on**: 5
**Files**:
- Create: `src/lib/video-pipeline.ts` (orchestrates full flow)
- Create: `src/app/api/generate-video/route.ts` (main endpoint)
**What**: Orchestrate the full pipeline: meeting → script → clips → stitched video. Single endpoint that handles the entire flow. Implement progress tracking for UI updates. Store generated video temporarily for playback.
**Must NOT**: Add persistent storage, implement queue system
**References**: None (internal orchestration)
**Verify**: POST to `/api/generate-video` with meeting ID returns final video URL

### 7. Meeting List Component
**Depends on**: 2
**Files**:
- Create: `src/components/MeetingList.tsx`
- Create: `src/components/MeetingCard.tsx`
- Create: `src/components/ConnectGranola.tsx` (OAuth button)
- Modify: `src/app/page.tsx`
**What**: Build a sidebar/list component showing recent meetings from Granola. Each card shows meeting title, date, participants. Include "Connect Granola" button that triggers OAuth flow. Show connected state after auth.
**Must NOT**: Implement infinite scroll, complex filtering
**References**: None
**Verify**: Connect button works, meetings appear after OAuth, clicking triggers loading state

### 8. TikTok-Style Video Feed UI
**Depends on**: 6, 7
**Files**:
- Create: `src/components/VideoFeed.tsx`
- Create: `src/components/VideoPlayer.tsx`
- Create: `src/components/VideoControls.tsx`
- Modify: `src/app/page.tsx`
**What**: Build vertical scrolling video feed inspired by TikTok/Reels. Full-screen video player with swipe navigation between meetings. Show meeting title, key points as overlay. Auto-play current video, pause others.
**Must NOT**: Implement comments, likes, sharing
**References**: TikTok/Reels UI patterns
**Verify**: Can scroll between videos, videos play/pause correctly

### 9. Loading & Generation States
**Depends on**: 8
**Files**:
- Create: `src/components/GeneratingState.tsx`
- Create: `src/components/ProgressIndicator.tsx`
- Create: `src/components/ErrorState.tsx`
- Modify: `src/components/VideoFeed.tsx`
**What**: Add loading states while video pipeline runs. Show multi-step progress (Generating script → Creating clips 3/8 → Stitching video). Animated placeholder during generation. Handle errors with retry.
**Must NOT**: Implement background generation queue, websockets for updates
**References**: None
**Verify**: Progress updates show during generation, errors display with retry

### 10. Polish & Responsive Design
**Depends on**: 9
**Files**:
- Modify: `src/app/globals.css`
- Modify: `src/components/*.tsx` (all components)
- Create: `src/components/Header.tsx`
**What**: Add finishing touches - smooth animations, proper mobile responsive design, dark mode support, header with branding. Ensure the feed feels native and smooth.
**Must NOT**: Add complex theme system, settings page
**References**: TikTok mobile UI for reference
**Verify**: App works on mobile viewport, animations are smooth, looks polished

### 11. Vercel Deployment
**Depends on**: 10
**Files**:
- Create: `vercel.json` (if needed)
- Modify: `.env.local.example` (document all required env vars)
**What**: Deploy to Vercel. Configure environment variables for Google AI API key. Set up OAuth callback URL for production. Note: FFmpeg may need serverless function configuration or external service.
**Must NOT**: Set up CI/CD, monitoring
**References**: Vercel deployment docs, Vercel serverless function limits
**Verify**: Production URL loads, OAuth flow works, can fetch meetings and generate videos
