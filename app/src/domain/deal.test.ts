import { describe, expect, it } from "vitest";
import { splitCommission } from "./commission";
import {
  acceptOfferPatches,
  buildClosingContext,
  buildListingContext,
  buildSplitRules,
  checklistProgress,
  contractStatus,
  daysUntil,
  defaultChecklist,
  expectedCommission,
  expectedFee,
  feeRate,
  isExpired,
  offerChains,
  pipelineSummary,
  toggleChecklist,
} from "./deal";
import { canTransition } from "./pipeline";

const now = new Date(2026, 8, 24, 10, 0);

describe("beklenen komisyon", () => {
  it("satışta fiyat × oran × 2 taraf", () => {
    expect(expectedFee({ ilan_tipi: "satilik", fiyat: 10_000_000 }, 2, now)).toBe(400_000);
    expect(expectedFee({ ilan_tipi: "satilik", fiyat: 10_000_000 }, 1, now)).toBe(200_000);
  });
  it("oran yasal tavanla sınırlanır", () => {
    expect(expectedFee({ ilan_tipi: "satilik", fiyat: 10_000_000 }, 3, now)).toBe(400_000);
  });
  it("kiralıkta 1 aylık kira", () => {
    expect(expectedFee({ ilan_tipi: "kiralik", fiyat: 42_000 }, 2, now)).toBe(42_000);
  });
  it("fiyat yoksa 0", () => {
    expect(expectedFee({ ilan_tipi: "satilik", fiyat: null }, 2, now)).toBe(0);
  });
  it("aşama olasılığıyla ağırlıklandırılır", () => {
    expect(expectedCommission({ ilan_tipi: "satilik", fiyat: 10_000_000, asama: "teklif" }, 2, now)).toBe(240_000);
    expect(expectedCommission({ ilan_tipi: "satilik", fiyat: 10_000_000, asama: "aday" }, 2, now)).toBe(20_000);
    expect(expectedCommission({ ilan_tipi: "kiralik", fiyat: 40_000, asama: "kapora" }, 2, now)).toBe(34_000);
    expect(expectedCommission({ ilan_tipi: "satilik", fiyat: 10_000_000, asama: "arsiv" }, 2, now)).toBe(0);
  });
  it("sütun özetleri", () => {
    const s = pipelineSummary(
      [
        { id: "a", ilan_tipi: "satilik", fiyat: 10_000_000, asama: "yayinda" },
        { id: "b", ilan_tipi: "satilik", fiyat: 5_000_000, asama: "yayinda" },
        { id: "c", ilan_tipi: "kiralik", fiyat: 30_000, asama: "tapu" },
        { id: "d", ilan_tipi: "satilik", fiyat: 1, asama: "arsiv" },
      ],
      (id) => (id === "b" ? 1 : 2),
      now,
    );
    expect(s.yayinda).toEqual({ adet: 2, beklenen: 140_000 + 35_000 });
    expect(s.tapu).toEqual({ adet: 1, beklenen: 28_500 });
    expect(s.aday.adet).toBe(0);
  });
  it("yetki sözleşmesinden oran; yoksa %2", () => {
    expect(feeRate([])).toBe(2);
    expect(feeRate([{ hizmet_bedeli_orani: 1, bitis: "2026-01-01" }, { hizmet_bedeli_orani: 1.5, bitis: "2027-01-01" }])).toBe(1.5);
    expect(feeRate([{ hizmet_bedeli_orani: null, bitis: "2027-01-01" }])).toBe(2);
  });
});

