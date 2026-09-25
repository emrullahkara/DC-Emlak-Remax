/**
 * İşlem hattı ve kapanış iş kuralları (tasarım §5.9, §5.11):
 * beklenen komisyon, kapanış kontrol listeleri, uyum motoru bağlamları,
 * teklif zinciri ve komisyon paylaşım kuralları. Saf fonksiyonlar.
 */
import type {
  AuthorizationContract as ContractRow,
  ChecklistItem,
  Deal,
  ListingType,
  Offer,
  Office,
  Portfolio,
} from "../data/types";
import type { SplitRule } from "./commission";
import type { ClosingContext, ListingContext } from "./compliance";
import { round2 } from "./money";
import { paramsFor } from "./params";
import { ASAMALAR, type Asama } from "./pipeline";

const GUN = 86_400_000;

// ---- Beklenen komisyon --------------------------------------------------------------

/** Aşamaya göre kapanma olasılığı */
export const ASAMA_OLASILIK: Record<Asama, number> = {
  aday: 0.05,
  degerleme: 0.1,
  yetki: 0.25,
  yayinda: 0.35,
  teklif: 0.6,
  kapora: 0.85,
  tapu: 0.95,
  tamamlandi: 1,
};

export const VARSAYILAN_HIZMET_ORANI = 2;

/** Portföyün yetki sözleşmelerinden hizmet bedeli oranı (en güncel sözleşme; yoksa %2). */
export function feeRate(contracts: Pick<ContractRow, "hizmet_bedeli_orani" | "bitis">[]): number {
  const c = [...contracts].sort((a, b) => (a.bitis < b.bitis ? 1 : -1))[0];
  return c?.hizmet_bedeli_orani ?? VARSAYILAN_HIZMET_ORANI;
}

/**
 * Tahmini brüt hizmet bedeli (KDV hariç).
 * Satış/devren: fiyat × oran × 2 taraf (oran yasal tavanla sınırlanır).
 * Kiralık: 1 aylık kira.
 */
export function expectedFee(p: Pick<Portfolio, "ilan_tipi" | "fiyat">, oran = VARSAYILAN_HIZMET_ORANI, tarih?: Date): number {
  const fiyat = p.fiyat ?? 0;
  if (fiyat <= 0) return 0;
  if (p.ilan_tipi === "kiralik") return round2(fiyat * paramsFor(tarih).kiraHizmetBedeliTavanAy.deger);
  const tavan = paramsFor(tarih).satisHizmetBedeliTavanOrani.deger;
  const o = Math.max(0, Math.min(oran, tavan));
  return round2(((fiyat * o) / 100) * 2);
}

/** Olasılıkla ağırlıklandırılmış beklenen komisyon */
export function expectedCommission(p: Pick<Portfolio, "ilan_tipi" | "fiyat" | "asama">, oran?: number, tarih?: Date): number {
  if (p.asama === "arsiv") return 0;
  return round2(expectedFee(p, oran, tarih) * ASAMA_OLASILIK[p.asama]);
}

/** Aşama → { adet, beklenen komisyon } */
export function pipelineSummary(
  portfolios: Pick<Portfolio, "id" | "ilan_tipi" | "fiyat" | "asama">[],
  rateOf: (portfolioId: string) => number,
  tarih?: Date,
): Record<Asama, { adet: number; beklenen: number }> {
  const out = Object.fromEntries(ASAMALAR.map((a) => [a, { adet: 0, beklenen: 0 }])) as Record<Asama, { adet: number; beklenen: number }>;
  for (const p of portfolios) {
    if (p.asama === "arsiv") continue;
    out[p.asama].adet += 1;
    out[p.asama].beklenen = round2(out[p.asama].beklenen + expectedCommission(p, rateOf(p.id), tarih));
  }
  return out;
}

// ---- Kapanış kontrol listeleri ------------------------------------------------------------

const SATIS: ChecklistItem[] = [
  { kod: "takyidat", baslik: "Tapu kaydı (takyidat) sorgusu güncel", tamam: false, zorunlu: true },
  { kod: "iskan", baslik: "İskân / kat mülkiyeti kontrolü", tamam: false, zorunlu: true },
  { kod: "dask", baslik: "DASK poliçesi (zorunlu deprem sigortası)", tamam: false, zorunlu: true },
  { kod: "aidat", baslik: "Aidat borcu yok yazısı (site yönetimi)", tamam: false, zorunlu: false },
  { kod: "emlak_vergisi", baslik: "Belediye emlak vergisi borcu yok yazısı", tamam: false, zorunlu: false },
  { kod: "kyc", baslik: "Müşteriyi tanıma (MASAK) formu", tamam: false, zorunlu: true },
  { kod: "kredi_ekspertiz", baslik: "Kredi: ekspertiz, banka onayı, ipotek tesisi", tamam: false, zorunlu: false },
  { kod: "tapu_randevu", baslik: "Tapu randevusu (Web Tapu) ve harç tahsilatı", tamam: false, zorunlu: true },
  { kod: "abonelik", baslik: "Abonelik devirleri ve anahtar teslim tutanağı", tamam: false, zorunlu: false },
  { kod: "fatura", baslik: "Fatura kesimi ve komisyon tahsilatı", tamam: false, zorunlu: true },
];

