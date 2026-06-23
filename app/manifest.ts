import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "My Updated PWA",
    short_name: "NewPWA",
    description: "A Progressive Web App powered by Next.js and Serwist",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/icon-192x192.png?v=2",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png?v=2",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
