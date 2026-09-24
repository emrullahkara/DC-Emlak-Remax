import { describe, expect, it } from "vitest";
import { CommissionCapError, rentCommission, saleCommission, splitCommission } from "./commission";
import {
  evaluateClosing,
  evaluateContractSign,
  evaluateListingPublish,
  evaluateMessageSend,
  evaluateShowingComplete,
  type ListingContext,
} from "./compliance";
import { buyerTotalCost, sellerNet } from "./costs";
import { rankMatches, type Portfolio, type SearchProfile } from "./matching";
import { canTransition } from "./pipeline";
import { checkDeposit, leaseMilestones, maxRenewedRent } from "./rent";
import { fsboScore, portfolioHealth } from "./scoring";

const bugun = new Date("2026-09-24T10:00:00");

describe("hizmet bedeli", () => {
  it("satışta taraf başına %2 + %20 KDV hesaplar", () => {
    const r = saleCommission(10_000_000, { alici: 2, satici: 2 }, bugun);
    expect(r.satirlar).toHaveLength(2);
    expect(r.satirlar[0]).toMatchObject({ taraf: "alici", matrah: 200_000, kdv: 40_000, toplam: 240_000 });
    expect(r.genelToplam).toBe(480_000);
    expect(r.paramSurum).toBe("2026.09");
  });

  it("yasal tavanı aşan oranı reddeder", () => {
    expect(() => saleCommission(5_000_000, { satici: 3 }, bugun)).toThrow(CommissionCapError);
  });

  it("kirada toplam 1 aylık kirayı aşmaz", () => {
    const r = rentCommission(40_000, { kiraci: 0.5, kiraya_veren: 0.5 }, bugun);
    expect(r.toplamMatrah).toBe(40_000);
    expect(r.genelToplam).toBe(48_000);
    expect(() => rentCommission(40_000, { kiraci: 1, kiraya_veren: 1 }, bugun)).toThrow(CommissionCapError);
  });

  it("paylaşımı kuruşu kaybetmeden dağıtır", () => {
    const s = splitCommission(100_000.01, [
      { alici: "ofis", oran: 33.3333 },
      { alici: "danisman", oran: 33.3333 },
      { alici: "portfoy_getiren", oran: 33.3334 },
    ]);
    expect(s.reduce((a, x) => a + x.tutar, 0)).toBeCloseTo(100_000.01, 2);
    expect(() => splitCommission(1000, [{ alici: "ofis", oran: 90 }])).toThrow(RangeError);
  });
});

describe("maliyet hesaplayıcıları", () => {
  const girdi = { satisBedeli: 8_000_000, aliciKomisyonOrani: 2, saticiKomisyonOrani: 2, daskPrimi: 1_500, tarih: bugun };

  it("alıcının toplam maliyeti", () => {
    const r = buyerTotalCost(girdi);
    // 8.000.000 + 160.000 tapu + 0 döner sermaye + 192.000 komisyon + 1.500 DASK
    expect(r.toplam).toBe(8_353_500);
  });

  it("satıcının eline geçen", () => {
    const r = sellerNet({ ...girdi, kalanKrediBorcu: 1_000_000 });
    // 8.000.000 - 160.000 - 192.000 - 1.000.000
    expect(r.toplam).toBe(6_648_000);
  });
});

describe("kira", () => {
  it("12 aylık TÜFE ortalamasına göre azami kira", () => {
    expect(maxRenewedRent(30_000, 35.5)).toEqual({ azamiArtisOrani: 35.5, yeniKira: 40_650, artisTutari: 10_650 });
  });
  it("güvence bedeli 3 aylık kirayı aşamaz", () => {
    expect(checkDeposit(20_000, 60_000, bugun).gecerli).toBe(true);
    expect(checkDeposit(20_000, 60_001, bugun).gecerli).toBe(false);
  });
  it("5. ve 10. yıl tarihleri", () => {
    const m = leaseMilestones(new Date("2024-03-01"));
    expect(m.besinciYil.getFullYear()).toBe(2029);
    expect(m.onYillikUzamaSonu.getFullYear()).toBe(2034);
  });
});

