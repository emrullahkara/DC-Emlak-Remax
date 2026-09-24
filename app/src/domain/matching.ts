/**
 * Eşleştirme Motoru — tasarım §5.5.
 * Sert filtreler (bütçe dışı, zorunlu kriter) eşleşmeyi eler; kalanlar
 * ağırlıklı puanla (0–100) sıralanır ve gerekçeleri döner.
 */

export interface Portfolio {
  id: string;
  fiyat: number;
  ilce: string;
  mahalle: string;
  oda: number;
  netM2: number;
  kat?: number;
  krediyeUygun: boolean;
  ozellikler: string[]; // "otopark", "asansor", "site", "balkon"...
}

export interface SearchProfile {
  butceMin?: number;
  butceMax: number;
  /** Bütçe üst sınırı için tolerans (%), ör. 5 */
  butceTolerans?: number;
  ilceler: string[];
  mahalleler?: string[];
  odaMin?: number;
  m2Min?: number;
  krediKullanacak: boolean;
  zorunlu: string[];
  tercih: string[];
  zeminKatIstemez?: boolean;
}

export interface MatchResult {
  portfoyId: string;
  puan: number;
  gerekceler: string[];
}

export function matchScore(p: Portfolio, s: SearchProfile): MatchResult | null {
  const tolMax = s.butceMax * (1 + (s.butceTolerans ?? 0) / 100);
  if (p.fiyat > tolMax) return null;
  if (s.butceMin && p.fiyat < s.butceMin * 0.7) return null;
  if (s.krediKullanacak && !p.krediyeUygun) return null;
  if (!s.ilceler.includes(p.ilce)) return null;
  if (s.zorunlu.some((z) => !p.ozellikler.includes(z))) return null;
  if (s.zeminKatIstemez && p.kat !== undefined && p.kat <= 0) return null;

  const gerekceler: string[] = [];
  let puan = 0;

  // Fiyat (30): bütçe içindeyse tam, tolerans bandındaysa kısmi
  if (p.fiyat <= s.butceMax) {
    puan += 30;
    gerekceler.push("Bütçe içinde");
  } else {
    puan += 15;
    gerekceler.push("Bütçeyi az aşıyor (pazarlık payı)");
  }

  // Konum (25)
  if (s.mahalleler?.length) {
    if (s.mahalleler.includes(p.mahalle)) {
      puan += 25;
      gerekceler.push(`İstenen mahalle: ${p.mahalle}`);
    } else puan += 12;
  } else puan += 20;

  // Oda ve m² (25)
  if (!s.odaMin || p.oda >= s.odaMin) {
    puan += 13;
    if (s.odaMin) gerekceler.push(`${p.oda} oda`);
  }
  if (!s.m2Min || p.netM2 >= s.m2Min) {
    puan += 12;
    if (s.m2Min) gerekceler.push(`${p.netM2} m² net`);
  }

  // Tercihler (20)
  if (s.tercih.length) {
    const eslesen = s.tercih.filter((t) => p.ozellikler.includes(t));
    puan += Math.round((20 * eslesen.length) / s.tercih.length);
    if (eslesen.length) gerekceler.push(`Tercihler: ${eslesen.join(", ")}`);
  } else puan += 20;

  return { portfoyId: p.id, puan: Math.min(100, puan), gerekceler };
}

export function rankMatches(portfoyler: Portfolio[], profil: SearchProfile): MatchResult[] {
  return portfoyler
    .map((p) => matchScore(p, profil))
    .filter((m): m is MatchResult => m !== null)
    .sort((a, b) => b.puan - a.puan);
}
