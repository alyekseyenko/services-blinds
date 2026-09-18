import type { MetadataRoute } from "next";
import { APP_NAME, APP_SHORT_NAME, APP_LOGO_PATH } from "@/lib/branding";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: "Field operations PWA for blinds technical services",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#84cc16",
    icons: [
      { src: APP_LOGO_PATH, sizes: "64x64", type: "image/png" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
