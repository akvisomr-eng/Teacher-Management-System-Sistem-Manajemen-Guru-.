import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistem Manajemen Guru | TMS",
  description: "Platform manajemen akademik dan pengembangan guru untuk satuan pendidikan Indonesia.",
  applicationName: "TMS"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
