import { describe, expect, it } from "vitest";
import type { Consent, Person, Portfolio } from "../data/types";
import {
  activeConsent,
  coolingStatus,
  daysSince,
  findDuplicatesByPhone,
  missingConsents,
  personHeat,
  personHeatFromRows,
  personMatchesQuery,
  phoneKey,
  waNumber,
} from "./crm";
import { buildCatalogMessage, buildKvkkMessage, priceLabel, roomLabel } from "./crm-messages";

const now = new Date("2026-09-24T10:00:00");
const gunOnce = (d: number, h = 10) => {
  const x = new Date(now.getTime() - d * 86_400_000);
  x.setHours(h, 0, 0, 0);
  return x.toISOString();
};

const kisi = (p: Partial<Person>): Person => ({
  id: "p1",
  office_id: "o",
  owner_id: "u",
  ad_soyad: "Zeynep Aydın",
  tipler: ["alici"],
  created_at: gunOnce(60),
  ...p,
});

describe("daysSince", () => {
  it("takvim günü farkını verir", () => {
    expect(daysSince(gunOnce(0, 1), now)).toBe(0);
    expect(daysSince(gunOnce(3), now)).toBe(3);
    expect(daysSince(null, now)).toBeNull();
    expect(daysSince("geçersiz", now)).toBeNull();
  });
});

describe("soğuma tespiti", () => {
  it("son temas 14 günden eskiyse soğuyor", () => {
    const s = coolingStatus(kisi({ son_temas: gunOnce(15), sonraki_adim: "Ara", sonraki_adim_tarihi: gunOnce(-1) }), now);
    expect(s.soguyor).toBe(true);
    expect(s.gun).toBe(15);
    expect(s.nedenler[0]).toContain("15 gündür");
  });

  it("14 gün sınırında ve sonraki adımı varsa soğumuyor", () => {
    const s = coolingStatus(kisi({ son_temas: gunOnce(14), sonraki_adim: "Ara", sonraki_adim_tarihi: gunOnce(-2) }), now);
    expect(s.soguyor).toBe(false);
    expect(s.nedenler).toEqual([]);
  });

  it("sonraki adım yoksa soğuyor", () => {
    const s = coolingStatus(kisi({ son_temas: gunOnce(1) }), now);
    expect(s.soguyor).toBe(true);
    expect(s.nedenler).toContain("Sonraki adım planlanmamış");
  });

  it("gecikmiş sonraki adım soğuma nedenidir", () => {
    const s = coolingStatus(kisi({ son_temas: gunOnce(1), sonraki_adim: "Ara", sonraki_adim_tarihi: gunOnce(3) }), now);
    expect(s.soguyor).toBe(true);
    expect(s.nedenler[0]).toContain("3 gün gecikti");
  });

  it("yeni eklenen, temassız ama planlı kişi soğumuyor; eski temassız kişi soğuyor", () => {
    const plan = { sonraki_adim: "İlk arama", sonraki_adim_tarihi: gunOnce(-1) };
    expect(coolingStatus(kisi({ ...plan, created_at: gunOnce(0) }), now).soguyor).toBe(false);
    const eski = coolingStatus(kisi({ ...plan, created_at: gunOnce(40) }), now);
    expect(eski.soguyor).toBe(true);
    expect(eski.nedenler).toContain("Hiç temas kaydı yok");
  });
});

