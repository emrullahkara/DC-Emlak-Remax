/**
 * CRM iş kuralları — tasarım §5.4, §6.7.
 *
 *  - Müşteri Isı Skoru (0–100, açıklanabilir sinyallerle)
 *  - "Hiçbir müşteri soğumaz": son temas > 14 gün ya da sonraki adım yoksa soğuyor
 *  - Telefon ile mükerrer kayıt tespiti (ofis içi)
 *  - KVKK rıza durumu (amaç bazında son geçerli kayıt)
 *
 * Saf fonksiyonlar; UI ve veritabanından bağımsızdır.
 */
import type { Consent, ConsentPurpose, Person, SearchProfile, Showing } from "../data/types";

const GUN = 86_400_000;

/** Bu kadar gün temas yoksa müşteri "soğuyor" sayılır */
export const SOGUMA_GUN = 14;

/** Takvim günü farkı (now − iso), yerel gün sınırına göre */
export function daysSince(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const a = new Date(iso);
  if (Number.isNaN(a.getTime())) return null;
  const d0 = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const d1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  return Math.round((d0 - d1) / GUN);
}

// ---- Soğuma -----------------------------------------------------------------

export interface CoolingStatus {
  soguyor: boolean;
  /** Son temastan bu yana geçen gün (temas yoksa null) */
  gun: number | null;
  nedenler: string[];
}

export function coolingStatus(
  p: Pick<Person, "son_temas" | "sonraki_adim" | "sonraki_adim_tarihi" | "created_at">,
  now: Date,
): CoolingStatus {
  const nedenler: string[] = [];
  const gun = daysSince(p.son_temas, now);
  // Temas kaydı yoksa kayıt tarihi başlangıç kabul edilir (yeni kişi hemen soğumaz)
  const referans = gun ?? daysSince(p.created_at, now);
  if (referans === null || referans > SOGUMA_GUN) {
    nedenler.push(gun === null ? "Hiç temas kaydı yok" : `${gun} gündür temas yok`);
  }
  if (!p.sonraki_adim?.trim() || !p.sonraki_adim_tarihi) nedenler.push("Sonraki adım planlanmamış");
  else {
    const gecikme = daysSince(p.sonraki_adim_tarihi, now);
    if (gecikme !== null && gecikme > 0) nedenler.push(`Sonraki adım ${gecikme} gün gecikti`);
  }
  return { soguyor: nedenler.length > 0, gun, nedenler };
}

// ---- Isı skoru ----------------------------------------------------------------

export interface HeatInput {
  sonTemas?: string | null;
  sonrakiAdim?: string | null;
  sonrakiAdimTarihi?: string | null;
  aktifArayis: boolean;
  krediOnOnay: boolean;
  /** Son 30 gün ve yaklaşan (iptal edilmemiş) gösterim sayısı */
  gosterimSayisi: number;
}

export interface Heat {
  puan: number;
  sinyaller: string[];
}

export function personHeat(i: HeatInput, now: Date): Heat {
  const s: string[] = [];
  let p = 0;

  // Son temas (40)
  const gun = daysSince(i.sonTemas, now);
  if (gun === null) s.push("Temas kaydı yok");
  else if (gun <= 2) {
    p += 40;
    s.push(gun === 0 ? "Bugün temas" : `${gun} gün önce temas`);
  } else if (gun <= 7) {
    p += 30;
    s.push(`${gun} gün önce temas`);
  } else if (gun <= SOGUMA_GUN) {
    p += 18;
    s.push(`${gun} gün önce temas`);
  } else if (gun <= 30) {
    p += 8;
    s.push(`${gun} gündür temas yok`);
  } else s.push(`${gun} gündür temas yok`);

  // Sonraki adım (20): gecikmişse yarım puan
  if (i.sonrakiAdim?.trim() && i.sonrakiAdimTarihi) {
    const gecikme = daysSince(i.sonrakiAdimTarihi, now) ?? 0;
    if (gecikme > 0) {
      p += 10;
      s.push("Sonraki adım gecikmiş");
    } else {
      p += 20;
      s.push("Sonraki adım planlı");
    }
  } else s.push("Sonraki adım yok");

  // Aktif arayış (15)
  if (i.aktifArayis) {
    p += 15;
    s.push("Aktif arayış");
  }

  // Kredi ön onayı (10)
  if (i.krediOnOnay) {
    p += 10;
    s.push("Kredi ön onaylı");
  }

  // Gösterim (15)
  if (i.gosterimSayisi > 0) {
    p += Math.min(15, i.gosterimSayisi * 8);
    s.push(`${i.gosterimSayisi} gösterim`);
  }

  return { puan: Math.max(0, Math.min(100, p)), sinyaller: s };
}

