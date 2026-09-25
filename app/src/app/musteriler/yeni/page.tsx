import type { Metadata } from "next";
import { PersonForm } from "@/components/crm/PersonForm";

export const metadata: Metadata = { title: "Yeni müşteri · DC Emlak" };

export default function YeniMusteriPage() {
  return <PersonForm />;
}
