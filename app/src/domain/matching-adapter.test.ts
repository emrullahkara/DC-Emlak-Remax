import { describe, expect, it } from "vitest";
import { buildSeed } from "../data/seed";
import type { Person, Portfolio, SearchProfile } from "../data/types";
import {
  isMatchable,
  matchPersonsForPortfolio,
  matchPortfoliosForProfile,
  matchPortfoliosForProfiles,
  toMatchPortfolio,
  toMatchProfile,
} from "./matching-adapter";

const now = new Date("2026-09-24T09:00:00");
const seed = buildSeed(now);
const portfolios = seed.portfolio as Portfolio[];
const profiles = seed.search_profile as SearchProfile[];
const persons = seed.person as Person[];

const port = (p: Partial<Portfolio>): Portfolio => ({
  ...portfolios[0]!,
  ...p,
});

describe("eşleştirme adaptörü — dönüşümler", () => {
  it("portföy satırını alan tipine çevirir; net m² yoksa brüt kullanılır", () => {
    const m = toMatchPortfolio(port({ net_m2: null, brut_m2: 150, kat: null, krediye_uygun: null }))!;
    expect(m).toMatchObject({ fiyat: 12_500_000, ilce: "Kadıköy", mahalle: "Moda", oda: 3, netM2: 150, krediyeUygun: false });
    expect(m.kat).toBeUndefined();
    expect(toMatchPortfolio(port({ fiyat: null }))).toBeNull();
  });

  it("profil satırını alan tipine çevirir ve yazım farklarını eşler", () => {
    const sp = { ...profiles[0]!, ilceler: ["kadıköy "], mahalleler: ["MODA"], butce_min: null, oda_min: null };
    const m = toMatchProfile(sp, { ilceler: ["Kadıköy"], mahalleler: ["Moda"] });
    expect(m.ilceler).toEqual(["Kadıköy"]);
    expect(m.mahalleler).toEqual(["Moda"]);
    expect(m.butceMin).toBeUndefined();
    expect(m.odaMin).toBeUndefined();
    expect(m.krediKullanacak).toBe(true);
  });

  it("yalnızca yetki/yayında/teklif aşamaları eşleştirilebilir", () => {
    expect(isMatchable(port({ asama: "yayinda" }))).toBe(true);
    expect(isMatchable(port({ asama: "teklif" }))).toBe(true);
    expect(isMatchable(port({ asama: "kapora" }))).toBe(false);
    expect(isMatchable(port({ asama: "aday" }))).toBe(false);
    expect(isMatchable(port({ asama: "yayinda", fiyat: null }))).toBe(false);
  });
});

describe("eşleştirme adaptörü — sıralama", () => {
  it("Zeynep (Moda, 11–13,5 M, asansör zorunlu) için Moda 3+1 ilk sırada", () => {
    const r = matchPortfoliosForProfile(portfolios, profiles.find((s) => s.id === "s1")!);
    expect(r[0]!.portfolio.baslik).toContain("Moda");
    expect(r[0]!.puan).toBeGreaterThanOrEqual(90);
    // Kapora/tapu aşamasındakiler ve kiralıklar listede yok
    expect(r.every((m) => ["yetki", "yayinda", "teklif"].includes(m.portfolio.asama))).toBe(true);
    expect(r.every((m) => m.portfolio.ilan_tipi === "satilik")).toBe(true);
  });

  it("kiralık arayışa yalnızca kiralık portföyler döner", () => {
    const r = matchPortfoliosForProfile(portfolios, profiles.find((s) => s.id === "s4")!);
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((m) => m.portfolio.ilan_tipi === "kiralik")).toBe(true);
    // Acıbadem 1+1 değerleme aşamasında: dahil değil
    expect(r.some((m) => m.portfolio.asama === "degerleme")).toBe(false);
  });

  it("birden çok profilde portföy başına en yüksek puanı tutar, pasif profili yok sayar", () => {
    const s1 = profiles.find((s) => s.id === "s1")!;
    const pasif = { ...s1, id: "sx", aktif: false, ilceler: ["Ataşehir"], mahalleler: [] };
    const tek = matchPortfoliosForProfile(portfolios, s1);
    const cok = matchPortfoliosForProfiles(portfolios, [s1, pasif]);
    expect(cok.map((m) => m.portfoyId)).toEqual(tek.map((m) => m.portfoyId));
    const ids = new Set(cok.map((m) => m.portfoyId));
    expect(ids.size).toBe(cok.length);
  });
});

describe("ters eşleştirme", () => {
  it("Moda 3+1 portföyüne uyan kişiler sıralı döner", () => {
    const moda = portfolios.find((p) => p.baslik?.startsWith("Moda"))!;
    const r = matchPersonsForPortfolio(moda, profiles, persons);
    expect(r[0]!.person.ad_soyad).toBe("Zeynep Aydın");
    for (let i = 1; i < r.length; i++) expect(r[i - 1]!.puan).toBeGreaterThanOrEqual(r[i]!.puan);
  });

  it("eşleştirilemez aşamadaki portföy için boş liste", () => {
    const kapora = portfolios.find((p) => p.asama === "kapora")!;
    expect(matchPersonsForPortfolio(kapora, profiles, persons)).toEqual([]);
  });

  it("kiralık portföye yalnızca kiralık arayan kişiler", () => {
    const goztepe = portfolios.find((p) => p.ilan_tipi === "kiralik" && p.asama === "yayinda")!;
    const r = matchPersonsForPortfolio(goztepe, profiles, persons);
    expect(r.map((m) => m.person.ad_soyad)).toEqual(["Deniz Yurt"]);
  });
});
