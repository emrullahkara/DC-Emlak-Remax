import type { Metadata } from "next";
import { FsboRadar } from "@/components/fsbo/FsboRadar";

export const metadata: Metadata = { title: "FSBO Radar · DC Emlak" };

export default function FsboPage() {
  return <FsboRadar />;
}
