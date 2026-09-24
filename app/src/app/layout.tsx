import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { AppNav } from "@/components/AppNav";
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
        <div className="flex min-h-dvh">
          <AppNav />
          <main className="min-w-0 flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-8">{children}</main>
        </div>
        <Script id="sw" strategy="afterInteractive">
          {`if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("/sw.js");`}
        </Script>
      </body>
    </html>
  );
}
