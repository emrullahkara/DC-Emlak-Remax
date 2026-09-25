"use client";

import type { DataStore } from "@/data/store";
import type { Portfolio } from "@/data/types";
import { healthInput } from "@/domain/portfoy";
import { portfolioHealth } from "@/domain/scoring";

/**
 * Sağlık skorunu medya ve teklif verisiyle hesaplayıp `portfolio.saglik_skoru`
 * alanına yazar (diğer modüller bu alanı okur). Değer değişmediyse yazmaz.
 * Yetki (RLS) nedeniyle yazılamazsa sessizce geçer.
 */
export async function refreshHealth(store: DataStore, p: Portfolio, bugun = new Date()): Promise<number> {
  const [media, offers] = await Promise.all([store.list("media", { eq: { portfolio_id: p.id } }), store.list("offer", { eq: { portfolio_id: p.id } })]);
  const puan = portfolioHealth(healthInput(p, { media, offers }, bugun)).puan;
  if (p.saglik_skoru !== puan) {
    try {
      await store.update("portfolio", p.id, { saglik_skoru: puan });
    } catch {
      // Paylaşımlı portföyde yazma yetkisi olmayabilir
    }
  }
  return puan;
}
