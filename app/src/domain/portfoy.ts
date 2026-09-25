/**
 * Portföy modülü yardımcıları — tasarım §5.2.
 *
 * Veritabanı satırlarını (src/data/types) alan motorlarının girdilerine
 * (eşleştirme, sağlık skoru, uyum motoru) dönüştüren saf fonksiyonlar.
 * UI ve depodan bağımsızdır; Vitest ile test edilir.
 */
import type {
  AuthorizationContract,
  Consent,
  Deal,
  DocumentRow,
  Media,
  Offer,
  Office,
  Person,
  Portfolio,
  PortfolioPriceHistory,
  PortfolioStage,
  SearchProfile,
  Showing,
} from "../data/types";
import type { ClosingContext, ListingContext } from "./compliance";
import { norm } from "./import";
import type { Portfolio as MatchPortfolio, SearchProfile as MatchProfile } from "./matching";
import { paramsFor } from "./params";
import type { PortfolioHealthInput } from "./scoring";

const GUN = 86_400_000;

/** Aşama etiketleri (arşiv dahil) */
export const STAGE_LABEL: Record<PortfolioStage, string> = {
  aday: "Aday",
  degerleme: "Değerleme",
  yetki: "Yetki Alındı",
  yayinda: "Yayında",
  teklif: "Teklif",
  kapora: "Kapora",
  tapu: "Tapu Randevusu",
  tamamlandi: "Satıldı / Kiralandı",
  arsiv: "Arşiv",
};

export const TAPU_TURLERI: Record<string, string> = {
  kat_mulkiyeti: "Kat mülkiyeti",
  kat_irtifaki: "Kat irtifakı",
  hisseli: "Hisseli tapu",
  arsa: "Arsa tapusu",
};

export const ISINMA_TURLERI = ["Kombi", "Merkezi", "Merkezi (pay ölçer)", "Yerden ısıtma", "Klima", "Soba", "Isı pompası", "Yok"];

export const PAYLASIM_LABEL: Record<Portfolio["paylasim_seviyesi"], string> = {
  ozel: "Özel (yalnız ben)",
  ofis: "Ofis içi",
  ag: "Ağ / MLS",
};

export const EIDS_LABEL: Record<Portfolio["eids_durum"], string> = {
  yok: "Talep yok",
  talep_edildi: "Malik onayı bekliyor",
  onaylandi: "Onaylı",
  reddedildi: "Reddedildi",
};

function daysBetween(fromIso: string, to: Date): number {
  return Math.floor((to.getTime() - new Date(fromIso).getTime()) / GUN);
}

/** ISO tarih (YYYY-MM-DD) için bugüne göre kalan gün — uyum motoruyla aynı hesap */
export function daysLeft(isoDate: string, bugun: Date): number {
  return Math.ceil((new Date(isoDate + "T23:59:59").getTime() - bugun.getTime()) / GUN);
}

/** Oda etiketi: 3 + 1 salon → "3+1" */
export function odaLabel(p: Pick<Portfolio, "oda" | "salon">): string | null {
  if (p.oda === null || p.oda === undefined) return null;
  return `${p.oda.toLocaleString("tr-TR")}+${p.salon ?? 1}`;
}

// ---- Yetki sözleşmesi --------------------------------------------------------

/**
 * Portföyün geçerli (en son biten) yetki sözleşmesi. İmzalı olanlar önceliklidir;
 * aynı durumdakiler arasında bitişi en geç olan seçilir.
 */
export function currentContract(contracts: AuthorizationContract[]): AuthorizationContract | null {
  if (!contracts.length) return null;
  return [...contracts].sort((a, b) => {
    const s = Number(Boolean(b.imza_tarihi)) - Number(Boolean(a.imza_tarihi));
    if (s !== 0) return s;
    return b.bitis.localeCompare(a.bitis);
  })[0]!;
}

export type YetkiDurum =
  | { durum: "yok" }
  | { durum: "imzasiz"; sozlesme: AuthorizationContract }
  | { durum: "doldu"; sozlesme: AuthorizationContract; kalan: number }
  | { durum: "gecerli"; sozlesme: AuthorizationContract; kalan: number };

