/**
 * İçe aktarma (Excel / CSV) — saf ayrıştırma, sütun eşleme ve doğrulama.
 *
 * Akış: dosya → tablo (string[][]) → başlık satırı → sütun eşleme (otomatik
 * tahmin + kullanıcı düzeltmesi) → satır doğrulama → geçerli satırları yaz.
 */
import type { ListingType, PersonType, Portfolio, Person } from "../data/types";

/** Türkçe duyarsız karşılaştırma (lib/format `norm` ile aynı; domain bağımsız kalsın diye burada) */
export function norm(s: string) {
  return s
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");
}

/** lib/format EMLAK_TIPLERI ile aynı anahtarlar */
const EMLAK_TIPLERI: Record<string, string> = {
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

const PERSON_TYPES: Record<PersonType, string> = {
  alici: "Alıcı",
  satici: "Satıcı",
  kiraci: "Kiracı",
  kiraya_veren: "Kiraya veren",
  yatirimci: "Yatırımcı",
  yabanci_alici: "Yabancı alıcı",
  referans: "Referans",
};

export type Cell = string | number | boolean | Date | null | undefined;
export type ImportKind = "portfoy" | "kisi";

// ---- CSV ---------------------------------------------------------------------

/** İlk satırdaki (tırnak dışı) ayraç sayısına göre `;`, `,` veya sekme seçer */
export function detectDelimiter(text: string): "," | ";" | "\t" {
  const counts = { ",": 0, ";": 0, "\t": 0 };
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') q = !q;
    else if (!q && (ch === "\n" || ch === "\r")) break;
    else if (!q && ch in counts) counts[ch as keyof typeof counts]++;
  }
  if (counts[";"] >= counts[","] && counts[";"] >= counts["\t"] && counts[";"] > 0) return ";";
  if (counts["\t"] > counts[","]) return "\t";
  return ",";
}

/**
 * RFC 4180 uyumlu CSV ayrıştırıcı: tırnaklı alanlar, "" kaçışı, alan içinde
 * satır sonu, CRLF/LF, BOM. Tamamen boş satırlar atlanır.
 */
export function parseCsv(input: string, delimiter?: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const d = delimiter ?? detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let q = false;
  let i = 0;
  const pushRow = () => {
    row.push(field);
    field = "";
    if (row.some((c) => c.trim() !== "")) rows.push(row);
    row = [];
  };
  while (i < text.length) {
    const ch = text[i]!;
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        q = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"' && field.trim() === "") {
      q = true;
      field = "";
      i++;
      continue;
    }
    if (ch === d) {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\r" || ch === "\n") {
      pushRow();
      if (ch === "\r" && text[i + 1] === "\n") i++;
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field !== "" || row.length) pushRow();
  return rows;
}

/** CSV hücresi kaçışı (şablon/dışa aktarma için) */
export function csvCell(v: string, delimiter = ";"): string {
  return /["\n\r]/.test(v) || v.includes(delimiter) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(rows: string[][], delimiter = ";"): string {
  return "﻿" + rows.map((r) => r.map((c) => csvCell(c, delimiter)).join(delimiter)).join("\r\n") + "\r\n";
}

// ---- Değer ayrıştırma ------------------------------------------------------------

export function cellText(v: Cell): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "Evet" : "Hayır";
  return String(v).trim();
}

/**
 * Türkçe/İngilizce sayı biçimleri:
 * "12.500.000 TL" → 12500000, "12,5" → 12.5, "1,250.75" → 1250.75,
 * "12,5 M" / "12,5 milyon" → 12500000, "850 bin" → 850000, "₺42.000" → 42000.
 * Anlaşılamazsa null.
 */
