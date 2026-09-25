/**
 * Rapor & Analitik hesapları — tasarım §5.16. Saf fonksiyonlar; arayüz yalnızca çizer.
 */
import type {
  CommissionLineRow,
  ComplianceLogRow,
  Deal,
  FsboListingRow,
  FsboStatus,
  Offer,
  OfficeMember,
  Person,
  Portfolio,
  PortfolioStage,
  Showing,
} from "@/data/types";

export interface Datum {
  key: string;
  label: string;
  value: number;
}

export const STAGE_LABELS: Record<PortfolioStage, string> = {
  aday: "Aday",
  degerleme: "Değerleme",
  yetki: "Yetki",
  yayinda: "Yayında",
  teklif: "Teklif",
  kapora: "Kapora",
  tapu: "Tapu",
  tamamlandi: "Tamamlandı",
  arsiv: "Arşiv",
};

export const FSBO_LABELS: Record<FsboStatus, string> = {
  yeni: "Yeni",
  arandi: "Arandı",
  gorusuldu: "Görüşüldü",
  degerleme: "Değerleme",
  yetki_alindi: "Yetki alındı",
  vazgecildi: "Vazgeçildi",
};

const AY = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

/** Aşama sırasına göre portföy sayısı (boş aşamalar dahil, arşiv hariç isteğe bağlı) */
export function portfoliosByStage(rows: Pick<Portfolio, "asama">[], opts: { arsivDahil?: boolean } = {}): Datum[] {
  const stages = (Object.keys(STAGE_LABELS) as PortfolioStage[]).filter((s) => opts.arsivDahil || s !== "arsiv");
  return stages.map((s) => ({ key: s, label: STAGE_LABELS[s], value: rows.filter((r) => r.asama === s).length }));
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Son `n` ay (bu ay dahil), eskiden yeniye */
export function lastMonths(now: Date, n = 12): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: monthKey(d), label: `${AY[d.getMonth()]}${d.getMonth() === 0 || i === n - 1 ? ` ${String(d.getFullYear()).slice(2)}` : ""}` });
  }
  return out;
}

/** İşlemin kapanış tarihi: tapu tarihi, yoksa oluşturulma */
export function dealDate(d: Pick<Deal, "tapu_tarihi" | "created_at">): Date {
  return d.tapu_tarihi ? new Date(d.tapu_tarihi + "T12:00:00") : new Date(d.created_at);
}

export interface MonthlyDeals {
  key: string;
  label: string;
  adet: number;
  ciro: number;
  komisyon: number;
}

/**
 * Aylara göre kapanan işlem adedi, ciro (bedel) ve hizmet bedeli (KDV hariç matrah).
 * Yalnızca tapu tarihi bugün veya öncesinde olan işlemler "kapanmış" sayılır.
 */
export function dealsByMonth(deals: Deal[], lines: CommissionLineRow[], now: Date, n = 12): MonthlyDeals[] {
  const months = lastMonths(now, n);
  const byDeal = new Map<string, number>();
  for (const l of lines) byDeal.set(l.deal_id, (byDeal.get(l.deal_id) ?? 0) + Number(l.matrah || 0));
  const map = new Map(months.map((m) => [m.key, { ...m, adet: 0, ciro: 0, komisyon: 0 }]));
  for (const d of deals) {
    const at = dealDate(d);
    if (d.tapu_tarihi && at.getTime() > now.getTime() + 86_400_000) continue;
    const m = map.get(monthKey(at));
    if (!m) continue;
    m.adet += 1;
    m.ciro += Number(d.bedel || 0);
    m.komisyon += byDeal.get(d.id) ?? 0;
  }
  return months.map((m) => map.get(m.key)!);
}

/** Kişi kaynağı dağılımı (büyükten küçüğe; boş kaynak "Belirtilmemiş") */
export function leadSources(persons: Pick<Person, "kaynak">[], top = 8): Datum[] {
  const m = new Map<string, number>();
  for (const p of persons) {
    const k = p.kaynak?.trim() || "Belirtilmemiş";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  const sorted = [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "tr"));
  const head = sorted.slice(0, top).map(([k, v]) => ({ key: k, label: k, value: v }));
  const rest = sorted.slice(top).reduce((s, [, v]) => s + v, 0);
  return rest ? [...head, { key: "_diger", label: "Diğer", value: rest }] : head;
}

/** Dönüşüm hunisi: kişiler → gösterim yapılan → teklif veren → işlem (alıcı) */
export function conversionFunnel(persons: Pick<Person, "id" | "tipler">[], showings: Pick<Showing, "person_id" | "durum">[], offers: Pick<Offer, "person_id">[], deals: Pick<Deal, "alici_id">[]): Datum[] {
  const ids = new Set(persons.map((p) => p.id));
  const shown = new Set(showings.filter((s) => s.durum !== "iptal" && ids.has(s.person_id)).map((s) => s.person_id));
  const offered = new Set(offers.filter((o) => ids.has(o.person_id)).map((o) => o.person_id));
  const closed = new Set(deals.filter((d) => d.alici_id && ids.has(d.alici_id)).map((d) => d.alici_id!));
  return [
    { key: "kisi", label: "Kişi", value: ids.size },
    { key: "gosterim", label: "Gösterim", value: shown.size },
    { key: "teklif", label: "Teklif", value: offered.size },
    { key: "islem", label: "İşlem", value: closed.size },
  ];
}

