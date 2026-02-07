/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
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
