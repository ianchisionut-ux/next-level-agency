import type { NextConfig } from "next";
import publicFont from "./docs/fonts/nextlevel-inter-latin.json";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [{ source: "/web-projects/elmont.jfif", destination: "/web-projects/elmont.webp", permanent: true }];
  },
  async headers() {
    const privatePaths = ["/dashboard/:path*", "/api/:path*", "/login", "/signup", "/forgot-password", "/reset-password/:path*", "/invite/:path*", "/campaigns/share/:path*", "/offline"];
    return [
      { source: publicFont.asset, headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      ...privatePaths.map(source => ({ source, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] })),
      // Public deployment aliases must not compete with the canonical domain.
      // Host matching leaves www.nextlevel-agency.ro indexable.
      {
        source: "/:path*",
        has: [{ type: "host" as const, value: ".*\\.vercel\\.app" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },
  outputFileTracingRoot: process.cwd(),
  outputFileTracingIncludes: { "/*": ["./prisma/accounting-safety-v13.sql", "./prisma/email-mailbox.sql", "./prisma/mailbox-archive.sql"], "/": ["./app/home-motion.css"] },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
