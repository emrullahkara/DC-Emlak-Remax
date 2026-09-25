import type { Metadata } from "next";

export const metadata: Metadata = { title: "Belge · DC Emlak" };

export default function BelgeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
