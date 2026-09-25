import { describe, expect, it } from "vitest";
import { buildSeed } from "../data/seed";
import type { AuthorizationContract, Consent, Portfolio } from "../data/types";
import { evaluateListingPublish } from "./compliance";
import { rankMatches } from "./matching";
import { canTransition } from "./pipeline";
import {
  closingContext,
  commissionCap,
  currentContract,
  eidsGuidanceText,
  evrakListesi,
  filterPortfolios,
  DEFAULT_FILTER,
  healthInput,
  listingContext,
  ownerReportText,
  ownersKvkk,
  performance,
  portfolioName,
  toMatchPortfolio,
  toMatchProfile,
  validateYetki,
  waLink,
  yetkiDurumu,
} from "./portfoy";
import { EMPTY_FORM, formFromPortfolio, parsePortfolioForm, priceChange, validHisse } from "./portfoy-form";
import { portfolioHealth } from "./scoring";

const bugun = new Date("2026-09-24T10:00:00");
const seed = buildSeed(bugun);
const P = (n: number) => seed.portfolio!.find((p) => p.id.endsWith(String(n).padStart(12, "0")))!;
const contractsOf = (id: string) => seed.authorization_contract!.filter((c) => c.portfolio_id === id);
const office = seed.office![0]!;

const ac = (p: Partial<AuthorizationContract>): AuthorizationContract => ({
  id: "x",
  portfolio_id: "p",
  munhasir: true,
  baslangic: "2026-01-01",
  bitis: "2026-12-31",
  ...p,
});

describe("yetki sözleşmesi", () => {
  it("imzalı ve en geç biten sözleşme seçilir", () => {
    const c = currentContract([
      ac({ id: "a", bitis: "2026-10-01", imza_tarihi: "2026-01-01" }),
      ac({ id: "b", bitis: "2027-03-01" }),
      ac({ id: "c", bitis: "2026-12-01", imza_tarihi: "2026-06-01" }),
    ]);
    expect(c?.id).toBe("c");
    expect(currentContract([])).toBeNull();
  });

  it("durum: yok / imzasız / geçerli / doldu", () => {
    expect(yetkiDurumu([], bugun).durum).toBe("yok");
    expect(yetkiDurumu([ac({})], bugun).durum).toBe("imzasiz");
    const g = yetkiDurumu([ac({ imza_tarihi: "2026-01-01", bitis: "2026-10-04" })], bugun);
    expect(g).toMatchObject({ durum: "gecerli", kalan: 11 });
    expect(yetkiDurumu([ac({ imza_tarihi: "2026-01-01", bitis: "2026-09-01" })], bugun).durum).toBe("doldu");
  });

  it("hizmet bedeli yasal tavanı ve form doğrulaması", () => {
    expect(commissionCap("satilik", bugun)).toMatchObject({ deger: 2, birim: "%" });
    expect(commissionCap("kiralik", bugun)).toMatchObject({ deger: 1, birim: "ay" });
    const base = { munhasir: true, oran: 2, baslangic: "2026-09-24", bitis: "2026-12-24", imzaTarihi: "2026-09-24" };
    expect(validateYetki(base, "satilik", bugun)).toEqual({});
    expect(validateYetki({ ...base, oran: 3 }, "satilik", bugun).oran).toMatch(/%2/);
    expect(validateYetki({ ...base, oran: 2 }, "kiralik", bugun).oran).toMatch(/aylık kira/);
    expect(validateYetki({ ...base, bitis: "2026-09-01" }, "satilik", bugun).bitis).toBeDefined();
  });
});

describe("uyum bağlamı", () => {
  it("seed portföy 1 yayına uygun (yalnız süre uyarısı olabilir)", () => {
    const p = P(1);
    const ev = evaluateListingPublish(listingContext(p, office, contractsOf(p.id), bugun));
    expect(ev.karar).not.toBe("ENGELLE");
  });

  it("seed portföy 6: imzasız yetki ve EİDS yok → ENGELLE", () => {
    const p = P(6);
    const ev = evaluateListingPublish(listingContext(p, office, contractsOf(p.id), bugun));
    expect(ev.karar).toBe("ENGELLE");
    expect(ev.sonuclar.map((r) => r.kural)).toEqual(expect.arrayContaining(["YETKI_SOZLESMESI", "EIDS"]));
  });

  it("ofis yetki belgesi yoksa engeller", () => {
    const p = P(1);
    const ev = evaluateListingPublish(listingContext(p, { yetki_belgesi_gecerlilik: null }, contractsOf(p.id), bugun));
    expect(ev.sonuclar.some((r) => r.kural === "YETKI_BELGESI")).toBe(true);
  });

  it("aşama geçişi: aday → yayında kapıyı kontrol eder; tamamlandı kapanış bağlamı ister", () => {
    const p = P(6);
    const ilan = listingContext(p, office, contractsOf(p.id), bugun);
    expect(canTransition("aday", "degerleme", { ilan }).karar).toBe("GEC");
    expect(canTransition("yetki", "yayinda", { ilan }).karar).toBe("ENGELLE");
    const deal = seed.deal![0]!;
    const kapanis = closingContext(P(10), deal, [], bugun);
    expect(kapanis).toMatchObject({ islemTutari: 9_800_000, daskPolicesiVar: true, musteriTanimaTamam: true, takyidatSorgusuGuncel: true });
    const p10 = P(10);
    expect(canTransition("tapu", "tamamlandi", { ilan: listingContext(p10, office, contractsOf(p10.id), bugun), kapanis }).karar).not.toBe("ENGELLE");
  });
});

