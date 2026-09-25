import type { Metadata } from "next";
import { PortfolioList } from "@/components/portfoy/PortfolioList";

export const metadata: Metadata = { title: "Portföyler · DC Emlak" };

export default function PortfoylerPage() {
  return <PortfolioList />;
}
