import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { Kurulum } from "./Kurulum";

export const metadata: Metadata = { title: "Ofis kurulumu · DC Emlak" };

export default function KurulumPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="h-10 w-10" />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Ofis kurulumu</h1>
          <p className="text-sm text-muted">DC Emlak&apos;e hoş geldiniz — birkaç dakikada ofisinizi hazırlayalım.</p>
        </div>
      </div>
      <Suspense fallback={<Spinner />}>
        <Kurulum />
      </Suspense>
    </div>
  );
}
