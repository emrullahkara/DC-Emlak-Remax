import { describe, expect, it } from "vitest";
import { buildSeed, DEMO_USER_ID, DEMO_USERS } from "../data/seed";
import type { AuthorizationContract, Portfolio } from "../data/types";
import {
  buildTodayActions,
  calendarDaysUntil,
  complianceAlertCount,
  monthlyRealized,
  pipelineSummary,
  potentialCommission,
  targetProgress,
  type KokpitInput,
} from "./kokpit";

const now = new Date("2026-09-24T09:00:00");
const U = DEMO_USER_ID;

function seedInput(scope: KokpitInput["scope"] = "ofis"): KokpitInput {
  const db = buildSeed(now);
  return {
    office: db.office![0],
    userId: U,
    scope,
    portfolios: db.portfolio!,
    contracts: db.authorization_contract!,
    showings: db.showing!,
    persons: db.person!,
    activities: db.activity!,
    fsbo: db.fsbo_listing!,
    documents: db.document!,
    offers: db.offer!,
    media: db.media!,
  };
}

function portfolio(p: Partial<Portfolio>): Portfolio {
  return {
    id: "p",
    office_id: "o",
    owner_id: U,
    asama: "yayinda",
    ilan_tipi: "satilik",
    emlak_tipi: "daire",
    baslik: "Test 3+1",
    para_birimi: "TRY",
    takyidat: {},
    imar: {},
    ozellikler: [],
    paylasim_seviyesi: "ofis",
    eids_durum: "onaylandi",
    aciklama: "x".repeat(500),
    created_at: "2026-09-20T09:00:00.000Z",
    updated_at: "2026-09-23T09:00:00.000Z",
    ...p,
  };
}

const emptyInput = (over: Partial<KokpitInput> = {}): KokpitInput => ({
  office: { yetki_belgesi_gecerlilik: "2029-01-01" },
  userId: U,
  scope: "ofis",
  portfolios: [],
  contracts: [],
  showings: [],
  persons: [],
  activities: [],
  fsbo: [],
  ...over,
});

const contract = (c: Partial<AuthorizationContract>): AuthorizationContract => ({
  id: "c",
  portfolio_id: "p",
  munhasir: true,
  hizmet_bedeli_orani: 2,
  baslangic: "2026-06-01",
  bitis: "2027-06-01",
  imza_tarihi: "2026-06-01",
  ...c,
});

