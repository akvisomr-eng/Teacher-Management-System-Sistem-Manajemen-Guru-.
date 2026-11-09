import type { Metadata, Viewport } from "next";
export const metadata: Metadata = {
  title: "TMS Teacher Desk",
  description: "Ruang kerja personal guru, terintegrasi dengan TMS dan mendukung pekerjaan offline.",
  manifest: "/teacher/manifest.webmanifest"
};
export const viewport: Viewport = { themeColor: "#6254d9", width: "device-width", initialScale: 1 };
export default function TeacherLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children; }
