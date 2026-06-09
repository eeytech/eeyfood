import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "eeYfood - Cardápio Digital",
    short_name: "eeYfood",
    description: "Peça sua comida favorita de forma rápida e ganhe cashback!",
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
