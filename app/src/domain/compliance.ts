/**
 * Uyum Motoru — tasarım §6.8.
 *
 * Bir olay (ilan yayınla, gösterimi kapat, sözleşme imzala, mesaj gönder…)
 * gerçekleşmeden önce ilgili kurallar değerlendirilir:
 *   ENGELLE → işlem yapılamaz, eksik adım gösterilir
 *   UYAR    → gerekçe ile devam edilebilir, denetim kaydı düşer
 *   GEC     → sorun yok
 */
import { paramsFor } from "./params";

export type Karar = "ENGELLE" | "UYAR" | "GEC";

export interface RuleResult {
  kural: string;
  karar: Karar;
  mesaj: string;
  /** Kullanıcıya gösterilecek tek tık çözüm aksiyonu kimliği */
  cozum?: string;
}

export interface Evaluation {
  karar: Karar;
  sonuclar: RuleResult[];
  paramSurum: string;
}

// ---- Bağlam tipleri ---------------------------------------------------------

export interface AuthorizationContract {
  imzaTarihi?: string;
  baslangic: string;
  bitis: string;
}

export interface ListingContext {
  bugun: Date;
  ofisYetkiBelgesiGecerlilik?: string; // ISO, yoksa belge yok
  yetkiSozlesmesi?: AuthorizationContract;
  eidsOnayli: boolean;
  ilanMetni?: string;
}

export interface ShowingContext {
  yerGostermeBelgesiImzali: boolean;
}

export interface MessageContext {
  ticariIleti: boolean;
  kanal: "sms" | "eposta" | "whatsapp" | "arama";
  kvkkAcikRiza: boolean;
  iysIzni: boolean;
}

export interface ClosingContext {
  islemTutari: number;
  daskPolicesiVar: boolean;
  takyidatSorgusuGuncel: boolean;
  musteriTanimaTamam: boolean;
  bugun: Date;
}

export interface ContractSignContext {
  zorunluAlanlar: string[];
  degerler: Record<string, unknown>;
}

// ---- Yardımcılar -------------------------------------------------------------

const GUN = 24 * 60 * 60 * 1000;

function daysBetween(a: Date, bIso: string) {
  return Math.ceil((new Date(bIso + "T23:59:59").getTime() - a.getTime()) / GUN);
}

function combine(sonuclar: RuleResult[], bugun?: Date): Evaluation {
  const karar: Karar = sonuclar.some((s) => s.karar === "ENGELLE")
    ? "ENGELLE"
    : sonuclar.some((s) => s.karar === "UYAR")
      ? "UYAR"
      : "GEC";
  return { karar, sonuclar, paramSurum: paramsFor(bugun).surum };
}

/** İlan metninde yanıltıcı olabilecek ifadeler (reklam mevzuatı) */
const RISKLI_IFADELER = [
  /en ucuz/i,
  /garanti(li)? (kira|getiri|kazan[cç])/i,
  /kaçırılmayacak fırsat/i,
  /piyasanın (çok )?altında/i,
  /%\s?100 kredi/i,
];

// ---- Kurallar ---------------------------------------------------------------

export function evaluateListingPublish(c: ListingContext): Evaluation {
  const r: RuleResult[] = [];
  const params = paramsFor(c.bugun);

  if (!c.ofisYetkiBelgesiGecerlilik || daysBetween(c.bugun, c.ofisYetkiBelgesiGecerlilik) < 0) {
    r.push({
      kural: "YETKI_BELGESI",
      karar: "ENGELLE",
      mesaj: "İşletmenin geçerli taşınmaz ticareti yetki belgesi yok.",
      cozum: "ofis.yetki_belgesi_gir",
    });
  }

  const ys = c.yetkiSozlesmesi;
  if (!ys || !ys.imzaTarihi) {
    r.push({
      kural: "YETKI_SOZLESMESI",
      karar: "ENGELLE",
      mesaj: "Mal sahibiyle imzalı yazılı yetki sözleşmesi olmadan ilan yayınlanamaz.",
      cozum: "sozlesme.yetki_olustur",
    });
  } else {
    const kalan = daysBetween(c.bugun, ys.bitis);
    if (kalan < 0) {
      r.push({
        kural: "YETKI_SOZLESMESI",
        karar: "ENGELLE",
        mesaj: "Yetki sözleşmesinin süresi dolmuş.",
        cozum: "sozlesme.yetki_yenile",
      });
    } else if (kalan <= Math.max(...params.yetkiBitisUyariGun.deger)) {
      r.push({
        kural: "YETKI_SOZLESMESI_SURE",
        karar: "UYAR",
        mesaj: `Yetki sözleşmesinin bitmesine ${kalan} gün kaldı.`,
        cozum: "sozlesme.yetki_yenile",
      });
    }
  }

  if (!c.eidsOnayli) {
    r.push({
      kural: "EIDS",
      karar: "ENGELLE",
      mesaj: "Elektronik İlan Doğrulama Sistemi (EİDS) onayı yok. Malik e-Devlet üzerinden yetki vermeli.",
      cozum: "eids.malike_yonlendirme_gonder",
    });
  }

  if (c.ilanMetni) {
    const bulunan = RISKLI_IFADELER.filter((re) => re.test(c.ilanMetni!));
    if (bulunan.length) {
      r.push({
        kural: "ILAN_METNI",
        karar: "UYAR",
        mesaj: "İlan metninde yanıltıcı olarak değerlendirilebilecek ifade var.",
        cozum: "ilan.metni_duzenle",
      });
    }
  }
  return combine(r, c.bugun);
}

