/**
 * Portföy formu: metin girdilerini doğrulayıp veritabanı yamasına çevirir.
 * Sayılar Türkçe biçimde girilebilir ("12.500.000", "12,5").
 */
import { z } from "zod";
import type { ListingType, Portfolio } from "../data/types";
import { parseNumberTR } from "./import";

export interface PortfolioFormValues {
  ilan_tipi: ListingType;
  emlak_tipi: string;
  baslik: string;
  aciklama: string;
  fiyat: string;
  brut_m2: string;
  net_m2: string;
  oda: string;
  salon: string;
  kat: string;
  toplam_kat: string;
  bina_yasi: string;
  isinma: string;
  aidat: string;
  il: string;
  ilce: string;
  mahalle: string;
  adres: string;
  lat: string;
  lng: string;
  ada: string;
  parsel: string;
  bagimsiz_bolum: string;
  tapu_turu: string;
  iskan_var: "" | "evet" | "hayir";
  krediye_uygun: "" | "evet" | "hayir";
  ipotek: boolean;
  haciz: boolean;
  serh: string;
  sorgu_tarihi: string;
  imar_durum: string;
  taks: string;
  kaks: string;
  ozellikler: string[];
  paylasim_seviyesi: Portfolio["paylasim_seviyesi"];
}

export const EMPTY_FORM: PortfolioFormValues = {
  ilan_tipi: "satilik",
  emlak_tipi: "daire",
  baslik: "",
  aciklama: "",
  fiyat: "",
  brut_m2: "",
  net_m2: "",
  oda: "",
  salon: "1",
  kat: "",
  toplam_kat: "",
  bina_yasi: "",
  isinma: "",
  aidat: "",
  il: "İstanbul",
  ilce: "",
  mahalle: "",
  adres: "",
  lat: "",
  lng: "",
  ada: "",
  parsel: "",
  bagimsiz_bolum: "",
  tapu_turu: "",
  iskan_var: "",
  krediye_uygun: "",
  ipotek: false,
  haciz: false,
  serh: "",
  sorgu_tarihi: "",
  imar_durum: "",
  taks: "",
  kaks: "",
  ozellikler: [],
  paylasim_seviyesi: "ofis",
};

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const tri = (v: boolean | null | undefined): "" | "evet" | "hayir" => (v === true ? "evet" : v === false ? "hayir" : "");

export function formFromPortfolio(p: Portfolio): PortfolioFormValues {
  return {
    ilan_tipi: p.ilan_tipi,
    emlak_tipi: p.emlak_tipi,
    baslik: s(p.baslik),
    aciklama: s(p.aciklama),
    fiyat: p.fiyat != null ? p.fiyat.toLocaleString("tr-TR") : "",
    brut_m2: s(p.brut_m2),
    net_m2: s(p.net_m2),
    oda: p.oda != null ? p.oda.toLocaleString("tr-TR") : "",
    salon: s(p.salon),
    kat: s(p.kat),
    toplam_kat: s(p.toplam_kat),
    bina_yasi: s(p.bina_yasi),
    isinma: s(p.isinma),
    aidat: p.aidat != null ? p.aidat.toLocaleString("tr-TR") : "",
    il: s(p.il),
    ilce: s(p.ilce),
    mahalle: s(p.mahalle),
    adres: s(p.adres),
    lat: p.konum ? String(p.konum.lat) : "",
    lng: p.konum ? String(p.konum.lng) : "",
    ada: s(p.ada),
    parsel: s(p.parsel),
    bagimsiz_bolum: s(p.bagimsiz_bolum),
    tapu_turu: s(p.tapu_turu),
    iskan_var: tri(p.iskan_var),
    krediye_uygun: tri(p.krediye_uygun),
    ipotek: Boolean(p.takyidat?.ipotek),
    haciz: Boolean(p.takyidat?.haciz),
    serh: s(p.takyidat?.serh),
    sorgu_tarihi: s(p.takyidat?.sorgu_tarihi),
    imar_durum: s(p.imar?.durum),
    taks: p.imar?.taks != null ? String(p.imar.taks).replace(".", ",") : "",
    kaks: p.imar?.kaks != null ? String(p.imar.kaks).replace(".", ",") : "",
    ozellikler: [...(p.ozellikler ?? [])],
    paylasim_seviyesi: p.paylasim_seviyesi,
  };
}

