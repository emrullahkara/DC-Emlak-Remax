/**
 * Demo modu örnek verisi. Tarihler açılış anına göre göreli üretilir,
 * böylece "bugün", "3 gün önce" gibi durumlar her zaman anlamlı kalır.
 * Tüm kişiler ve ilanlar kurgusaldır.
 */
import type {
  Activity,
  AuthorizationContract,
  Consent,
  Deal,
  FsboListingRow,
  Media,
  Office,
  OfficeMember,
  Offer,
  Person,
  Portfolio,
  PortfolioOwner,
  PortfolioPriceHistory,
  SearchProfile,
  Showing,
  TableName,
  Tables,
} from "./types";

export const DEMO_OFFICE_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_USER_ID = "00000000-0000-4000-8000-0000000000a1";
export const DEMO_USERS = {
  broker: DEMO_USER_ID,
  selin: "00000000-0000-4000-8000-0000000000a2",
  kaan: "00000000-0000-4000-8000-0000000000a3",
};

type DB = { [K in TableName]?: Tables[K][] };

const DAY = 86_400_000;

export function buildSeed(now: Date = new Date()): DB {
  const iso = (d: number, h = 10, m = 0) => {
    const x = new Date(now.getTime() + d * DAY);
    x.setHours(h, m, 0, 0);
    return x.toISOString();
  };
  const date = (d: number) => iso(d).slice(0, 10);
  const pid = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const cid = (n: number) => `20000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const O = DEMO_OFFICE_ID;
  const U = DEMO_USER_ID;

  const office: Office[] = [
    {
      id: O,
      unvan: "DC Emlak Kadıköy",
      vergi_no: "1234567890",
      mersis_no: "0123456789000015",
      yetki_belgesi_no: "3401-2231",
      yetki_belgesi_gecerlilik: date(4 * 365),
      plan: "profesyonel",
      deneme_bitis: date(14),
      varsayilan_ofis_payi: 50,
      created_at: iso(-120),
    },
  ];

  const office_member: OfficeMember[] = [
    { office_id: O, user_id: U, rol: "broker", ad_soyad: "Emrullah Kara", telefon: "0532 000 00 01", yetki_belgesi_no: "3401-2231-01", aktif: true },
    { office_id: O, user_id: DEMO_USERS.selin, rol: "danisman", ad_soyad: "Selin Demir", telefon: "0532 000 00 02", yetki_belgesi_no: "3401-2231-02", aktif: true },
    { office_id: O, user_id: DEMO_USERS.kaan, rol: "danisman", ad_soyad: "Kaan Yalçın", telefon: "0532 000 00 03", yetki_belgesi_no: "3401-2231-03", aktif: true },
  ];

  const base = (n: number, p: Partial<Portfolio>): Portfolio => ({
    id: pid(n),
    office_id: O,
    owner_id: U,
    asama: "aday",
    ilan_tipi: "satilik",
    emlak_tipi: "daire",
    para_birimi: "TRY",
    il: "İstanbul",
    ilce: "Kadıköy",
    takyidat: { ipotek: false, haciz: false, sorgu_tarihi: date(-6) },
    imar: { durum: "Konut alanı" },
    ozellikler: [],
    paylasim_seviyesi: "ofis",
    eids_durum: "yok",
    created_at: iso(-60),
    updated_at: iso(-2),
    ...p,
  });

  const portfolio: Portfolio[] = [
    base(1, { asama: "yayinda", baslik: "Moda 3+1, deniz manzaralı", fiyat: 12_500_000, brut_m2: 140, net_m2: 122, oda: 3, salon: 1, kat: 4, toplam_kat: 6, bina_yasi: 12, isinma: "Kombi", aidat: 1850, mahalle: "Moda", ada: "1234", parsel: "5", bagimsiz_bolum: "9", tapu_turu: "kat_mulkiyeti", iskan_var: true, krediye_uygun: true, ozellikler: ["asansor", "balkon", "deniz_manzarasi"], eids_durum: "onaylandi", eids_ref: "EIDS-7781", aciklama: "Moda sahiline 3 dakika yürüme mesafesinde, yeni tadilatlı, güney-batı cepheli, deniz manzaralı 3+1 daire. Salon ve mutfak açık plan, ebeveyn banyolu. Bina 2014 yapımı, asansörlü ve açık otoparklı. Metrobüs ve vapur iskelesine yürüme mesafesinde; okullar, kafeler ve Moda sahil parkı hemen yanı başınızda. Tapu kat mülkiyetli, iskânlı ve krediye uygundur.", saglik_skoru: 82, konum: { lat: 40.9847, lng: 29.0275 }, created_at: iso(-34) }),
    base(2, { asama: "yayinda", baslik: "Caddebostan 2+1, sahile 3 dk", fiyat: 8_750_000, brut_m2: 95, net_m2: 82, oda: 2, salon: 1, kat: 2, toplam_kat: 5, bina_yasi: 24, isinma: "Kombi", aidat: 950, mahalle: "Caddebostan", ada: "877", parsel: "12", bagimsiz_bolum: "4", tapu_turu: "kat_mulkiyeti", iskan_var: true, krediye_uygun: true, takyidat: { ipotek: true, haciz: false, sorgu_tarihi: date(-10) }, ozellikler: ["balkon"], eids_durum: "onaylandi", aciklama: "Caddebostan sahiline 3 dakika, 2+1 daire.", saglik_skoru: 58, owner_id: DEMO_USERS.selin, created_at: iso(-41) }),
    base(3, { asama: "yetki", baslik: "Fenerbahçe 4+1 dubleks, bahçeli", fiyat: 21_900_000, brut_m2: 210, net_m2: 180, oda: 4, salon: 1, kat: 0, toplam_kat: 4, bina_yasi: 6, isinma: "Yerden ısıtma", aidat: 4200, mahalle: "Fenerbahçe", ada: "415", parsel: "3", bagimsiz_bolum: "1", tapu_turu: "kat_mulkiyeti", iskan_var: true, krediye_uygun: true, ozellikler: ["bahce", "kapali_otopark", "site"], eids_durum: "talep_edildi", created_at: iso(-5) }),
    base(4, { ilce: "Ataşehir", mahalle: "Barbaros", asama: "yayinda", baslik: "Ataşehir Barbaros 3+1, site içi", fiyat: 11_200_000, brut_m2: 155, net_m2: 132, oda: 3, salon: 1, kat: 11, toplam_kat: 22, bina_yasi: 9, isinma: "Merkezi", aidat: 3100, ada: "3310", parsel: "1", bagimsiz_bolum: "86", tapu_turu: "kat_mulkiyeti", iskan_var: true, krediye_uygun: true, ozellikler: ["asansor", "kapali_otopark", "site", "havuz"], eids_durum: "onaylandi", aciklama: "Barbaros'ta havuzlu site içinde, metroya 5 dk, kapalı otoparklı, 11. kat şehir manzaralı 3+1. Site içinde 7/24 güvenlik, spor salonu, çocuk oyun alanı. Okullar ve alışveriş merkezlerine yürüme mesafesi. İskânlı, krediye uygun. Yatırım için de uygun; bölgedeki kira getirisi yüksek.", saglik_skoru: 88, owner_id: DEMO_USERS.kaan }),
    base(5, { ilan_tipi: "kiralik", asama: "yayinda", baslik: "Göztepe 2+1 kiralık, metroya yakın", fiyat: 42_000, brut_m2: 90, net_m2: 78, oda: 2, salon: 1, kat: 3, toplam_kat: 5, bina_yasi: 18, isinma: "Kombi", aidat: 700, mahalle: "Göztepe", ada: "602", parsel: "8", bagimsiz_bolum: "6", tapu_turu: "kat_mulkiyeti", iskan_var: true, ozellikler: ["asansor", "esyali_yari"], eids_durum: "onaylandi", saglik_skoru: 76 }),
    base(6, { mahalle: "Suadiye", asama: "yetki", baslik: "Suadiye 3+1, deniz manzaralı", fiyat: 17_400_000, brut_m2: 165, net_m2: 145, oda: 3, salon: 1, kat: 6, toplam_kat: 8, bina_yasi: 4, isinma: "Kombi", aidat: 2600, ada: "209", parsel: "17", bagimsiz_bolum: "12", tapu_turu: "kat_irtifaki", iskan_var: false, krediye_uygun: false, ozellikler: ["asansor", "kapali_otopark", "deniz_manzarasi"], eids_durum: "yok" }),
    base(7, { ilan_tipi: "kiralik", mahalle: "Acıbadem", asama: "degerleme", baslik: "Acıbadem 1+1 kiralık, eşyalı", fiyat: 28_500, brut_m2: 60, net_m2: 52, oda: 1, salon: 1, kat: 1, toplam_kat: 4, bina_yasi: 15, isinma: "Kombi", aidat: 500, ozellikler: ["esyali"], eids_durum: "yok" }),
    base(8, { emlak_tipi: "villa", mahalle: "Koşuyolu", asama: "teklif", baslik: "Koşuyolu 4+1, bahçeli müstakil", fiyat: 26_000_000, brut_m2: 240, net_m2: 205, oda: 4, salon: 2, kat: 0, toplam_kat: 2, bina_yasi: 30, isinma: "Kombi", ada: "88", parsel: "4", tapu_turu: "arsa", iskan_var: true, krediye_uygun: true, ozellikler: ["bahce", "otopark"], eids_durum: "onaylandi", saglik_skoru: 79 }),
    base(9, { ilce: "Ataşehir", mahalle: "Küçükbakkalköy", asama: "kapora", baslik: "Küçükbakkalköy 2+1, yeni bina", fiyat: 6_450_000, brut_m2: 98, net_m2: 84, oda: 2, salon: 1, kat: 5, toplam_kat: 9, bina_yasi: 2, isinma: "Kombi", aidat: 1400, ada: "2021", parsel: "6", bagimsiz_bolum: "22", tapu_turu: "kat_mulkiyeti", iskan_var: true, krediye_uygun: true, ozellikler: ["asansor", "kapali_otopark"], eids_durum: "onaylandi", saglik_skoru: 84, owner_id: DEMO_USERS.kaan }),
    base(10, { mahalle: "Bostancı", asama: "tapu", baslik: "Bostancı 3+1, sahil yolu", fiyat: 9_950_000, brut_m2: 135, net_m2: 118, oda: 3, salon: 1, kat: 3, toplam_kat: 7, bina_yasi: 14, isinma: "Kombi", aidat: 1600, ada: "512", parsel: "9", bagimsiz_bolum: "7", tapu_turu: "kat_mulkiyeti", iskan_var: true, krediye_uygun: true, ozellikler: ["asansor", "otopark"], eids_durum: "onaylandi", saglik_skoru: 90 }),
  ];

  const portfolio_price_history: PortfolioPriceHistory[] = [
    { id: "h1", portfolio_id: pid(1), fiyat: 13_200_000, created_at: iso(-60) },
    { id: "h2", portfolio_id: pid(1), fiyat: 12_900_000, created_at: iso(-30) },
    { id: "h3", portfolio_id: pid(1), fiyat: 12_500_000, created_at: iso(-7) },
    { id: "h4", portfolio_id: pid(8), fiyat: 27_500_000, created_at: iso(-50) },
    { id: "h5", portfolio_id: pid(8), fiyat: 26_000_000, created_at: iso(-20) },
  ];

  const person = (n: number, p: Partial<Person>): Person => ({
    id: cid(n),
    office_id: O,
    owner_id: U,
    ad_soyad: "",
    tipler: ["alici"],
    created_at: iso(-30),
    ...p,
  });

  const personRows: Person[] = [
    person(1, { ad_soyad: "Zeynep Aydın", telefon: "0532 418 22 47", eposta: "zeynep@example.com", tipler: ["alici"], kaynak: "Referans", isi_skoru: 92, son_temas: iso(0, 8), sonraki_adim: "Moda gösterimi", sonraki_adim_tarihi: iso(0, 10, 30) }),
    person(2, { ad_soyad: "Burak Şahin", telefon: "0535 207 91 03", tipler: ["yatirimci"], kaynak: "sahibinden.com", isi_skoru: 74, son_temas: iso(-3), sonraki_adim: "2 portföy kataloğu gönder", sonraki_adim_tarihi: iso(1) }),
    person(3, { ad_soyad: "Elif Karaca", telefon: "0544 663 10 58", tipler: ["alici"], kaynak: "Instagram", isi_skoru: 81, son_temas: iso(-1), sonraki_adim: "Fenerbahçe dubleks gösterimi", sonraki_adim_tarihi: iso(2) }),
    person(4, { ad_soyad: "Deniz Yurt", telefon: "0536 902 44 15", tipler: ["kiraci"], kaynak: "Web formu", isi_skoru: 66, son_temas: iso(-5), sonraki_adim: "İkinci görüşme", sonraki_adim_tarihi: iso(1) }),
    person(5, { ad_soyad: "Hakan Demirel", telefon: "0533 780 35 62", tipler: ["alici"], kaynak: "Tabela QR", isi_skoru: 28, son_temas: iso(-19) }),
    person(6, { ad_soyad: "Hülya Ertem", sonraki_adim: "Haftalık rapor gönder", sonraki_adim_tarihi: iso(1, 15), telefon: "0532 555 12 18", tipler: ["satici"], kaynak: "FSBO Radar", son_temas: iso(-2) }),
    person(7, { ad_soyad: "Canan Öztürk", sonraki_adim: "Fiyat revizyonu görüşmesi", sonraki_adim_tarihi: iso(2, 15), telefon: "0544 115 20 71", tipler: ["satici"], kaynak: "FSBO Radar", son_temas: iso(-2), owner_id: DEMO_USERS.selin }),
    person(8, { ad_soyad: "Levent Tan", sonraki_adim: "EİDS onayını hatırlat", sonraki_adim_tarihi: iso(0, 15), telefon: "0533 410 22 40", tipler: ["satici"], kaynak: "Referans", son_temas: iso(-4) }),
    person(9, { ad_soyad: "Gülay Sezer", sonraki_adim: "Yetki sözleşmesi imzası", sonraki_adim_tarihi: iso(0, 15), telefon: "0530 222 11 55", tipler: ["satici"], kaynak: "Sfer", son_temas: iso(-1) }),
    person(10, { ad_soyad: "Olga Petrova", telefon: "+7 916 000 00 12", tipler: ["yabanci_alici"], kaynak: "Ağ/MLS", isi_skoru: 70, son_temas: iso(-4) }),
  ];

  const portfolio_owner: PortfolioOwner[] = [
    { portfolio_id: pid(1), person_id: cid(6), hisse: "1/1", vekil: false },
    { portfolio_id: pid(2), person_id: cid(7), hisse: "1/1", vekil: false },
    { portfolio_id: pid(3), person_id: cid(8), hisse: "1/1", vekil: false },
    { portfolio_id: pid(6), person_id: cid(9), hisse: "1/1", vekil: false },
  ];

  const consent: Consent[] = personRows
    .filter((p) => p.id !== cid(5))
    .flatMap((p, i) => [
      { id: `k${i}a`, person_id: p.id, amac: "aydinlatma" as const, verildi: true, kaynak: "otp", created_at: p.created_at },
      { id: `k${i}b`, person_id: p.id, amac: "ticari_ileti" as const, kanal: "whatsapp", verildi: true, kaynak: "otp", created_at: p.created_at },
    ]);

  const search_profile: SearchProfile[] = [
    { id: "s1", person_id: cid(1), ilan_tipi: "satilik", butce_min: 11_000_000, butce_max: 13_500_000, butce_tolerans: 5, ilceler: ["Kadıköy"], mahalleler: ["Moda", "Caddebostan", "Fenerbahçe"], oda_min: 3, m2_min: 110, kredi_kullanacak: true, kredi_on_onay: true, zorunlu: ["asansor"], tercih: ["deniz_manzarasi", "otopark"], aktif: true },
    { id: "s2", person_id: cid(2), ilan_tipi: "satilik", butce_min: 6_000_000, butce_max: 9_000_000, butce_tolerans: 5, ilceler: ["Ataşehir", "Kadıköy"], mahalleler: [], oda_min: 1, kredi_kullanacak: false, kredi_on_onay: false, zorunlu: [], tercih: ["asansor"], aktif: true },
    { id: "s3", person_id: cid(3), ilan_tipi: "satilik", butce_min: 15_000_000, butce_max: 22_000_000, butce_tolerans: 5, ilceler: ["Kadıköy"], mahalleler: ["Suadiye", "Fenerbahçe", "Caddebostan"], oda_min: 3, kredi_kullanacak: true, kredi_on_onay: false, zorunlu: [], tercih: ["bahce", "kapali_otopark"], aktif: true },
    { id: "s4", person_id: cid(4), ilan_tipi: "kiralik", butce_min: 35_000, butce_max: 45_000, butce_tolerans: 5, ilceler: ["Kadıköy"], mahalleler: ["Göztepe", "Moda", "Acıbadem"], oda_min: 2, kredi_kullanacak: false, kredi_on_onay: false, zorunlu: [], tercih: [], aktif: true },
    { id: "s5", person_id: cid(10), ilan_tipi: "satilik", butce_min: 18_000_000, butce_max: 27_000_000, butce_tolerans: 5, ilceler: ["Kadıköy"], mahalleler: [], oda_min: 3, kredi_kullanacak: false, kredi_on_onay: false, zorunlu: [], tercih: ["deniz_manzarasi", "bahce"], aktif: true },
  ];

  const authorization_contract: AuthorizationContract[] = [
    { id: "y1", portfolio_id: pid(1), munhasir: true, hizmet_bedeli_orani: 2, baslangic: date(-160), bitis: date(23), imza_tarihi: date(-160) },
    { id: "y2", portfolio_id: pid(2), munhasir: false, hizmet_bedeli_orani: 2, baslangic: date(-84), bitis: date(6), imza_tarihi: date(-84) },
    { id: "y3", portfolio_id: pid(3), munhasir: true, hizmet_bedeli_orani: 2, baslangic: date(-5), bitis: date(175), imza_tarihi: date(-5) },
    { id: "y4", portfolio_id: pid(4), munhasir: true, hizmet_bedeli_orani: 2, baslangic: date(-40), bitis: date(47), imza_tarihi: date(-40) },
    { id: "y5", portfolio_id: pid(5), munhasir: false, hizmet_bedeli_orani: 1, baslangic: date(-20), bitis: date(34), imza_tarihi: date(-20) },
    { id: "y6", portfolio_id: pid(6), munhasir: true, hizmet_bedeli_orani: 2, baslangic: date(0), bitis: date(180) },
    { id: "y8", portfolio_id: pid(8), munhasir: true, hizmet_bedeli_orani: 2, baslangic: date(-60), bitis: date(61), imza_tarihi: date(-60) },
    { id: "y9", portfolio_id: pid(9), munhasir: false, hizmet_bedeli_orani: 2, baslangic: date(-50), bitis: date(40), imza_tarihi: date(-50) },
    { id: "y10", portfolio_id: pid(10), munhasir: true, hizmet_bedeli_orani: 2, baslangic: date(-90), bitis: date(15), imza_tarihi: date(-90) },
  ];

  const showing: Showing[] = [
    { id: "g1", office_id: O, portfolio_id: pid(1), person_id: cid(1), agent_id: U, planlanan: iso(0, 10, 30), durum: "planli" },
    { id: "g2", office_id: O, portfolio_id: pid(4), person_id: cid(2), agent_id: U, planlanan: iso(0, 14), durum: "planli" },
    { id: "g3", office_id: O, portfolio_id: pid(3), person_id: cid(3), agent_id: U, planlanan: iso(2, 11), durum: "planli" },
    { id: "g4", office_id: O, portfolio_id: pid(5), person_id: cid(4), agent_id: U, planlanan: iso(-3, 17), durum: "tamamlandi", yer_gosterme_belgesi_id: "d-ygb-1", geri_bildirim: { puan: 4, fiyat: 3, konum: 5, not: "Metroya yakın, mutfak küçük" } },
  ];

  const offer: Offer[] = [
    { id: "t1", portfolio_id: pid(8), person_id: cid(10), tutar: 24_750_000, kosullar: { odeme: "nakit", teslim: "30 gün" }, gecerlilik: iso(3), durum: "acik", created_at: iso(-1) },
  ];

  const deal: Deal[] = [
    {
      id: "i1",
      office_id: O,
      portfolio_id: pid(10),
      alici_id: cid(3),
      bedel: 9_800_000,
      kapora: 300_000,
      tapu_tarihi: date(0),
      kural_surum: "2026.09",
      created_at: iso(-12),
      kontrol_listesi: [
        { kod: "takyidat", baslik: "Tapu kaydı (takyidat) sorgusu", tamam: true, zorunlu: true },
        { kod: "iskan", baslik: "İskân / kat mülkiyeti kontrolü", tamam: true, zorunlu: true },
        { kod: "dask", baslik: "DASK poliçesi", tamam: true, zorunlu: true },
        { kod: "aidat", baslik: "Aidat borcu yok yazısı", tamam: true, zorunlu: false },
        { kod: "emlak_vergisi", baslik: "Emlak vergisi borcu yok yazısı", tamam: false, zorunlu: false },
        { kod: "kyc", baslik: "Müşteriyi tanıma (MASAK) formu", tamam: true, zorunlu: true },
        { kod: "tapu_randevu", baslik: "Tapu randevusu ve harç tahsilatı", tamam: true, zorunlu: true },
        { kod: "abonelik", baslik: "Abonelik devirleri ve anahtar teslimi", tamam: false, zorunlu: false },
        { kod: "fatura", baslik: "Fatura ve komisyon tahsilatı", tamam: false, zorunlu: true },
      ],
    },
  ];

  const fsbo = (n: number, f: Partial<FsboListingRow>): FsboListingRow => ({
    id: `f${n}`,
    office_id: O,
    kaynak: "danisman_linki",
    ilk_gorulme: date(-10),
    fiyat_dusum_sayisi: 0,
    sinyaller: [],
    durum: "yeni",
    ilce: "Kadıköy",
    ...f,
  });

  const fsbo_listing: FsboListingRow[] = [
    fsbo(1, { baslik: "Fenerbahçe 3+1 acil satılık", fiyat: 9_800_000, mahalle: "Fenerbahçe", ilk_gorulme: date(-47), fiyat_dusum_sayisi: 2, aciklama: "Acil satılık, yurt dışına taşınıyoruz", foto_sayisi: 5, piyasaya_gore_fark: 11, malik_ad: "Ayşe Korkmaz", malik_telefon: "0532 000 10 07", durum: "arandi", atanan_id: U, kaynak_url: "https://example.com/ilan/1" }),
    fsbo(2, { baslik: "Caddebostan 2+1, tayin nedeniyle", fiyat: 7_200_000, mahalle: "Caddebostan", ilk_gorulme: date(-33), fiyat_dusum_sayisi: 1, aciklama: "Tayin nedeniyle satılık, pazarlık payı var", foto_sayisi: 9, piyasaya_gore_fark: 4, malik_ad: "Onur Başaran", malik_telefon: "0532 000 10 08" }),
    fsbo(3, { baslik: "Suadiye 3+1 bahçe katı", fiyat: 13_900_000, mahalle: "Suadiye", ilk_gorulme: date(-61), fiyat_dusum_sayisi: 3, aciklama: "Yurt dışı nedeniyle satılık", foto_sayisi: 12, piyasaya_gore_fark: -8, malik_ad: "Pınar Ateş", malik_telefon: "0532 000 10 09", durum: "gorusuldu", atanan_id: U }),
    fsbo(4, { baslik: "Göztepe 4+1 dubleks", fiyat: 14_500_000, mahalle: "Göztepe", ilk_gorulme: date(-12), aciklama: "Sahibinden satılık dubleks", foto_sayisi: 16, piyasaya_gore_fark: -2, malik_ad: "Kemal Yıldız" }),
    fsbo(5, { baslik: "Kozyatağı 2+1 site içi", fiyat: 7_100_000, mahalle: "Kozyatağı", ilk_gorulme: date(-28), fiyat_dusum_sayisi: 1, aciklama: "Hızlı satış, pazarlıklı", foto_sayisi: 8, piyasaya_gore_fark: 2, malik_ad: "Tarık Ersoy", durum: "degerleme", atanan_id: DEMO_USERS.selin }),
    fsbo(6, { baslik: "Ataşehir Atatürk Mah. 3+1", fiyat: 10_400_000, ilce: "Ataşehir", mahalle: "Atatürk", ilk_gorulme: date(-40), fiyat_dusum_sayisi: 1, aciklama: "Sahibinden 3+1", foto_sayisi: 10, piyasaya_gore_fark: 6, malik_ad: "Sevgi Oral" }),
  ];

  const activity: Activity[] = [
    { id: "a1", office_id: O, user_id: U, person_id: cid(1), tur: "arama", icerik: "Eşi de görmek istiyor, hafta sonu uygun", created_at: iso(-1, 17) },
    { id: "a2", office_id: O, user_id: U, person_id: cid(1), tur: "mesaj", icerik: "3 portföylük katalog gönderildi", created_at: iso(-1, 19) },
    { id: "a3", office_id: O, user_id: U, person_id: cid(9), portfolio_id: pid(6), tur: "gorev", icerik: "Yetki sözleşmesini imzalat", vade: iso(0, 12), tamamlandi: false, created_at: iso(-1) },
    { id: "a4", office_id: O, user_id: U, person_id: cid(2), tur: "gorev", icerik: "2 portföy kataloğu gönder", vade: iso(1, 11), tamamlandi: false, created_at: iso(-2) },
  ];

  const media: Media[] = [];

  return {
    office,
    office_member,
    person: personRows,
    consent,
    portfolio,
    portfolio_owner,
    portfolio_price_history,
    media,
    document: [
      { id: "d-ygb-1", office_id: O, sablon: "yer-gosterme-belgesi", sablon_surum: "2026.09-taslak", kural_surum: "2026.09", portfolio_id: pid(5), alanlar: { gosterilen_ad_soyad: "Deniz Yurt" }, durum: "imzalandi", created_by: U, created_at: iso(-3, 16) },
    ],
    signature: [
      { id: "sg1", document_id: "d-ygb-1", person_id: cid(4), yontem: "link", imzalandi_at: iso(-3, 16, 55), kanit: { ad_soyad: "Deniz Yurt" } },
    ],
    authorization_contract,
    search_profile,
    showing,
    offer,
    deal,
    commission_line: [],
    commission_split: [],
    fsbo_listing,
    activity,
    compliance_log: [],
  };
}
