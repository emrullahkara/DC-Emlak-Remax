/**
 * Veritabanı satırları (Portfolio, SearchProfile) ↔ Eşleştirme Motoru alan tipleri.
 * Yalnızca pazarlanabilir aşamadaki (yetki / yayında / teklif) ve ilan tipi
 * uyan portföyler eşleştirilir.
 */
import type { Person, Portfolio, PortfolioStage, SearchProfile } from "../data/types";
import {
  matchScore,
  rankMatches,
  type MatchResult,
  type Portfolio as MatchPortfolio,
  type SearchProfile as MatchProfile,
} from "./matching";

export const ESLESTIRILEBILIR_ASAMALAR: PortfolioStage[] = ["yetki", "yayinda", "teklif"];

function fold(s: string) {
  return s.trim().toLocaleLowerCase("tr");
}

export function isMatchable(p: Pick<Portfolio, "asama" | "fiyat">): boolean {
  return ESLESTIRILEBILIR_ASAMALAR.includes(p.asama) && typeof p.fiyat === "number" && p.fiyat > 0;
}

export function toMatchPortfolio(p: Portfolio): MatchPortfolio | null {
  if (typeof p.fiyat !== "number" || !(p.fiyat > 0)) return null;
  return {
    id: p.id,
    fiyat: p.fiyat,
    ilce: (p.ilce ?? "").trim(),
    mahalle: (p.mahalle ?? "").trim(),
    oda: p.oda ?? 0,
    netM2: p.net_m2 ?? p.brut_m2 ?? 0,
    kat: p.kat ?? undefined,
    krediyeUygun: Boolean(p.krediye_uygun),
    ozellikler: p.ozellikler ?? [],
  };
}

/**
 * Profildeki ilçe/mahalle yazımlarını portföylerdeki yazıma eşler
 * (büyük/küçük harf ve boşluk farkları eşleşmeyi bozmasın).
 */
function canon(values: string[], known: string[]): string[] {
  const map = new Map(known.filter(Boolean).map((k) => [fold(k), k]));
  return values.map((v) => map.get(fold(v)) ?? v.trim()).filter(Boolean);
}

export function toMatchProfile(s: SearchProfile, known?: { ilceler: string[]; mahalleler: string[] }): MatchProfile {
  return {
    butceMin: s.butce_min ?? undefined,
    butceMax: Number(s.butce_max),
    butceTolerans: s.butce_tolerans ?? 0,
    ilceler: known ? canon(s.ilceler ?? [], known.ilceler) : (s.ilceler ?? []),
    mahalleler: known ? canon(s.mahalleler ?? [], known.mahalleler) : (s.mahalleler ?? []),
    odaMin: s.oda_min ?? undefined,
    m2Min: s.m2_min ?? undefined,
    krediKullanacak: s.kredi_kullanacak,
    zorunlu: s.zorunlu ?? [],
    tercih: s.tercih ?? [],
  };
}

function knownPlaces(portfolios: Portfolio[]) {
  return {
    ilceler: portfolios.map((p) => p.ilce ?? ""),
    mahalleler: portfolios.map((p) => p.mahalle ?? ""),
  };
}

export interface PortfolioMatch extends MatchResult {
  portfolio: Portfolio;
}

/** Bir arayış profili için sıralı portföyler */
export function matchPortfoliosForProfile(portfolios: Portfolio[], profile: SearchProfile): PortfolioMatch[] {
  const aday = portfolios.filter((p) => isMatchable(p) && p.ilan_tipi === profile.ilan_tipi);
  const byId = new Map(aday.map((p) => [p.id, p]));
  const domain = aday.map(toMatchPortfolio).filter((x): x is MatchPortfolio => x !== null);
  return rankMatches(domain, toMatchProfile(profile, knownPlaces(portfolios))).map((m) => ({
    ...m,
    portfolio: byId.get(m.portfoyId)!,
  }));
}

/** Birden çok aktif profil: her portföy için en yüksek puan */
export function matchPortfoliosForProfiles(portfolios: Portfolio[], profiles: SearchProfile[]): PortfolioMatch[] {
  const best = new Map<string, PortfolioMatch>();
  for (const sp of profiles.filter((x) => x.aktif)) {
    for (const m of matchPortfoliosForProfile(portfolios, sp)) {
      const prev = best.get(m.portfoyId);
      if (!prev || m.puan > prev.puan) best.set(m.portfoyId, m);
    }
  }
  return [...best.values()].sort((a, b) => b.puan - a.puan);
}

export interface PersonMatch {
  person: Person;
  profile: SearchProfile;
  puan: number;
  gerekceler: string[];
}

/** Ters eşleştirme: bir portföye uyan kişiler (kişi başına en iyi profil) */
export function matchPersonsForPortfolio(portfolio: Portfolio, profiles: SearchProfile[], persons: Person[]): PersonMatch[] {
  if (!isMatchable(portfolio)) return [];
  const mp = toMatchPortfolio(portfolio);
  if (!mp) return [];
  const known = knownPlaces([portfolio]);
  const personById = new Map(persons.map((p) => [p.id, p]));
  const best = new Map<string, PersonMatch>();
  for (const sp of profiles) {
    if (!sp.aktif || sp.ilan_tipi !== portfolio.ilan_tipi) continue;
    const person = personById.get(sp.person_id);
    if (!person) continue;
    const r = matchScore(mp, toMatchProfile(sp, known));
    if (!r) continue;
    const prev = best.get(person.id);
    if (!prev || r.puan > prev.puan) best.set(person.id, { person, profile: sp, puan: r.puan, gerekceler: r.gerekceler });
  }
  return [...best.values()].sort((a, b) => b.puan - a.puan);
}