/** Veritabanı satırlarından ısı skoru */
export function personHeatFromRows(
  person: Pick<Person, "id" | "son_temas" | "sonraki_adim" | "sonraki_adim_tarihi">,
  profiles: Pick<SearchProfile, "person_id" | "aktif" | "kredi_on_onay">[],
  showings: Pick<Showing, "person_id" | "planlanan" | "durum">[],
  now: Date,
): Heat {
  const aktif = profiles.filter((sp) => sp.person_id === person.id && sp.aktif);
  const gosterim = showings.filter((g) => {
    if (g.person_id !== person.id || g.durum === "iptal") return false;
    const d = daysSince(g.planlanan, now);
    return d !== null && d <= 30;
  }).length;
  return personHeat(
    {
      sonTemas: person.son_temas,
      sonrakiAdim: person.sonraki_adim,
      sonrakiAdimTarihi: person.sonraki_adim_tarihi,
      aktifArayis: aktif.length > 0,
      krediOnOnay: aktif.some((sp) => sp.kredi_on_onay),
      gosterimSayisi: gosterim,
    },
    now,
  );
}

// ---- Telefon ve mükerrer kayıt ---------------------------------------------------

/**
 * Karşılaştırma anahtarı: yalnızca rakamlar; Türkiye numaralarında ülke kodu
 * ve baştaki 0 atılır ("0532 418 22 47", "+90 532 4182247" → "5324182247").
 */
export function phoneKey(tel: string | null | undefined): string {
  let d = (tel ?? "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("90")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d;
}

/** Aynı telefonlu diğer kişiler (en az 7 hane) */
export function findDuplicatesByPhone<P extends Pick<Person, "id" | "telefon">>(
  persons: P[],
  tel: string | null | undefined,
  excludeId?: string,
): P[] {
  const k = phoneKey(tel);
  if (k.length < 7) return [];
  return persons.filter((p) => p.id !== excludeId && phoneKey(p.telefon) === k);
}

/** WhatsApp (wa.me) numarası: "+" ile başlayan yabancı numaralar olduğu gibi */
export function waNumber(tel: string): string {
  const t = tel.trim();
  const d = t.replace(/\D/g, "");
  if (t.startsWith("+") || t.startsWith("00")) return d.replace(/^00/, "");
  if (d.startsWith("90") && d.length === 12) return d;
  if (d.startsWith("0")) return "9" + d;
  return "90" + d;
}

/** Türkiye numarası mı (wa.me için normalizeTrPhone yeterli mi) */
export function isTrPhone(tel: string): boolean {
  return waNumber(tel).startsWith("90");
}

// ---- Arama ------------------------------------------------------------------------

function fold(s: string) {
  return s
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i");
}

/** İsim/e-posta (Türkçe duyarsız) ya da telefon rakamlarında arama */
export function personMatchesQuery(p: Pick<Person, "ad_soyad" | "telefon" | "eposta">, q: string): boolean {
  const t = q.trim();
  if (!t) return true;
  if (fold(`${p.ad_soyad} ${p.eposta ?? ""}`).includes(fold(t))) return true;
  const d = t.replace(/\D/g, "");
  if (d.length >= 3) {
    const tel = (p.telefon ?? "").replace(/\D/g, "");
    return tel.includes(d) || phoneKey(p.telefon).includes(phoneKey(d) || d);
  }
  return false;
}

// ---- KVKK rıza -------------------------------------------------------------------

export const RIZA_AMACLARI: ConsentPurpose[] = ["aydinlatma", "ticari_ileti", "arama_kaydi", "yurt_disi_aktarim", "gorsel"];

/** Amaç için geçerli (verilmiş, geri alınmamış) en son rıza kaydı */
export function activeConsent(consents: Consent[], amac: ConsentPurpose): Consent | null {
  const rows = consents
    .filter((c) => c.amac === amac)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
  const son = rows[0];
  return son && son.verildi && !son.geri_alindi_at ? son : null;
}

export function hasConsent(consents: Consent[], amac: ConsentPurpose): boolean {
  return activeConsent(consents, amac) !== null;
}

/** Kişi kartında gösterilecek eksik rızalar */
export function missingConsents(consents: Consent[]): ConsentPurpose[] {
  return (["aydinlatma", "ticari_ileti"] as ConsentPurpose[]).filter((a) => !hasConsent(consents, a));
}