describe("kapanış kontrol listeleri", () => {
  it("satış listesi zorunlu maddeleri içerir", () => {
    const l = defaultChecklist("satilik");
    expect(l.map((i) => i.kod)).toEqual(["takyidat", "iskan", "dask", "aidat", "emlak_vergisi", "kyc", "kredi_ekspertiz", "tapu_randevu", "abonelik", "fatura"]);
    expect(l.find((i) => i.kod === "kredi_ekspertiz")!.zorunlu).toBe(false);
    expect(l.find((i) => i.kod === "dask")!.zorunlu).toBe(true);
    expect(l.every((i) => !i.tamam)).toBe(true);
  });
  it("kira listesi", () => {
    const kodlar = defaultChecklist("kiralik").map((i) => i.kod);
    for (const k of ["kimlik_gelir", "kefil", "depozito", "demirbas", "teslim_tutanagi", "sozlesme", "abonelik"]) expect(kodlar).toContain(k);
    expect(kodlar).not.toContain("takyidat");
  });
  it("her çağrı bağımsız kopya döner", () => {
    const a = defaultChecklist("satilik");
    a[0].tamam = true;
    expect(defaultChecklist("satilik")[0].tamam).toBe(false);
  });
  it("madde işaretleme ve ilerleme", () => {
    let l = defaultChecklist("satilik");
    l = toggleChecklist(l, "dask");
    expect(l.find((i) => i.kod === "dask")!.tamam).toBe(true);
    l = toggleChecklist(l, "dask", false);
    expect(l.find((i) => i.kod === "dask")!.tamam).toBe(false);
    const p = checklistProgress(toggleChecklist(l, "aidat"));
    expect(p.tamam).toBe(1);
    expect(p.eksikZorunlu.length).toBe(6);
  });
  it("tapuya kalan gün", () => {
    expect(daysUntil("2026-09-30", now)).toBe(6);
    expect(daysUntil("2026-09-24", now)).toBe(0);
    expect(daysUntil("2026-09-20", now)).toBe(-4);
    expect(daysUntil(null, now)).toBeNull();
  });
});

describe("uyum bağlamları", () => {
  const office = { yetki_belgesi_gecerlilik: "2030-01-01" };
  it("ilan bağlamı imzalı ve güncel sözleşmeyi seçer", () => {
    const ctx = buildListingContext(
      office,
      { eids_durum: "onaylandi", aciklama: "Güzel daire" },
      [
        { imza_tarihi: null, baslangic: "2026-09-01", bitis: "2027-09-01" },
        { imza_tarihi: "2026-06-01", baslangic: "2026-06-01", bitis: "2026-12-01" },
      ],
      now,
    );
    expect(ctx.yetkiSozlesmesi).toEqual({ imzaTarihi: "2026-06-01", baslangic: "2026-06-01", bitis: "2026-12-01" });
    expect(ctx.eidsOnayli).toBe(true);
    expect(ctx.ofisYetkiBelgesiGecerlilik).toBe("2030-01-01");
    expect(canTransition("yetki", "yayinda", { ilan: ctx }).karar).toBe("GEC");
  });
  it("EİDS ve sözleşme yoksa yayına geçiş engellenir", () => {
    const ctx = buildListingContext(office, { eids_durum: "talep_edildi", aciklama: null }, [], now);
    expect(ctx.yetkiSozlesmesi).toBeUndefined();
    const ev = canTransition("yetki", "yayinda", { ilan: ctx });
    expect(ev.karar).toBe("ENGELLE");
    expect(ev.sonuclar.map((s) => s.kural)).toEqual(expect.arrayContaining(["YETKI_SOZLESMESI", "EIDS"]));
  });
  it("kapanış bağlamı kontrol listesinden kurulur", () => {
    let l = defaultChecklist("satilik");
    const ctx0 = buildClosingContext({ bedel: 9_800_000, kontrol_listesi: l }, now);
    expect(ctx0).toMatchObject({ islemTutari: 9_800_000, daskPolicesiVar: false, takyidatSorgusuGuncel: false, musteriTanimaTamam: false });
    l = toggleChecklist(toggleChecklist(toggleChecklist(l, "dask"), "takyidat"), "kyc");
    const ctx1 = buildClosingContext({ bedel: 9_800_000, kontrol_listesi: l }, now);
    expect(ctx1).toMatchObject({ daskPolicesiVar: true, takyidatSorgusuGuncel: true, musteriTanimaTamam: true });
    const ilan = buildListingContext(office, { eids_durum: "onaylandi", aciklama: null }, [{ imza_tarihi: "2026-01-01", baslangic: "2026-01-01", bitis: "2027-06-01" }], now);
    expect(canTransition("tapu", "tamamlandi", { ilan, kapanis: ctx0 }).karar).toBe("ENGELLE");
    expect(canTransition("tapu", "tamamlandi", { ilan, kapanis: ctx1 }).karar).toBe("GEC");
  });
  it("kira işleminde takyidat maddesi aranmaz", () => {
    const ctx = buildClosingContext({ bedel: 40_000, kontrol_listesi: defaultChecklist("kiralik") }, now);
    expect(ctx.takyidatSorgusuGuncel).toBe(true);
    expect(ctx.daskPolicesiVar).toBe(false);
  });
  it("yetki sözleşmesi durumu", () => {
    expect(contractStatus([], now).durum).toBe("yok");
    expect(contractStatus([{ imza_tarihi: null, bitis: "2027-01-01" }], now).durum).toBe("imzasiz");
    expect(contractStatus([{ imza_tarihi: "2026-01-01", bitis: "2026-10-01" }], now)).toEqual({ durum: "bitiyor", kalanGun: 7 });
    expect(contractStatus([{ imza_tarihi: "2026-01-01", bitis: "2027-01-01" }], now).durum).toBe("gecerli");
    expect(contractStatus([{ imza_tarihi: "2026-01-01", bitis: "2026-09-01" }], now).durum).toBe("doldu");
  });
});

