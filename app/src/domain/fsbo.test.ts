import { describe, expect, it } from "vitest";
import type { FsboListingRow } from "../data/types";
import {
  cadence,
  callQueue,
  fsboToPortfolioDraft,
  funnel,
  isNew24h,
  nextStatus,
  openingScript,
  scorePatch,
  toScoreInput,
  type FsboRow,
} from "./fsbo";
import { fsboScore } from "./scoring";

const now = new Date(2026, 8, 24, 10, 0); // 24 Eylül 2026 10:00 yerel

const row = (p: Partial<FsboRow> = {}): FsboRow => ({
  id: "f1",
  office_id: "o1",
  kaynak: "manuel",
  ilk_gorulme: "2026-08-08",
  fiyat_dusum_sayisi: 2,
  sinyaller: [],
  durum: "yeni",
  ...p,
});

describe("FSBO skor eşlemesi", () => {
  it("ilan yaşını ilk görülme tarihinden, eksik alanları varsayılanlarla hesaplar", () => {
    const i = toScoreInput(row({ baslik: "Acil satılık", aciklama: null, foto_sayisi: null, piyasaya_gore_fark: null }), now);
    expect(i).toEqual({ ilanYasiGun: 47, fiyatDusumSayisi: 2, piyasayaGoreFark: 0, aciklama: "Acil satılık", fotoSayisi: 10 });
  });

  it("açıklama varsa başlık yerine açıklamayı kullanır", () => {
    expect(toScoreInput(row({ baslik: "x", aciklama: "tayin" }), now).aciklama).toBe("tayin");
  });

  it("gelecekteki ilk görülme negatif yaş üretmez", () => {
    expect(toScoreInput(row({ ilk_gorulme: "2026-09-30" }), now).ilanYasiGun).toBe(0);
  });

  it("skor değişmediyse yama üretmez, değiştiyse skor ve sinyalleri döner", () => {
    const r = row({ aciklama: "acil", foto_sayisi: 5, piyasaya_gore_fark: 11 });
    const s = fsboScore(toScoreInput(r, now));
    const p = scorePatch(r, now);
    expect(p).toEqual({ skor: s.puan, sinyaller: s.sinyaller });
    expect(scorePatch({ ...r, ...p! }, now)).toBeNull();
  });
});

describe("takip kadansı 1-3-7-14-30", () => {
  it("başlamamış kadansta ilk adım bugün ve sıradaki", () => {
    const c = cadence(null, now);
    expect(c.basladi).toBe(false);
    expect(c.gun).toBe(0);
    expect(c.adimlar.map((a) => a.durum)).toEqual(["current", "upcoming", "upcoming", "upcoming", "upcoming"]);
    expect(c.sonrakiVade!.getDate()).toBe(24);
    expect(c.sonrakiGorev!.gun).toBe(3);
  });

  it("ilk temas günü kadansın 1. günüdür; sonraki görev 3. gün", () => {
    const c = cadence("2026-09-24", now);
    expect(c.gun).toBe(1);
    expect(c.adimlar[0].durum).toBe("current");
    expect(c.sonrakiGorev!.gun).toBe(3);
    expect(c.sonrakiGorev!.tarih).toEqual(new Date(2026, 8, 26));
  });

  it("5. günde 1 ve 3 tamam, 7. gün adımı sıradaki (26 Eylül)", () => {
    const c = cadence("2026-09-20", now);
    expect(c.gun).toBe(5);
    expect(c.adimlar.map((a) => a.durum)).toEqual(["done", "done", "current", "upcoming", "upcoming"]);
    expect(c.sonrakiVade).toEqual(new Date(2026, 8, 26));
    expect(c.sonrakiGorev!.gun).toBe(7);
  });

  it("tam adım gününde o adım sıradaki olur", () => {
    const c = cadence("2026-09-11", now); // 14. gün
    expect(c.gun).toBe(14);
    expect(c.siradaki!.gun).toBe(14);
    expect(c.sonrakiGorev!.gun).toBe(30);
  });

  it("30 gün sonrasında kadans biter", () => {
    const c = cadence("2026-08-01", now);
    expect(c.adimlar.every((a) => a.durum === "done")).toBe(true);
    expect(c.siradaki).toBeNull();
    expect(c.sonrakiVade).toBeNull();
    expect(c.sonrakiGorev).toBeNull();
  });

  it("Date nesnesi de kabul eder", () => {
    expect(cadence(new Date(2026, 8, 23, 18), now).gun).toBe(2);
  });
});

