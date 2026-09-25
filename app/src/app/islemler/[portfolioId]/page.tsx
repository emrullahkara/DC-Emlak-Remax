import type { Metadata } from "next";
import { Suspense } from "react";
import { DealWorkspace } from "@/components/islemler/DealWorkspace";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = { title: "İşlem alanı · DC Emlak" };

export default function IslemAlaniPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <DealWorkspace />
    </Suspense>
  );
}