describe("ısı skoru", () => {
  const plan = { sonrakiAdim: "Gösterim", sonrakiAdimTarihi: gunOnce(-1) };

  it("sıcak alıcı yüksek puan alır ve 100'ü aşmaz", () => {
    const h = personHeat({ sonTemas: gunOnce(0), ...plan, aktifArayis: true, krediOnOnay: true, gosterimSayisi: 3 }, now);
    expect(h.puan).toBe(100);
    expect(h.sinyaller).toContain("Kredi ön onaylı");
  });

  it("soğuk ve plansız kişi düşük puan alır", () => {
    const h = personHeat({ sonTemas: gunOnce(40), aktifArayis: false, krediOnOnay: false, gosterimSayisi: 0 }, now);
    expect(h.puan).toBe(0);
    expect(h.sinyaller).toContain("Sonraki adım yok");
  });

  it("son temas yaşlandıkça puan düşer", () => {
    const p = (d: number) => personHeat({ sonTemas: gunOnce(d), ...plan, aktifArayis: true, krediOnOnay: false, gosterimSayisi: 0 }, now).puan;
    expect(p(1)).toBe(75);
    expect(p(5)).toBe(65);
    expect(p(10)).toBe(53);
    expect(p(20)).toBe(43);
    expect(p(1)).toBeGreaterThan(p(5));
  });

  it("gecikmiş sonraki adım yarım puan", () => {
    const a = personHeat({ sonTemas: gunOnce(1), sonrakiAdim: "Ara", sonrakiAdimTarihi: gunOnce(2), aktifArayis: false, krediOnOnay: false, gosterimSayisi: 0 }, now);
    expect(a.puan).toBe(50);
    expect(a.sinyaller).toContain("Sonraki adım gecikmiş");
  });

  it("satırlardan hesaplarken yalnızca aktif profilleri, 30 günlük ve iptal olmayan gösterimleri sayar", () => {
    const p = kisi({ son_temas: gunOnce(1), sonraki_adim: "Ara", sonraki_adim_tarihi: gunOnce(-1) });
    const h = personHeatFromRows(
      p,
      [
        { person_id: "p1", aktif: false, kredi_on_onay: true },
        { person_id: "p2", aktif: true, kredi_on_onay: true },
      ],
      [
        { person_id: "p1", planlanan: gunOnce(3), durum: "tamamlandi" },
        { person_id: "p1", planlanan: gunOnce(-2), durum: "planli" },
        { person_id: "p1", planlanan: gunOnce(5), durum: "iptal" },
        { person_id: "p1", planlanan: gunOnce(45), durum: "tamamlandi" },
      ],
      now,
    );
    // 40 temas + 20 adım + 0 arayış + 0 kredi + 15 (2 gösterim)
    expect(h.puan).toBe(75);
    expect(h.sinyaller).toContain("2 gösterim");
  });
});

describe("telefon ve mükerrer kayıt", () => {
  it("farklı yazımları aynı anahtara indirger", () => {
    expect(phoneKey("0532 418 22 47")).toBe("5324182247");
    expect(phoneKey("+90 (532) 418-22-47")).toBe("5324182247");
    expect(phoneKey("5324182247")).toBe("5324182247");
    expect(phoneKey(null)).toBe("");
  });

  it("aynı telefonlu kişileri bulur, kendisini hariç tutar", () => {
    const kisiler = [kisi({ id: "a", telefon: "0532 418 22 47" }), kisi({ id: "b", telefon: "+905324182247" }), kisi({ id: "c", telefon: "0533 000 00 00" })];
    expect(findDuplicatesByPhone(kisiler, "532 418 2247").map((p) => p.id)).toEqual(["a", "b"]);
    expect(findDuplicatesByPhone(kisiler, "05324182247", "a").map((p) => p.id)).toEqual(["b"]);
    expect(findDuplicatesByPhone(kisiler, "123")).toEqual([]);
    expect(findDuplicatesByPhone(kisiler, "")).toEqual([]);
  });

  it("wa.me numarası: TR ve yabancı", () => {
    expect(waNumber("0532 418 22 47")).toBe("905324182247");
    expect(waNumber("532 418 22 47")).toBe("905324182247");
    expect(waNumber("+7 916 000 00 12")).toBe("79160000012");
    expect(waNumber("0049 151 234")).toBe("49151234");
  });
});