describe("Kokpit — bugünün aksiyonları (örnek veri)", () => {
  const actions = buildTodayActions(seedInput(), now);
  const byId = (id: string) => actions.find((a) => a.id === id);

  it("önceliğe göre azalan sıralıdır", () => {
    for (let i = 1; i < actions.length; i++) expect(actions[i - 1].priority).toBeGreaterThanOrEqual(actions[i].priority);
  });

  it("EİDS onayı olmayan yetki aşamasındaki portföyleri engel olarak gösterir", () => {
    const a = byId("uyum:10000000-0000-4000-8000-000000000003");
    expect(a?.level).toBe("ENGELLE");
    expect(a?.detail).toMatch(/EİDS/);
    expect(a?.href).toBe("/portfoyler/10000000-0000-4000-8000-000000000003");
    // İmzasız yetki sözleşmesi (Suadiye)
    expect(byId("uyum:10000000-0000-4000-8000-000000000006")?.detail).toMatch(/yetki sözleşmesi/i);
  });

  it("yetki sözleşmesi bitişlerini 30/15/7 gün kovalarında uyarır", () => {
    const cadde = byId("yetki:10000000-0000-4000-8000-000000000002"); // 6 gün
    const moda = byId("yetki:10000000-0000-4000-8000-000000000001"); // 23 gün
    const bostanci = byId("yetki:10000000-0000-4000-8000-000000000010"); // 15 gün, tapu aşaması
    expect(cadde?.detail).toMatch(/^7 gün/);
    expect(moda?.detail).toMatch(/^30 gün/);
    expect(bostanci?.detail).toMatch(/^15 gün/);
    expect(cadde!.priority).toBeGreaterThan(bostanci!.priority);
    expect(bostanci!.priority).toBeGreaterThan(moda!.priority);
    // 47 günlük sözleşme uyarılmaz
    expect(byId("yetki:10000000-0000-4000-8000-000000000004")).toBeUndefined();
  });

  it("bugünkü gösterimleri belge durumuyla ve takvim bağlantısıyla listeler", () => {
    const g1 = byId("gosterim:g1");
    expect(g1?.title).toMatch(/Gösterim · Moda/);
    expect(g1?.detail).toMatch(/Zeynep Aydın/);
    expect(g1?.detail).toMatch(/hazırlanmadı/);
    expect(g1?.compliance).toBe(true);
    expect(g1?.href).toBe("/takvim");
    // Daha erken saatteki gösterim önce gelir
    expect(g1!.priority).toBeGreaterThan(byId("gosterim:g2")!.priority);
    // 2 gün sonraki gösterim bugün listesinde yok
    expect(byId("gosterim:g3")).toBeUndefined();
  });

  it("bugünkü görevleri gösterir, yarınkileri göstermez", () => {
    expect(byId("gorev:a3")?.href).toBe("/musteriler/20000000-0000-4000-8000-000000000009");
    expect(byId("gorev:a4")).toBeUndefined();
  });

  it("soğuyan müşteriyi ve sonraki adımı olmayanı ayırır", () => {
    expect(byId("soguyan:20000000-0000-4000-8000-000000000005")?.title).toMatch(/Hakan Demirel soğuyor/);
    expect(byId("soguyan:20000000-0000-4000-8000-000000000010")?.title).toMatch(/sonraki adımı planlayın/);
    // Sonraki adımı olan, yakın temaslı müşteri listelenmez
    expect(byId("soguyan:20000000-0000-4000-8000-000000000001")).toBeUndefined();
    // Satıcılar müşteri soğuma listesine girmez
    expect(byId("soguyan:20000000-0000-4000-8000-000000000006")).toBeUndefined();
  });

  it("sıcak FSBO ilanlarını gösterir; başka danışmana atananları göstermez", () => {
    expect(byId("fsbo:f1")?.href).toBe("/fsbo");
    expect(byId("fsbo:f5")).toBeUndefined(); // Selin'e atanmış
    expect(byId("fsbo:f4")).toBeUndefined(); // soğuk
  });

  it("sağlığı düşük yayındaki portföy için fiyat revizyonu önerir", () => {
    const a = byId("fiyat:10000000-0000-4000-8000-000000000002");
    expect(a?.detail).toMatch(/Sağlık \d+\/100/);
  });

  it("uyum sayacını hesaplar", () => {
    expect(complianceAlertCount(actions)).toBe(actions.filter((a) => a.compliance && a.level !== "BILGI").length);
    expect(complianceAlertCount(actions)).toBeGreaterThanOrEqual(4);
  });
});

describe("Kokpit — kapsam (Benim / Ofis)", () => {
  it("'benim' kapsamında başka danışmanın portföyü ve müşterisi görünmez", () => {
    const benim = buildTodayActions(seedInput("benim"), now);
    expect(benim.find((a) => a.id === "yetki:10000000-0000-4000-8000-000000000002")).toBeUndefined(); // Selin'in
    const ofis = buildTodayActions(seedInput("ofis"), now);
    expect(ofis.length).toBeGreaterThan(benim.length);
  });
});