export function yetkiDurumu(contracts: AuthorizationContract[], bugun: Date): YetkiDurum {
  const c = currentContract(contracts);
  if (!c) return { durum: "yok" };
  if (!c.imza_tarihi) return { durum: "imzasiz", sozlesme: c };
  const kalan = daysLeft(c.bitis, bugun);
  return kalan < 0 ? { durum: "doldu", sozlesme: c, kalan } : { durum: "gecerli", sozlesme: c, kalan };
}

/** Hizmet bedeli tavanı: satış/devren → % (taraf başı), kiralık → aylık kira katı */
export function commissionCap(ilanTipi: Portfolio["ilan_tipi"], bugun: Date): { deger: number; birim: "%" | "ay"; aciklama: string } {
  const p = paramsFor(bugun);
  if (ilanTipi === "kiralik") {
    return { deger: p.kiraHizmetBedeliTavanAy.deger, birim: "ay", aciklama: p.kiraHizmetBedeliTavanAy.aciklama };
  }
  return { deger: p.satisHizmetBedeliTavanOrani.deger, birim: "%", aciklama: p.satisHizmetBedeliTavanOrani.aciklama };
}

export interface YetkiInput {
  munhasir: boolean;
  oran: number | null;
  baslangic: string;
  bitis: string;
  imzaTarihi: string | null;
}

/** Yetki sözleşmesi formu doğrulaması; hata mesajları alan → metin */
export function validateYetki(v: YetkiInput, ilanTipi: Portfolio["ilan_tipi"], bugun: Date): Record<string, string> {
  const e: Record<string, string> = {};
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso.test(v.baslangic)) e.baslangic = "Başlangıç tarihi girin";
  if (!iso.test(v.bitis)) e.bitis = "Bitiş tarihi girin";
  if (!e.baslangic && !e.bitis && v.bitis <= v.baslangic) e.bitis = "Bitiş, başlangıçtan sonra olmalı";
  if (v.imzaTarihi && !iso.test(v.imzaTarihi)) e.imzaTarihi = "Geçersiz tarih";
  const cap = commissionCap(ilanTipi, bugun);
  if (v.oran !== null) {
    if (!Number.isFinite(v.oran) || v.oran < 0) e.oran = "Geçersiz oran";
    else if (v.oran > cap.deger) {
      e.oran = cap.birim === "%" ? `Yasal tavan %${cap.deger} (+KDV)` : `Yasal tavan ${cap.deger} aylık kira (+KDV)`;
    }
  }
  return e;
}

// ---- Uyum motoru bağlamı -----------------------------------------------------

export function listingContext(
  p: Pick<Portfolio, "eids_durum" | "aciklama" | "baslik">,
  office: Pick<Office, "yetki_belgesi_gecerlilik">,
  contracts: AuthorizationContract[],
  bugun: Date,
): ListingContext {
  const c = currentContract(contracts);
  return {
    bugun,
    ofisYetkiBelgesiGecerlilik: office.yetki_belgesi_gecerlilik ?? undefined,
    yetkiSozlesmesi: c
      ? { imzaTarihi: c.imza_tarihi ?? undefined, baslangic: c.baslangic, bitis: c.bitis }
      : undefined,
    eidsOnayli: p.eids_durum === "onaylandi",
    ilanMetni: [p.baslik, p.aciklama].filter(Boolean).join("\n") || undefined,
  };
}

/** Takyidat sorgusu 30 günden eskiyse güncel sayılmaz */
export const TAKYIDAT_GECERLILIK_GUN = 30;

export function takyidatGuncel(p: Pick<Portfolio, "takyidat">, bugun: Date): boolean {
  const t = p.takyidat?.sorgu_tarihi;
  if (!t) return false;
  return daysBetween(t, bugun) <= TAKYIDAT_GECERLILIK_GUN;
}

export const DASK_SABLON = "dask-policesi";

/** DASK poliçesi kaydı: evrak kasasındaki poliçe belgesi veya işlem kontrol listesi */
export function daskVar(docs: DocumentRow[], deal: Deal | null): boolean {
  if (docs.some((d) => d.sablon === DASK_SABLON && d.durum !== "iptal")) return true;
  return Boolean(deal?.kontrol_listesi.some((k) => k.kod === "dask" && k.tamam));
}

