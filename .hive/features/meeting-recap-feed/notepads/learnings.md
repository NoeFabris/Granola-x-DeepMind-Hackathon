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
