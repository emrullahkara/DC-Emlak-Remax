import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "DC Emlak",
  description: "Emlak danışmanları için tek ekrandan portföy, müşteri ve işlem yönetimi",
  appleWebApp: { capable: true, title: "DC Emlak", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0f3d7a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AppShell>{children}</AppShell>
        <Script id="sw" strategy="afterInteractive">
          {`if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("/sw.js");`}
        </Script>
      </body>
    </html>
  );
}