type NumOpts = { min?: number; max?: number; int?: boolean; label: string };

/** Boş → null; geçersiz → zod hatası */
const numField = ({ min, max, int, label }: NumOpts) =>
  z.string().transform((v, ctx) => {
    const t = v.trim();
    if (!t) return null;
    // Form alanlarında "12.5" gibi girişler ondalık kabul edilir (binlik yalnızca 3 hane ile)
    const n = parseNumberTR(t);
    if (n === null) {
      ctx.addIssue({ code: "custom", message: `${label} sayı olmalı` });
      return z.NEVER;
    }
    if (int && !Number.isInteger(n)) {
      ctx.addIssue({ code: "custom", message: `${label} tam sayı olmalı` });
      return z.NEVER;
    }
    if (min !== undefined && n < min) {
      ctx.addIssue({ code: "custom", message: `${label} en az ${min}` });
      return z.NEVER;
    }
    if (max !== undefined && n > max) {
      ctx.addIssue({ code: "custom", message: `${label} en fazla ${max.toLocaleString("tr-TR")}` });
      return z.NEVER;
    }
    return n;
  });

const text = (max = 200) =>
  z
    .string()
    .max(max, `En fazla ${max} karakter`)
    .transform((v) => v.trim() || null);

const isoDate = z
  .string()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Geçersiz tarih")
  .transform((v) => v || undefined);

const triState = z.enum(["", "evet", "hayir"]).transform((v) => (v === "evet" ? true : v === "hayir" ? false : null));

export const portfolioFormSchema = z
  .object({
    ilan_tipi: z.enum(["satilik", "kiralik", "devren"]),
    emlak_tipi: z.string().min(1, "Emlak tipi seçin"),
    baslik: z
      .string()
      .trim()
      .min(5, "Başlık en az 5 karakter olmalı")
      .max(120, "Başlık en fazla 120 karakter"),
    aciklama: text(5000),
    fiyat: numField({ label: "Fiyat", min: 1, max: 1e11 }),
    brut_m2: numField({ label: "Brüt m²", min: 1, max: 1e7 }),
    net_m2: numField({ label: "Net m²", min: 1, max: 1e7 }),
    oda: numField({ label: "Oda", min: 0, max: 50 }),
    salon: numField({ label: "Salon", min: 0, max: 10, int: true }),
    kat: numField({ label: "Kat", min: -5, max: 200, int: true }),
    toplam_kat: numField({ label: "Toplam kat", min: 0, max: 200, int: true }),
    bina_yasi: numField({ label: "Bina yaşı", min: 0, max: 500, int: true }),
    isinma: text(),
    aidat: numField({ label: "Aidat", min: 0, max: 1e7 }),
    il: text(),
    ilce: z.string().trim().min(1, "İlçe zorunlu (eşleştirme için)"),
    mahalle: text(),
    adres: text(500),
    lat: numField({ label: "Enlem", min: 35, max: 43 }),
    lng: numField({ label: "Boylam", min: 25, max: 45 }),
    ada: text(20),
    parsel: text(20),
    bagimsiz_bolum: text(20),
    tapu_turu: text(),
    iskan_var: triState,
    krediye_uygun: triState,
    ipotek: z.boolean(),
    haciz: z.boolean(),
    serh: text(500),
    sorgu_tarihi: isoDate,
    imar_durum: text(),
    taks: numField({ label: "TAKS", min: 0, max: 1 }),
    kaks: numField({ label: "KAKS (emsal)", min: 0, max: 20 }),
    ozellikler: z.array(z.string()),
    paylasim_seviyesi: z.enum(["ozel", "ofis", "ag"]),
  });

/**
 * Alanlar arası kurallar. Zod, alan hatası varken nesne düzeyi kontrolleri
 * çalıştırmadığı için ayrı tutulur; böylece tüm hatalar birlikte gösterilir.
 */
