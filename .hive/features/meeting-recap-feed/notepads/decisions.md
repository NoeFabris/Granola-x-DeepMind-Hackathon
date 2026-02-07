## 2026-02-07
- Used the minimal dependency set needed for Next.js + TypeScript + Tailwind + MCP SDK.
- Used a static placeholder page for initial verification to keep task scope focused on setup.

## 2026-02-07 (Task 02)
- Implemented Granola OAuth with the official MCP SDK flow (`beginGranolaOAuth` + `completeGranolaAuthorization`) instead of any custom OAuth implementation.
- Stored OAuth session state in server-memory maps keyed by an HTTP-only `granola_session` cookie to avoid persisting raw credentials.
- Added tool-name fallbacks (`get_meetings`/`get_all_meetings` and `get_document_summary`/`get_meeting_by_id`) to tolerate MCP server tool naming differences.

## 2026-02-07 (Task 07)
- Implemented `MeetingList` as a client component responsible for fetching `/api/meetings`, handling loading/error/empty states, and deriving connected/disconnected status from API responses.
- Kept OAuth trigger behavior isolated in a dedicated `ConnectGranola` component with `window.location.assign("/api/auth/granola/connect")` semantics for a direct server-side OAuth flow.
- Passed `searchParams.granola` from `src/app/page.tsx` into `MeetingList` as `initialConnected` so callback redirects (`/?granola=connected`) immediately reflect connected state in the UI.

## 2026-02-07 (Task 04)
- Implemented Veo integration through direct Gemini REST calls in `src/lib/veo.ts` (`:generateVideos` + operation polling) to avoid adding another SDK dependency.
- Standardized clip generation on `9:16` as the route default to match TikTok-style output requirements.
- Designed `/api/generate-clips` to return a plain array of video URL/buffer strings so downstream feed assembly can consume clips without additional response mapping.

## 2026-02-07 (Task 05)
- Implemented stitching with `fluent-ffmpeg` + bundled static binaries (`ffmpeg-static`, `ffprobe-static`) so the service does not depend on a system-level FFmpeg install.
- Kept `/api/stitch-video` response shape as `{ videoUrl, mimeType }` where `videoUrl` is a data URL, deferring cloud/object storage to a later task.
- Limited MVP transitions to visual crossfades (`xfade`) and skipped advanced effects/audio compositing to stay in scope.

## 2026-02-07 (Task 06)
- Implemented full orchestration in `src/lib/video-pipeline.ts` to centralize meeting -> script -> clips -> stitch flow and keep `/api/generate-video` route thin.
- Used a single endpoint strategy: `POST /api/generate-video` for generation, plus `GET /api/generate-video?runId=...` (progress) and `GET /api/generate-video?videoId=...` (temporary playback) to support UI updates without adding extra routes.
- Chose in-memory TTL storage for generated videos and pipeline runs to satisfy temporary playback/progress requirements while explicitly avoiding persistent storage and queue infrastructure.

## 2026-02-07 (Task 08)
- Implemented the feed UI in a dedicated `VideoFeed` client component that owns meeting loading, active-slide tracking, and recap generation actions.
- Kept `MeetingList` available in a collapsible section on `src/app/page.tsx` while promoting `VideoFeed` as the primary full-height TikTok/Reels interaction.
- Limited `VideoControls` to playback and recap generation only, explicitly excluding comments, likes, and sharing to stay within MVP scope.

## 2026-02-07 (Task 09)
- Used request-time polling from `VideoFeed` (`GET /api/generate-video?runId=...`) while the generation `POST` is in flight, avoiding any websocket/background queue implementation.
- Added task-specific UI states as separate components (`GeneratingState`, `ProgressIndicator`, `ErrorState`) and kept orchestration/polling in `VideoFeed`.
- Standardized visible pipeline copy to three feed steps: `Generating script`, `Creating clips`, and `Stitching video`, with retry surfaced from inline error state.

## 2026-02-07 (Task 10)
- Implemented dark-mode support via lightweight CSS variables in `src/app/globals.css` with `@media (prefers-color-scheme: dark)` (no theme toggle/settings UI).
- Kept the header as a dedicated `Header` component overlaid on the feed from `src/app/page.tsx` to keep branding consistent without changing feed logic.
- Used safe-area-aware positioning (CSS `env(safe-area-inset-*)` through `--safe-*` variables) for overlay elements and controls to improve mobile ergonomics.

## 2026-02-07 (Task 11)
- Added `vercel.json` with a `functions` config to raise `maxDuration` for the long-running generation routes, keeping the values within the Hobby plan ceiling while allowing upgrades on Pro/Enterprise.
- Documented all required/optional runtime env vars in `.env.local.example`, including the production Granola OAuth callback path.
- Used `experimental.outputFileTracingIncludes` in `next.config.js` to bundle `ffmpeg-static`/`ffprobe-static` binaries for serverless deployments.