describe("teklifler", () => {
  const o = (id: string, created_at: string, onceki_teklif_id: string | null = null, durum: "acik" | "karsi_teklif" | "red" = "acik") => ({ id, created_at, onceki_teklif_id, durum });
  it("karşı teklif zincirleri", () => {
    const offers = [o("a", "2026-09-01"), o("b", "2026-09-02", "a"), o("c", "2026-09-03"), o("d", "2026-09-04", "b")];
    const chains = offerChains(offers);
    expect(chains.map((c) => c.map((x) => x.id))).toEqual([["a", "b", "d"], ["c"]]);
  });
  it("döngüsel bağlar sonsuz döngüye girmez", () => {
    const chains = offerChains([o("a", "2026-09-01", "b"), o("b", "2026-09-02", "a")]);
    expect(chains.flat().length).toBe(2);
  });
  it("kabulde diğer açık teklifler reddedilir", () => {
    const p = acceptOfferPatches([o("a", "1", null, "karsi_teklif"), o("b", "2"), o("c", "3", null, "red"), o("d", "4")], "b");
    expect(p).toEqual({ a: "red", b: "kabul", d: "red" });
  });
  it("kabul edilen karşı teklifin zincirindeki önceki adımlar korunur", () => {
    const offers = [o("a", "1", null, "karsi_teklif"), o("b", "2", "a", "karsi_teklif"), o("c", "3", "b"), o("x", "4")];
    expect(acceptOfferPatches(offers, "c")).toEqual({ c: "kabul", x: "red" });
  });
  it("süresi geçmiş açık teklif", () => {
    expect(isExpired({ durum: "acik", gecerlilik: "2026-09-20T00:00:00Z" }, now)).toBe(true);
    expect(isExpired({ durum: "red", gecerlilik: "2026-09-20T00:00:00Z" }, now)).toBe(false);
    expect(isExpired({ durum: "acik", gecerlilik: null }, now)).toBe(false);
  });
});

describe("komisyon paylaşımı", () => {
  it("varsayılan 50/50", () => {
    const r = buildSplitRules(50, []);
    expect(r.map((x) => [x.alici, x.oran])).toEqual([["ofis", 50], ["danisman", 50]]);
    expect(splitCommission(100_000, r)).toEqual([{ alici: "ofis", tutar: 50_000 }, { alici: "danisman", tutar: 50_000 }]);
  });
  it("ek paylar önce ayrılır, kalan ofis/danışman arasında bölünür", () => {
    const r = buildSplitRules(60, [{ rol: "referans", oran: 10 }, { rol: "portfoy_getiren", oran: 15, userId: "u2" }]);
    expect(r.map((x) => [x.alici, x.oran])).toEqual([["referans", 10], ["portfoy_getiren", 15], ["ofis", 45], ["danisman", 30]]);
    expect(r[1].userId).toBe("u2");
    const s = splitCommission(200_000, r);
    expect(s.reduce((a, x) => a + x.tutar, 0)).toBe(200_000);
  });
  it("küsuratlı oranlarda toplam %100 kalır", () => {
    const r = buildSplitRules(33.33, [{ rol: "musteri_getiren", oran: 12.5 }]);
    expect(() => splitCommission(123_456.78, r)).not.toThrow();
  });
  it("geçersiz oranlar reddedilir", () => {
    expect(() => buildSplitRules(50, [{ rol: "referans", oran: 120 }])).toThrow(RangeError);
    expect(() => buildSplitRules(150, [])).toThrow(RangeError);
  });
});
