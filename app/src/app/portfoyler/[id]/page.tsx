import type { Metadata } from "next";
import { PortfolioDetail } from "@/components/portfoy/PortfolioDetail";

export const metadata: Metadata = { title: "Portföy · DC Emlak" };

export default async function PortfoyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PortfolioDetail id={id} />;
}