const KIRA: ChecklistItem[] = [
  { kod: "kimlik_gelir", baslik: "Kiracı kimlik ve gelir kontrolü", tamam: false, zorunlu: true },
  { kod: "kefil", baslik: "Kefil bilgileri ve kefalet imzası", tamam: false, zorunlu: false },
  { kod: "depozito", baslik: "Depozito (güvence bedeli) tahsilatı", tamam: false, zorunlu: true },
  { kod: "demirbas", baslik: "Demirbaş listesi", tamam: false, zorunlu: false },
  { kod: "dask", baslik: "DASK poliçesi (abonelikler için)", tamam: false, zorunlu: true },
  { kod: "teslim_tutanagi", baslik: "Fotoğraflı teslim tutanağı", tamam: false, zorunlu: true },
  { kod: "sozlesme", baslik: "Kira sözleşmesi imzası", tamam: false, zorunlu: true },
  { kod: "kyc", baslik: "Müşteriyi tanıma (MASAK) formu", tamam: false, zorunlu: false },
  { kod: "abonelik", baslik: "Abonelik (elektrik, su, doğalgaz) devirleri", tamam: false, zorunlu: false },
];

/** İlan tipine göre boş kapanış kontrol listesi */
export function defaultChecklist(ilanTipi: ListingType): ChecklistItem[] {
  return (ilanTipi === "kiralik" ? KIRA : SATIS).map((i) => ({ ...i }));
}

export function toggleChecklist(list: ChecklistItem[], kod: string, tamam?: boolean): ChecklistItem[] {
  return list.map((i) => (i.kod === kod ? { ...i, tamam: tamam ?? !i.tamam } : i));
}

export function checklistProgress(list: ChecklistItem[]) {
  const zorunlu = list.filter((i) => i.zorunlu);
  return {
    tamam: list.filter((i) => i.tamam).length,
    toplam: list.length,
    eksikZorunlu: zorunlu.filter((i) => !i.tamam),
  };
}

/** Tapuya (ya da teslime) kalan gün; tarih yoksa null. Negatif = gecikmiş. */
export function daysUntil(isoDate: string | null | undefined, now: Date): number | null {
  if (!isoDate) return null;
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((Date.UTC(y, m - 1, d) - a) / GUN);
}

// ---- Uyum motoru bağlamları ----------------------------------------------------------------

/** Aşama geçişi için ilan bağlamı (ofis yetki belgesi, yetki sözleşmesi, EİDS). */
export function buildListingContext(
  office: Pick<Office, "yetki_belgesi_gecerlilik">,
  portfolio: Pick<Portfolio, "eids_durum" | "aciklama">,
  contracts: Pick<ContractRow, "imza_tarihi" | "baslangic" | "bitis">[],
  bugun: Date,
): ListingContext {
  // Öncelik: imzalı ve en geç biten sözleşme
  const sorted = [...contracts].sort((a, b) => {
    const sa = a.imza_tarihi ? 1 : 0;
    const sb = b.imza_tarihi ? 1 : 0;
    if (sa !== sb) return sb - sa;
    return a.bitis < b.bitis ? 1 : -1;
  });
  const c = sorted[0];
  return {
    bugun,
    ofisYetkiBelgesiGecerlilik: office.yetki_belgesi_gecerlilik ?? undefined,
    yetkiSozlesmesi: c ? { imzaTarihi: c.imza_tarihi ?? undefined, baslangic: c.baslangic, bitis: c.bitis } : undefined,
    eidsOnayli: portfolio.eids_durum === "onaylandi",
    ilanMetni: portfolio.aciklama ?? undefined,
  };
}

/**
 * Kapanış bağlamı: DASK / takyidat / müşteriyi tanıma işlemin kontrol
 * listesinden, işlem tutarı işlem bedelinden gelir. Kira işleminde listede
 * takyidat maddesi yoksa gerekli sayılmaz.
 */
export function buildClosingContext(deal: Pick<Deal, "bedel" | "kontrol_listesi">, bugun: Date): ClosingContext {
  const item = (kod: string) => deal.kontrol_listesi.find((i) => i.kod === kod);
  const done = (kod: string) => item(kod)?.tamam === true;
  return {
    islemTutari: deal.bedel,
    daskPolicesiVar: done("dask"),
    takyidatSorgusuGuncel: item("takyidat") ? done("takyidat") : isRentChecklist(deal.kontrol_listesi),
    musteriTanimaTamam: done("kyc"),
    bugun,
  };
}

function isRentChecklist(list: ChecklistItem[]) {
  return list.some((i) => i.kod === "teslim_tutanagi" || i.kod === "depozito");
}

