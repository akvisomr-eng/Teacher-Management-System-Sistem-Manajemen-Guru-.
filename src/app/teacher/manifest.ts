import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/teacher",
    name: "TMS Teacher Desk",
    short_name: "Teacher Desk",
    description: "Ruang kerja personal guru yang terintegrasi dengan TMS dan mendukung pekerjaan offline.",
    lang: "id-ID",
    start_url: "/teacher",
    scope: "/teacher",
    display: "standalone",
    background_color: "#f4f6fb",
    theme_color: "#6254d9",
    icons: [
      {
        src: "/teacher-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      }
    ]
  };
}
