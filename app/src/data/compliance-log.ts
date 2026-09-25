import type { Evaluation } from "@/domain/compliance";
import type { DataStore } from "./store";

/**
 * Uyum motoru kararını denetim kaydına yazar (değişmez tablo).
 * ENGELLE ve UYAR her zaman, GEC yalnızca kritik olaylarda kaydedilir.
 */
export async function recordEvaluation(
  store: DataStore,
  ctx: { officeId: string; userId: string },
  olay: string,
  varlik: string,
  varlikId: string | null,
  ev: Evaluation,
  gerekce?: string,
) {
  await store.insert("compliance_log", {
    office_id: ctx.officeId,
    user_id: ctx.userId,
    olay,
    varlik,
    varlik_id: varlikId,
    karar: ev.karar,
    sonuclar: ev.sonuclar,
    kural_surum: ev.paramSurum,
    gerekce: gerekce ?? null,
  });
}
