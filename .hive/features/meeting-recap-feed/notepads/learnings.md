## 2026-02-07
- Bootstrapped a Next.js 14 App Router project with TypeScript and Tailwind CSS.
- Added `@modelcontextprotocol/sdk` as the only non-framework runtime dependency.
- Added a lightweight Node test that validates required setup files and placeholder content.

## 2026-02-07 (Task 02)
- `StreamableHTTPClientTransport` raises `UnauthorizedError` when OAuth is needed; the auth URL is captured through `OAuthClientProvider.redirectToAuthorization`.
- A per-session in-memory OAuth provider can reuse SDK-managed dynamic client registration plus PKCE without implementing custom token exchange logic.
- `client.callTool()` can return heterogeneous result shapes, so tool payload parsing must guard for unknown payload types.
