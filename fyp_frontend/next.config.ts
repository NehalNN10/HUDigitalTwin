import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:1767/api/:path*", // Proxies all API calls to Flask
      },
    ];
  },
};

export default nextConfig;