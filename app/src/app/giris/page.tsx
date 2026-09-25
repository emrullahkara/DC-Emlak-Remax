import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { GirisForm } from "./GirisForm";

export const metadata: Metadata = { title: "Giriş · DC Emlak" };

export default function GirisPage() {
  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="h-10 w-10" />
        <div>
          <h1 className="text-2xl font-semibold">DC Emlak</h1>
          <p className="text-sm text-muted">Portföy, müşteri ve işlemler tek ekranda</p>
        </div>
      </div>
      <Suspense fallback={<Spinner />}>
        <GirisForm />
      </Suspense>
      <p className="text-center text-xs text-muted">
        Giriş yaparak kişisel verilerinizin hizmetin sunulması amacıyla işlenmesine ilişkin aydınlatma metnini okuduğunuzu kabul edersiniz.
      </p>
    </div>
  );
}
