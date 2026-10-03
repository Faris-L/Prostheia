import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.PROSTHEIA_NEXT_DIST_DIR ?? ".next",
  outputFileTracingIncludes: {
    "/api/private-training-assets/*": ["src/cad/case-packages/private-v1/runtime/*.glb"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // This restrictive subset does not impose a script/style/connect allowlist.
          // A nonce-based full CSP needs to be validated against the 3D runtime first.
          { key: "Content-Security-Policy", value: "object-src 'none'; base-uri 'self'; frame-ancestors 'none'" },
        ],
      },
    ];
  },
};

export default nextConfig;
