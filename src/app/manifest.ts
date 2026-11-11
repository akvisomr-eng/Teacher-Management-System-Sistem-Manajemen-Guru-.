import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Sistem Manajemen Guru",
    short_name: "TMS Guru",
    description: "Ruang kerja guru untuk mengelola perangkat pembelajaran, jurnal, refleksi, dan sinkronisasi tugas.",
    lang: "id-ID",
    start_url: "/teacher",
    scope: "/",
    display: "standalone",
    background_color: "#f7f8fc",
    theme_color: "#6254d9",
    orientation: "any",
    categories: ["education", "productivity"]
  };
}
