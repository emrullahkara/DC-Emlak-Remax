import type { Metadata } from "next";
import { PortfolioForm } from "@/components/portfoy/PortfolioForm";

export const metadata: Metadata = { title: "Portföyü düzenle · DC Emlak" };

export default async function PortfoyDuzenlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PortfolioForm id={id} />;
}
