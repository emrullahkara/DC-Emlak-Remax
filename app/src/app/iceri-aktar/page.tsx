import type { Metadata } from "next";
import { ImportWizard } from "@/components/portfoy/ImportWizard";

export const metadata: Metadata = { title: "İçe aktar · DC Emlak" };

export default function IceriAktarPage() {
  return <ImportWizard />;
}
