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
        src: "/dine_in.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
