/**
 * Belge ve imza işlemleri (veri deposu üzerinden). Hem Sözleşmeler hem Takvim
 * modülü kullanır; kurallar `@/domain/templates` ve `@/domain/signing` içindedir.
 */
import { recordEvaluation } from "@/data/compliance-log";
import type { DataStore } from "@/data/store";
import type { DocumentRow, DocumentStatus, Signature } from "@/data/types";
import type { Evaluation } from "@/domain/compliance";
import { paramsFor } from "@/domain/params";
import { authorizationFromValues, generateToken } from "@/domain/signing";
import { type Template } from "@/domain/templates";

export const DOC_STATUS: Record<DocumentStatus, { label: string; tone: "neutral" | "warn" | "ok" | "block" }> = {
  taslak: { label: "Taslak", tone: "neutral" },
  imzada: { label: "İmza bekliyor", tone: "warn" },
  imzalandi: { label: "İmzalandı", tone: "ok" },
  iptal: { label: "İptal", tone: "block" },
};

export const YONTEM_LABEL: Record<Signature["yontem"], string> = {
  link: "Uzaktan bağlantı",
  islak: "Islak imza",
  otp: "SMS-OTP",
  e_imza: "Nitelikli e-imza",
};

/**
 * Şablondan üretilmeyen, diğer modüllerin kaydettiği belge türleri
 * (ör. Portföy modülünün DASK poliçesi kaydı). Salt okunur gösterilir, imzaya gönderilmez.
 */
export const RECORD_DOC_LABELS: Record<string, string> = {
  "dask-policesi": "DASK poliçesi",
};

export function docTitle(sablon: string, templateTitle?: string): string {
  return templateTitle ?? RECORD_DOC_LABELS[sablon] ?? sablon;
}

export interface Ctx {
  officeId: string;
  userId: string;
}

/** Yönetmelik gereği belgeler en az 10 yıl saklanır (tasarım §6.1 — süre teyit edilmeli). */
export function retentionDate(now = new Date(), years = 10): string {
  const d = new Date(now);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

export async function createDocument(
  store: DataStore,
  ctx: Ctx,
  t: Template,
  alanlar: Record<string, string>,
  portfolioId: string | null,
): Promise<DocumentRow> {
  return store.insert("document", {
    office_id: ctx.officeId,
    sablon: t.kod,
    sablon_surum: t.surum,
    kural_surum: paramsFor().surum,
    portfolio_id: portfolioId,
    alanlar,
    durum: "taslak",
    saklama_bitis: retentionDate(),
    imza_token: null,
    created_by: ctx.userId,
  });
}

/** Kararı denetim kaydına yazar (imza olayları kritik: GEC de kaydedilir). */
export async function logSignEvaluation(store: DataStore, ctx: Ctx, doc: DocumentRow, ev: Evaluation, olay: string, gerekce?: string) {
  try {
    await recordEvaluation(store, ctx, olay, "document", doc.id, ev, gerekce);
  } catch {
    // Denetim kaydı yazılamazsa işlem yine de kullanıcıya bildirilir (çağıran ele alır)
  }
}

/** Belgeyi imzaya açar: yeni tek kullanımlık belirteç, durum 'imzada'. */
export async function openForSigning(store: DataStore, doc: DocumentRow): Promise<DocumentRow> {
  return store.update("document", doc.id, { durum: "imzada", imza_token: generateToken() });
}

/** İmzayı geri çeker (bağlantı geçersiz olur), belge yeniden düzenlenebilir. */
export async function withdrawSigning(store: DataStore, doc: DocumentRow): Promise<DocumentRow> {
  return store.update("document", doc.id, { durum: "taslak", imza_token: null });
}

/** Islak imza kaydı: ofiste kâğıt üzerinde imzalanan belge. */
export async function recordWetSignature(
  store: DataStore,
  ctx: Ctx,
  doc: DocumentRow,
  input: { adSoyad: string; tarih: string; not?: string },
): Promise<void> {
  const personId = doc.alanlar?._kisi_id || null;
  await store.insert("signature", {
    document_id: doc.id,
    person_id: personId,
    yontem: "islak",
    imzalandi_at: new Date(input.tarih).toISOString(),
    kanit: { ad_soyad: input.adSoyad.trim(), kaydeden: ctx.userId, not: input.not?.trim() || null, kayit_zamani: new Date().toISOString() },
  });
  const updated = await store.update("document", doc.id, {
    durum: "imzalandi",
    imza_token: null,
    alanlar: { ...doc.alanlar, imza_yontemi: doc.alanlar?.imza_yontemi || "Islak imza" },
  });
  await syncAuthorizationContract(store, updated);
}

/**
 * İmzalanan yetki sözleşmesi portföye bağlıysa `authorization_contract` kaydını
 * oluşturur/günceller (idempotent). İlan yayını kuralı bu kayda bakar.
 */
export async function syncAuthorizationContract(store: DataStore, doc: DocumentRow): Promise<boolean> {
  if (doc.sablon !== "yetki-sozlesmesi" || doc.durum !== "imzalandi" || !doc.portfolio_id) return false;
  const rows = await store.list("authorization_contract", { eq: { portfolio_id: doc.portfolio_id } });
  const mine = rows.find((r) => r.document_id === doc.id);
  if (mine?.imza_tarihi) return false;
  const sigs = await store.list("signature", { eq: { document_id: doc.id } });
  const signedAt = sigs.map((s) => s.imzalandi_at).filter(Boolean).sort().pop() ?? new Date().toISOString();
  const a = authorizationFromValues(doc.alanlar ?? {}, signedAt.slice(0, 10));
  const patch = {
    document_id: doc.id,
    munhasir: a.munhasir,
    hizmet_bedeli_orani: a.hizmet_bedeli_orani,
    baslangic: a.baslangic,
    bitis: a.bitis,
    imza_tarihi: a.imza_tarihi,
  };
  const pending = mine ?? rows.find((r) => !r.imza_tarihi && !r.document_id);
  if (pending) await store.update("authorization_contract", pending.id, patch);
  else await store.insert("authorization_contract", { portfolio_id: doc.portfolio_id, ...patch });
  return true;
}