describe("Kokpit — kurallar (el yapımı veri)", () => {
  it("ofis yetki belgesi yoksa tek bir ofis aksiyonu üretir, portföy başına tekrar etmez", () => {
    const a = buildTodayActions(
      emptyInput({
        office: { yetki_belgesi_gecerlilik: null },
        portfolios: [portfolio({ id: "p1" }), portfolio({ id: "p2" })],
        contracts: [contract({ id: "c1", portfolio_id: "p1" }), contract({ id: "c2", portfolio_id: "p2" })],
      }),
      now,
    );
    expect(a.filter((x) => x.kind === "yetki_belgesi")).toHaveLength(1);
    expect(a[0].id).toBe("ofis:yetki_belgesi");
    expect(a[0].href).toBe("/ayarlar");
    expect(a.filter((x) => x.kind === "uyum")).toHaveLength(0);
  });

  it("ofis yetki belgesi yakında bitiyorsa uyarır", () => {
    const a = buildTodayActions(emptyInput({ office: { yetki_belgesi_gecerlilik: "2026-10-04" } }), now);
    expect(a[0]).toMatchObject({ kind: "yetki_belgesi", level: "UYAR" });
  });

  it("süresi dolmuş imzalı sözleşmeyi tek engel olarak gösterir", () => {
    const a = buildTodayActions(
      emptyInput({ portfolios: [portfolio({ id: "p" })], contracts: [contract({ bitis: "2026-09-20" })] }),
      now,
    );
    const yetki = a.filter((x) => x.kind === "yetki_bitis");
    expect(yetki).toHaveLength(1);
    expect(yetki[0].level).toBe("ENGELLE");
    expect(a.filter((x) => x.kind === "uyum")).toHaveLength(0);
  });

  it("yayındaki ilanda yanıltıcı ifadeyi uyarı olarak gösterir", () => {
    const a = buildTodayActions(
      emptyInput({ portfolios: [portfolio({ aciklama: "Bölgenin en ucuz dairesi! " + "x".repeat(450) })], contracts: [contract({})] }),
      now,
    );
    expect(a.find((x) => x.kind === "uyum")).toMatchObject({ level: "UYAR" });
  });

  it("aday/değerleme aşamasındaki portföyler için yayın kapısı çalışmaz", () => {
    const a = buildTodayActions(emptyInput({ portfolios: [portfolio({ asama: "aday", eids_durum: "yok" })] }), now);
    expect(a).toHaveLength(0);
  });

  it("gecikmiş görev bugünküden önce gelir; tamamlanan görev görünmez", () => {
    const a = buildTodayActions(
      emptyInput({
        activities: [
          { id: 1, office_id: "o", user_id: U, tur: "gorev", icerik: "Bugün", vade: "2026-09-24T15:00:00", tamamlandi: false, created_at: "" },
          { id: 2, office_id: "o", user_id: U, tur: "gorev", icerik: "Dün", vade: "2026-09-23T15:00:00", tamamlandi: false, created_at: "" },
          { id: 3, office_id: "o", user_id: U, tur: "gorev", icerik: "Bitti", vade: "2026-09-23T15:00:00", tamamlandi: true, created_at: "" },
          { id: 4, office_id: "o", user_id: U, tur: "not", icerik: "Not", vade: "2026-09-23T15:00:00", created_at: "" },
        ],
      }),
      now,
    );
    expect(a.map((x) => x.title)).toEqual(["Dün", "Bugün"]);
    expect(a[0].level).toBe("UYAR");
  });

  it("imzalı yer gösterme belgesi olan gösterim uyum uyarısı sayılmaz", () => {
    const a = buildTodayActions(
      emptyInput({
        portfolios: [portfolio({ asama: "teklif" })],
        showings: [{ id: "s", office_id: "o", portfolio_id: "p", person_id: "k", agent_id: U, planlanan: "2026-09-24T11:00:00", durum: "planli", yer_gosterme_belgesi_id: "d" }],
        documents: [{ id: "d", office_id: "o", sablon: "yer-gosterme-belgesi", sablon_surum: "1", kural_surum: "1", alanlar: {}, durum: "imzalandi", created_by: U, created_at: "" }],
      }),
      now,
    );
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ kind: "gosterim", level: "BILGI", compliance: false });
    expect(complianceAlertCount(a)).toBe(0);
  });
});

