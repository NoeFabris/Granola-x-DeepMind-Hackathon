/** @type {import('next').NextConfig} */
const isVercelDeployment = process.env.VERCEL === "1" || process.env.VERCEL === "true";

const nextConfig = {
  experimental: isVercelDeployment
    ? {}
    : {
        outputFileTracingIncludes: {
          "/api/generate-video": [
            "./node_modules/ffmpeg-static/**",
            "./node_modules/ffprobe-static/**",
          ],
          "/api/stitch-video": [
            "./node_modules/ffmpeg-static/**",
            "./node_modules/ffprobe-static/**",
          ],
        },
      },
};

module.exports = nextConfig;
