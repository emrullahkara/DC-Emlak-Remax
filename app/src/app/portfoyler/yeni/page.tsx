import type { Metadata } from "next";
import { PortfolioForm } from "@/components/portfoy/PortfolioForm";

export const metadata: Metadata = { title: "Yeni portföy · DC Emlak" };

export default function YeniPortfoyPage() {
  return <PortfolioForm />;
}
