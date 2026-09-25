import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Belge onayı · DC Emlak",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ImzaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