describe("KVKK ve evrak", () => {
  const consents: Consent[] = [
    { id: "1", person_id: "a", amac: "aydinlatma", verildi: true, kaynak: "otp", created_at: "" },
    { id: "2", person_id: "b", amac: "aydinlatma", verildi: true, kaynak: "otp", created_at: "", geri_alindi_at: "2026-09-01" },
  ];
  it("malik rıza durumu", () => {
    expect(ownersKvkk([], consents)).toBe("malik_yok");
    expect(ownersKvkk(["a"], consents)).toBe("tamam");
    expect(ownersKvkk(["a", "b"], consents)).toBe("eksik");
  });

  it("evrak listesi veriden türetilir", () => {
    const p = P(6);
    const items = evrakListesi({ portfolio: p, contracts: contractsOf(p.id), docs: [], deal: null, ownerIds: ["a"], consents }, bugun);
    const by = Object.fromEntries(items.map((i) => [i.kod, i]));
    expect(by.yetki!.tamam).toBe(false);
    expect(by.yetki!.detay).toBe("Sözleşme imzalanmamış");
    expect(by.kvkk!.tamam).toBe(true);
    expect(by.iskan!.tamam).toBe(false);
    expect(by.takyidat!.tamam).toBe(true);
    expect(by.dask!.tamam).toBe(false);
    expect(by.tapu!.tamam).toBe(true);
  });

  it("arsa için iskân/DASK gerekmez", () => {
    const p = { ...P(6), emlak_tipi: "arsa" };
    const items = evrakListesi({ portfolio: p, contracts: [], docs: [], deal: null, ownerIds: [], consents: [] }, bugun);
    expect(items.find((i) => i.kod === "iskan")).toBeUndefined();
    expect(items.find((i) => i.kod === "dask")!.zorunlu).toBe(false);
  });
});

describe("sağlık skoru eşlemesi", () => {
  it("medya ve teklif sayısından girdi üretir", () => {
    const p = P(2);
    const inp = healthInput(p, { media: [{ tur: "foto" }, { tur: "foto" }, { tur: "kat_plani" }, { tur: "sanal_mobilya" }], offers: [] }, bugun);
    expect(inp).toMatchObject({ fotoSayisi: 3, katPlaniVar: true, aciklamaKarakter: p.aciklama!.length, piyasayaGoreFark: 0, teklifSayisi: 0, yayindaGun: 41, sonGuncellemeGun: 2 });
    const h = portfolioHealth(inp);
    expect(h.puan).toBeLessThan(100);
    expect(h.sinyaller.join(" ")).toMatch(/Fotoğraf sayısı 3/);
  });

  it("yayında olmayan portföyde yayın süresi 0", () => {
    expect(healthInput(P(7), { media: [], offers: [] }, bugun).yayindaGun).toBe(0);
  });
});

describe("eşleştirme eşlemesi", () => {
  it("seed arama profilleri ile Moda portföyü Zeynep'e eşleşir", () => {
    const ports = seed.portfolio!.filter((p) => p.ilan_tipi === "satilik").map(toMatchPortfolio).filter((x) => x !== null);
    const s1 = seed.search_profile!.find((s) => s.id === "s1")!;
    const r = rankMatches(ports, toMatchProfile(s1));
    expect(r[0]?.portfoyId).toBe(P(1).id);
  });

  it("fiyatı veya ilçesi olmayan portföy eşleştirmeye girmez", () => {
    expect(toMatchPortfolio({ ...P(1), fiyat: null })).toBeNull();
    expect(toMatchPortfolio({ ...P(1), ilce: null })).toBeNull();
    expect(toMatchPortfolio({ ...P(1), net_m2: null })!.netM2).toBe(140);
  });
});

describe("liste filtreleme", () => {
  const rows = seed.portfolio!;
  it("Türkçe duyarsız arama ve tip filtresi", () => {
    expect(filterPortfolios(rows, { ...DEFAULT_FILTER, q: "KOSUYOLU" }).map((p) => p.mahalle)).toEqual(["Koşuyolu"]);
    expect(filterPortfolios(rows, { ...DEFAULT_FILTER, q: "ataşehir 3+1" })).toHaveLength(1);
    expect(filterPortfolios(rows, { ...DEFAULT_FILTER, ilanTipi: "kiralik" }).every((p) => p.ilan_tipi === "kiralik")).toBe(true);
  });
  it("arşiv varsayılan olarak gizli; sıralama", () => {
    const withArchive: Portfolio[] = [...rows, { ...rows[0]!, id: "arsiv-1", asama: "arsiv" }];
    expect(filterPortfolios(withArchive, DEFAULT_FILTER).some((p) => p.asama === "arsiv")).toBe(false);
    expect(filterPortfolios(withArchive, { ...DEFAULT_FILTER, asama: "arsiv" })).toHaveLength(1);
    const asc = filterPortfolios(rows, { ...DEFAULT_FILTER, siralama: "fiyat_artan" }).map((p) => p.fiyat!);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
  });
});