describe("Kokpit — para", () => {
  it("satışta iki taraf, kiralamada bir aylık kira üzerinden potansiyel komisyon", () => {
    expect(potentialCommission(portfolio({ fiyat: 10_000_000 }), contract({ hizmet_bedeli_orani: 1.5 }), now)).toBe(350_000);
    expect(potentialCommission(portfolio({ fiyat: 10_000_000 }), undefined, now)).toBe(400_000);
    expect(potentialCommission(portfolio({ ilan_tipi: "kiralik", fiyat: 40_000 }), undefined, now)).toBe(40_000);
    expect(potentialCommission(portfolio({ fiyat: null }), undefined, now)).toBe(0);
  });

  it("hat özeti aşama olasılıklarıyla ağırlıklandırır", () => {
    const s = pipelineSummary(
      [portfolio({ id: "a", fiyat: 10_000_000, asama: "yayinda" }), portfolio({ id: "b", fiyat: 10_000_000, asama: "tapu" }), portfolio({ id: "c", asama: "tamamlandi", fiyat: 1 })],
      [],
      now,
    );
    expect(s.asamalar.find((x) => x.asama === "yayinda")).toMatchObject({ adet: 1, beklenen: 140_000 });
    expect(s.asamalar.find((x) => x.asama === "tapu")).toMatchObject({ adet: 1, beklenen: 380_000 });
    expect(s.beklenenToplam).toBe(520_000);
    expect(s.kayitSayisi).toBe(2);
  });

  it("bu ay oluşturulan işlemlerin matrahını toplar", () => {
    const deals = [
      { id: "d1", office_id: "o", portfolio_id: "p1", bedel: 1, kontrol_listesi: [], kural_surum: "x", created_at: "2026-09-03T10:00:00" },
      { id: "d2", office_id: "o", portfolio_id: "p2", bedel: 1, kontrol_listesi: [], kural_surum: "x", created_at: "2026-08-30T10:00:00" },
      { id: "d3", office_id: "o", portfolio_id: "p3", bedel: 1, kontrol_listesi: [], kural_surum: "x", created_at: "2026-09-20T10:00:00" },
    ];
    const lines = [
      { id: "l1", deal_id: "d1", taraf: "alici", matrah: 100_000, kdv: 20_000, tahsil_edildi: false },
      { id: "l2", deal_id: "d1", taraf: "satici", matrah: 50_000.5, kdv: 10_000, tahsil_edildi: true },
      { id: "l3", deal_id: "d2", taraf: "alici", matrah: 999, kdv: 0, tahsil_edildi: true },
      { id: "l4", deal_id: "d3", taraf: "alici", matrah: 30_000, kdv: 0, tahsil_edildi: true },
    ];
    expect(monthlyRealized(deals, lines, now)).toBe(180_000.5);
    const portfolios = [portfolio({ id: "p1" }), portfolio({ id: "p3", owner_id: DEMO_USERS.selin })];
    expect(monthlyRealized(deals, lines, now, { scope: "benim", userId: U, portfolios })).toBe(150_000.5);
  });

  it("hedef ilerlemesini hesaplar", () => {
    expect(targetProgress(600_000, 468_000, now)).toEqual({ hedef: 600_000, gerceklesen: 468_000, oran: 78, kalan: 132_000, kalanGun: 6 });
    expect(targetProgress(0, 10, now).oran).toBe(0);
    expect(targetProgress(100, 250, now).oran).toBe(100);
  });

  it("takvim günü farkı", () => {
    expect(calendarDaysUntil("2026-09-24", now)).toBe(0);
    expect(calendarDaysUntil("2026-10-01", now)).toBe(7);
    expect(calendarDaysUntil("2026-09-20", now)).toBe(-4);
  });
});
