import type { Metadata } from "next";
import { ContractsPage } from "@/components/sozlesme/ContractsPage";

export const metadata: Metadata = { title: "Sözleşmeler · DC Emlak" };

export default function SozlesmelerPage() {
  return <ContractsPage />;
}
