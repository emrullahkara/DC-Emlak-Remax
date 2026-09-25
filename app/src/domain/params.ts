/**
 * Mevzuat parametreleri.
 *
 * Oranlar ve tutarlar kodun içine gömülmez; burada tarih aralıklı ve versiyonlu
 * tutulur. Her işlem, o tarihte geçerli olan parametre setinin sürümünü saklar.
 * `teyitGerekli: true` olan değerler canlıya çıkmadan önce güncel Resmî Gazete /
 * ilgili kurum duyurusu üzerinden doğrulanmalıdır.
 */

export interface ParamValue<T = number> {
  deger: T;
  aciklama: string;
  dayanak: string;
  teyitGerekli?: boolean;
}

export interface RuleParams {
  surum: string;
  gecerlilikBaslangic: string; // ISO tarih
  gecerlilikBitis?: string;
  /** Satışta her bir taraftan alınabilecek azami hizmet bedeli oranı (%) */
  satisHizmetBedeliTavanOrani: ParamValue;
  /** Kiralamada alınabilecek azami hizmet bedeli (aylık kira katı, taraflar toplamı) */
  kiraHizmetBedeliTavanAy: ParamValue;
  /** Hizmet bedeline uygulanan KDV oranı (%) */
  hizmetKdvOrani: ParamValue;
  /** Tapu harcı — alıcı ve satıcı için ayrı ayrı (binde) */
  tapuHarciBindeAlici: ParamValue;
  tapuHarciBindeSatici: ParamValue;
  /** Tapu döner sermaye ücreti (TL) — yıllık güncellenir */
  donerSermayeUcreti: ParamValue;
  /** Konut kirasında güvence bedeli üst sınırı (aylık kira katı) */
  guvenceBedeliTavanAy: ParamValue;
  /** Yetki sözleşmesi bitişine kaç gün kala uyarı verilir */
  yetkiBitisUyariGun: ParamValue<number[]>;
  /** MASAK müşteriyi tanıma için işlem tutarı eşiği (TL) */
  masakKimlikTespitEsigi: ParamValue;
}

export const PARAM_SETLERI: RuleParams[] = [
  {
    surum: "2026.09",
    gecerlilikBaslangic: "2026-01-01",
    satisHizmetBedeliTavanOrani: {
      deger: 2,
      aciklama: "Satışta taraflardan ayrı ayrı azami %2 + KDV",
      dayanak: "Taşınmaz Ticareti Hakkında Yönetmelik",
    },
    kiraHizmetBedeliTavanAy: {
      deger: 1,
      aciklama: "Kiralamada azami bir aylık kira bedeli + KDV",
      dayanak: "Taşınmaz Ticareti Hakkında Yönetmelik",
    },
    hizmetKdvOrani: {
      deger: 20,
      aciklama: "Emlak komisyonculuğu hizmetinde genel KDV oranı",
      dayanak: "3065 sayılı KDV Kanunu",
    },
    tapuHarciBindeAlici: {
      deger: 20,
      aciklama: "Alıcı için binde 20",
      dayanak: "492 sayılı Harçlar Kanunu (4) sayılı tarife",
    },
    tapuHarciBindeSatici: {
      deger: 20,
      aciklama: "Satıcı için binde 20",
      dayanak: "492 sayılı Harçlar Kanunu (4) sayılı tarife",
    },
    donerSermayeUcreti: {
      deger: 0,
      aciklama: "TKGM döner sermaye ücreti — ofis güncel tutarı girmelidir",
      dayanak: "TKGM Döner Sermaye İşletmesi ücret tarifesi",
      teyitGerekli: true,
    },
    guvenceBedeliTavanAy: {
      deger: 3,
      aciklama: "Konut ve çatılı işyeri kiralarında güvence bedeli üst sınırı",
      dayanak: "6098 sayılı TBK md. 342",
    },
    yetkiBitisUyariGun: {
      deger: [30, 15, 7],
      aciklama: "Yetki sözleşmesi bitiş uyarıları",
      dayanak: "Ürün politikası",
    },
    masakKimlikTespitEsigi: {
      deger: 0,
      aciklama: "Kimlik tespiti eşiği — güncel MASAK tutarı girilmelidir",
      dayanak: "5549 sayılı Kanun ve Tedbirler Yönetmeliği",
      teyitGerekli: true,
    },
  },
];

export function paramsFor(tarih: Date = new Date()): RuleParams {
  const iso = tarih.toISOString().slice(0, 10);
  const set = PARAM_SETLERI.find(
    (p) =>
      p.gecerlilikBaslangic <= iso &&
      (!p.gecerlilikBitis || iso <= p.gecerlilikBitis),
  );
  if (!set) throw new Error(`${iso} tarihi için geçerli parametre seti yok`);
  return set;
}
