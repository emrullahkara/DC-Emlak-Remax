export { formatTL } from "@/domain/money";

const TL0 = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("tr-TR");

/** Kuruşsuz TL (liste ve kartlar için) */
export const tl = (n: number | null | undefined) => (n === null || n === undefined ? "—" : TL0.format(n));
export const num = (n: number | null | undefined) => (n === null || n === undefined ? "—" : NUM.format(n));

/** 12.500.000 → "12,5 M ₺" */
export function shortTL(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} M ₺`;
  return tl(n);
}

export function fmtDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR", opts);
}

export function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function fmtTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

/** Bugüne göre gün farkı (pozitif = gelecekte) */
export function daysFromNow(iso: string | null | undefined, now = new Date()): number | null {
  if (!iso) return null;
  const a = new Date(iso);
  const d0 = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const d1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  return Math.round((d1 - d0) / 86_400_000);
}

export function relDay(iso: string | null | undefined) {
  const d = daysFromNow(iso);
  if (d === null) return "—";
  if (d === 0) return "Bugün";
  if (d === 1) return "Yarın";
  if (d === -1) return "Dün";
  return d > 0 ? `${d} gün sonra` : `${-d} gün önce`;
}

/** Türkçe duyarlı arama normalizasyonu */
export function norm(s: string) {
  return s
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i");
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toLocaleUpperCase("tr"))
    .join("");
}

export function todayISO(now = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export const EMLAK_TIPLERI: Record<string, string> = {
  daire: "Daire",
  villa: "Villa",
  mustakil: "Müstakil ev",
  arsa: "Arsa",
  tarla: "Tarla",
  dukkan: "Dükkân",
  ofis: "Ofis",
  depo: "Depo",
  bina: "Bina",
};

export const OZELLIKLER: Record<string, string> = {
  asansor: "Asansör",
  otopark: "Otopark",
  kapali_otopark: "Kapalı otopark",
  site: "Site içi",
  havuz: "Havuz",
  balkon: "Balkon",
  bahce: "Bahçe",
  deniz_manzarasi: "Deniz manzarası",
  esyali: "Eşyalı",
  esyali_yari: "Yarı eşyalı",
  guvenlik: "Güvenlik",
  metroya_yakin: "Metroya yakın",
};

export const PERSON_TYPES: Record<string, string> = {
  alici: "Alıcı",
  satici: "Satıcı",
  kiraci: "Kiracı",
  kiraya_veren: "Kiraya veren",
  yatirimci: "Yatırımcı",
  yabanci_alici: "Yabancı alıcı",
  referans: "Referans",
};

/** Yalnızca http(s) bağlantılarını döndürür (javascript:, data: vb. reddedilir) */
export function safeHttpUrl(u?: string | null): string | null {
  if (!u) return null;
  try {
    const x = new URL(u);
    return x.protocol === "https:" || x.protocol === "http:" ? x.href : null;
  } catch {
    return null;
  }
}

export const ILAN_TIPLERI: Record<string, string> = { satilik: "Satılık", kiralik: "Kiralık", devren: "Devren" };