/** Yetki sözleşmesi rozeti: imzalı ve geçerli mi, kaç gün kaldı */
export function contractStatus(
  contracts: Pick<ContractRow, "imza_tarihi" | "bitis">[],
  now: Date,
): { durum: "yok" | "imzasiz" | "gecerli" | "bitiyor" | "doldu"; kalanGun: number | null } {
  if (!contracts.length) return { durum: "yok", kalanGun: null };
  const signed = contracts.filter((c) => c.imza_tarihi).sort((a, b) => (a.bitis < b.bitis ? 1 : -1));
  if (!signed.length) return { durum: "imzasiz", kalanGun: null };
  const kalan = daysUntil(signed[0].bitis, now)!;
  if (kalan < 0) return { durum: "doldu", kalanGun: kalan };
  return { durum: kalan <= 15 ? "bitiyor" : "gecerli", kalanGun: kalan };
}

// ---- Teklifler ------------------------------------------------------------------------------

/**
 * Teklifleri karşı teklif zincirlerine ayırır. Her zincir kök tekliften
 * başlayıp `onceki_teklif_id` bağlarını izler; zincirler en yeni hareket önce sıralanır.
 */
export function offerChains<T extends Pick<Offer, "id" | "onceki_teklif_id" | "created_at">>(offers: T[]): T[][] {
  const byId = new Map(offers.map((o) => [o.id, o]));
  const rootOf = (o: T): T => {
    const seen = new Set<string>();
    let cur = o;
    while (cur.onceki_teklif_id && byId.has(cur.onceki_teklif_id) && !seen.has(cur.id)) {
      seen.add(cur.id);
      cur = byId.get(cur.onceki_teklif_id)!;
    }
    return cur;
  };
  const groups = new Map<string, T[]>();
  for (const o of offers) {
    const r = rootOf(o).id;
    groups.set(r, [...(groups.get(r) ?? []), o]);
  }
  const chains = [...groups.values()].map((g) => g.sort((a, b) => (a.created_at < b.created_at ? -1 : 1)));
  const last = (c: T[]) => c[c.length - 1].created_at;
  return chains.sort((a, b) => (last(a) < last(b) ? 1 : -1));
}

/**
 * Kabul edilen teklif "kabul" olur; diğer zincirlerdeki açık/karşı teklifler
 * reddedilir. Kabul edilen teklifin kendi zincirindeki önceki adımlar
 * (karşı teklifle aşılmış olanlar) olduğu gibi kalır. Dönen: id → yeni durum
 */
export function acceptOfferPatches(offers: Pick<Offer, "id" | "durum" | "onceki_teklif_id">[], acceptedId: string): Record<string, Offer["durum"]> {
  const byId = new Map(offers.map((o) => [o.id, o]));
  const ancestors = new Set<string>();
  let cur = byId.get(acceptedId)?.onceki_teklif_id;
  while (cur && !ancestors.has(cur)) {
    ancestors.add(cur);
    cur = byId.get(cur)?.onceki_teklif_id;
  }
  const out: Record<string, Offer["durum"]> = {};
  for (const o of offers) {
    if (o.id === acceptedId) out[o.id] = "kabul";
    else if (ancestors.has(o.id)) continue;
    else if (o.durum === "acik" || o.durum === "karsi_teklif") out[o.id] = "red";
  }
  return out;
}

/** Süresi geçmiş açık teklif mi */
export function isExpired(o: Pick<Offer, "durum" | "gecerlilik">, now: Date): boolean {
  return o.durum === "acik" && !!o.gecerlilik && new Date(o.gecerlilik).getTime() < now.getTime();
}

// ---- Komisyon paylaşımı ----------------------------------------------------------------------

export interface ExtraShare {
  rol: "portfoy_getiren" | "musteri_getiren" | "referans";
  oran: number;
  userId?: string | null;
}

export const PAY_ROL_ETIKET: Record<string, string> = {
  ofis: "Ofis",
  danisman: "Danışman",
  portfoy_getiren: "Portföy getiren",
  musteri_getiren: "Müşteri getiren",
  referans: "Referans",
};

/**
 * Paylaşım kuralları: önce ek paylar (portföy getiren, müşteri getiren, referans)
 * matrahtan ayrılır, kalan kısım ofis payı oranına göre ofis ve danışman arasında
 * bölünür. Toplam her zaman %100'dür.
 */
export function buildSplitRules(ofisPayi: number, extras: ExtraShare[]): (SplitRule & { userId?: string | null })[] {
  const ekToplam = extras.reduce((a, e) => a + e.oran, 0);
  if (extras.some((e) => e.oran < 0) || ekToplam > 100) {
    throw new RangeError(`Ek paylar toplamı %0–100 arasında olmalı (şu an %${ekToplam})`);
  }
  if (ofisPayi < 0 || ofisPayi > 100) throw new RangeError("Ofis payı %0–100 arasında olmalı");
  const kalan = 100 - ekToplam;
  const ofis = round2((kalan * ofisPayi) / 100);
  const danisman = round2(kalan - ofis);
  return [
    ...extras.filter((e) => e.oran > 0).map((e) => ({ alici: e.rol, oran: e.oran, userId: e.userId ?? null })),
    { alici: "ofis", oran: ofis, userId: null },
    { alici: "danisman", oran: danisman, userId: null },
  ];
}
