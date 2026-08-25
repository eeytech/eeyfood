import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["react-leaflet", "leaflet"],
  images: {
    remotePatterns: [{ hostname: "u9a6wmr3as.ufs.sh" }],
  },
  serverExternalPackages: ["@fsw/db", "drizzle-orm", "pg", "sharp", "mercadopago", "openai"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;