describe("performans ve metinler", () => {
  it("fiyat değişimi ve gösterim istatistikleri", () => {
    const p = P(1);
    const perf = performance(
      p,
      seed.portfolio_price_history!.filter((h) => h.portfolio_id === p.id),
      [
        { durum: "tamamlandi", planlanan: new Date(bugun.getTime() - 2 * 86_400_000).toISOString(), geri_bildirim: { puan: 4 } },
        { durum: "tamamlandi", planlanan: new Date(bugun.getTime() - 20 * 86_400_000).toISOString(), geri_bildirim: { puan: 5 } },
        { durum: "planli", planlanan: bugun.toISOString() },
      ],
      [{ id: "t" }],
      bugun,
    );
    expect(perf).toMatchObject({ fiyatDegisimi: 2, ilkFiyat: 13_200_000, sonFiyat: 12_500_000, degisimYuzde: -5.3, gosterim: 2, gosterimSon7: 1, teklif: 1, ortPuan: 4.5 });
  });

  it("mal sahibi raporu ve EİDS yönlendirmesi", () => {
    const perf = performance(P(1), [], [], [], bugun);
    const t = ownerReportText({ malikAd: "Hülya Ertem", portfoyAdi: "Moda 3+1", fiyat: 12_500_000, perf, geriBildirimler: ["Metroya yakın"], oneriler: ["Kat planı ekleyin"], yetkiKalan: 12, danismanAd: "Emrullah Kara", ofisUnvan: "DC Emlak", bugun });
    expect(t).toMatch(/^Merhaba Hülya Hanım\/Bey,/);
    expect(t).toMatch(/Kat planı ekleyin/);
    expect(t).toMatch(/12 gün kaldı/);
    const e = eidsGuidanceText({ malikAd: "Hülya Ertem", ofisUnvan: "DC Emlak", yetkiBelgesiNo: "3401-2231", portfoyAdi: "Moda 3+1", adaParsel: "Ada 1234 / Parsel 5", danismanAd: "Emrullah" });
    expect(e).toMatch(/turkiye\.gov\.tr/);
    expect(e).toMatch(/3401-2231/);
  });

  it("wa.me bağlantısı TR ve yabancı numarayı doğru biçimler", () => {
    expect(waLink("0532 555 12 18", "a b")).toBe("https://wa.me/905325551218?text=a%20b");
    expect(waLink("+7 916 000 00 12", "x")).toBe("https://wa.me/79160000012?text=x");
  });

  it("portföy adı", () => {
    expect(portfolioName({ baslik: null, mahalle: "Moda", ilce: "Kadıköy", oda: 3, salon: 1, emlak_tipi: "daire" })).toBe("Moda 3+1 daire");
  });
});

describe("portföy formu", () => {
  it("seed satırı → form → yama gidiş-dönüş", () => {
    const p = P(1);
    const r = parsePortfolioForm(formFromPortfolio(p));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toMatchObject({ fiyat: p.fiyat, brut_m2: p.brut_m2, oda: 3, salon: 1, ilce: "Kadıköy", iskan_var: true, konum: p.konum, ozellikler: p.ozellikler });
    expect(r.data.takyidat).toMatchObject({ ipotek: false, haciz: false, sorgu_tarihi: p.takyidat.sorgu_tarihi });
  });

  it("doğrulama hataları alan bazında", () => {
    const r = parsePortfolioForm({ ...EMPTY_FORM, baslik: "abc", fiyat: "pahalı", brut_m2: "100", net_m2: "120", kat: "5", toplam_kat: "3", lat: "41" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(["baslik", "fiyat", "ilce", "kat", "lng", "net_m2"].sort());
  });

  it("Türkçe sayı girişi", () => {
    const r = parsePortfolioForm({ ...EMPTY_FORM, baslik: "Deneme portföy", ilce: "Kadıköy", fiyat: "12.500.000", aidat: "1.850,50", taks: "0,35" });
    expect(r.ok && r.data.fiyat).toBe(12_500_000);
    expect(r.ok && r.data.aidat).toBe(1850.5);
    expect(r.ok && r.data.imar.taks).toBe(0.35);
  });

  it("fiyat değişimi ve hisse biçimi", () => {
    expect(priceChange(null, 10)).toBe(10);
    expect(priceChange(10, 10)).toBeNull();
    expect(priceChange(10, null)).toBeNull();
    expect(validHisse("1/2")).toBe(true);
    expect(validHisse("%50")).toBe(true);
    expect(validHisse("3/2")).toBe(false);
    expect(validHisse("abc")).toBe(false);
    expect(validHisse("")).toBe(true);
  });
});