describe("arama sonucu → durum", () => {
  it("huni ileri gider", () => {
    expect(nextStatus("yeni", "ulasilamadi")).toBe("arandi");
    expect(nextStatus("yeni", "gorusuldu")).toBe("gorusuldu");
    expect(nextStatus("arandi", "degerleme")).toBe("degerleme");
    expect(nextStatus("gorusuldu", "vazgecti")).toBe("vazgecildi");
  });
  it("geri düşmez", () => {
    expect(nextStatus("gorusuldu", "ulasilamadi")).toBe("gorusuldu");
    expect(nextStatus("yetki_alindi", "gorusuldu")).toBe("yetki_alindi");
  });
  it("vazgeçmiş mal sahibi yeniden kazanılabilir", () => {
    expect(nextStatus("vazgecildi", "gorusuldu")).toBe("gorusuldu");
  });
});

describe("huni ve arama sırası", () => {
  it("kümülatif huni", () => {
    const rows = (["yeni", "arandi", "gorusuldu", "degerleme", "yetki_alindi", "vazgecildi"] as const).map((durum) => ({ durum }));
    expect(funnel(rows).map((f) => f.sayi)).toEqual([6, 5, 3, 2, 1]);
  });

  it("arama sırası: aktif, vadesi gelmiş, bugün aranmamış; skora göre", () => {
    const rows: FsboRow[] = [
      row({ id: "a", skor: 50 }),
      row({ id: "b", skor: 90, durum: "arandi", ilk_temas: "2026-09-20" }), // 7. gün adımı 26'sında → değil
      row({ id: "c", skor: 70, durum: "gorusuldu", ilk_temas: "2026-09-18" }), // 7. gün = 24 → vadesi bugün
      row({ id: "d", skor: 99, durum: "degerleme" }),
      row({ id: "e", skor: 80, son_temas: new Date(2026, 8, 24, 9).toISOString() }),
      row({ id: "f", skor: 60, durum: "arandi" }),
    ];
    expect(callQueue(rows, now).map((r) => r.id)).toEqual(["c", "f", "a"]);
  });

  it("son 24 saatte görülenler", () => {
    expect(isNew24h(row({ ilk_gorulme: "2026-09-24" }), now)).toBe(true);
    expect(isNew24h(row({ ilk_gorulme: "2026-09-23" }), now)).toBe(true);
    expect(isNew24h(row({ ilk_gorulme: "2026-09-21" }), now)).toBe(false);
  });
});

describe("portföye dönüştürme", () => {
  it("malikten satıcı kişi, ilandan değerleme aşamasında portföy üretir", () => {
    const r: FsboListingRow = row({ baslik: "Moda 3+1", fiyat: 9_000_000, ilce: "Kadıköy", mahalle: "Moda", malik_ad: "Ayşe Kaya", malik_telefon: "0532" });
    const d = fsboToPortfolioDraft(r, { officeId: "o1", userId: "u1" });
    expect(d.person).toMatchObject({ ad_soyad: "Ayşe Kaya", telefon: "0532", tipler: ["satici"], owner_id: "u1", office_id: "o1" });
    expect(d.portfolio).toMatchObject({ asama: "degerleme", baslik: "Moda 3+1", fiyat: 9_000_000, ilce: "Kadıköy", mahalle: "Moda", eids_durum: "yok", owner_id: "u1" });
  });
  it("malik adı yoksa yer tutucu kullanır", () => {
    expect(fsboToPortfolioDraft(row(), { officeId: "o", userId: "u" }).person.ad_soyad).toBe("Malik (FSBO)");
  });
});

describe("açılış senaryosu", () => {
  it("malik ve danışman ilk adıyla kişiselleşir", () => {
    const s = openingScript({ malik_ad: "Ayşe Korkmaz", mahalle: "Fenerbahçe", ilce: "Kadıköy", baslik: null }, { ad: "Emrullah Kara", ofis: "DC Emlak" });
    expect(s).toContain("Ayşe Hanım/Bey");
    expect(s).toContain("ben Emrullah, DC Emlak ofisinden");
    expect(s).toContain("Fenerbahçe bölgesindeki");
  });
});