export function evaluateShowingComplete(c: ShowingContext): Evaluation {
  return combine(
    c.yerGostermeBelgesiImzali
      ? []
      : [
          {
            kural: "YER_GOSTERME_BELGESI",
            karar: "ENGELLE",
            mesaj: "Yer gösterme belgesi imzalanmadan gösterim tamamlanamaz.",
            cozum: "gosterim.belge_imzalat",
          },
        ],
  );
}

export function evaluateMessageSend(c: MessageContext): Evaluation {
  const r: RuleResult[] = [];
  if (c.ticariIleti && c.kanal !== "arama" && !c.iysIzni) {
    r.push({
      kural: "IYS",
      karar: "ENGELLE",
      mesaj: "Alıcının İleti Yönetim Sistemi'nde ticari ileti izni yok.",
    });
  }
  if (c.ticariIleti && !c.kvkkAcikRiza) {
    r.push({
      kural: "KVKK_RIZA",
      karar: "ENGELLE",
      mesaj: "Kişinin pazarlama amaçlı açık rızası yok.",
      cozum: "kisi.riza_iste",
    });
  }
  return combine(r);
}

export function evaluateContractSign(c: ContractSignContext): Evaluation {
  const eksik = c.zorunluAlanlar.filter((a) => {
    const v = c.degerler[a];
    return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
  });
  return combine(
    eksik.length
      ? [
          {
            kural: "ZORUNLU_ALAN",
            karar: "ENGELLE",
            mesaj: `Eksik zorunlu alanlar: ${eksik.join(", ")}`,
          },
        ]
      : [],
  );
}

export function evaluateClosing(c: ClosingContext): Evaluation {
  const r: RuleResult[] = [];
  const p = paramsFor(c.bugun);
  if (!c.daskPolicesiVar) {
    r.push({
      kural: "DASK",
      karar: "ENGELLE",
      mesaj: "Geçerli DASK poliçesi olmadan tapu devri yapılamaz.",
      cozum: "islem.dask_ekle",
    });
  }
  if (!c.takyidatSorgusuGuncel) {
    r.push({
      kural: "TAKYIDAT",
      karar: "UYAR",
      mesaj: "Tapu kaydı (ipotek/haciz/şerh) sorgusu güncel değil.",
    });
  }
  const esik = p.masakKimlikTespitEsigi.deger;
  if (esik > 0 && c.islemTutari >= esik && !c.musteriTanimaTamam) {
    r.push({
      kural: "MASAK_KIMLIK",
      karar: "ENGELLE",
      mesaj: "İşlem tutarı MASAK kimlik tespiti eşiğinin üzerinde; müşteriyi tanıma formu tamamlanmalı.",
      cozum: "islem.kyc_formu",
    });
  } else if (esik === 0 && !c.musteriTanimaTamam) {
    r.push({
      kural: "MASAK_KIMLIK",
      karar: "UYAR",
      mesaj: "MASAK eşiği tanımlı değil; müşteriyi tanıma formunu doldurmanız önerilir.",
      cozum: "islem.kyc_formu",
    });
  }
  return combine(r, c.bugun);
}
