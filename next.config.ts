import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    const privatePaths = ["/dashboard/:path*", "/api/:path*", "/login", "/signup", "/forgot-password", "/reset-password/:path*", "/invite/:path*", "/campaigns/share/:path*", "/offline"];
    return privatePaths.map(source => ({ source, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] }));
  },
  outputFileTracingRoot: process.cwd(),
  outputFileTracingIncludes: { "/*": ["./prisma/accounting-safety-v13.sql"] },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
