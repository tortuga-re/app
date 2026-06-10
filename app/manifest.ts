import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.appName,
    short_name: "Tortuga",
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: siteConfig.accent,
    orientation: "portrait",
    lang: "it-IT",
    icons: [
      {
        src: siteConfig.logoUrl,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: siteConfig.logoUrl,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: siteConfig.logoUrl,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: siteConfig.logoUrl,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
