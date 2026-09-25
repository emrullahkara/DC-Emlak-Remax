/**
 * Kokpit — tasarım §5.1: "Bugün ne yapmalıyım? Param nerede? Ne tehlikede?"
 *
 * Saf fonksiyonlar: veri katmanından gelen satırları alır, önceliklendirilmiş
 * aksiyon listesi, beklenen komisyon ve hedef gerçekleşmesini hesaplar.
 * UI ve veritabanından bağımsızdır; `now` her zaman dışarıdan verilir.
 */
import type {
  Activity,
  AuthorizationContract,
  CommissionLineRow,
  Deal,
  DocumentRow,
  FsboListingRow,
  Media,
  Offer,
  Office,
  Person,
  Portfolio,
  PortfolioStage,
  Showing,
} from "@/data/types";
import { evaluateListingPublish } from "./compliance";
import { round2 } from "./money";
import { paramsFor } from "./params";
import { fsboScore, portfolioHealth } from "./scoring";

// ---- Tipler ------------------------------------------------------------------

export type ActionKind = "uyum" | "yetki_belgesi" | "yetki_bitis" | "gosterim" | "gorev" | "soguyan" | "fsbo" | "fiyat";
export type ActionLevel = "ENGELLE" | "UYAR" | "BILGI";

export interface TodayAction {
  /** Kararlı anahtar (liste render'ı ve testler için) */
  id: string;
  kind: ActionKind;
  level: ActionLevel;
  /** 0–100; büyük olan önce */
  priority: number;
  title: string;
  detail?: string;
  href: string;
  /** Mevzuat/uyum uyarısı mı (Kokpit'teki uyum sayacına girer) */
  compliance: boolean;
  /** Varsa zamanlı aksiyonun saati (gösterim, görev) */
  at?: string;
}

export type KokpitScope = "benim" | "ofis";

export interface KokpitInput {
  office: Pick<Office, "yetki_belgesi_gecerlilik">;
  userId: string;
  scope: KokpitScope;
  portfolios: Portfolio[];
  contracts: AuthorizationContract[];
  showings: Showing[];
  persons: Person[];
  activities: Activity[];
  fsbo: FsboListingRow[];
  /** Gösterimlere bağlı yer gösterme belgeleri */
  documents?: DocumentRow[];
  offers?: Offer[];
  media?: Media[];
}

// ---- Tarih yardımcıları ------------------------------------------------------------

const DAY = 86_400_000;

/** Yerel takvim günü başlangıcı */
export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** "2026-10-10" gibi bir tarihin bugüne göre takvim günü farkı (pozitif = gelecekte) */
export function calendarDaysUntil(isoDate: string, now: Date): number {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / DAY);
}

/** Bir zaman damgasından bu yana geçen tam gün sayısı (takvim günü) */
export function daysSince(iso: string, now: Date): number {
  const a = new Date(iso);
  const d0 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const d1 = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d1 - d0) / DAY);
}

function sameLocalDay(iso: string, now: Date) {
  const a = new Date(iso);
  return a.getFullYear() === now.getFullYear() && a.getMonth() === now.getMonth() && a.getDate() === now.getDate();
}