describe("uyum motoru", () => {
  const tamIlan: ListingContext = {
    bugun,
    ofisYetkiBelgesiGecerlilik: "2030-01-01",
    yetkiSozlesmesi: { imzaTarihi: "2026-09-01", baslangic: "2026-09-01", bitis: "2027-03-01" },
    eidsOnayli: true,
    ilanMetni: "Moda'da deniz manzaralı, yeni tadilatlı 3+1 daire.",
  };

  it("eksiksiz ilan geçer", () => {
    expect(evaluateListingPublish(tamIlan).karar).toBe("GEC");
  });

  it("yetki sözleşmesi veya EİDS yoksa engeller", () => {
    const r = evaluateListingPublish({ ...tamIlan, yetkiSozlesmesi: undefined, eidsOnayli: false });
    expect(r.karar).toBe("ENGELLE");
    expect(r.sonuclar.map((s) => s.kural)).toEqual(["YETKI_SOZLESMESI", "EIDS"]);
  });

  it("süresi yaklaşan yetki ve riskli ifade uyarır", () => {
    const r = evaluateListingPublish({
      ...tamIlan,
      yetkiSozlesmesi: { imzaTarihi: "2026-04-01", baslangic: "2026-04-01", bitis: "2026-10-04" },
      ilanMetni: "Bölgenin en ucuz dairesi, garantili kira getirisi!",
    });
    expect(r.karar).toBe("UYAR");
    expect(r.sonuclar.map((s) => s.kural)).toEqual(["YETKI_SOZLESMESI_SURE", "ILAN_METNI"]);
  });

  it("yer gösterme belgesi olmadan gösterim kapanmaz", () => {
    expect(evaluateShowingComplete({ yerGostermeBelgesiImzali: false }).karar).toBe("ENGELLE");
    expect(evaluateShowingComplete({ yerGostermeBelgesiImzali: true }).karar).toBe("GEC");
  });

  it("İYS izni veya açık rıza yoksa ticari ileti gitmez", () => {
    expect(
      evaluateMessageSend({ ticariIleti: true, kanal: "sms", kvkkAcikRiza: true, iysIzni: false }).karar,
    ).toBe("ENGELLE");
    expect(
      evaluateMessageSend({ ticariIleti: false, kanal: "whatsapp", kvkkAcikRiza: false, iysIzni: false }).karar,
    ).toBe("GEC");
  });

  it("zorunlu alan boşsa sözleşme imzaya gitmez", () => {
    const r = evaluateContractSign({ zorunluAlanlar: ["ada", "parsel"], degerler: { ada: "1234", parsel: " " } });
    expect(r.karar).toBe("ENGELLE");
    expect(r.sonuclar[0].mesaj).toContain("parsel");
  });

  it("DASK yoksa tapu kapanışı engellenir", () => {
    const r = evaluateClosing({
      islemTutari: 5_000_000,
      daskPolicesiVar: false,
      takyidatSorgusuGuncel: true,
      musteriTanimaTamam: true,
      bugun,
    });
    expect(r.karar).toBe("ENGELLE");
  });

  it("işlem hattında 'Yayında'ya atlamak kapıyı tetikler, geri gitmek serbest", () => {
    const eksik = { ...tamIlan, eidsOnayli: false };
    expect(canTransition("yetki", "yayinda", { ilan: eksik }).karar).toBe("ENGELLE");
    expect(canTransition("aday", "teklif", { ilan: eksik }).karar).toBe("ENGELLE");
    expect(canTransition("teklif", "aday", { ilan: eksik }).karar).toBe("GEC");
    expect(canTransition("aday", "degerleme", { ilan: eksik }).karar).toBe("GEC");
  });
});

describe("eşleştirme", () => {
  const portfoyler: Portfolio[] = [
    { id: "a", fiyat: 9_500_000, ilce: "Kadıköy", mahalle: "Moda", oda: 3, netM2: 120, kat: 3, krediyeUygun: true, ozellikler: ["asansor", "balkon"] },
    { id: "b", fiyat: 10_400_000, ilce: "Kadıköy", mahalle: "Göztepe", oda: 3, netM2: 110, kat: 2, krediyeUygun: true, ozellikler: ["asansor", "otopark"] },
    { id: "c", fiyat: 8_000_000, ilce: "Kadıköy", mahalle: "Moda", oda: 3, netM2: 100, kat: 1, krediyeUygun: false, ozellikler: ["asansor"] },
    { id: "d", fiyat: 7_000_000, ilce: "Üsküdar", mahalle: "Altunizade", oda: 3, netM2: 115, kat: 4, krediyeUygun: true, ozellikler: ["asansor"] },
  ];
  const profil: SearchProfile = {
    butceMax: 10_000_000,
    butceTolerans: 5,
    ilceler: ["Kadıköy"],
    mahalleler: ["Moda"],
    odaMin: 3,
    krediKullanacak: true,
    zorunlu: ["asansor"],
    tercih: ["balkon", "otopark"],
  };

  it("sert filtreleri uygular ve puana göre sıralar", () => {
    const r = rankMatches(portfoyler, profil);
    expect(r.map((m) => m.portfoyId)).toEqual(["a", "b"]);
    expect(r[0].puan).toBeGreaterThan(r[1].puan);
    expect(r[0].gerekceler).toContain("Bütçe içinde");
  });
});

describe("skorlar", () => {
  it("motivasyon sinyali yüksek FSBO'yu öne çıkarır", () => {
    const sicak = fsboScore({ ilanYasiGun: 40, fiyatDusumSayisi: 2, piyasayaGoreFark: 12, aciklama: "Acil satılık, tayin nedeniyle", fotoSayisi: 4 });
    const soguk = fsboScore({ ilanYasiGun: 3, fiyatDusumSayisi: 0, piyasayaGoreFark: 0, aciklama: "Satılık daire", fotoSayisi: 20 });
    expect(sicak.puan).toBeGreaterThan(80);
    expect(soguk.puan).toBeLessThan(20);
    expect(sicak.sinyaller).toContain("tayin");
  });

  it("portföy sağlık skoru somut öneri üretir", () => {
    const h = portfolioHealth({ fotoSayisi: 8, katPlaniVar: false, aciklamaKarakter: 900, piyasayaGoreFark: 18, sonGuncellemeGun: 3, yayindaGun: 25, teklifSayisi: 0, goruntulenme: 300, arama: 5 });
    expect(h.puan).toBeLessThan(60);
    expect(h.sinyaller.join(" ")).toMatch(/Kat planı/);
  });
});
