import type { Metadata } from "next";
import { Pipeline } from "@/components/islemler/Pipeline";

export const metadata: Metadata = { title: "İşlemler · DC Emlak" };

export default function IslemlerPage() {
  return <Pipeline />;
}