export function parseNumberTR(v: Cell): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  let s = norm(v.trim()).replace(/\s+/g, " ");
  if (!s) return null;
  let carpan = 1;
  const suffix = s.match(/(milyar|milyon|mn|m|bin|k)\.?\s*(tl|try|₺|trl)?\.?$/);
  if (suffix) {
    const k = suffix[1];
    carpan = k === "milyar" ? 1e9 : k === "bin" || k === "k" ? 1e3 : 1e6;
    s = s.slice(0, suffix.index);
  }
  s = s.replace(/(tl|try|trl|₺|usd|eur|\$|€|m²|m2|metrekare)/g, "").replace(/\s/g, "");
  const neg = s.startsWith("-");
  if (neg) s = s.slice(1);
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null;
  const dots = (s.match(/\./g) ?? []).length;
  const commas = (s.match(/,/g) ?? []).length;
  let n: number;
  if (dots && commas) {
    // Son görülen ayraç ondalıktır
    const dec = s.lastIndexOf(",") > s.lastIndexOf(".") ? "," : ".";
    const th = dec === "," ? "." : ",";
    n = Number(s.split(th).join("").replace(dec, "."));
  } else if (commas) {
    n = commas > 1 ? Number(s.replace(/,/g, "")) : Number(s.replace(",", "."));
  } else if (dots) {
    if (dots > 1) n = Number(s.replace(/\./g, ""));
    else {
      // "12.500" → binlik; "12.5" → ondalık
      const [, frac = ""] = s.split(".");
      n = frac.length === 3 && carpan === 1 ? Number(s.replace(".", "")) : Number(s);
    }
  } else n = Number(s);
  if (!Number.isFinite(n)) return null;
  // Kayan nokta artığını temizle (12,3 × 1e6 gibi)
  return (neg ? -1 : 1) * Number((n * carpan).toPrecision(12));
}

/** "3+1" → { oda: 3, salon: 1 }, "Stüdyo" → { oda: 1, salon: 0 }, "4" → { oda: 4 } */
export function parseOda(v: Cell): { oda: number; salon?: number } | null {
  if (typeof v === "number") return Number.isFinite(v) && v >= 0 ? { oda: v } : null;
  const s = norm(cellText(v));
  if (!s) return null;
  if (/studyo|stüdyo|1\s*\+\s*0/.test(s)) return { oda: 1, salon: 0 };
  const m = s.match(/^(\d+(?:[.,]5)?)\s*\+\s*(\d+)/);
  if (m) return { oda: Number(m[1]!.replace(",", ".")), salon: Number(m[2]) };
  const n = parseNumberTR(s);
  return n !== null && n >= 0 && n < 50 ? { oda: n } : null;
}

export function parseBool(v: Cell): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = norm(cellText(v));
  if (!s) return null;
  if (["evet", "var", "e", "x", "true", "1", "yes", "y", "uygun", "✓", "✔"].includes(s)) return true;
  if (["hayir", "yok", "h", "false", "0", "no", "n", "uygun degil", "-"].includes(s)) return false;
  return null;
}

/**
 * Telefon normalizasyonu. TR cep/sabit → "0532 123 45 67".
 * "+" ile başlayan yabancı numara korunur ("+7 916 000 00 12").
 */
export function normalizePhone(v: Cell): { ok: true; value: string } | { ok: false; error: string } | null {
  const raw = cellText(typeof v === "number" ? String(Math.round(v)) : v);
  if (!raw) return null;
  const t = raw.trim();
  let d = t.replace(/\D/g, "");
  if (t.startsWith("+") && !t.startsWith("+90")) {
    if (d.length < 7 || d.length > 15) return { ok: false, error: "Geçersiz uluslararası numara" };
    return { ok: true, value: "+" + d };
  }
  if (d.startsWith("0090")) d = d.slice(4);
  else if (d.startsWith("90") && d.length === 12) d = d.slice(2);
  else if (d.startsWith("0") && d.length === 11) d = d.slice(1);
  if (d.length !== 10 || !/^[2-5]/.test(d)) return { ok: false, error: "Telefon 10 haneli olmalı (5XX XXX XX XX)" };
  return { ok: true, value: `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}` };
}

