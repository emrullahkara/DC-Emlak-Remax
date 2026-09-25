/**
 * Takvim ve gösterim yardımcıları — tasarım §5.8. Tüm hesaplar yerel saatle.
 */

export const GUN_KISA = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Haftanın pazartesisi (Türkiye: hafta pazartesi başlar) */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const dow = (x.getDay() + 6) % 7; // Pzt=0
  return addDays(x, -dow);
}

export function weekDays(d: Date): Date[] {
  const s = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const pad = (n: number) => String(n).padStart(2, "0");

/** `<input type="datetime-local">` değeri */
export function toLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** `<input type="date">` değeri */
export function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "2026-09-24" → yerel gece yarısı */
export function fromDateInput(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(+m[1]!, +m[2]! - 1, +m[3]!);
}

/** Bir sonraki yarım saate yuvarlanmış varsayılan randevu zamanı */
export function nextSlot(now: Date, day?: Date): Date {
  const base = day && !sameDay(day, now) ? new Date(day.getFullYear(), day.getMonth(), day.getDate(), 10, 0) : new Date(now);
  if (!day || sameDay(day, now)) {
    base.setSeconds(0, 0);
    const m = base.getMinutes();
    base.setMinutes(m < 30 ? 30 : 60);
  }
  return base;
}

export interface AgendaSource {
  showings: { id: string; planlanan: string; durum: string }[];
  tasks: { id: string | number; vade?: string | null; tur: string; tamamlandi?: boolean | null }[];
}

export type AgendaItem<S, T> = { kind: "gosterim"; at: Date; row: S } | { kind: "gorev"; at: Date; row: T };

/**
 * Seçili aralıktaki (gün veya hafta) gösterimler ve vadeli görevler; saate göre sıralı.
 * İptal edilen gösterimler `iptalDahil` verilmedikçe gösterilmez.
 */
export function agendaItems<S extends AgendaSource["showings"][number], T extends AgendaSource["tasks"][number]>(
  showings: S[],
  tasks: T[],
  from: Date,
  to: Date,
  opts: { iptalDahil?: boolean } = {},
): AgendaItem<S, T>[] {
  const a = from.getTime();
  const b = to.getTime();
  const out: AgendaItem<S, T>[] = [];
  for (const s of showings) {
    const at = new Date(s.planlanan);
    if (at.getTime() >= a && at.getTime() < b && (opts.iptalDahil || s.durum !== "iptal")) out.push({ kind: "gosterim", at, row: s });
  }
  for (const t of tasks) {
    if (t.tur !== "gorev" || !t.vade) continue;
    const at = new Date(t.vade);
    if (at.getTime() >= a && at.getTime() < b) out.push({ kind: "gorev", at, row: t });
  }
  return out.sort((x, y) => x.at.getTime() - y.at.getTime() || (x.kind === y.kind ? 0 : x.kind === "gosterim" ? -1 : 1));
}

/** Gün bazında sayım (hafta şeridindeki rozetler için) */
export function countByDay(dates: Date[], days: Date[]): number[] {
  return days.map((d) => dates.filter((x) => sameDay(x, d)).length);
}

/** Google Haritalar yol tarifi bağlantısı: konum varsa koordinat, yoksa adres. */
export function directionsUrl(p: { konum?: { lat: number; lng: number } | null; adres?: string | null; mahalle?: string | null; ilce?: string | null; il?: string | null }): string | null {
  if (p.konum && Number.isFinite(p.konum.lat) && Number.isFinite(p.konum.lng)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${p.konum.lat},${p.konum.lng}`;
  }
  const q = [p.adres, p.mahalle, p.ilce, p.il].filter(Boolean).join(", ");
  return q ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}` : null;
}

export interface Feedback {
  puan?: number;
  fiyat?: number;
  konum?: number;
  not?: string;
}

/** Geri bildirim puanlarını 1–5 aralığına sıkıştırır, boş notu atar. */
export function normalizeFeedback(f: Feedback): Feedback {
  const clamp = (n: number | undefined) => (n === undefined || !Number.isFinite(n) || n <= 0 ? undefined : Math.min(5, Math.max(1, Math.round(n))));
  const out: Feedback = {};
  const puan = clamp(f.puan);
  const fiyat = clamp(f.fiyat);
  const konum = clamp(f.konum);
  if (puan) out.puan = puan;
  if (fiyat) out.fiyat = fiyat;
  if (konum) out.konum = konum;
  if (f.not?.trim()) out.not = f.not.trim();
  return out;
}

export function feedbackSummary(f: Feedback | null | undefined): string {
  if (!f) return "";
  const parts = [f.puan && `Genel ${f.puan}/5`, f.fiyat && `Fiyat ${f.fiyat}/5`, f.konum && `Konum ${f.konum}/5`].filter(Boolean);
  return [parts.join(" · "), f.not].filter(Boolean).join(" — ");
}

/** "Güvendeyim" sayacı: kalan saniye (negatif = süre aşıldı) */
export function checkinRemaining(startedAt: number, minutes: number, now: number): number {
  return Math.round((startedAt + minutes * 60_000 - now) / 1000);
}

export function formatCountdown(sec: number): string {
  const s = Math.abs(sec);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${sec < 0 ? "-" : ""}${pad(mm)}:${pad(ss)}`;
}
