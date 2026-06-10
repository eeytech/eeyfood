import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@fsw/db"],
  images: {
    remotePatterns: [{ hostname: "u9a6wmr3as.ufs.sh" }],
  },
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