/** Karşılaştırma anahtarı: yalnızca rakamlar, TR için 10 hane */
export function phoneKey(tel: string | null | undefined): string {
  if (!tel) return "";
  const r = normalizePhone(tel);
  return r && r.ok ? r.value.replace(/\D/g, "").replace(/^0/, "") : tel.replace(/\D/g, "");
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function matchLabel<K extends string>(v: string, labels: Record<K, string>, extra: Partial<Record<K, string[]>> = {}): K | null {
  const s = norm(v).replace(/[^a-z0-9]/g, "");
  if (!s) return null;
  for (const [k, l] of Object.entries(labels) as [K, string][]) {
    const cands = [k, l, ...(extra[k] ?? [])].map((x) => norm(x).replace(/[^a-z0-9]/g, ""));
    if (cands.includes(s)) return k;
  }
  for (const [k, l] of Object.entries(labels) as [K, string][]) {
    const cands = [k, l, ...(extra[k] ?? [])].map((x) => norm(x).replace(/[^a-z0-9]/g, ""));
    if (cands.some((c) => c.length >= 3 && (s.startsWith(c) || c.startsWith(s)))) return k;
  }
  return null;
}

export function parseIlanTipi(v: Cell): ListingType | null {
  return matchLabel<ListingType>(cellText(v), { satilik: "Satılık", kiralik: "Kiralık", devren: "Devren" }, {
    satilik: ["sat", "satis", "sale", "for sale"],
    kiralik: ["kira", "rent", "for rent", "kiralama"],
    devren: ["devir", "devren satilik", "devren kiralik"],
  });
}

export function parseEmlakTipi(v: Cell): string | null {
  return matchLabel<string>(cellText(v), EMLAK_TIPLERI, {
    daire: ["apartman dairesi", "apartment", "flat", "residence", "rezidans"],
    villa: ["villa"],
    mustakil: ["mustakil", "müstakil ev", "house", "detached"],
    arsa: ["land", "plot", "imarli arsa"],
    dukkan: ["dukkan", "shop", "magaza", "store"],
    ofis: ["office", "buro", "büro"],
    depo: ["warehouse", "antrepo"],
  });
}

export function parsePersonTypes(v: Cell): PersonType[] {
  const parts = cellText(v)
    .split(/[,;/|]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  const out = new Set<PersonType>();
  for (const p of parts) {
    const k = matchLabel<PersonType>(p, PERSON_TYPES, {
      alici: ["buyer", "alim"],
      satici: ["seller", "mal sahibi", "malik", "ev sahibi"],
      kiraci: ["tenant"],
      kiraya_veren: ["landlord", "kiralayan"],
      yatirimci: ["investor"],
      yabanci_alici: ["foreign buyer", "yabanci"],
    });
    if (k) out.add(k);
  }
  return [...out];
}

// ---- Alan tanımları ---------------------------------------------------------------

export interface FieldDef {
  key: string;
  label: string;
  required?: boolean;
  /** Başlık tahmini için eş anlamlılar (TR/EN) */
  synonyms: string[];
  ornek: string;
}

export const PORTFOY_FIELDS: FieldDef[] = [
  { key: "baslik", label: "Başlık", required: true, synonyms: ["baslik", "ilan basligi", "title", "ad", "portfoy", "portfoy adi", "name"], ornek: "Moda 3+1 deniz manzaralı" },
  { key: "ilan_tipi", label: "İlan tipi", required: true, synonyms: ["ilan tipi", "islem", "islem tipi", "durum", "satilik kiralik", "listing type", "type", "tip"], ornek: "Satılık" },
  { key: "emlak_tipi", label: "Emlak tipi", synonyms: ["emlak tipi", "mulk tipi", "gayrimenkul tipi", "konut tipi", "property type", "kategori", "cins"], ornek: "Daire" },
  { key: "fiyat", label: "Fiyat (TL)", synonyms: ["fiyat", "fiyati", "satis fiyati", "kira bedeli", "bedel", "tutar", "price", "amount"], ornek: "12.500.000 TL" },
  { key: "oda", label: "Oda (3+1)", synonyms: ["oda", "oda sayisi", "oda salon", "rooms", "room", "bedrooms"], ornek: "3+1" },
  { key: "brut_m2", label: "Brüt m²", synonyms: ["brut m2", "brut", "brut metrekare", "m2 brut", "gross m2", "gross area", "m2", "metrekare", "alan", "area"], ornek: "140" },
  { key: "net_m2", label: "Net m²", synonyms: ["net m2", "net", "net metrekare", "m2 net", "net area"], ornek: "122" },
  { key: "kat", label: "Bulunduğu kat", synonyms: ["kat", "bulundugu kat", "floor"], ornek: "4" },
  { key: "toplam_kat", label: "Toplam kat", synonyms: ["toplam kat", "kat sayisi", "bina kat sayisi", "total floors", "floors"], ornek: "6" },
  { key: "bina_yasi", label: "Bina yaşı", synonyms: ["bina yasi", "yas", "building age", "age"], ornek: "12" },
  { key: "isinma", label: "Isınma", synonyms: ["isinma", "isitma", "isinma tipi", "heating"], ornek: "Kombi" },
  { key: "aidat", label: "Aidat (TL)", synonyms: ["aidat", "dues", "maintenance fee", "site aidati"], ornek: "1.850" },
  { key: "il", label: "İl", synonyms: ["il", "sehir", "city", "province"], ornek: "İstanbul" },
  { key: "ilce", label: "İlçe", synonyms: ["ilce", "district", "county"], ornek: "Kadıköy" },
  { key: "mahalle", label: "Mahalle", synonyms: ["mahalle", "semt", "neighborhood", "neighbourhood", "mah"], ornek: "Moda" },
  { key: "adres", label: "Adres", synonyms: ["adres", "acik adres", "address"], ornek: "Moda Cad. No:1" },
  { key: "ada", label: "Ada", synonyms: ["ada", "ada no", "block"], ornek: "1234" },
  { key: "parsel", label: "Parsel", synonyms: ["parsel", "parsel no", "parcel", "lot"], ornek: "5" },
  { key: "bagimsiz_bolum", label: "Bağımsız bölüm", synonyms: ["bagimsiz bolum", "bb", "bagimsiz bolum no", "daire no", "unit"], ornek: "9" },
  { key: "iskan_var", label: "İskân (Evet/Hayır)", synonyms: ["iskan", "iskan var", "iskan durumu", "occupancy permit"], ornek: "Evet" },
  { key: "krediye_uygun", label: "Krediye uygun (Evet/Hayır)", synonyms: ["krediye uygun", "kredi", "krediye uygunluk", "mortgage"], ornek: "Evet" },
  { key: "aciklama", label: "Açıklama", synonyms: ["aciklama", "ilan aciklamasi", "detay", "description", "notes", "not"], ornek: "Sahile 3 dk, yeni tadilatlı…" },
];

export const KISI_FIELDS: FieldDef[] = [
  { key: "ad_soyad", label: "Ad soyad", required: true, synonyms: ["ad soyad", "adi soyadi", "isim soyisim", "isim", "ad", "musteri", "musteri adi", "full name", "name", "kisi", "adi", "first name"], ornek: "Zeynep Aydın" },
  { key: "soyad", label: "Soyad (ayrı sütunsa)", synonyms: ["soyad", "soyadi", "soyisim", "surname", "last name"], ornek: "" },
  { key: "telefon", label: "Telefon", synonyms: ["telefon", "tel", "cep", "cep telefonu", "gsm", "phone", "mobile", "telefon no"], ornek: "0532 418 22 47" },
  { key: "eposta", label: "E-posta", synonyms: ["eposta", "e posta", "email", "e mail", "mail"], ornek: "zeynep@example.com" },
  { key: "tipler", label: "Tip (alıcı, satıcı…)", synonyms: ["tip", "tipler", "musteri tipi", "kisi tipi", "type", "rol", "kategori"], ornek: "Alıcı" },
  { key: "kaynak", label: "Kaynak", synonyms: ["kaynak", "source", "nereden", "lead source", "referans"], ornek: "Referans" },
  { key: "sonraki_adim", label: "Not / sonraki adım", synonyms: ["not", "notlar", "sonraki adim", "notes", "note", "aciklama"], ornek: "Hafta sonu gösterim" },
];

export function fieldsFor(kind: ImportKind): FieldDef[] {
  return kind === "portfoy" ? PORTFOY_FIELDS : KISI_FIELDS;
}

const hkey = (s: string) => norm(s).replace(/[²]/g, "2").replace(/[^a-z0-9]+/g, " ").trim();

/** Sütun eşleme: alan anahtarı → sütun indeksi (yoksa -1) */
export type Mapping = Record<string, number>;

/**
 * Başlık satırından alan eşlemesini tahmin eder. Önce tam eşleşme, sonra
 * içerme; her sütun en fazla bir alana atanır.
 */
export function guessMapping(headers: string[], fields: FieldDef[]): Mapping {
  const hs = headers.map((h) => hkey(h ?? ""));
  const used = new Set<number>();
  const m: Mapping = Object.fromEntries(fields.map((f) => [f.key, -1]));
  const syn = (f: FieldDef) => [f.key.replace(/_/g, " "), hkey(f.label), ...f.synonyms.map(hkey)];
  // 1) tam eşleşme
  for (const f of fields) {
    const i = hs.findIndex((h, idx) => !used.has(idx) && h && syn(f).includes(h));
    if (i >= 0) {
      m[f.key] = i;
      used.add(i);
    }
  }
  // 2) başlık eş anlamlıyı kelime olarak içeriyor (uzun eş anlamlılar önce)
  const pairs: { f: FieldDef; s: string }[] = fields.flatMap((f) => syn(f).map((s) => ({ f, s })));
  pairs.sort((a, b) => b.s.length - a.s.length);
  for (const { f, s } of pairs) {
    if (m[f.key]! >= 0 || s.length < 2) continue;
    const re = new RegExp(`(^| )${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}( |$)`);
    const i = hs.findIndex((h, idx) => !used.has(idx) && h && re.test(h));
    if (i >= 0) {
      m[f.key] = i;
      used.add(i);
    }
  }
  return m;
}

/** İlk dolu satırı başlık, kalanları veri olarak ayırır */
export function splitHeader(table: Cell[][]): { headers: string[]; rows: Cell[][] } {
  const idx = table.findIndex((r) => r.some((c) => cellText(c) !== ""));
  if (idx < 0) return { headers: [], rows: [] };
  const width = Math.max(...table.map((r) => r.length));
  const headers = Array.from({ length: width }, (_, i) => cellText(table[idx]![i]));
  const rows = table.slice(idx + 1).filter((r) => r.some((c) => cellText(c) !== ""));
  return { headers, rows };
}

// ---- Satır doğrulama -----------------------------------------------------------------

export interface RowResult<T> {
  /** Kaynaktaki satır numarası (başlık 1. satır kabul edilir) */
  satir: number;
  value: Partial<T>;
  errors: string[];
  warnings: string[];
}

function get(row: Cell[], m: Mapping, key: string): Cell {
  const i = m[key];
  return i === undefined || i < 0 ? null : row[i];
}

export function validatePortfolioRow(row: Cell[], m: Mapping, satir: number): RowResult<Portfolio> {
  const e: string[] = [];
  const w: string[] = [];
  const v: Partial<Portfolio> = {};
  const txt = (k: string) => cellText(get(row, m, k)) || null;
  const num = (k: string, label: string, opts: { int?: boolean; min?: number; max?: number } = {}) => {
    const raw = get(row, m, k);
    if (cellText(raw) === "") return null;
    const n = parseNumberTR(raw);
    if (n === null) {
      e.push(`${label}: “${cellText(raw)}” sayı değil`);
      return null;
    }
    if ((opts.min !== undefined && n < opts.min) || (opts.max !== undefined && n > opts.max)) {
      e.push(`${label}: ${n} geçerli aralıkta değil`);
      return null;
    }
    return opts.int ? Math.round(n) : n;
  };

  v.baslik = txt("baslik");
  if (!v.baslik) e.push("Başlık boş");

  const tipRaw = get(row, m, "ilan_tipi");
  const tip = parseIlanTipi(tipRaw);
  if (!tip) e.push(cellText(tipRaw) ? `İlan tipi anlaşılamadı: “${cellText(tipRaw)}”` : "İlan tipi boş (Satılık / Kiralık / Devren)");
  else v.ilan_tipi = tip;

  const etRaw = get(row, m, "emlak_tipi");
  const et = parseEmlakTipi(etRaw);
  if (cellText(etRaw) && !et) w.push(`Emlak tipi “${cellText(etRaw)}” tanınmadı; “Daire” kabul edildi`);
  v.emlak_tipi = et ?? "daire";

  v.fiyat = num("fiyat", "Fiyat", { min: 0 });
  if (v.fiyat === null) w.push("Fiyat yok");

  const odaRaw = get(row, m, "oda");
  if (cellText(odaRaw)) {
    const o = parseOda(odaRaw);
    if (!o) e.push(`Oda: “${cellText(odaRaw)}” anlaşılamadı (ör. 3+1)`);
    else {
      v.oda = o.oda;
      if (o.salon !== undefined) v.salon = o.salon;
    }
  }
  v.brut_m2 = num("brut_m2", "Brüt m²", { min: 1, max: 1_000_000 });
  v.net_m2 = num("net_m2", "Net m²", { min: 1, max: 1_000_000 });
  if (v.brut_m2 && v.net_m2 && v.net_m2 > v.brut_m2) w.push("Net m², brüt m²'den büyük");
  v.kat = num("kat", "Kat", { int: true, min: -5, max: 200 });
  v.toplam_kat = num("toplam_kat", "Toplam kat", { int: true, min: 0, max: 200 });
  v.bina_yasi = num("bina_yasi", "Bina yaşı", { int: true, min: 0, max: 500 });
  v.aidat = num("aidat", "Aidat", { min: 0 });
  v.isinma = txt("isinma");
  v.il = txt("il");
  v.ilce = txt("ilce");
  v.mahalle = txt("mahalle");
  v.adres = txt("adres");
  v.ada = txt("ada");
  v.parsel = txt("parsel");
  v.bagimsiz_bolum = txt("bagimsiz_bolum");
  v.aciklama = txt("aciklama");
  for (const [k, label] of [
    ["iskan_var", "İskân"],
    ["krediye_uygun", "Krediye uygun"],
  ] as const) {
    const raw = get(row, m, k);
    if (!cellText(raw)) continue;
    const b = parseBool(raw);
    if (b === null) w.push(`${label}: “${cellText(raw)}” anlaşılamadı`);
    else v[k] = b;
  }
  if (!v.ilce) w.push("İlçe yok (eşleştirmede kullanılamaz)");
  return { satir, value: v, errors: e, warnings: w };
}

export function validatePersonRow(row: Cell[], m: Mapping, satir: number, existingPhones: Set<string> = new Set()): RowResult<Person> {
  const e: string[] = [];
  const w: string[] = [];
  const v: Partial<Person> = {};
  v.ad_soyad = [cellText(get(row, m, "ad_soyad")), cellText(get(row, m, "soyad"))].join(" ").replace(/\s+/g, " ").trim() || undefined;
  if (!v.ad_soyad) e.push("Ad soyad boş");
  else if (v.ad_soyad.length < 2) e.push("Ad soyad çok kısa");

  const tel = normalizePhone(get(row, m, "telefon"));
  if (tel && !tel.ok) e.push(`Telefon: ${tel.error}`);
  else if (tel?.ok) {
    v.telefon = tel.value;
    if (existingPhones.has(phoneKey(tel.value))) e.push("Bu telefonla kayıtlı kişi zaten var");
  }

  const mail = cellText(get(row, m, "eposta")).toLocaleLowerCase("tr");
  if (mail) {
    if (!EMAIL.test(mail)) e.push(`E-posta geçersiz: “${mail}”`);
    else v.eposta = mail;
  }
  if (!tel && !mail) e.push("Telefon veya e-posta gerekli");

  const tipRaw = get(row, m, "tipler");
  const tipler = parsePersonTypes(tipRaw);
  if (cellText(tipRaw) && !tipler.length) w.push(`Tip “${cellText(tipRaw)}” tanınmadı; “Alıcı” kabul edildi`);
  v.tipler = tipler.length ? tipler : ["alici"];
  v.kaynak = cellText(get(row, m, "kaynak")) || "İçe aktarma";
  v.sonraki_adim = cellText(get(row, m, "sonraki_adim")) || null;
  return { satir, value: v, errors: e, warnings: w };
}

/**
 * Tüm satırları doğrular. Kişilerde dosya içindeki yinelenen telefonlar da
 * hata olarak işaretlenir.
 */
export function validateAll(kind: ImportKind, rows: Cell[][], m: Mapping, opts: { existingPhones?: Set<string>; headerRow?: number } = {}) {
  const start = (opts.headerRow ?? 1) + 1;
  if (kind === "portfoy") return rows.map((r, i) => validatePortfolioRow(r, m, start + i));
  const seen = new Set(opts.existingPhones ?? []);
  const fileSeen = new Map<string, number>();
  return rows.map((r, i) => {
    const res = validatePersonRow(r, m, start + i, seen);
    const k = res.value.telefon ? phoneKey(res.value.telefon) : "";
    if (k) {
      const prev = fileSeen.get(k);
      if (prev !== undefined && !res.errors.length) res.errors.push(`Aynı telefon ${prev}. satırda da var`);
      else fileSeen.set(k, res.satir);
    }
    return res;
  });
}

export function missingRequired(m: Mapping, fields: FieldDef[]): FieldDef[] {
  return fields.filter((f) => f.required && (m[f.key] ?? -1) < 0);
}

/** İndirilebilir CSV şablonu (Excel TR için `;` ve BOM) */
export function templateCsv(kind: ImportKind): string {
  const fields = fieldsFor(kind).filter((f) => f.ornek !== "");
  return toCsv([fields.map((f) => f.label), fields.map((f) => f.ornek)]);
}