/** Bir adımın önceki adıma oranı (%) */
export function stepRates(funnel: Datum[]): (number | null)[] {
  return funnel.map((d, i) => (i === 0 ? null : funnel[i - 1]!.value ? Math.round((d.value / funnel[i - 1]!.value) * 100) : null));
}

export interface AgentRow {
  user_id: string;
  ad_soyad: string;
  portfoy: number;
  gosterim: number;
  islem: number;
  ciro: number;
  komisyon: number;
}

/** Danışman sıralaması: komisyon, sonra işlem, sonra gösterim */
export function agentLeaderboard(
  members: Pick<OfficeMember, "user_id" | "ad_soyad" | "aktif">[],
  portfolios: Pick<Portfolio, "id" | "owner_id">[],
  showings: Pick<Showing, "agent_id" | "durum">[],
  deals: Deal[],
  lines: CommissionLineRow[],
): AgentRow[] {
  const ownerOf = new Map(portfolios.map((p) => [p.id, p.owner_id]));
  const komByDeal = new Map<string, number>();
  for (const l of lines) komByDeal.set(l.deal_id, (komByDeal.get(l.deal_id) ?? 0) + Number(l.matrah || 0));
  const rows = members
    .filter((m) => m.aktif)
    .map<AgentRow>((m) => {
      const myDeals = deals.filter((d) => ownerOf.get(d.portfolio_id) === m.user_id);
      return {
        user_id: m.user_id,
        ad_soyad: m.ad_soyad,
        portfoy: portfolios.filter((p) => p.owner_id === m.user_id).length,
        gosterim: showings.filter((s) => s.agent_id === m.user_id && s.durum !== "iptal").length,
        islem: myDeals.length,
        ciro: myDeals.reduce((s, d) => s + Number(d.bedel || 0), 0),
        komisyon: myDeals.reduce((s, d) => s + (komByDeal.get(d.id) ?? 0), 0),
      };
    });
  return rows.sort((a, b) => b.komisyon - a.komisyon || b.islem - a.islem || b.ciro - a.ciro || b.gosterim - a.gosterim || a.ad_soyad.localeCompare(b.ad_soyad, "tr"));
}

/**
 * Ortalama satışta kalma süresi (gün): tamamlanan portföylerde `created_at` →
 * tamamlanma. Tamamlanma anı, portföye ait "tamamla" içeren son uyum kaydından,
 * yoksa `updated_at`'ten alınır.
 */
export function averageDaysOnMarket(portfolios: Pick<Portfolio, "id" | "asama" | "created_at" | "updated_at">[], logs: Pick<ComplianceLogRow, "varlik" | "varlik_id" | "olay" | "created_at">[]): { ortalama: number | null; adet: number } {
  const done = portfolios.filter((p) => p.asama === "tamamlandi");
  const days: number[] = [];
  for (const p of done) {
    const hits = logs
      .filter((l) => l.varlik === "portfolio" && l.varlik_id === p.id && /tamamla/i.test(l.olay))
      .map((l) => new Date(l.created_at).getTime())
      .sort((a, b) => b - a);
    const end = hits[0] ?? new Date(p.updated_at).getTime();
    const start = new Date(p.created_at).getTime();
    if (Number.isFinite(end) && Number.isFinite(start) && end >= start) days.push((end - start) / 86_400_000);
  }
  return { ortalama: days.length ? Math.round(days.reduce((s, d) => s + d, 0) / days.length) : null, adet: days.length };
}

/** FSBO durum dağılımı (akış sırasıyla) */
export function fsboFunnel(rows: Pick<FsboListingRow, "durum">[]): Datum[] {
  return (Object.keys(FSBO_LABELS) as FsboStatus[]).map((s) => ({ key: s, label: FSBO_LABELS[s], value: rows.filter((r) => r.durum === s).length }));
}

/** FSBO → yetki dönüşüm oranı (%), sonuçlanmış (yetki/vazgeçildi) kayıtlara göre değil tüm kayıtlara göre */
export function fsboConversion(rows: Pick<FsboListingRow, "durum">[]): number | null {
  if (!rows.length) return null;
  return Math.round((rows.filter((r) => r.durum === "yetki_alindi").length / rows.length) * 100);
}

export function sum(ds: { value: number }[]): number {
  return ds.reduce((s, d) => s + d.value, 0);
}

/** Eksen için "güzel" adım (1-2-5 dizisi) ve üst sınır */
export function niceScale(max: number, ticks = 4, integer = false): { step: number; top: number } {
  if (!(max > 0)) return { step: 1, top: integer ? 1 : ticks };
  const raw = max / ticks;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / p;
  let step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
  if (integer) step = Math.max(1, Math.round(step));
  return { step, top: Math.ceil(max / step) * step };
}
