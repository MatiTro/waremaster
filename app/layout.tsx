import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Warehouse Masterpress",
  applicationName: "Warehouse Masterpress",
  description: "Operacyjny system magazynowy Masterpress.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Warehouse",
  },
  icons: {
    icon: "/masterpress-mark.png",
    shortcut: "/masterpress-mark.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#002855",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
