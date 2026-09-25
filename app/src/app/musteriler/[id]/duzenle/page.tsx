import type { Metadata } from "next";
import { PersonForm } from "@/components/crm/PersonForm";

export const metadata: Metadata = { title: "Müşteriyi düzenle · DC Emlak" };

export default async function MusteriDuzenlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PersonForm id={decodeURIComponent(id)} />;
}
