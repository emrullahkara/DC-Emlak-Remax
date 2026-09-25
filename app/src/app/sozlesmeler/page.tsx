import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { ContractsPage } from "@/components/sozlesme/ContractsPage";

export const metadata: Metadata = { title: "Sözleşmeler · DC Emlak" };

export default function SozlesmelerPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ContractsPage />
    </Suspense>
  );
}
