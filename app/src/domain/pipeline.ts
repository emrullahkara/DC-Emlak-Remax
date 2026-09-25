import {
  evaluateClosing,
  evaluateListingPublish,
  type ClosingContext,
  type Evaluation,
  type ListingContext,
} from "./compliance";
import { paramsFor } from "./params";

export const ASAMALAR = [
  "aday",
  "degerleme",
  "yetki",
  "yayinda",
  "teklif",
  "kapora",
  "tapu",
  "tamamlandi",
] as const;

export type Asama = (typeof ASAMALAR)[number];

export const ASAMA_ETIKET: Record<Asama, string> = {
  aday: "Aday",
  degerleme: "Değerleme",
  yetki: "Yetki Alındı",
  yayinda: "Yayında",
  teklif: "Teklif",
  kapora: "Kapora",
  tapu: "Tapu Randevusu",
  tamamlandi: "Satıldı / Kiralandı",
};

export interface TransitionContext {
  ilan: ListingContext;
  kapanis?: ClosingContext;
}

/**
 * Aşama geçişini uyum motoruna göre değerlendirir. Geri gitmek serbesttir;
 * ileri giderken aradaki her aşamanın kapısı kontrol edilir.
 */
export function canTransition(
  from: Asama,
  to: Asama,
  ctx: TransitionContext,
): Evaluation {
  const gec: Evaluation = { karar: "GEC", sonuclar: [], paramSurum: paramsFor(ctx.ilan.bugun).surum };
  const i = ASAMALAR.indexOf(from);
  const j = ASAMALAR.indexOf(to);
  if (j <= i) return gec;

  const gates: Evaluation[] = [];
  const crosses = (a: Asama) => i < ASAMALAR.indexOf(a) && ASAMALAR.indexOf(a) <= j;
  if (crosses("yayinda")) gates.push(evaluateListingPublish(ctx.ilan));
  if (crosses("tamamlandi")) {
    if (!ctx.kapanis) throw new Error("Kapanış bağlamı olmadan işlem tamamlanamaz");
    gates.push(evaluateClosing(ctx.kapanis));
  }
  if (!gates.length) return gec;

  const sonuclar = gates.flatMap((g) => g.sonuclar);
  const karar = gates.some((g) => g.karar === "ENGELLE")
    ? "ENGELLE"
    : gates.some((g) => g.karar === "UYAR")
      ? "UYAR"
      : "GEC";
  return { karar, sonuclar, paramSurum: gates[0].paramSurum };
}
