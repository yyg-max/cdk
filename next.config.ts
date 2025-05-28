import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        hostname: "linux.do",
      },
    ],
  },
};

export default nextConfig;