describe("kişi arama", () => {
  const p = kisi({ ad_soyad: "Hülya Ertem", telefon: "0532 555 12 18", eposta: "hulya@ornek.com" });
  it("Türkçe duyarsız isim araması", () => {
    expect(personMatchesQuery(p, "hulya")).toBe(true);
    expect(personMatchesQuery(p, "ERTEM")).toBe(true);
    expect(personMatchesQuery(kisi({ ad_soyad: "Işıl Çakır" }), "isil cakir")).toBe(true);
    expect(personMatchesQuery(p, "zeynep")).toBe(false);
  });
  it("telefon rakamlarıyla arama", () => {
    expect(personMatchesQuery(p, "555 12")).toBe(true);
    expect(personMatchesQuery(p, "05325551218")).toBe(true);
    expect(personMatchesQuery(p, "+90 532 555 1218")).toBe(true);
    expect(personMatchesQuery(p, "999")).toBe(false);
  });
  it("boş sorgu her şeyi eşler", () => expect(personMatchesQuery(p, "  ")).toBe(true));
});

describe("KVKK rıza durumu", () => {
  const c = (p: Partial<Consent>): Consent => ({ id: "x", person_id: "p1", amac: "ticari_ileti", verildi: true, kaynak: "otp", created_at: gunOnce(10), ...p });

  it("en son kayıt geçerlidir; geri alınan rıza geçersizdir", () => {
    expect(activeConsent([c({ id: "1" })], "ticari_ileti")?.id).toBe("1");
    expect(activeConsent([c({ id: "1", geri_alindi_at: gunOnce(1) })], "ticari_ileti")).toBeNull();
    expect(activeConsent([c({ id: "1", geri_alindi_at: gunOnce(5) }), c({ id: "2", created_at: gunOnce(1) })], "ticari_ileti")?.id).toBe("2");
    expect(activeConsent([c({ id: "1" }), c({ id: "2", created_at: gunOnce(1), verildi: false })], "ticari_ileti")).toBeNull();
  });

  it("eksik rızaları listeler", () => {
    expect(missingConsents([])).toEqual(["aydinlatma", "ticari_ileti"]);
    expect(missingConsents([c({ amac: "aydinlatma" })])).toEqual(["ticari_ileti"]);
  });
});

describe("mesaj metinleri", () => {
  const port = (p: Partial<Portfolio>) =>
    ({ baslik: "Moda 3+1", fiyat: 12_500_000, ilan_tipi: "satilik", oda: 3, salon: 1, net_m2: 122, mahalle: "Moda", ilce: "Kadıköy", ...p }) as Portfolio;

  it("oda ve fiyat etiketleri", () => {
    expect(roomLabel({ oda: 3, salon: 1 })).toBe("3+1");
    expect(roomLabel({ oda: null })).toBeNull();
    expect(priceLabel({ fiyat: 12_500_000, ilan_tipi: "satilik" })).toBe("12,5 M ₺");
    expect(priceLabel({ fiyat: 42_000, ilan_tipi: "kiralik" })).toMatch(/42\.000.*\/ay$/);
  });

  it("katalog mesajı portföyleri listeler ve ret bilgisi içerir", () => {
    const m = buildCatalogMessage({
      kisiAdi: "Zeynep Aydın",
      portfoyler: [port({}), port({ baslik: "Göztepe 2+1", ilan_tipi: "kiralik", fiyat: 42_000, oda: 2, net_m2: null, brut_m2: 90, mahalle: "Göztepe" })],
      danismanAdi: "Emrullah Kara",
      ofisUnvani: "DC Emlak Kadıköy",
    });
    expect(m.startsWith("Merhaba Zeynep,")).toBe(true);
    expect(m).toContain("2 portföy");
    expect(m).toContain("1) Moda 3+1\n   12,5 M ₺ · 3+1 · 122 m² · Moda, Kadıköy");
    expect(m).toContain("2) Göztepe 2+1");
    expect(m).toContain("90 m²");
    expect(m).toContain("RET");
  });

  it("KVKK mesajı bağlantıyı içerir", () => {
    const m = buildKvkkMessage({ kisiAdi: "Deniz Yurt", ofisUnvani: "DC Emlak", link: "https://x/sozlesmeler", danismanAdi: "Selin" });
    expect(m).toContain("https://x/sozlesmeler");
    expect(m).toContain("KVKK");
  });
});