export function closingContext(
  p: Pick<Portfolio, "fiyat" | "takyidat">,
  deal: Deal | null,
  docs: DocumentRow[],
  bugun: Date,
): ClosingContext {
  return {
    islemTutari: deal?.bedel ?? p.fiyat ?? 0,
    daskPolicesiVar: daskVar(docs, deal),
    takyidatSorgusuGuncel: takyidatGuncel(p, bugun),
    musteriTanimaTamam: Boolean(deal?.kontrol_listesi.some((k) => k.kod === "kyc" && k.tamam)),
    bugun,
  };
}

// ---- KVKK --------------------------------------------------------------------

/** Kişinin geçerli (geri alınmamış) aydınlatma kaydı var mı */
export function hasKvkk(personId: string, consents: Consent[]): boolean {
  return consents.some((c) => c.person_id === personId && c.amac === "aydinlatma" && c.verildi && !c.geri_alindi_at);
}

export type KvkkDurum = "malik_yok" | "tamam" | "eksik";

export function ownersKvkk(ownerIds: string[], consents: Consent[]): KvkkDurum {
  if (!ownerIds.length) return "malik_yok";
  return ownerIds.every((id) => hasKvkk(id, consents)) ? "tamam" : "eksik";
}

// ---- Sağlık skoru ------------------------------------------------------------

export function healthInput(
  p: Pick<Portfolio, "aciklama" | "updated_at" | "created_at" | "asama">,
  extra: { media: Pick<Media, "tur">[]; offers: Pick<Offer, "id">[]; yayinBaslangic?: string | null; piyasayaGoreFark?: number },
  bugun: Date,
): PortfolioHealthInput {
  const yayinda = ["yayinda", "teklif", "kapora", "tapu"].includes(p.asama);
  return {
    fotoSayisi: extra.media.filter((m) => m.tur === "foto" || m.tur === "sanal_mobilya").length,
    katPlaniVar: extra.media.some((m) => m.tur === "kat_plani"),
    aciklamaKarakter: (p.aciklama ?? "").trim().length,
    piyasayaGoreFark: extra.piyasayaGoreFark ?? 0,
    sonGuncellemeGun: Math.max(0, daysBetween(p.updated_at, bugun)),
    yayindaGun: yayinda ? Math.max(0, daysBetween(extra.yayinBaslangic ?? p.created_at, bugun)) : 0,
    teklifSayisi: extra.offers.length,
    // Kanal istatistikleri (portal entegrasyonu) henüz yok
    goruntulenme: 0,
    arama: 0,
  };
}

// ---- Eşleştirme --------------------------------------------------------------

export function toMatchPortfolio(p: Portfolio): MatchPortfolio | null {
  if (p.fiyat === null || p.fiyat === undefined || !p.ilce) return null;
  return {
    id: p.id,
    fiyat: p.fiyat,
    ilce: p.ilce,
    mahalle: p.mahalle ?? "",
    oda: p.oda ?? 0,
    netM2: p.net_m2 ?? p.brut_m2 ?? 0,
    kat: p.kat ?? undefined,
    krediyeUygun: Boolean(p.krediye_uygun),
    ozellikler: p.ozellikler ?? [],
  };
}

export function toMatchProfile(s: SearchProfile): MatchProfile {
  return {
    butceMin: s.butce_min ?? undefined,
    butceMax: s.butce_max,
    butceTolerans: s.butce_tolerans ?? undefined,
    ilceler: s.ilceler ?? [],
    mahalleler: s.mahalleler ?? [],
    odaMin: s.oda_min ?? undefined,
    m2Min: s.m2_min ?? undefined,
    krediKullanacak: s.kredi_kullanacak,
    zorunlu: s.zorunlu ?? [],
    tercih: s.tercih ?? [],
  };
}

// ---- Liste filtreleme --------------------------------------------------------

export interface PortfolioFilter {
  ilanTipi: Portfolio["ilan_tipi"] | "tumu";
  ilce: string | "tumu";
  asama: PortfolioStage | "tumu" | "aktif";
  q: string;
  siralama: "guncel" | "fiyat_artan" | "fiyat_azalan" | "saglik" | "yeni";
}

