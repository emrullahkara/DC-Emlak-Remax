import { friendlyDbError } from "@/data/store";
/**
 * Ofis kurulum formu doğrulaması (saf fonksiyonlar). Hem kurulumda hem
 * Ayarlar → Ofis sekmesinde kullanılır.
 */
import type { PlanId } from "@/lib/plans";

export interface OfficeForm {
  unvan: string;
  vergi_no: string;
  mersis_no: string;
  yetki_belgesi_no: string;
  yetki_belgesi_gecerlilik: string; // yyyy-mm-dd ya da boş
  ad_soyad: string;
  telefon: string;
  plan: PlanId;
}

export type FormErrors<T> = Partial<Record<keyof T, string>>;

const digits = (s: string) => s.replace(/\D/g, "");

/** VKN (10 hane) resmi kontrol hanesi algoritması */
export function isValidVkn(v: string): boolean {
  if (!/^\d{10}$/.test(v)) return false;
  const d = v.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const t = (d[i] + 9 - i) % 10;
    let r = (t * 2 ** (9 - i)) % 9;
    if (t !== 0 && r === 0) r = 9;
    sum += r;
  }
  return (10 - (sum % 10)) % 10 === d[9];
}

/** TCKN (11 hane) kontrolü — şahıs işletmelerinde vergi no olarak kullanılır */
export function isValidTckn(v: string): boolean {
  if (!/^[1-9]\d{10}$/.test(v)) return false;
  const d = v.split("").map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  if ((((odd * 7 - even) % 10) + 10) % 10 !== d[9]) return false;
  return d.slice(0, 10).reduce((a, b) => a + b, 0) % 10 === d[10];
}

/** Türkiye telefon numarası: 10 hane (5xx…) ya da başında 0 / 90 */
export function normalizeTrMobile(s: string): string | null {
  let d = digits(s);
  if (d.startsWith("90") && d.length === 12) d = d.slice(2);
  if (d.startsWith("0") && d.length === 11) d = d.slice(1);
  return d.length === 10 ? d : null;
}

export function validateOffice(f: Partial<OfficeForm>, opts: { requireOwner?: boolean; today?: Date } = {}): FormErrors<OfficeForm> {
  const e: FormErrors<OfficeForm> = {};
  if (!f.unvan?.trim()) e.unvan = "Ofis unvanı zorunludur.";
  else if (f.unvan.trim().length < 3) e.unvan = "Unvan en az 3 karakter olmalı.";

  const vn = digits(f.vergi_no ?? "");
  if (vn && !(vn.length === 10 ? isValidVkn(vn) : vn.length === 11 ? isValidTckn(vn) : false)) {
    e.vergi_no = "Vergi kimlik no 10 haneli (şirket) ya da 11 haneli TCKN (şahıs) olmalı.";
  }
  const mersis = digits(f.mersis_no ?? "");
  if (mersis && mersis.length !== 16) e.mersis_no = "MERSİS numarası 16 hanelidir.";

  if (f.yetki_belgesi_gecerlilik) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.yetki_belgesi_gecerlilik) || Number.isNaN(Date.parse(f.yetki_belgesi_gecerlilik))) {
      e.yetki_belgesi_gecerlilik = "Geçerli bir tarih girin.";
    }
  }
  if (f.yetki_belgesi_gecerlilik && !f.yetki_belgesi_no?.trim()) e.yetki_belgesi_no = "Geçerlilik tarihi girildiyse belge numarası da girilmeli.";

  if (opts.requireOwner) {
    if (!f.ad_soyad?.trim() || f.ad_soyad.trim().split(/\s+/).length < 2) e.ad_soyad = "Adınızı ve soyadınızı yazın.";
    if (f.telefon?.trim() && !normalizeTrMobile(f.telefon)) e.telefon = "Telefonu 05xx xxx xx xx biçiminde girin.";
  }
  return e;
}

/** Yetki belgesi uyarısı: yoksa/geçmişse ilan yayını engellenir */
export function yetkiBelgesiDurumu(gecerlilik: string | null | undefined, today = new Date()): { ton: "ok" | "warn" | "block"; metin: string } {
  if (!gecerlilik) return { ton: "block", metin: "Girilmedi — ilan yayını engellenir" };
  const [y, m, d] = gecerlilik.split("-").map(Number);
  const gun = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86_400_000);
  if (gun < 0) return { ton: "block", metin: "Süresi dolmuş — ilan yayını engellenir" };
  if (gun <= 30) return { ton: "warn", metin: `${gun} gün içinde bitiyor` };
  return { ton: "ok", metin: "Geçerli" };
}

/** Davet kodu: boşluk/tire temizlenir, büyük harfe çevrilir */
export function normalizeInviteCode(s: string): string {
  return s.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/** Supabase/PostgREST hata mesajını kullanıcıya uygun hale getirir */
export function rpcErrorMessage(e: unknown): string {
  const m = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e);
  if (/could not find the function|schema cache/i.test(m)) return "Veritabanı kurulumu eksik: 0002_onboarding.sql migration'ı çalıştırılmamış olabilir.";
  if (/fetch|network/i.test(m)) return "Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.";
  const code = e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : undefined;
  return friendlyDbError({ code, message: m }).message;
}
