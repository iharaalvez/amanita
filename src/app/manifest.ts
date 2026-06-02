import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Amanita",
    short_name: "Amanita",
    description: "Your Living Dex, organized.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0f18",
    theme_color: "#0d0f18",
    icons: [
      {
        src: "/brand/48x48.png",
        sizes: "48x48",
        type: "image/png",
      },
      {
        src: "/brand/180x180.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/brand/256x256.png",
        sizes: "256x256",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
