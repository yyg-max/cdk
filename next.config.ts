import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  },
  images: {
    remotePatterns: [
      {
        hostname: "linux.do",
      },
    ],
  },
};

export default nextConfig;
