import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { Matching } from "@/components/crm/Matching";

export const metadata: Metadata = { title: "Eşleştirme · DC Emlak" };

export default function EslestirmePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Matching />
    </Suspense>
  );
}
