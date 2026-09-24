import type { Metadata } from "next";
import { Calculators } from "./Calculators";

export const metadata: Metadata = { title: "Hesaplayıcılar · DC Emlak" };

export default function HesaplayicilarPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl font-semibold">Hesaplayıcılar</h1>
      <p className="text-sm text-muted">Hizmet bedeli, alıcı toplam maliyeti, satıcı net tutarı ve kira artışı — yasal tavan kontrolüyle.</p>
      <Calculators />
    </div>
  );
}
