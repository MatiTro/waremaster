import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Warehouse Masterpress",
  description: "Centrum operacyjne magazynu Masterpress.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/masterpress-mark.png",
    shortcut: "/masterpress-mark.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
