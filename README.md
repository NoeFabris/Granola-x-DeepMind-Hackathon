# Meeting Recap Feed (Granola x DeepMind Hackathon)

Next.js app that connects to Granola via the official MCP server, generates a short recap script with Gemini, renders TikTok-style Veo clips, and stitches them into a single vertical video.

## Local Development

1. Install deps: `npm install`
2. Create `.env.local` from `.env.local.example`
3. Run: `npm run dev`

## Vercel Deployment

- Add the environment variables from `.env.local.example` in the Vercel dashboard.
- Granola OAuth callback URL (production): `https://YOUR_DOMAIN/api/auth/granola`
- Function duration limits: `vercel.json` sets `maxDuration` for the long-running routes. If Veo generation regularly exceeds the limit, you will need a higher plan limit and/or an external job runner.
- FFmpeg: the app uses `ffmpeg-static`/`ffprobe-static`. `next.config.js` includes output file tracing config so the binaries are bundled into Vercel serverless output.

## Notes

- Granola OAuth session state and generated video playback assets are stored in-memory (serverless cold starts will clear them). For production durability, move these to a persistent store.
