import { describe, expect, it } from "vitest";
import {
  addDays,
  agendaItems,
  checkinRemaining,
  countByDay,
  directionsUrl,
  feedbackSummary,
  formatCountdown,
  fromDateInput,
  nextSlot,
  normalizeFeedback,
  sameDay,
  startOfDay,
  startOfWeek,
  toLocalInput,
  weekDays,
} from "./calendar";

const d = (y: number, m: number, day: number, h = 0, min = 0) => new Date(y, m - 1, day, h, min);

describe("tarih yardımcıları", () => {
  it("haftayı pazartesiden başlatır", () => {
    expect(startOfWeek(d(2026, 9, 24, 15)).getTime()).toBe(d(2026, 9, 21).getTime()); // Perşembe → Pzt
    expect(startOfWeek(d(2026, 9, 27)).getTime()).toBe(d(2026, 9, 21).getTime()); // Pazar
    const w = weekDays(d(2026, 9, 24));
    expect(w).toHaveLength(7);
    expect(w[6]!.getDate()).toBe(27);
  });
  it("gün ekler ve karşılaştırır", () => {
    expect(sameDay(addDays(d(2026, 9, 30), 1), d(2026, 10, 1, 8))).toBe(true);
    expect(startOfDay(d(2026, 9, 24, 13, 5)).getHours()).toBe(0);
  });
  it("form değerlerini dönüştürür", () => {
    expect(toLocalInput(d(2026, 9, 4, 9, 5))).toBe("2026-09-04T09:05");
    expect(fromDateInput("2026-09-24")!.getTime()).toBe(d(2026, 9, 24).getTime());
    expect(fromDateInput("x")).toBeNull();
  });
  it("sonraki boş zamanı önerir", () => {
    expect(toLocalInput(nextSlot(d(2026, 9, 24, 10, 10)))).toBe("2026-09-24T10:30");
    expect(toLocalInput(nextSlot(d(2026, 9, 24, 10, 40)))).toBe("2026-09-24T11:00");
    expect(toLocalInput(nextSlot(d(2026, 9, 24, 10, 40), d(2026, 9, 26)))).toBe("2026-09-26T10:00");
  });
});

describe("ajanda", () => {
  const showings = [
    { id: "g1", planlanan: d(2026, 9, 24, 14).toISOString(), durum: "planli" },
    { id: "g2", planlanan: d(2026, 9, 24, 10, 30).toISOString(), durum: "planli" },
    { id: "g3", planlanan: d(2026, 9, 24, 11).toISOString(), durum: "iptal" },
    { id: "g4", planlanan: d(2026, 9, 25, 9).toISOString(), durum: "planli" },
  ];
  const tasks = [
    { id: "a1", tur: "gorev", vade: d(2026, 9, 24, 12).toISOString() },
    { id: "a2", tur: "not", vade: d(2026, 9, 24, 12).toISOString() },
    { id: "a3", tur: "gorev", vade: null },
  ];
  it("güne göre süzer ve saate göre sıralar", () => {
    const items = agendaItems(showings, tasks, d(2026, 9, 24), d(2026, 9, 25));
    expect(items.map((i) => i.row.id)).toEqual(["g2", "a1", "g1"]);
    expect(agendaItems(showings, tasks, d(2026, 9, 24), d(2026, 9, 25), { iptalDahil: true })).toHaveLength(4);
  });
  it("günlere göre sayar", () => {
    const dates = showings.map((s) => new Date(s.planlanan));
    expect(countByDay(dates, weekDays(d(2026, 9, 24))).slice(3, 5)).toEqual([3, 1]);
  });
});

describe("yol tarifi ve geri bildirim", () => {
  it("koordinat öncelikli bağlantı kurar", () => {
    expect(directionsUrl({ konum: { lat: 40.98, lng: 29.02 }, adres: "x" })).toBe("https://www.google.com/maps/dir/?api=1&destination=40.98,29.02");
    expect(directionsUrl({ mahalle: "Moda", ilce: "Kadıköy", il: "İstanbul" })).toContain(encodeURIComponent("Moda, Kadıköy, İstanbul"));
    expect(directionsUrl({})).toBeNull();
  });
  it("puanları 1–5 aralığına sıkıştırır", () => {
    expect(normalizeFeedback({ puan: 7, fiyat: 0, konum: 3.4, not: "  " })).toEqual({ puan: 5, konum: 3 });
    expect(feedbackSummary({ puan: 4, fiyat: 3, not: "Mutfak küçük" })).toBe("Genel 4/5 · Fiyat 3/5 — Mutfak küçük");
    expect(feedbackSummary(null)).toBe("");
  });
  it("güvendeyim sayacını hesaplar", () => {
    expect(checkinRemaining(0, 45, 60_000)).toBe(44 * 60);
    expect(formatCountdown(125)).toBe("02:05");
    expect(formatCountdown(-5)).toBe("-00:05");
  });
});
