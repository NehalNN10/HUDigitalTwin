import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: 'https://pretended-surgery-likely.ngrok-free.dev/api/:path*', // Proxies all API calls to Flask
      },
    ];
  },
};

export default nextConfig;