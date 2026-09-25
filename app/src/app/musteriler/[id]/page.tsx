import type { Metadata } from "next";
import { PersonDetail } from "@/components/crm/PersonDetail";

export const metadata: Metadata = { title: "Müşteri · DC Emlak" };

export default async function MusteriPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PersonDetail id={decodeURIComponent(id)} />;
}