function hhmm(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ---- Sabitler ------------------------------------------------------------------

/** Yayın kapısının değerlendirildiği aşamalar */
const YAYIN_ASAMALARI: PortfolioStage[] = ["yetki", "yayinda"];
/** Yetki sözleşmesinin hâlâ önemli olduğu aşamalar */
const AKTIF_ASAMALAR: PortfolioStage[] = ["yetki", "yayinda", "teklif", "kapora", "tapu"];
/** Müşteri (alıcı tarafı) kişi tipleri — soğuma takibi bunlar için yapılır */
const MUSTERI_TIPLERI = ["alici", "kiraci", "yatirimci", "yabanci_alici"];

export const SOGUMA_GUN = 14;
export const FSBO_SICAK_ESIK = 60;
export const SAGLIK_REVIZYON_ESIK = 60;

/** Aşama olasılıkları (beklenen komisyon için) — prototiple aynı */
export const ASAMA_OLASILIK: Partial<Record<PortfolioStage, number>> = {
  aday: 0.05,
  degerleme: 0.1,
  yetki: 0.25,
  yayinda: 0.35,
  teklif: 0.6,
  kapora: 0.85,
  tapu: 0.95,
};

// ---- Sağlık skoru girdisi -------------------------------------------------------

/** Portföy satırından sağlık skoru girdisi üretir (bilinmeyen metrikler nötr kabul edilir) */
export function healthInputFor(p: Portfolio, now: Date, media: Media[] = [], offers: Offer[] = []) {
  const m = media.filter((x) => x.portfolio_id === p.id);
  return {
    fotoSayisi: m.filter((x) => x.tur === "foto").length,
    katPlaniVar: m.some((x) => x.tur === "kat_plani"),
    aciklamaKarakter: (p.aciklama ?? "").length,
    piyasayaGoreFark: 0,
    sonGuncellemeGun: Math.max(0, daysSince(p.updated_at, now)),
    yayindaGun: Math.max(0, daysSince(p.created_at, now)),
    teklifSayisi: offers.filter((o) => o.portfolio_id === p.id).length,
    goruntulenme: 0,
    arama: 0,
  };
}

// ---- Aksiyon üretimi ---------------------------------------------------------------

function inScope<T>(scope: KokpitScope, userId: string, owner: (x: T) => string | null | undefined) {
  return (x: T) => scope === "ofis" || owner(x) === userId;
}

/** Bir sözleşmenin en güncel (bitişi en geç) imzalı olanını seçer */
function latestContract(contracts: AuthorizationContract[], portfolioId: string) {
  return contracts
    .filter((c) => c.portfolio_id === portfolioId)
    .sort((a, b) => (a.bitis < b.bitis ? 1 : -1))
    .sort((a, b) => Number(Boolean(b.imza_tarihi)) - Number(Boolean(a.imza_tarihi)))[0];
}

export function buildTodayActions(input: KokpitInput, now: Date): TodayAction[] {
  const out: TodayAction[] = [];
  const { userId, scope } = input;
  const params = paramsFor(now);
  const esikler = [...params.yetkiBitisUyariGun.deger].sort((a, b) => a - b);
  const enUzun = esikler[esikler.length - 1] ?? 30;

  const portfolios = input.portfolios.filter(inScope<Portfolio>(scope, userId, (p) => p.owner_id));
  const pById = new Map(input.portfolios.map((p) => [p.id, p]));
  const personById = new Map(input.persons.map((p) => [p.id, p]));
  const baslik = (p: Portfolio) => p.baslik || `${p.mahalle ?? p.ilce ?? ""} ${p.emlak_tipi}`.trim();

  // 1) İşletme yetki belgesi (ofis düzeyinde tek aksiyon)
  const belge = input.office.yetki_belgesi_gecerlilik;
  const belgeKalan = belge ? calendarDaysUntil(belge, now) : null;
  const yayinaGiden = portfolios.filter((p) => YAYIN_ASAMALARI.includes(p.asama));
  if (belgeKalan === null || belgeKalan < 0) {
    out.push({
      id: "ofis:yetki_belgesi",
      kind: "yetki_belgesi",
      level: "ENGELLE",
      priority: 99,
      title: belgeKalan === null ? "İşletme yetki belgesi girilmemiş" : "İşletme yetki belgesinin süresi dolmuş",
      detail: `Geçerli taşınmaz ticareti yetki belgesi olmadan ilan yayınlanamaz${yayinaGiden.length ? ` (${yayinaGiden.length} portföy etkileniyor)` : ""}.`,
      href: "/ayarlar",
      compliance: true,
    });
  } else if (belgeKalan <= enUzun) {
    out.push({
      id: "ofis:yetki_belgesi",
      kind: "yetki_belgesi",
      level: "UYAR",
      priority: 80,
      title: `İşletme yetki belgesi ${belgeKalan} gün içinde bitiyor`,
      detail: "Yenileme başvurusunu Ticaret İl Müdürlüğü'ne zamanında yapın.",
      href: "/ayarlar",
      compliance: true,
    });
  }

  // 2) Yayın kapısı (EİDS, yetki sözleşmesi, ilan metni)
  for (const p of yayinaGiden) {
    const c = latestContract(input.contracts, p.id);
    const ev = evaluateListingPublish({
      bugun: now,
      // Ofis belgesi yukarıda tek aksiyon olarak ele alındı
      ofisYetkiBelgesiGecerlilik: "9999-12-31",
      yetkiSozlesmesi: c ? { imzaTarihi: c.imza_tarihi ?? undefined, baslangic: c.baslangic, bitis: c.bitis } : undefined,
      eidsOnayli: p.eids_durum === "onaylandi",
      ilanMetni: p.aciklama ?? undefined,
    });
    // Süre uyarıları ve süresi dolmuş imzalı sözleşme 3. adımda ele alınır
    const imzali = Boolean(c?.imza_tarihi);
    const sonuclar = ev.sonuclar.filter((r) => r.kural !== "YETKI_SOZLESMESI_SURE" && !(r.kural === "YETKI_SOZLESMESI" && imzali));
    if (!sonuclar.length) continue;
    const engel = sonuclar.some((r) => r.karar === "ENGELLE");
    const yayinda = p.asama === "yayinda";
    out.push({
      id: `uyum:${p.id}`,
      kind: "uyum",
      level: engel ? "ENGELLE" : "UYAR",
      // Yayındaki ilanda engel en acil durumdur; yetki aşamasında yayına çıkışı bekletir
      priority: engel ? (yayinda ? 98 : 90) : 65,
      title: engel ? `${baslik(p)} — ${yayinda ? "yayında ama uyum eksik" : "yayına çıkamaz"}` : `${baslik(p)} — ilan uyarısı`,
      detail: sonuclar.map((r) => r.mesaj).join(" · "),
      href: `/portfoyler/${p.id}`,
      compliance: true,
    });
  }

  // 3) Yetki sözleşmesi bitişleri (30/15/7 gün)
  for (const p of portfolios.filter((x) => AKTIF_ASAMALAR.includes(x.asama))) {
    const c = latestContract(input.contracts, p.id);
    if (!c || !c.imza_tarihi) continue;
    const kalan = calendarDaysUntil(c.bitis, now);
    if (kalan < 0) {
      out.push({
        id: `yetki:${p.id}`,
        kind: "yetki_bitis",
        level: "ENGELLE",
        priority: 96,
        title: `Yetki sözleşmesinin süresi doldu — ${baslik(p)}`,
        detail: `${-kalan} gün önce bitti. Yenilenmeden ilan yayında kalamaz.`,
        href: `/portfoyler/${p.id}`,
        compliance: true,
      });
      continue;
    }
    const kova = esikler.find((e) => kalan <= e);
    if (kova === undefined) continue;
    out.push({
      id: `yetki:${p.id}`,
      kind: "yetki_bitis",
      level: "UYAR",
      // 7 gün → 83, 15 gün → 75, 30 gün → 60
      priority: Math.round(90 - (kova / enUzun) * 30),
      title: kalan === 0 ? `Yetki sözleşmesi bugün bitiyor — ${baslik(p)}` : `Yetki sözleşmesi ${kalan} gün içinde bitiyor — ${baslik(p)}`,
      detail: `${kova} gün uyarısı · mal sahibiyle yenilemeyi görüşün`,
      href: `/portfoyler/${p.id}`,
      compliance: true,
    });
  }

  // 4) Bugünkü gösterimler
  const docById = new Map((input.documents ?? []).map((d) => [d.id, d]));
  for (const s of input.showings) {
    if (s.durum !== "planli" || !sameLocalDay(s.planlanan, now)) continue;
    if (scope === "benim" && s.agent_id !== userId) continue;
    const p = pById.get(s.portfolio_id);
    const kisi = personById.get(s.person_id);
    const doc = s.yer_gosterme_belgesi_id ? docById.get(s.yer_gosterme_belgesi_id) : undefined;
    const belgeTamam = doc?.durum === "imzalandi";
    const dakika = new Date(s.planlanan).getHours() * 60 + new Date(s.planlanan).getMinutes();
    out.push({
      id: `gosterim:${s.id}`,
      kind: "gosterim",
      level: belgeTamam ? "BILGI" : "UYAR",
      // Belgesi eksik olan önce; aynı gruptakiler saate göre
      priority: (belgeTamam ? 80 : 90) - dakika / 1440,
      title: `${hhmm(s.planlanan)} Gösterim · ${p ? baslik(p) : "Portföy"}`,
      detail: [kisi?.ad_soyad, belgeTamam ? "Yer gösterme belgesi imzalı" : s.yer_gosterme_belgesi_id ? "Yer gösterme belgesi imza bekliyor" : "Yer gösterme belgesi hazırlanmadı"]
        .filter(Boolean)
        .join(" · "),
      href: "/takvim",
      compliance: !belgeTamam,
      at: s.planlanan,
    });
  }

  // 5) Gecikmiş ve bugünkü görevler
  const gunSonu = startOfDay(now).getTime() + DAY;
  const gunBasi = startOfDay(now).getTime();
  for (const a of input.activities) {
    if (a.tur !== "gorev" || a.tamamlandi || !a.vade) continue;
    if (scope === "benim" && a.user_id !== userId) continue;
    const t = new Date(a.vade).getTime();
    if (t >= gunSonu) continue;
    const gecikti = t < gunBasi;
    const kisi = a.person_id ? personById.get(a.person_id) : undefined;
    const p = a.portfolio_id ? pById.get(a.portfolio_id) : undefined;
    out.push({
      id: `gorev:${a.id}`,
      kind: "gorev",
      level: gecikti ? "UYAR" : "BILGI",
      priority: gecikti ? 92 : 85 - (new Date(a.vade).getHours() * 60 + new Date(a.vade).getMinutes()) / 1440,
      title: a.icerik || "Görev",
      detail: [gecikti ? `Gecikti · ${daysSince(a.vade, now)} gün` : `Bugün ${hhmm(a.vade)}`, kisi?.ad_soyad, p ? baslik(p) : undefined].filter(Boolean).join(" · "),
      href: kisi ? `/musteriler/${kisi.id}` : p ? `/portfoyler/${p.id}` : "/takvim",
      compliance: false,
      at: a.vade,
    });
  }

  // 6) Soğuyan müşteriler
  for (const k of input.persons) {
    if (!k.tipler.some((t) => MUSTERI_TIPLERI.includes(t))) continue;
    if (scope === "benim" && k.owner_id !== userId) continue;
    const temas = k.son_temas ?? null;
    const gun = temas ? daysSince(temas, now) : daysSince(k.created_at, now);
    const uzun = gun > SOGUMA_GUN;
    const adimYok = !k.sonraki_adim;
    if (!uzun && !adimYok) continue;
    // Yeni eklenen ve henüz temas kurulmamış kişiyi ilk gün uyarma
    if (!uzun && !temas && gun < 1) continue;
    const isi = k.isi_skoru ?? 50;
    const nedenler = [uzun ? (temas ? `${gun} gündür temas yok` : `${gun} gündür hiç temas kaydı yok`) : null, adimYok ? "sonraki adım planlanmamış" : null].filter(Boolean);
    out.push({
      id: `soguyan:${k.id}`,
      kind: "soguyan",
      level: uzun ? "UYAR" : "BILGI",
      priority: (uzun ? 70 + Math.min(8, (gun - SOGUMA_GUN) / 2) : 55) + isi / 50,
      title: uzun ? `${k.ad_soyad} soğuyor` : `${k.ad_soyad} için sonraki adımı planlayın`,
      detail: nedenler.join(" · "),
      href: `/musteriler/${k.id}`,
      compliance: false,
    });
  }

  // 7) Sıcak FSBO ilanları
  for (const f of input.fsbo) {
    if (f.durum === "yetki_alindi" || f.durum === "vazgecildi") continue;
    if (f.atanan_id && f.atanan_id !== userId) continue;
    const s = fsboScore({
      ilanYasiGun: Math.max(0, daysSince(f.ilk_gorulme, now)),
      fiyatDusumSayisi: f.fiyat_dusum_sayisi ?? 0,
      piyasayaGoreFark: f.piyasaya_gore_fark ?? 0,
      aciklama: [f.baslik, f.aciklama].filter(Boolean).join(" "),
      fotoSayisi: f.foto_sayisi ?? 6,
    });
    if (s.puan < FSBO_SICAK_ESIK) continue;
    out.push({
      id: `fsbo:${f.id}`,
      kind: "fsbo",
      level: "BILGI",
      priority: 50 + s.puan / 5,
      title: `FSBO ara: ${f.malik_ad ? `${f.malik_ad} — ` : ""}${f.baslik ?? "Sahibinden ilan"} (skor ${s.puan})`,
      detail: s.sinyaller.join(" · "),
      href: "/fsbo",
      compliance: false,
    });
  }

  // 8) Fiyat revizyonu önerileri
  for (const p of portfolios.filter((x) => x.asama === "yayinda")) {
    const h = portfolioHealth(healthInputFor(p, now, input.media, input.offers));
    if (h.puan >= SAGLIK_REVIZYON_ESIK) continue;
    out.push({
      id: `fiyat:${p.id}`,
      kind: "fiyat",
      level: "UYAR",
      priority: 50 + (SAGLIK_REVIZYON_ESIK - h.puan) / 2,
      title: `Fiyat revizyonu önerisi: ${baslik(p)}`,
      detail: `Sağlık ${h.puan}/100 · ${h.sinyaller.slice(0, 2).join(" · ")}`,
      href: `/portfoyler/${p.id}`,
      compliance: false,
    });
  }

  return out.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}

/** Uyum uyarısı sayısı (Kokpit rozeti) */
export function complianceAlertCount(actions: TodayAction[]): number {
  return actions.filter((a) => a.compliance && a.level !== "BILGI").length;
}

// ---- Para: beklenen komisyon, hat özeti, hedef ------------------------------------------

/** Bir portföy kapanırsa ofise gelecek hizmet bedeli (KDV hariç, iki taraf) */
export function potentialCommission(p: Portfolio, contract: AuthorizationContract | undefined, now: Date): number {
  if (!p.fiyat || p.fiyat <= 0) return 0;
  const params = paramsFor(now);
  if (p.ilan_tipi === "kiralik") return round2(p.fiyat * params.kiraHizmetBedeliTavanAy.deger);
  const tavan = params.satisHizmetBedeliTavanOrani.deger;
  const saticiOran = Math.min(tavan, contract?.hizmet_bedeli_orani ?? tavan);
  // Alıcı tarafı: yasal tavan varsayılır
  return round2((p.fiyat * (saticiOran + tavan)) / 100);
}

export interface PipelineStage {
  asama: PortfolioStage;
  adet: number;
  beklenen: number;
}

export interface PipelineSummary {
  asamalar: PipelineStage[];
  beklenenToplam: number;
  kayitSayisi: number;
}

export const HAT_ASAMALARI: PortfolioStage[] = ["aday", "degerleme", "yetki", "yayinda", "teklif", "kapora", "tapu"];

export function pipelineSummary(
  portfolios: Portfolio[],
  contracts: AuthorizationContract[],
  now: Date,
  scope: KokpitScope = "ofis",
  userId = "",
): PipelineSummary {
  const list = portfolios.filter(inScope<Portfolio>(scope, userId, (p) => p.owner_id));
  const asamalar = HAT_ASAMALARI.map((asama) => {
    const ps = list.filter((p) => p.asama === asama);
    const olasilik = ASAMA_OLASILIK[asama] ?? 0;
    const beklenen = round2(ps.reduce((t, p) => t + potentialCommission(p, latestContract(contracts, p.id), now) * olasilik, 0));
    return { asama, adet: ps.length, beklenen };
  });
  return {
    asamalar,
    beklenenToplam: round2(asamalar.reduce((t, a) => t + a.beklenen, 0)),
    kayitSayisi: asamalar.reduce((t, a) => t + a.adet, 0),
  };
}

/**
 * Bu ay gerçekleşen ciro: bu ay oluşturulan işlemlerin hizmet bedeli matrahı
 * (KDV hariç). "benim" kapsamında yalnızca kullanıcının portföylerindeki işlemler.
 */
export function monthlyRealized(
  deals: Deal[],
  lines: CommissionLineRow[],
  now: Date,
  opts: { scope?: KokpitScope; userId?: string; portfolios?: Portfolio[] } = {},
): number {
  const owner = new Map((opts.portfolios ?? []).map((p) => [p.id, p.owner_id]));
  const ids = new Set(
    deals
      .filter((d) => {
        const c = new Date(d.created_at);
        if (c.getFullYear() !== now.getFullYear() || c.getMonth() !== now.getMonth()) return false;
        return opts.scope !== "benim" || owner.get(d.portfolio_id) === opts.userId;
      })
      .map((d) => d.id),
  );
  return round2(lines.filter((l) => ids.has(l.deal_id)).reduce((t, l) => t + Number(l.matrah || 0), 0));
}

export interface TargetProgress {
  hedef: number;
  gerceklesen: number;
  oran: number; // 0–100 (kırpılmış)
  kalan: number;
  kalanGun: number;
}

export function targetProgress(hedef: number, gerceklesen: number, now: Date): TargetProgress {
  const ayGun = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return {
    hedef,
    gerceklesen,
    oran: hedef > 0 ? Math.min(100, Math.round((gerceklesen / hedef) * 100)) : 0,
    kalan: Math.max(0, round2(hedef - gerceklesen)),
    kalanGun: ayGun - now.getDate(),
  };
}
