import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { NewDocumentPage } from "@/components/sozlesme/NewDocumentPage";

export const metadata: Metadata = { title: "Yeni belge · DC Emlak" };

export default function YeniBelgePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <NewDocumentPage />
    </Suspense>
  );
}
