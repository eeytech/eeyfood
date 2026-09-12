import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "eeyFood - Cardápio Digital",
    short_name: "eeyFood",
    description: "Experiência digital para pedidos!",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ef4444",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/dine_in.png",
        sizes: "79x80",
        type: "image/png",
      },
    ],
  };
}
