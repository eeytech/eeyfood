import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@fsw/db", "react-leaflet", "leaflet"],
  images: {
    remotePatterns: [
      { hostname: "u9a6wmr3as.ufs.sh" },
      { hostname: "images.unsplash.com" },
    ],
  },
  serverExternalPackages: ["sharp", "pg"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
      };
    }
    return config;
  },
};

export default nextConfig;
