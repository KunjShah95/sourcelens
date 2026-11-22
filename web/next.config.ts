import type { NextConfig } from "next";

/**
 * The Next.js app is the browser-facing frontend. The zero-dependency Node
 * server in the project root remains the API + tracker host. Everything under
 * /api and the tracker assets are proxied same-origin, so the httpOnly auth
 * cookies written by the Node server travel with every request.
 *
 * Local dev:  API_ORIGIN=http://127.0.0.1:3001
 * Production: API_ORIGIN=https://your-api-host
 */
const API_ORIGIN = process.env.API_ORIGIN || "http://127.0.0.1:3001";

const nextConfig: NextConfig = {
  cacheComponents: false,
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` },
      { source: "/t.js", destination: `${API_ORIGIN}/t.js` },
      { source: "/tracker.js", destination: `${API_ORIGIN}/tracker.js` },
      { source: "/embed", destination: `${API_ORIGIN}/embed` },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
