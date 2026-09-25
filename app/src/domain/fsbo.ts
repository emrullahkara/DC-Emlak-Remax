/**
 * FSBO Radar iş kuralları (tasarım §5.3): skor girdisi eşlemesi, takip kadansı,
 * arama sonucu → durum geçişi, dönüşüm hunisi, arama sırası ve portföye dönüşüm taslağı.
 * Saf fonksiyonlar; UI ve veritabanından bağımsızdır.
 */
import type { FsboListingRow, FsboStatus, Portfolio, Person } from "../data/types";
import { fsboScore, type FsboListing, type Score } from "./scoring";

const GUN = 86_400_000;

/**
 * FSBO satırı + ilk temas tarihi. `ilk_temas` sütunu 0004_fsbo_deal.sql ile eklenir;
 * ortak `FsboListingRow` tipine henüz eklenmediği için burada genişletilir.
 */
export type FsboRow = FsboListingRow & { ilk_temas?: string | null; son_temas?: string | null };

/** Yerel takvim gününe göre iki tarih arasındaki gün farkı (b - a) */
export function dayDiff(a: Date, b: Date): number {
  const x = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const y = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((y - x) / GUN);
}

/** "2026-09-24" → yerel gece yarısı (UTC kaymasını önler) */
export function parseDay(iso: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(iso);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// ---- Skor ------------------------------------------------------------------

/** Veritabanı satırını skor fonksiyonunun girdisine çevirir. */
export function toScoreInput(row: Pick<FsboListingRow, "ilk_gorulme" | "fiyat_dusum_sayisi" | "piyasaya_gore_fark" | "aciklama" | "baslik" | "foto_sayisi">, now: Date): FsboListing {
  return {
    ilanYasiGun: Math.max(0, dayDiff(parseDay(row.ilk_gorulme), now)),
    fiyatDusumSayisi: row.fiyat_dusum_sayisi ?? 0,
    piyasayaGoreFark: row.piyasaya_gore_fark ?? 0,
    aciklama: row.aciklama ?? row.baslik ?? "",
    fotoSayisi: row.foto_sayisi ?? 10,
  };
}

export function scoreRow(row: Parameters<typeof toScoreInput>[0], now: Date): Score {
  return fsboScore(toScoreInput(row, now));
}

/** Saklı skor/sinyaller hesaplanandan farklıysa yazılacak yama; aynıysa null. */
export function scorePatch(row: FsboListingRow, now: Date): Pick<FsboListingRow, "skor" | "sinyaller"> | null {
  const s = scoreRow(row, now);
  const same = row.skor === s.puan && JSON.stringify(row.sinyaller ?? []) === JSON.stringify(s.sinyaller);
  return same ? null : { skor: s.puan, sinyaller: s.sinyaller };
}

// ---- Takip kadansı -------------------------------------------------------------

export const KADANS = [
  { gun: 1, baslik: "İlk arama" },
  { gun: 3, baslik: "Değerleme raporu gönder" },
  { gun: 7, baslik: "Piyasa bülteni gönder" },
  { gun: 14, baslik: "Yeniden arama" },
  { gun: 30, baslik: "“İlanınız hâlâ yayında” mesajı" },
] as const;

export type CadenceState = "done" | "current" | "upcoming";

export interface CadenceStep {
  gun: number;
  baslik: string;
  durum: CadenceState;
  /** Adımın planlanan günü (yerel gece yarısı) */
  tarih: Date;
}

export interface Cadence {
  /** Kadansın kaçıncı günündeyiz (ilk temas günü = 1). Başlamadıysa 0. */
  gun: number;
  basladi: boolean;
  adimlar: CadenceStep[];
  /** Tamamlanmamış ilk adım (bugün ya da ileride); kadans bittiyse null */
  siradaki: CadenceStep | null;
  /** Sıradaki adımın tarihi */
  sonrakiVade: Date | null;
  /** Bugünden sonraki ilk adım — sonuç kaydedilince oluşturulacak görev */
  sonrakiGorev: CadenceStep | null;
}

/**
 * 1-3-7-14-30 gün takip kadansı. İlk temas günü kadansın 1. günüdür.
 * İlk temas yoksa kadans bugün başlayacakmış gibi hesaplanır (1. adım bugün).
 */
export function cadence(ilkTemasTarihi: string | Date | null | undefined, now: Date): Cadence {
  const basladi = !!ilkTemasTarihi;
  const start = ilkTemasTarihi
    ? typeof ilkTemasTarihi === "string"
      ? parseDay(ilkTemasTarihi)
      : new Date(ilkTemasTarihi.getFullYear(), ilkTemasTarihi.getMonth(), ilkTemasTarihi.getDate())
    : new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const gun = basladi ? dayDiff(start, now) + 1 : 0;
  // Başlamamışsa 1. adım "current" olsun
  const ref = basladi ? gun : 1;
  let currentSet = false;
  const adimlar: CadenceStep[] = KADANS.map((k) => {
    const tarih = addDays(start, k.gun - 1);
    let durum: CadenceState;
    if (k.gun < ref) durum = "done";
    else if (!currentSet) {
      durum = "current";
      currentSet = true;
    } else durum = "upcoming";
    return { gun: k.gun, baslik: k.baslik, durum, tarih };
  });
  const siradaki = adimlar.find((a) => a.durum === "current") ?? null;
  const sonrakiGorev = adimlar.find((a) => a.gun > ref) ?? null;
  return { gun, basladi, adimlar, siradaki, sonrakiVade: siradaki?.tarih ?? null, sonrakiGorev };
}

// ---- Arama sonucu → durum --------------------------------------------------------

export type CallResult = "ulasilamadi" | "gorusuldu" | "degerleme" | "vazgecti";

export const SONUC_ETIKET: Record<CallResult, string> = {
  ulasilamadi: "Ulaşılamadı",
  gorusuldu: "Görüşüldü",
  degerleme: "Değerleme randevusu",
  vazgecti: "Vazgeçti",
};

export const DURUM_ETIKET: Record<FsboStatus, string> = {
  yeni: "Yeni",
  arandi: "Arandı",
  gorusuldu: "Görüşüldü",
  degerleme: "Değerleme",
  yetki_alindi: "Yetki alındı",
  vazgecildi: "Vazgeçti",
};

const SIRA: FsboStatus[] = ["yeni", "arandi", "gorusuldu", "degerleme", "yetki_alindi"];

/**
 * Arama sonucuna göre yeni durum. Huni geriye gitmez (ör. görüşülmüş bir
 * mal sahibine sonradan ulaşılamaması durumu "arandı"ya düşürmez).
 */
export function nextStatus(current: FsboStatus, result: CallResult): FsboStatus {
  if (result === "vazgecti") return "vazgecildi";
  const hedef: FsboStatus = result === "ulasilamadi" ? "arandi" : result === "gorusuldu" ? "gorusuldu" : "degerleme";
  if (current === "vazgecildi") return hedef;
  return SIRA.indexOf(hedef) > SIRA.indexOf(current) ? hedef : current;
}

// ---- Huni ve arama sırası ---------------------------------------------------------------

export interface FunnelStep {
  kod: FsboStatus | "tespit";
  etiket: string;
  sayi: number;
}

/** Kümülatif dönüşüm hunisi: her adım, o aşamaya en az ulaşmış ilan sayısıdır. */
export function funnel(rows: Pick<FsboListingRow, "durum">[]): FunnelStep[] {
  const rank = (d: FsboStatus) => (d === "vazgecildi" ? 1 : SIRA.indexOf(d));
  const count = (min: number) => rows.filter((r) => rank(r.durum) >= min).length;
  return [
    { kod: "tespit", etiket: "Tespit", sayi: rows.length },
    { kod: "arandi", etiket: "Arandı", sayi: count(1) },
    { kod: "gorusuldu", etiket: "Görüşüldü", sayi: count(2) },
    { kod: "degerleme", etiket: "Değerleme", sayi: count(3) },
    { kod: "yetki_alindi", etiket: "Yetki", sayi: count(4) },
  ];
}

const AKTIF: FsboStatus[] = ["yeni", "arandi", "gorusuldu"];

/**
 * Bugünkü arama sırası: aktif (yeni/arandı/görüşüldü) ilanlardan kadans adımı
 * bugün ya da geçmişte kalanlar; bugün zaten temas kurulanlar hariç; skora göre azalan.
 */
export function callQueue<T extends FsboRow>(rows: T[], now: Date): T[] {
  return rows
    .filter((r) => AKTIF.includes(r.durum))
    .filter((r) => !r.son_temas || dayDiff(new Date(r.son_temas), now) !== 0)
    .filter((r) => {
      if (!r.ilk_temas) return true;
      const c = cadence(r.ilk_temas, now);
      return !!c.sonrakiVade && dayDiff(c.sonrakiVade, now) >= 0;
    })
    .sort((a, b) => (b.skor ?? 0) - (a.skor ?? 0));
}

/** Son 24 saatte ilk görülen ilanlar */
export function isNew24h(row: Pick<FsboListingRow, "ilk_gorulme">, now: Date): boolean {
  return dayDiff(parseDay(row.ilk_gorulme), now) <= 1;
}

// ---- Portföye dönüştürme ------------------------------------------------------------------

export interface ConversionDraft {
  person: Partial<Person>;
  portfolio: Partial<Portfolio>;
}

/** FSBO ilanından satıcı kişi ve "değerleme" aşamasında portföy taslağı üretir. */
export function fsboToPortfolioDraft(row: FsboListingRow, ctx: { officeId: string; userId: string }): ConversionDraft {
  return {
    person: {
      office_id: ctx.officeId,
      owner_id: ctx.userId,
      ad_soyad: row.malik_ad?.trim() || "Malik (FSBO)",
      telefon: row.malik_telefon ?? null,
      tipler: ["satici"],
      kaynak: "FSBO Radar",
    },
    portfolio: {
      office_id: ctx.officeId,
      owner_id: ctx.userId,
      asama: "degerleme",
      ilan_tipi: "satilik",
      emlak_tipi: "daire",
      baslik: row.baslik ?? null,
      aciklama: row.aciklama ?? null,
      fiyat: row.fiyat ?? null,
      para_birimi: "TRY",
      ilce: row.ilce ?? null,
      mahalle: row.mahalle ?? null,
      takyidat: {},
      imar: {},
      ozellikler: [],
      paylasim_seviyesi: "ofis",
      eids_durum: "yok",
    },
  };
}

// ---- Arama senaryosu ---------------------------------------------------------------------

/** Kişiselleştirilmiş açılış senaryosu */
export function openingScript(row: Pick<FsboListingRow, "malik_ad" | "mahalle" | "ilce" | "baslik">, agent: { ad: string; ofis: string }): string {
  const ilkAd = row.malik_ad?.trim().split(/\s+/)[0];
  const hitap = ilkAd ? `${ilkAd} Hanım/Bey` : "efendim";
  const yerAd = row.mahalle || row.ilce;
  const yer = yerAd ? `${yerAd} bölgesindeki` : "sahibinden";
  const ajanIlk = agent.ad.trim().split(/\s+/)[0] || agent.ad;
  // Ek uyumu sorunlarından kaçınmak için özel adlara ek getirilmez
  return `Merhaba ${hitap}, ben ${ajanIlk}, ${agent.ofis} ofisinden arıyorum. ${yer} ilanınızı gördüm. Size ücretsiz, emsal satışlara dayalı bir değerleme raporu hazırlayabilirim; böylece fiyatınızın piyasadaki yerini net görürsünüz. Bu hafta 10 dakikalığına uğrasam uygun olur mu?`;
}

export const ITIRAZLAR: { soru: string; cevap: string }[] = [
  {
    soru: "“Komisyon vermem.”",
    cevap:
      "Çok haklısınız, kimse boşuna ödeme yapmak istemez. Hizmet bedelini yalnızca satış gerçekleşirse ve yasal üst sınır içinde alıyoruz. Profesyonel fotoğraf, doğrulanmış ilan ve hazır alıcı portföyümüzle çoğu zaman daha iyi fiyata ve daha hızlı satış sağlıyoruz; bu fark genellikle bedeli karşılıyor.",
  },
  {
    soru: "“Kendim satarım.”",
    cevap:
      "Elbette, birçok mal sahibi önce kendisi deniyor. Size ücretsiz bir değerleme bırakayım; kendiniz satarken de fiyatı doğru konumlandırmanıza yardımcı olur. Uygun görmezseniz hiçbir yükümlülüğünüz yok.",
  },
  {
    soru: "“Başka emlakçı da aradı.”",
    cevap:
      "Anlıyorum, ilgi görmesi iyi bir işaret. Farkımız: ilanınız EİDS doğrulamalı yayınlanır, her hafta görüntülenme ve gösterim raporu alırsınız, alıcılarımızın kredi ön onayını gösterimden önce kontrol ederiz.",
  },
  {
    soru: "“Fiyatım düşük değil.”",
    cevap:
      "Fiyat konusunda sizinle aynı fikirde olabiliriz; bunu birlikte verilerle görelim. Son 3 ayda bölgede satılan benzer daireleri içeren raporu getireyim, fiyatınızı ona göre birlikte değerlendirelim.",
  },
];
