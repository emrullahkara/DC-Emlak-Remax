import type { Metadata } from "next";
import { Ayarlar } from "@/components/ayarlar/Ayarlar";

export const metadata: Metadata = { title: "Ayarlar & Paket · DC Emlak" };

export default function AyarlarPage() {
  return <Ayarlar />;
}
