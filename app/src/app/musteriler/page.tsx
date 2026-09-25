import type { Metadata } from "next";
import { PersonList } from "@/components/crm/PersonList";

export const metadata: Metadata = { title: "Müşteriler · DC Emlak" };

export default function MusterilerPage() {
  return <PersonList />;
}
