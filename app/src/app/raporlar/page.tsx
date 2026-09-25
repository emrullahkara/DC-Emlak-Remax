import type { Metadata } from "next";
import { ReportsPage } from "@/components/raporlar/ReportsPage";

export const metadata: Metadata = { title: "Raporlar · DC Emlak" };

export default function RaporlarPage() {
  return <ReportsPage />;
}
