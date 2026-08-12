import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ContriTrack Platform",
    short_name: "ContriTrack",
    description: "Academic Collaboration & Contribution Analytics Workspace",
    start_url: "/",
    display: "standalone",
    background_color: "#12131e",
    theme_color: "#1b1c2b",
    icons: [
      {
        src: "/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  };
}
