import { describe, expect, it } from "vitest";
import type { CommissionLineRow, Deal } from "@/data/types";
import { buildSeed } from "../data/seed";
import {
  agentLeaderboard,
  averageDaysOnMarket,
  conversionFunnel,
  dealsByMonth,
  fsboConversion,
  fsboFunnel,
  lastMonths,
  leadSources,
  niceScale,
  portfoliosByStage,
  stepRates,
  sum,
} from "./reports";

const now = new Date(2026, 8, 24, 12); // 24 Eylül 2026

const deal = (id: string, portfolio_id: string, bedel: number, tapu: string | null, alici_id: string | null = null): Deal => ({
  id,
  office_id: "o",
  portfolio_id,
  alici_id,
  bedel,
  tapu_tarihi: tapu,
  kontrol_listesi: [],
  kural_surum: "2026.09",
  created_at: "2026-03-01T10:00:00.000Z",
});
const line = (deal_id: string, matrah: number): CommissionLineRow => ({ id: deal_id + matrah, deal_id, taraf: "alici", matrah, kdv: matrah * 0.2, tahsil_edildi: false });

describe("portföy ve kaynak", () => {
  it("aşamalara göre sayar", () => {
    const r = portfoliosByStage([{ asama: "yayinda" }, { asama: "yayinda" }, { asama: "tapu" }, { asama: "arsiv" }]);
    expect(r.find((x) => x.key === "yayinda")!.value).toBe(2);
    expect(r.some((x) => x.key === "arsiv")).toBe(false);
    expect(sum(r)).toBe(3);
  });
  it("kaynak dağılımı sıralı ve 'Diğer' ile kırpılır", () => {
    const r = leadSources([{ kaynak: "A" }, { kaynak: "B" }, { kaynak: "B" }, { kaynak: null }, { kaynak: "C" }], 2);
    expect(r).toEqual([
      { key: "B", label: "B", value: 2 },
      { key: "A", label: "A", value: 1 },
      { key: "_diger", label: "Diğer", value: 2 },
    ]);
  });
});

describe("işlemler", () => {
  it("son 12 ayı etiketler", () => {
    const m = lastMonths(now);
    expect(m).toHaveLength(12);
    expect(m[11]!.key).toBe("2026-09");
    expect(m[0]!.key).toBe("2025-10");
    expect(m[3]!.label).toBe("Oca 26");
  });
  it("aylara göre adet, ciro ve komisyonu toplar; gelecekteki tapuları saymaz", () => {
    const deals = [deal("d1", "p1", 10_000_000, "2026-09-10"), deal("d2", "p2", 5_000_000, "2026-09-20"), deal("d3", "p1", 1, "2026-12-01"), deal("d4", "p3", 7, "2024-01-01")];
    const r = dealsByMonth(deals, [line("d1", 200_000), line("d1", 200_000), line("d2", 100_000)], now);
    const eyl = r[11]!;
    expect(eyl).toMatchObject({ adet: 2, ciro: 15_000_000, komisyon: 500_000 });
    expect(sum(r.map((x) => ({ value: x.adet })))).toBe(2);
  });
  it("danışman sıralaması komisyona göre", () => {
    const members = [
      { user_id: "u1", ad_soyad: "Ali", aktif: true },
      { user_id: "u2", ad_soyad: "Berk", aktif: true },
      { user_id: "u3", ad_soyad: "Pasif", aktif: false },
    ];
    const portfolios = [
      { id: "p1", owner_id: "u1" },
      { id: "p2", owner_id: "u2" },
      { id: "p3", owner_id: "u2" },
    ];
    const r = agentLeaderboard(members, portfolios, [{ agent_id: "u1", durum: "planli" }, { agent_id: "u1", durum: "iptal" }], [deal("d1", "p2", 100, null)], [line("d1", 50)]);
    expect(r.map((x) => x.user_id)).toEqual(["u2", "u1"]);
    expect(r[0]).toMatchObject({ portfoy: 2, islem: 1, ciro: 100, komisyon: 50, gosterim: 0 });
    expect(r[1]!.gosterim).toBe(1);
  });
});

describe("huni ve süreler", () => {
  it("dönüşüm hunisini tekil kişilere göre kurar", () => {
    const persons = [{ id: "a", tipler: [] }, { id: "b", tipler: [] }, { id: "c", tipler: [] }, { id: "d", tipler: [] }];
    const f = conversionFunnel(persons, [{ person_id: "a", durum: "planli" }, { person_id: "a", durum: "tamamlandi" }, { person_id: "b", durum: "tamamlandi" }, { person_id: "c", durum: "iptal" }], [{ person_id: "a" }], [{ alici_id: "a" }, { alici_id: null }]);
    expect(f.map((x) => x.value)).toEqual([4, 2, 1, 1]);
    expect(stepRates(f)).toEqual([null, 50, 50, 100]);
    expect(stepRates([{ key: "a", label: "a", value: 0 }, { key: "b", label: "b", value: 0 }])).toEqual([null, null]);
  });
  it("ortalama satış süresini uyum kaydı ya da updated_at ile hesaplar", () => {
    const r = averageDaysOnMarket(
      [
        { id: "p1", asama: "tamamlandi", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-12-01T00:00:00Z" },
        { id: "p2", asama: "tamamlandi", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-21T00:00:00Z" },
        { id: "p3", asama: "yayinda", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-02-01T00:00:00Z" },
      ],
      [{ varlik: "portfolio", varlik_id: "p1", olay: "portfoy.tamamlandi", created_at: "2026-01-11T00:00:00Z" }],
    );
    expect(r).toEqual({ ortalama: 15, adet: 2 });
    expect(averageDaysOnMarket([], [])).toEqual({ ortalama: null, adet: 0 });
  });
  it("FSBO durum dağılımı ve dönüşüm", () => {
    const rows = [{ durum: "yeni" as const }, { durum: "yetki_alindi" as const }, { durum: "yeni" as const }, { durum: "vazgecildi" as const }];
    expect(fsboFunnel(rows).map((x) => x.value)).toEqual([2, 0, 0, 0, 1, 1]);
    expect(fsboConversion(rows)).toBe(25);
    expect(fsboConversion([])).toBeNull();
  });
  it("örnek veriyle hata vermeden çalışır", () => {
    const s = buildSeed(now);
    expect(sum(portfoliosByStage(s.portfolio!))).toBe(10);
    expect(conversionFunnel(s.person!, s.showing!, s.offer!, s.deal!)[0]!.value).toBe(10);
  });
});

describe("eksen ölçeği", () => {
  it("1-2-5 adımlarını seçer", () => {
    expect(niceScale(780)).toEqual({ step: 200, top: 800 });
    expect(niceScale(0)).toEqual({ step: 1, top: 4 });
    expect(niceScale(3, 4, true)).toEqual({ step: 1, top: 3 });
  });
});