function crossFieldErrors(v: PortfolioFormValues): Record<string, string> {
  const e: Record<string, string> = {};
  const n = (x: string) => (x.trim() ? parseNumberTR(x) : null);
  const brut = n(v.brut_m2);
  const net = n(v.net_m2);
  const kat = n(v.kat);
  const top = n(v.toplam_kat);
  if (brut !== null && net !== null && net > brut) e.net_m2 = "Net m², brüt m²'den büyük olamaz";
  if (kat !== null && top !== null && kat > top) e.kat = "Kat, toplam kattan büyük olamaz";
  if (!v.lat.trim() !== !v.lng.trim()) e[v.lat.trim() ? "lng" : "lat"] = "Enlem ve boylamı birlikte girin";
  if (v.sorgu_tarihi && v.sorgu_tarihi > new Date().toISOString().slice(0, 10)) e.sorgu_tarihi = "Sorgu tarihi gelecekte olamaz";
  return e;
}

export type PortfolioPatch = Omit<
  Portfolio,
  "id" | "office_id" | "owner_id" | "asama" | "para_birimi" | "saglik_skoru" | "eids_durum" | "eids_ref" | "created_at" | "updated_at"
>;

export type ParseResult = { ok: true; data: PortfolioPatch } | { ok: false; errors: Record<string, string> };

export function parsePortfolioForm(values: PortfolioFormValues): ParseResult {
  const r = portfolioFormSchema.safeParse(values);
  const errors: Record<string, string> = {};
  if (!r.success) {
    for (const i of r.error.issues) {
      const k = String(i.path[0] ?? "_");
      errors[k] ??= i.message;
    }
  }
  for (const [k, m] of Object.entries(crossFieldErrors(values))) errors[k] ??= m;
  if (!r.success || Object.keys(errors).length) return { ok: false, errors };
  const v = r.data;
  const takyidat: Portfolio["takyidat"] = { ipotek: v.ipotek, haciz: v.haciz };
  if (v.serh) takyidat.serh = v.serh;
  if (v.sorgu_tarihi) takyidat.sorgu_tarihi = v.sorgu_tarihi;
  const imar: Portfolio["imar"] = {};
  if (v.imar_durum) imar.durum = v.imar_durum;
  if (v.taks !== null) imar.taks = v.taks;
  if (v.kaks !== null) imar.kaks = v.kaks;
  return {
    ok: true,
    data: {
      ilan_tipi: v.ilan_tipi,
      emlak_tipi: v.emlak_tipi,
      baslik: v.baslik,
      aciklama: v.aciklama,
      fiyat: v.fiyat,
      brut_m2: v.brut_m2,
      net_m2: v.net_m2,
      oda: v.oda,
      salon: v.salon,
      kat: v.kat,
      toplam_kat: v.toplam_kat,
      bina_yasi: v.bina_yasi,
      isinma: v.isinma,
      aidat: v.aidat,
      il: v.il,
      ilce: v.ilce,
      mahalle: v.mahalle,
      adres: v.adres,
      konum: v.lat !== null && v.lng !== null ? { lat: v.lat, lng: v.lng } : null,
      ada: v.ada,
      parsel: v.parsel,
      bagimsiz_bolum: v.bagimsiz_bolum,
      tapu_turu: v.tapu_turu,
      iskan_var: v.iskan_var,
      krediye_uygun: v.krediye_uygun,
      takyidat,
      imar,
      ozellikler: [...new Set(v.ozellikler)],
      paylasim_seviyesi: v.paylasim_seviyesi,
    },
  };
}

/** Fiyat değiştiyse geçmişe eklenecek yeni fiyat, değilse null */
export function priceChange(prev: number | null | undefined, next: number | null | undefined): number | null {
  if (next === null || next === undefined) return null;
  return prev === next ? null : next;
}

/** Hisse biçimi: "1/2", "%50", "50" veya boş */
export function validHisse(h: string): boolean {
  const t = h.trim();
  if (!t) return true;
  const frac = t.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) return Number(frac[2]) > 0 && Number(frac[1]) <= Number(frac[2]) && Number(frac[1]) > 0;
  const pct = t.replace(/^%/, "").replace(",", ".");
  return /^\d+(\.\d+)?$/.test(pct) && Number(pct) > 0 && Number(pct) <= 100;
}