export const DEFAULT_FILTER: PortfolioFilter = { ilanTipi: "tumu", ilce: "tumu", asama: "aktif", q: "", siralama: "guncel" };

export function filterPortfolios<T extends Portfolio>(rows: T[], f: PortfolioFilter, score: (p: T) => number = (p) => p.saglik_skoru ?? 0): T[] {
  const q = norm(f.q.trim());
  const out = rows.filter((p) => {
    if (f.ilanTipi !== "tumu" && p.ilan_tipi !== f.ilanTipi) return false;
    if (f.ilce !== "tumu" && p.ilce !== f.ilce) return false;
    if (f.asama === "aktif") {
      if (p.asama === "arsiv") return false;
    } else if (f.asama !== "tumu" && p.asama !== f.asama) return false;
    if (q) {
      const hay = norm([p.baslik, p.il, p.ilce, p.mahalle, p.adres, p.ada && `${p.ada}/${p.parsel}`, p.id.slice(0, 8), odaLabel(p)].filter(Boolean).join(" "));
      if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  const fiyat = (p: T) => p.fiyat ?? Number.POSITIVE_INFINITY;
  const cmp: Record<PortfolioFilter["siralama"], (a: T, b: T) => number> = {
    guncel: (a, b) => b.updated_at.localeCompare(a.updated_at),
    yeni: (a, b) => b.created_at.localeCompare(a.created_at),
    fiyat_artan: (a, b) => fiyat(a) - fiyat(b),
    fiyat_azalan: (a, b) => (b.fiyat ?? -1) - (a.fiyat ?? -1),
    saglik: (a, b) => score(a) - score(b),
  };
  return [...out].sort(cmp[f.siralama]);
}

// ---- Evrak kontrol listesi -----------------------------------------------------

export interface EvrakItem {
  kod: "yetki" | "dask" | "iskan" | "kvkk" | "takyidat" | "tapu";
  baslik: string;
  tamam: boolean;
  zorunlu: boolean;
  detay: string;
}

export function evrakListesi(
  input: {
    portfolio: Pick<Portfolio, "iskan_var" | "takyidat" | "ada" | "parsel" | "tapu_turu" | "emlak_tipi">;
    contracts: AuthorizationContract[];
    docs: DocumentRow[];
    deal: Deal | null;
    ownerIds: string[];
    consents: Consent[];
  },
  bugun: Date,
): EvrakItem[] {
  const { portfolio: p } = input;
  const y = yetkiDurumu(input.contracts, bugun);
  const kvkk = ownersKvkk(input.ownerIds, input.consents);
  const tk = p.takyidat?.sorgu_tarihi;
  const arsaMi = ["arsa", "tarla"].includes(p.emlak_tipi);
  const items: EvrakItem[] = [
    {
      kod: "tapu",
      baslik: "Tapu bilgileri (ada / parsel)",
      tamam: Boolean(p.ada && p.parsel),
      zorunlu: true,
      detay: p.ada && p.parsel ? `Ada ${p.ada} / Parsel ${p.parsel}` : "Ada ve parsel girilmemiş",
    },
    {
      kod: "yetki",
      baslik: "Yetki sözleşmesi (imzalı)",
      tamam: y.durum === "gecerli",
      zorunlu: true,
      detay:
        y.durum === "yok"
          ? "Sözleşme yok"
          : y.durum === "imzasiz"
            ? "Sözleşme imzalanmamış"
            : y.durum === "doldu"
              ? "Süresi dolmuş"
              : `${y.kalan} gün geçerli`,
    },
    {
      kod: "takyidat",
      baslik: "Takyidat sorgusu (ipotek / haciz / şerh)",
      tamam: takyidatGuncel(p, bugun),
      zorunlu: true,
      detay: tk ? `Son sorgu: ${tk}${takyidatGuncel(p, bugun) ? "" : ` (${TAKYIDAT_GECERLILIK_GUN} günden eski)`}` : "Sorgu tarihi yok",
    },
    {
      kod: "kvkk",
      baslik: "Malik KVKK aydınlatma / rıza",
      tamam: kvkk === "tamam",
      zorunlu: true,
      detay: kvkk === "malik_yok" ? "Malik eklenmemiş" : kvkk === "tamam" ? "Tüm maliklerde kayıtlı" : "Bir veya daha fazla malikte eksik",
    },
    {
      kod: "dask",
      baslik: "DASK poliçesi",
      tamam: daskVar(input.docs, input.deal),
      zorunlu: !arsaMi,
      detay: daskVar(input.docs, input.deal) ? "Kayıtlı" : arsaMi ? "Arsada gerekmez" : "Tapu devrinden önce zorunlu",
    },
  ];
  if (!arsaMi) {
    items.push({
      kod: "iskan",
      baslik: "İskân (yapı kullanma izni)",
      tamam: p.iskan_var === true,
      zorunlu: false,
      detay: p.iskan_var === true ? "Var" : p.iskan_var === false ? "Yok — konut kredisi kullanılamaz" : "Bilinmiyor",
    });
  }
  return items;
}

// ---- Performans ----------------------------------------------------------------

export interface Performance {
  ilandaGun: number;
  fiyatDegisimi: number;
  ilkFiyat: number | null;
  sonFiyat: number | null;
  degisimYuzde: number | null;
  gosterim: number;
  gosterimSon7: number;
  teklif: number;
  ortPuan: number | null;
}

export function performance(
  p: Pick<Portfolio, "created_at" | "fiyat">,
  history: Pick<PortfolioPriceHistory, "fiyat" | "created_at">[],
  showings: Pick<Showing, "durum" | "planlanan" | "geri_bildirim">[],
  offers: Pick<Offer, "id">[],
  bugun: Date,
): Performance {
  const h = [...history].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const ilk = h[0]?.fiyat ?? p.fiyat ?? null;
  const son = p.fiyat ?? h[h.length - 1]?.fiyat ?? null;
  const tamam = showings.filter((s) => s.durum === "tamamlandi");
  const puanlar = tamam.map((s) => s.geri_bildirim?.puan).filter((x): x is number => typeof x === "number");
  const hafta = bugun.getTime() - 7 * GUN;
  return {
    ilandaGun: Math.max(0, daysBetween(p.created_at, bugun)),
    fiyatDegisimi: Math.max(0, h.length - 1),
    ilkFiyat: ilk,
    sonFiyat: son,
    degisimYuzde: ilk && son ? Math.round(((son - ilk) / ilk) * 1000) / 10 : null,
    gosterim: tamam.length,
    gosterimSon7: tamam.filter((s) => new Date(s.planlanan).getTime() >= hafta).length,
    teklif: offers.length,
    ortPuan: puanlar.length ? Math.round((puanlar.reduce((a, b) => a + b, 0) / puanlar.length) * 10) / 10 : null,
  };
}

// ---- Mesaj metinleri -----------------------------------------------------------

const TL = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });

function ilkAd(ad: string | undefined) {
  return ad?.trim().split(/\s+/)[0] ?? "";
}

export function eidsGuidanceText(input: {
  malikAd?: string;
  ofisUnvan: string;
  yetkiBelgesiNo?: string | null;
  vergiNo?: string | null;
  portfoyAdi: string;
  adaParsel?: string | null;
  danismanAd: string;
}): string {
  const selam = input.malikAd ? `Merhaba ${ilkAd(input.malikAd)} Hanım/Bey,` : "Merhaba,";
  const lines = [
    selam,
    "",
    `${input.portfoyAdi} için ilan yayınlayabilmemiz amacıyla, mevzuat gereği taşınmazınız için Elektronik İlan Doğrulama Sistemi (EİDS) üzerinden işletmemize yetki vermeniz gerekiyor. İşlem yaklaşık 3 dakika sürer:`,
    "",
    "1) turkiye.gov.tr adresine e-Devlet şifrenizle giriş yapın.",
    "2) Arama kutusuna “Elektronik İlan Doğrulama” yazın ve Ticaret Bakanlığı’nın hizmetini açın.",
    "3) “Yetkilendirme” adımında tapudaki taşınmazınızı seçin" + (input.adaParsel ? ` (${input.adaParsel}).` : "."),
    `4) Yetki verilecek işletme olarak ${input.ofisUnvan} seçin` +
      (input.yetkiBelgesiNo ? ` (yetki belgesi no: ${input.yetkiBelgesiNo}` + (input.vergiNo ? `, vergi no: ${input.vergiNo})` : ")") : input.vergiNo ? ` (vergi no: ${input.vergiNo})` : "") +
      ".",
    "5) Süreyi yetki sözleşmemizin bitiş tarihine göre seçip onaylayın.",
    "",
    "Onay verdikten sonra bu mesaja “tamam” yazmanız yeterli. Takıldığınız bir adım olursa hemen arayabilirim.",
    "",
    `${input.danismanAd} — ${input.ofisUnvan}`,
  ];
  return lines.join("\n");
}

export function ownerReportText(input: {
  malikAd?: string;
  portfoyAdi: string;
  fiyat?: number | null;
  perf: Performance;
  geriBildirimler: string[];
  oneriler: string[];
  yetkiKalan?: number | null;
  danismanAd: string;
  ofisUnvan: string;
  bugun: Date;
}): string {
  const p = input.perf;
  const tarih = input.bugun.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  const out: string[] = [];
  out.push(input.malikAd ? `Merhaba ${ilkAd(input.malikAd)} Hanım/Bey,` : "Merhaba,");
  out.push("");
  out.push(`${input.portfoyAdi} için ${tarih} tarihli haftalık durum raporunuz:`);
  out.push("");
  if (input.fiyat) out.push(`• Güncel fiyat: ${TL.format(input.fiyat)}`);
  out.push(`• Portföyde geçen süre: ${p.ilandaGun} gün`);
  out.push(`• Bu hafta yapılan gösterim: ${p.gosterimSon7} (toplam ${p.gosterim})`);
  out.push(`• Alınan teklif: ${p.teklif}`);
  if (p.ortPuan !== null) out.push(`• Ziyaretçilerin ortalama puanı: ${p.ortPuan.toLocaleString("tr-TR")}/5`);
  if (p.fiyatDegisimi > 0 && p.degisimYuzde !== null) {
    out.push(`• Fiyat değişikliği: ${p.fiyatDegisimi} kez (toplam %${p.degisimYuzde.toLocaleString("tr-TR")})`);
  }
  if (input.geriBildirimler.length) {
    out.push("");
    out.push("Ziyaretçi geri bildirimleri:");
    input.geriBildirimler.slice(0, 5).forEach((g) => out.push(`– ${g}`));
  }
  if (input.oneriler.length) {
    out.push("");
    out.push("Önerilerimiz:");
    input.oneriler.slice(0, 3).forEach((o) => out.push(`– ${o}`));
  }
  if (input.yetkiKalan !== null && input.yetkiKalan !== undefined && input.yetkiKalan <= 30) {
    out.push("");
    out.push(`Yetki sözleşmemizin bitmesine ${input.yetkiKalan} gün kaldı; yenileme için sizi arayacağım.`);
  }
  out.push("");
  out.push("Sorularınız için her zaman ulaşabilirsiniz.");
  out.push(`${input.danismanAd} — ${input.ofisUnvan}`);
  return out.join("\n");
}

/** wa.me bağlantısı için telefon: TR numaralarını 90 ile, yabancıları olduğu gibi */
export function waNumber(tel: string): string {
  const t = tel.trim();
  const d = t.replace(/\D/g, "");
  if (t.startsWith("+")) return d;
  if (d.startsWith("90") && d.length === 12) return d;
  if (d.startsWith("0")) return "9" + d;
  if (d.length === 10) return "90" + d;
  return d;
}

export function waLink(tel: string | null | undefined, text: string): string {
  const n = tel ? waNumber(tel) : "";
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

/** Portföy adı: başlık yoksa konum + oda */
export function portfolioName(p: Pick<Portfolio, "baslik" | "mahalle" | "ilce" | "oda" | "salon" | "emlak_tipi">): string {
  if (p.baslik?.trim()) return p.baslik.trim();
  const parts = [p.mahalle || p.ilce, odaLabel(p), p.emlak_tipi].filter(Boolean);
  return parts.join(" ") || "Adsız portföy";
}

export function ownersOf(ownerRows: { person_id: string }[], persons: Person[]): Person[] {
  const ids = new Set(ownerRows.map((o) => o.person_id));
  return persons.filter((p) => ids.has(p.id));
}
