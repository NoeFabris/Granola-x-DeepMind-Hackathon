## 2026-02-07
- Bootstrapped a Next.js 14 App Router project with TypeScript and Tailwind CSS.
- Added `@modelcontextprotocol/sdk` as the only non-framework runtime dependency.
- Added a lightweight Node test that validates required setup files and placeholder content.

## 2026-02-07 (Task 02)
- `StreamableHTTPClientTransport` raises `UnauthorizedError` when OAuth is needed; the auth URL is captured through `OAuthClientProvider.redirectToAuthorization`.
- A per-session in-memory OAuth provider can reuse SDK-managed dynamic client registration plus PKCE without implementing custom token exchange logic.
- `client.callTool()` can return heterogeneous result shapes, so tool payload parsing must guard for unknown payload types.

## 2026-02-07 (Task 07)
- The meetings API can be polled from a client component to infer connection state: `200` means connected, `401` returns either `authUrl` or `connectUrl` for OAuth kickoff.
- For Granola payload variance, meeting cards should parse participants from multiple candidate keys (`participants`, `participant_names`, `attendees`, `people`) and tolerate mixed string/object arrays.
- OAuth connect UX is simplest when the button owns a local `isConnecting` flag and immediately calls `window.location.assign()` so users see a loading label before redirect.

## 2026-02-07 (Task 04)
- Veo clip generation via Google AI is long-running and returns an operation name first, so the service needs explicit polling until `done` before reading generated video data.
- Returning `url ?? bufferBase64` from generated clips keeps the API resilient to response-shape differences between hosted URLs and inline video payload variants.
- Keeping `generateVeoClips` request body validation in the route (instead of the client UI) allows later feed composers to reuse the endpoint safely.

## 2026-02-07 (Task 05)
- `fluent-ffmpeg` can build a chained `xfade` graph for multi-clip transitions, but each transition offset should be based on cumulative duration minus prior overlaps to avoid jumpy cuts.
- Returning stitched output as a `data:video/mp4;base64,...` URL keeps MVP delivery simple without introducing storage/upload infrastructure.
- Wrapping the whole stitch flow in a `mkdtemp` workspace plus `rm(..., { recursive: true, force: true })` cleanup avoids temp file leaks even on failures.

## 2026-02-07 (Task 06)
- A pipeline-level in-memory run registry (`runId` + progress events) provides a low-overhead way for UI polling without introducing a queue system.
- Allowing clients to optionally pass their own `runId` on `POST /api/generate-video` enables progress polling in parallel with the long-running generation request.
- Converting stitched data URLs into temporary binary assets and serving them via `GET /api/generate-video?videoId=...` keeps playback efficient while staying within the no-persistence MVP scope.

## 2026-02-07 (Task 08)
- Vertical `snap-y` containers combined with `IntersectionObserver` are enough to detect the active slide and drive play/pause behavior for a swipe-style feed.
- Keeping playback/generation state keyed by meeting id makes it straightforward to preserve per-meeting controls while users scroll between videos.
- Reusing the existing `POST /api/generate-video` pipeline endpoint from feed controls avoids duplicating orchestration logic in the UI layer.

## 2026-02-07 (Task 09)
- The existing `runId` support in `POST /api/generate-video` plus `GET /api/generate-video?runId=...` enables UI progress updates without introducing websockets or queue workers.
- Pipeline events do not emit per-clip counts while clips are rendering, so the feed can derive a user-friendly `Creating clips x/y` label from known chunk totals and elapsed time.
- Keeping progress UI in dedicated `GeneratingState`, `ProgressIndicator`, and `ErrorState` components makes VideoFeed logic easier to maintain while preserving task scope.

## 2026-02-07 (Task 10)
- `h-[100dvh]` (dynamic viewport units) provides a more stable full-height feed on mobile browsers compared to `h-screen` alone.
- Safe-area inset CSS variables (`--safe-top`, `--safe-bottom`, etc.) combined with Tailwind `calc(...)` arbitrary values keep overlays readable on notched devices.
- A couple of global utilities (`.scrollbar-hidden`, `.ios-scroll`) are enough to make the snap feed feel more native without adding a Tailwind plugin.
