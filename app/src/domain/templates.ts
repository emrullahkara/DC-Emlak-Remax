/**
 * Sözleşme ve evrak şablonları — tasarım §5.10.
 *
 * Şablonlar `docs/sablonlar/*.md` dosyalarından `scripts/sync-templates.mjs`
 * ile `templates.generated.ts` içine gömülür (çalışma zamanında dosya sistemi
 * yok, tarayıcıda da çalışır). Bu modül:
 *  - YAML ön bilgisini (front matter) bağımlılıksız ayrıştırır,
 *  - yer tutucuları (`{{alan}}`) çıkarır, etiketler ve gruplar,
 *  - portföy/kişi/ofis kartlarından otomatik değer üretir,
 *  - imzaya gönderimi Uyum Motoru ile değerlendirir.
 */
import type { Office, OfficeMember, Person, Portfolio } from "@/data/types";
import { evaluateContractSign, type Evaluation, type Karar, type RuleResult } from "./compliance";
import { paramsFor } from "./params";
import { TEMPLATE_SOURCES } from "./templates.generated";
import { parseMarkdown, type Block } from "./templates-markdown";

// ---- Ön bilgi (front matter) ------------------------------------------------------

export type FrontMatterValue = string | string[];
export type FrontMatter = Record<string, FrontMatterValue>;

function unquote(raw: string): string {
  const v = raw.trim();
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
    return v.slice(1, -1).replace(/\\(["\\])/g, "$1").replace(/\\n/g, "\n");
  }
  if (v.length >= 2 && v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1).replace(/''/g, "'");
  // Tırnaksız değerde satır sonu yorumu: "değer   # açıklama"
  return v.replace(/\s+#.*$/, "").trim();
}

/**
 * Basit YAML alt kümesi: `anahtar: değer` skalerleri ve `anahtar:` ardından
 * `  - öğe` listeleri. Şablonlar yalnızca bunları kullanır.
 */
export function parseFrontMatter(src: string): { data: FrontMatter; body: string } {
  const text = src.replace(/\r\n/g, "\n").replace(/^\uFEFF/, "");
  if (!text.startsWith("---\n")) return { data: {}, body: text };
  const end = text.indexOf("\n---", 4);
  if (end < 0) return { data: {}, body: text };
  const head = text.slice(4, end);
  const afterClose = text.indexOf("\n", end + 4);
  const body = afterClose < 0 ? "" : text.slice(afterClose + 1);

  const data: FrontMatter = {};
  let listKey: string | null = null;
  for (const rawLine of head.split("\n")) {
    const line = rawLine.replace(/\s+$/, "");
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const item = /^\s*-\s+(.*)$/.exec(line);
    if (item && listKey) {
      (data[listKey] as string[]).push(unquote(item[1]!));
      continue;
    }
    const kv = /^([A-Za-z0-9_]+)\s*:\s*(.*)$/.exec(line);
    if (kv) {
      const [, key, rest] = kv;
      const value = unquote(rest ?? "");
      if (value === "" || value === "[]") {
        data[key!] = [];
        listKey = key!;
      } else {
        data[key!] = value;
        listKey = null;
      }
    }
  }
  return { data, body };
}

// ---- Şablon modeli ---------------------------------------------------------------------

export interface Template {
  dosya: string;
  kod: string;
  baslik: string;
  surum: string;
  durum: string;
  /** `durum` "Taslak" ile başlıyorsa hukuk onayı bekliyor */
  taslak: boolean;
  zorunlu: string[];
  opsiyonel: string[];
  dayanak: string[];
  kontroller: string[];
  /** Gövdede geçen tüm yer tutucular (ilk görülme sırasıyla) */
  alanlar: string[];
  govde: string;
}

const asList = (v: FrontMatterValue | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const asStr = (v: FrontMatterValue | undefined, d = "") => (typeof v === "string" ? v : d);

export function extractPlaceholders(body: string): string[] {
  const seen = new Set<string>();
  for (const m of body.matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/g)) seen.add(m[1]!);
  return [...seen];
}

export function parseTemplate(dosya: string, src: string): Template {
  const { data, body } = parseFrontMatter(src);
  const durum = asStr(data.durum, "Taslak");
  return {
    dosya,
    kod: asStr(data.kod, dosya.replace(/\.md$/, "")),
    baslik: asStr(data.baslik, dosya),
    surum: asStr(data.surum, "0"),
    durum,
    taslak: /^taslak/i.test(durum.trim()),
    zorunlu: asList(data.zorunlu_alanlar),
    opsiyonel: asList(data.opsiyonel_alanlar),
    dayanak: asList(data.dayanak),
    kontroller: asList(data.kontroller),
    alanlar: extractPlaceholders(body),
    govde: body,
  };
}

let cache: Template[] | null = null;

export function listTemplates(sources: Record<string, string> = TEMPLATE_SOURCES): Template[] {
  if (sources === TEMPLATE_SOURCES && cache) return cache;
  const list = Object.entries(sources)
    .map(([f, s]) => parseTemplate(f, s))
    .sort((a, b) => ORDER.indexOf(a.kod) - ORDER.indexOf(b.kod) || a.baslik.localeCompare(b.baslik, "tr"));
  if (sources === TEMPLATE_SOURCES) cache = list;
  return list;
}

/** Kütüphanede gösterim sırası (sık kullanılan önce) */
const ORDER = [
  "yetki-sozlesmesi",
  "yer-gosterme-belgesi",
  "kapora-on-protokol",
  "konut-kira-sozlesmesi",
  "isyeri-kira-sozlesmesi",
  "tahliye-taahhutnamesi",
  "teslim-tutanagi",
  "kvkk-aydinlatma-metni",
  "acik-riza-formu",
  "ortak-satis-protokolu",
  "masak-musteri-tanima-formu",
];

export function getTemplate(kod: string): Template | undefined {
  return listTemplates().find((t) => t.kod === kod);
}

const blockCache = new Map<string, Block[]>();
export function templateBlocks(t: Template): Block[] {
  const key = `${t.kod}@${t.surum}`;
  let b = blockCache.get(key);
  if (!b) {
    b = parseMarkdown(t.govde);
    blockCache.set(key, b);
  }
  return b;
}

// ---- İmza anında sistemce doldurulan alanlar -------------------------------------------

/** Bu alanlar imza sırasında kanıt olarak yazılır; gönderim öncesi aranmaz, formda düzenlenmez. */
export const SIGNING_FIELDS = new Set([
  "zaman_damgasi",
  "belge_ozet_degeri",
  "konum_enlem",
  "konum_boylam",
  "konum_dogruluk_m",
  "cihaz_bilgisi",
  "otp_dogrulama_kodu_ref",
  "otp_telefon_maskeli",
]);

/** İmzaya gönderim öncesi dolu olması gereken zorunlu alanlar */
export function requiredForSending(t: Template): string[] {
  return t.zorunlu.filter((f) => !SIGNING_FIELDS.has(f));
}

const isEmpty = (v: unknown) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

export function requiredMissing(t: Template, values: Record<string, unknown>, opts: { includeSigningFields?: boolean } = {}): string[] {
  const list = opts.includeSigningFields ? t.zorunlu : requiredForSending(t);
  return list.filter((f) => isEmpty(values[f]));
}

/** Kullanıcının dolduracağı alanlar: önce zorunlular, sonra opsiyoneller (şablon sırasıyla). */
export function editableFields(t: Template): { zorunlu: string[]; opsiyonel: string[] } {
  const req = new Set(t.zorunlu);
  const all = [...t.alanlar, ...t.zorunlu, ...t.opsiyonel].filter((f, i, a) => a.indexOf(f) === i && !SIGNING_FIELDS.has(f));
  return { zorunlu: all.filter((f) => req.has(f)), opsiyonel: all.filter((f) => !req.has(f)) };
}

// ---- Etiket ve gruplar -------------------------------------------------------------------

const WORDS: Record<string, string> = {
  ad: "ad",
  soyad: "soyad",
  unvan: "unvan",
  unvani: "unvanı",
  tckn: "T.C. kimlik no",
  no: "no",
  isletme: "işletme",
  adres: "adres",
  acik: "açık",
  telefon: "telefon",
  eposta: "e-posta",
  kep: "KEP",
  adresi: "adresi",
  danisman: "danışman",
  sorumlu: "sorumlu",
  yetki: "yetki",
  belgesi: "belgesi",
  mersis: "MERSİS",
  vergi: "vergi",
  dairesi: "dairesi",
  malik: "malik",
  malik2: "2. malik",
  alici: "alıcı",
  alici2: "2. alıcı",
  satici: "satıcı",
  satici2: "2. satıcı",
  kiraci: "kiracı",
  kiraci2: "2. kiracı",
  kiraya: "kiraya",
  veren: "veren",
  tasinmaz: "taşınmaz",
  niteligi: "niteliği",
  il: "il",
  ilce: "ilçe",
  mahalle: "mahalle",
  ada: "ada",
  parsel: "parsel",
  bagimsiz: "bağımsız",
  bolum: "bölüm",
  tapu: "tapu",
  turu: "türü",
  islem: "işlem",
  fiyat: "fiyat",
  fiyati: "fiyatı",
  talep: "talep",
  edilen: "edilen",
  para: "para",
  birimi: "birimi",
  baslangic: "başlangıç",
  bitis: "bitiş",
  tarihi: "tarihi",
  saati: "saati",
  hizmet: "hizmet",
  bedeli: "bedeli",
  orani: "oranı",
  kira: "kira",
  ay: "(ay)",
  gun: "(gün)",
  sozlesme: "sözleşme",
  sozlesmesi: "sözleşmesi",
  gosterme: "gösterme",
  gosterilen: "gösterilen",
  gosterim: "gösterim",
  koruma: "koruma",
  suresi: "süresi",
  hisse: "hisse",
  protokol: "protokol",
  kapora: "kapora",
  niteligi_: "niteliği",
  odeme: "ödeme",
  teslim: "teslim",
  kredi: "kredi",
  kullanimi: "kullanımı",
  takyidat: "takyidat",
  beyani: "beyanı",
  yazi: "(yazıyla)",
  kalan: "kalan",
  guvence: "güvence",
  aylik: "aylık",
  yillik: "yıllık",
  aidat: "aidat",
  tutari: "tutarı",
  kullanim: "kullanım",
  amaci: "amacı",
  kiralananin: "kiralananın",
  cinsi: "cinsi",
  durumu: "durumu",
  sekli: "şekli",
  gunu: "günü",
  kefil: "kefil",
  kefalet: "kefalet",
  azami: "azami",
  imza: "imza",
  yontemi: "yöntemi",
  zaman: "zaman",
  damgasi: "damgası",
  ilgili: "ilgili",
  kisi: "kişi",
  form: "form",
  musteri: "müşteri",
  kimlik: "kimlik",
  uyruk: "uyruk",
  uyum: "uyum",
  sorumlusu: "sorumlusu",
  portfoy: "portföy",
  pay: "pay",
  paylasim: "paylaşım",
  esasi: "esası",
  tutanak: "tutanak",
  eden: "eden",
  alan: "alan",
  anahtar: "anahtar",
  adedi: "adedi",
  sayac: "sayaç",
  endeks: "endeks",
  elektrik: "elektrik",
  su: "su",
  dogalgaz: "doğalgaz",
  genel: "genel",
  fotograf: "fotoğraf",
  demirbas: "demirbaş",
  ozel: "özel",
  sartlar: "şartlar",
  notlar: "notlar",
  yetkili: "yetkili",
  mahkeme: "mahkeme",
  yeri: "yeri",
  taahhut: "taahhüt",
  tahliye: "tahliye",
  metin: "metin",
  yururluk: "yürürlük",
  bulut: "bulut",
  saglayici: "sağlayıcı",
  ulke: "ülke",
  aydinlatma: "aydınlatma",
  metni: "metni",
  surumu: "sürümü",
  riza: "rıza",
  ticari: "ticari",
  ileti: "ileti",
  arama: "arama",
  kaydi: "kaydı",
  yurt: "yurt",
  disi: "dışı",
  aktarim: "aktarım",
  video: "video",
  fonun: "fonun",
  kaynagi: "kaynağı",
  gercek: "gerçek",
  faydalanici: "faydalanıcı",
  pep: "PEP",
  meslek: "meslek",
  faaliyet: "faaliyet",
  rolu: "rolü",
  bilgisi: "bilgisi",
  dogum: "doğum",
  anne: "anne",
  baba: "baba",
  adi: "adı",
  seri: "seri",
  dogrulama: "doğrulama",
  yuzolcumu: "yüzölçümü",
  m2: "(m²)",
  blok: "blok",
  kat: "kat",
  vekil: "vekil",
  vekaletname: "vekâletname",
  pazarlik: "pazarlık",
  payi: "payı",
  notu: "notu",
  pazarlama: "pazarlama",
  kanallari: "kanalları",
  iban: "IBAN",
  kdv: "KDV",
  stopaj: "stopaj",
  mukellefi: "mükellefi",
  yukumlusu: "yükümlüsü",
  net: "net",
  brut: "brüt",
  artis: "artış",
  ek: "ek",
  evcil: "evcil",
  hayvan: "hayvan",
  izni: "izni",
  dask: "DASK",
  police: "poliçe",
  harci: "harcı",
  paylasimi: "paylaşımı",
  devir: "devir",
  ipotek: "ipotek",
  alacaklisi: "alacaklısı",
  banka: "banka",
  onay: "onay",
  son: "son",
  tarih: "tarih",
  belge: "belge",
  ozet: "özet",
  degeri: "değeri",
  konum: "konum",
  enlem: "enlem",
  boylam: "boylam",
  cihaz: "cihaz",
  otp: "OTP",
  kodu: "kodu",
  ref: "ref.",
  maskeli: "maskeli",
  temsil: "temsil",
  ettigi: "ettiği",
};

const LABEL_OVERRIDES: Record<string, string> = {
  isletme_unvani: "İşletme unvanı",
  yetki_belgesi_no: "Yetki belgesi no",
  hizmet_bedeli_orani: "Hizmet bedeli oranı (%)",
  hizmet_bedeli_kira_ay: "Kirada hizmet bedeli (ay)",
  bagimsiz_bolum_no: "Bağımsız bölüm no",
  musteri_ad_soyad_unvan: "Müşteri ad soyad / unvan",
  tasinmaz_acik_adres: "Taşınmazın açık adresi",
};

export function fieldLabel(name: string): string {
  if (LABEL_OVERRIDES[name]) return LABEL_OVERRIDES[name];
  const words = name.split("_").map((w) => {
    if (/^\d+$/.test(w)) return `${w}.`;
    return WORDS[w] ?? w;
  });
  const s = words.join(" ");
  return s.charAt(0).toLocaleUpperCase("tr") + s.slice(1);
}

export const FIELD_GROUPS = ["İşletme ve danışman", "Malik / satıcı / kiraya veren", "Karşı taraf", "Taşınmaz", "Bedel ve ödeme", "Tarih ve süre", "Diğer"] as const;
export type FieldGroup = (typeof FIELD_GROUPS)[number];

const GROUP_RULES: [RegExp, FieldGroup][] = [
  [/^(isletme_|yetki_belgesi_no$|danisman|sorumlu_danisman|portfoy_isletme|portfoy_danisman|alici_isletme|alici_danisman|uyum_sorumlusu|veri_sorumlusu|verbis|irtibat|kurumsal|bulut|metin_yururluk)/, "İşletme ve danışman"],
  [/^(malik|satici|kiraya_veren|teslim_eden|vekil|vekaletname)/, "Malik / satıcı / kiraya veren"],
  [/^(alici|kiraci|gosterilen|ilgili_kisi|musteri_(?!koruma)|teslim_alan|kefil|kefalet|temsilci|temsil_|gercek_faydalanici|pep_|anne_|baba_|dogum_|uyruk|kimlik_|meslek)/, "Karşı taraf"],
  [/(_tarihi$|^tarih|_saati$|_suresi|_ay$|_gun$|gunu$)/, "Tarih ve süre"],
  [/(fiyat|bedel|kira$|_kira|kapora|hizmet|para_birimi|odeme|guvence|aidat|kredi|ipotek|stopaj|kdv|pay_orani|paylasim|islem_tutari|masak_esik|tutari|harci)/, "Bedel ve ödeme"],
  [/^(tasinmaz|il$|ilce$|mahalle$|ada$|parsel$|bagimsiz|blok$|kat$|tapu_turu|yuzolcumu|kiralanan|portfoy_no|demirbas|anahtar|elektrik|su_|dogalgaz|kumanda|posta_kutusu|isitma)/, "Taşınmaz"],
];

export function fieldGroup(name: string): FieldGroup {
  for (const [re, g] of GROUP_RULES) if (re.test(name)) return g;
  return "Diğer";
}

export function groupFields(fields: string[]): { grup: FieldGroup; alanlar: string[] }[] {
  const m = new Map<FieldGroup, string[]>();
  for (const f of fields) {
    const g = fieldGroup(f);
    m.set(g, [...(m.get(g) ?? []), f]);
  }
  return FIELD_GROUPS.filter((g) => m.has(g)).map((g) => ({ grup: g, alanlar: m.get(g)! }));
}

/** Serbest metin alanları için öneriler (datalist) */
export const FIELD_OPTIONS: Record<string, string[]> = {
  yetki_turu: ["Münhasır (tek yetkili)", "Münhasır olmayan (genel)"],
  islem_turu: ["Satış", "Kiralama", "Satış ve kiralama"],
  tapu_turu: ["Kat mülkiyeti", "Kat irtifakı", "Arsa payı", "Hisseli tapu", "Diğer"],
  para_birimi: ["TL", "USD", "EUR"],
  imza_yontemi: ["Uzaktan imza bağlantısı (elektronik onay)", "Islak imza", "SMS-OTP ile elektronik onay", "Nitelikli elektronik imza"],
  kapora_niteligi: ["Bağlanma parası", "Cayma parası"],
  kredi_kullanimi: ["Kredi kullanılmayacak", "Kredi kullanılacak"],
  teslim_turu: ["Satış teslimi", "Kira başlangıcı", "Tahliye / iade"],
  musteri_turu: ["Gerçek kişi (T.C. vatandaşı)", "Gerçek kişi (yabancı)", "Tüzel kişi", "Tüzel kişiliği olmayan teşekkül"],
  koruma_suresi_ay: ["6", "12"],
  yer_gosterme_koruma_suresi_ay: ["6", "12"],
};

// ---- Tarih / sayı yardımcıları ------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, "0");

export function formatDateTr(d: Date): string {
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function formatTimeTr(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "24.09.2026", "24/09/2026" veya "2026-09-24" → "2026-09-24"; geçersizse null */
export function parseDateTr(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  let y: number, m: number, d: number;
  let r = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (r) {
    y = +r[1]!;
    m = +r[2]!;
    d = +r[3]!;
  } else {
    r = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(t);
    if (!r) return null;
    d = +r[1]!;
    m = +r[2]!;
    y = +r[3]!;
  }
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** "12.500.000", "%2", "2,5" → sayı; çözülemezse null */
export function parseTrNumber(s: string | null | undefined): number | null {
  if (!s) return null;
  let t = s.replace(/[%\s₺]|TL/gi, "");
  if (/,\d+$/.test(t)) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  const n = Number(t);
  return t !== "" && Number.isFinite(n) ? n : null;
}

const NUM = new Intl.NumberFormat("tr-TR");

// ---- Otomatik doldurma --------------------------------------------------------------------

export interface AutoContext {
  office?: Partial<Office> | null;
  member?: Partial<OfficeMember> | null;
  portfolio?: Partial<Portfolio> | null;
  /** Karşı taraf (alıcı, kiracı, gösterilen kişi…) */
  person?: Partial<Person> | null;
  /** Malik / satıcı / kiraya veren (portföy sahibi) */
  owner?: Partial<Person> | null;
  /** portfolio_owner.hisse */
  ownerHisse?: string | null;
  now?: Date;
  /** Gösterim zamanı (yer gösterme belgesi) */
  when?: Date;
  /** Belge numarası; verilmezse üretilir */
  belgeNo?: string;
  kod?: string;
}

const PREFIX: Record<string, string> = {
  "yetki-sozlesmesi": "YS",
  "yer-gosterme-belgesi": "YGB",
  "kapora-on-protokol": "KP",
  "teslim-tutanagi": "TT",
  "masak-musteri-tanima-formu": "MTF",
  "ortak-satis-protokolu": "OSP",
  "acik-riza-formu": "ARF",
};

const TAPU: Record<string, string> = {
  kat_mulkiyeti: "Kat mülkiyeti",
  kat_irtifaki: "Kat irtifakı",
  arsa: "Arsa payı",
  hisseli: "Hisseli tapu",
};

const EMLAK: Record<string, string> = {
  daire: "Daire",
  villa: "Villa",
  mustakil: "Müstakil ev",
  arsa: "Arsa",
  tarla: "Tarla",
  dukkan: "Dükkân",
  ofis: "Ofis",
  depo: "Depo",
  bina: "Bina",
};

const ISLEM: Record<string, string> = { satilik: "Satış", kiralik: "Kiralama", devren: "Devren" };

export function portfolioNo(id: string | undefined | null): string {
  return id ? id.replace(/-/g, "").slice(-6).toUpperCase() : "";
}

export function makeDocNo(kod: string | undefined, now: Date, rand: () => number = Math.random): string {
  const p = (kod && PREFIX[kod]) || "BLG";
  const alphabet = "ABCDEFGHJKLMNPRSTUVYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += alphabet[Math.floor(rand() * alphabet.length)];
  return `${p}-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${s}`;
}

/**
 * Ofis, danışman, portföy ve kişi kartlarından şablon alanlarını üretir.
 * Yalnızca bilinen verilerle doldurur; boş kalanlar kullanıcıya bırakılır.
 * Dönüşte şablonda kullanılmayan anahtarlar da olabilir — `pickFor` ile süzün.
 */
export function autoValues(ctx: AutoContext): Record<string, string> {
  const v: Record<string, string> = {};
  const set = (keys: string[], val: string | number | null | undefined) => {
    if (val === null || val === undefined || val === "") return;
    for (const k of keys) v[k] = String(val);
  };
  const now = ctx.now ?? new Date();
  const params = paramsFor(now);
  const { office: o, member: m, portfolio: p } = ctx;

  // İşletme
  set(["isletme_unvani", "portfoy_isletme_unvani"], o?.unvan);
  set(["yetki_belgesi_no", "portfoy_isletme_yetki_belgesi_no"], o?.yetki_belgesi_no);
  set(["isletme_mersis_no"], o?.mersis_no);
  set(["isletme_vergi_no", "portfoy_isletme_vergi_no"], o?.vergi_no);
  // Danışman
  set(["danisman_ad_soyad", "sorumlu_danisman_ad_soyad", "portfoy_danisman_ad_soyad"], m?.ad_soyad);
  set(["danisman_yetki_belgesi_no", "sorumlu_danisman_yetki_belgesi_no"], m?.yetki_belgesi_no);
  set(["isletme_telefon"], m?.telefon);

  // Tarihler ve numara
  const today = formatDateTr(now);
  set(["sozlesme_tarihi", "protokol_tarihi", "form_tarihi", "tutanak_tarihi", "baslangic_tarihi"], today);
  set(["tutanak_saati"], formatTimeTr(now));
  const when = ctx.when ?? now;
  set(["gosterim_tarihi"], formatDateTr(when));
  set(["gosterim_saati"], formatTimeTr(when));
  set(["belge_no", "sozlesme_no", "protokol_no", "tutanak_no", "form_no"], ctx.belgeNo ?? makeDocNo(ctx.kod, now));

  // Mevzuat parametreleri (yasal tavan)
  set(["hizmet_bedeli_orani"], params.satisHizmetBedeliTavanOrani.deger);
  set(["hizmet_bedeli_kira_ay"], params.kiraHizmetBedeliTavanAy.deger);
  set(["imza_yontemi"], "Uzaktan imza bağlantısı (elektronik onay)");
  set(["para_birimi"], !p?.para_birimi || p.para_birimi === "TRY" ? "TL" : p.para_birimi);

  // Portföy
  if (p) {
    set(["il"], p.il);
    set(["ilce"], p.ilce);
    set(["mahalle"], p.mahalle);
    set(["ada"], p.ada);
    set(["parsel"], p.parsel);
    set(["bagimsiz_bolum_no"], p.bagimsiz_bolum);
    set(["kat"], p.kat);
    set(["yuzolcumu_m2"], p.brut_m2);
    set(["tapu_turu"], p.tapu_turu ? (TAPU[p.tapu_turu] ?? p.tapu_turu) : null);
    const cins = p.emlak_tipi ? (EMLAK[p.emlak_tipi] ?? p.emlak_tipi) : null;
    set(["tasinmaz_niteligi", "kiralananin_cinsi"], cins);
    const islem = p.ilan_tipi ? ISLEM[p.ilan_tipi] : null;
    set(["islem_turu", "tasinmaz_1_islem_turu"], islem);
    const yer = [p.il, p.ilce, p.mahalle].filter(Boolean).join(" / ");
    const acik = [p.adres, yer].filter(Boolean).join(", ");
    set(["tasinmaz_acik_adres", "tasinmaz_1_adres"], acik);
    set(["tasinmaz_1_ada_parsel"], [p.ada, p.parsel, p.bagimsiz_bolum].filter(Boolean).join(" / "));
    set(["portfoy_no", "tasinmaz_1_portfoy_no"], portfolioNo(p.id));
    const cur = v.para_birimi ?? "TL";
    if (p.fiyat) {
      const f = NUM.format(p.fiyat);
      set(["tasinmaz_1_fiyat"], `${f} ${cur}`);
      if (p.ilan_tipi === "kiralik") set(["talep_edilen_kira", "aylik_kira"], f);
      else set(["talep_edilen_fiyat"], f);
    }
    if (p.aidat) set(["aidat_tutari"], `${NUM.format(p.aidat)} ${cur}`);
    const tb = [yer, p.ada && `Ada ${p.ada}`, p.parsel && `Parsel ${p.parsel}`, p.bagimsiz_bolum && `BB ${p.bagimsiz_bolum}`].filter(Boolean).join(", ");
    set(["tasinmaz_bilgisi"], tb);
  }

  // Kişiler
  const saticiTipli = (x?: Partial<Person> | null) => !!x?.tipler?.some((t) => t === "satici" || t === "kiraya_veren");
  const owner = ctx.owner ?? (saticiTipli(ctx.person) ? ctx.person : null);
  const person = ctx.person && ctx.person !== owner ? ctx.person : null;
  if (owner) {
    set(["malik_ad_soyad", "satici_ad_soyad", "kiraya_veren_ad_soyad", "teslim_eden_ad_soyad"], owner.ad_soyad);
    set(["malik_telefon", "satici_telefon"], owner.telefon);
    set(["malik_hisse"], ctx.ownerHisse);
  }
  if (person) {
    set(["gosterilen_ad_soyad", "alici_ad_soyad", "kiraci_ad_soyad", "ilgili_kisi_ad_soyad", "musteri_ad_soyad_unvan", "teslim_alan_ad_soyad"], person.ad_soyad);
    set(["gosterilen_telefon", "alici_telefon", "kiraci_telefon", "ilgili_kisi_telefon", "musteri_telefon"], person.telefon);
    set(["gosterilen_eposta", "ilgili_kisi_eposta", "musteri_eposta"], person.eposta);
  }
  return v;
}

/** Yalnızca şablonda kullanılan alanları bırakır. */
export function pickFor(t: Template, values: Record<string, string>): Record<string, string> {
  const keep = new Set([...t.alanlar, ...t.zorunlu, ...t.opsiyonel]);
  return Object.fromEntries(Object.entries(values).filter(([k]) => keep.has(k)));
}

// ---- Uyum değerlendirmesi ---------------------------------------------------------------------

/** Şablona özgü ek kontroller (ör. tahliye taahhüdü tarih sırası) */
export function templateChecks(t: Template, values: Record<string, string | undefined>): RuleResult[] {
  const r: RuleResult[] = [];
  if (t.kod === "tahliye-taahhutnamesi") {
    const taahhut = parseDateTr(values.taahhut_tarihi);
    const teslim = parseDateTr(values.teslim_tarihi);
    const kira = parseDateTr(values.kira_sozlesmesi_tarihi);
    const tahliye = parseDateTr(values.tahliye_tarihi);
    if (taahhut && teslim && !(taahhut > teslim)) {
      r.push({ kural: "TAHLIYE_TESLIM_SONRASI", karar: "ENGELLE", mesaj: "Tahliye taahhüdü, kiralananın tesliminden sonraki bir tarihte verilmelidir." });
    }
    if (taahhut && kira && taahhut === kira) {
      r.push({ kural: "TAHLIYE_SOZLESME_AYNI_GUN", karar: "ENGELLE", mesaj: "Tahliye taahhüdü kira sözleşmesiyle aynı gün alınmamalıdır." });
    }
    if (taahhut && tahliye && !(tahliye > taahhut)) {
      r.push({ kural: "TAHLIYE_TARIHI", karar: "ENGELLE", mesaj: "Tahliye tarihi, taahhüt tarihinden sonra olmalıdır." });
    }
  }
  if (t.kod === "yetki-sozlesmesi") {
    const bas = parseDateTr(values.baslangic_tarihi);
    const bit = parseDateTr(values.bitis_tarihi);
    if (bas && bit && !(bit > bas)) r.push({ kural: "YETKI_SURE", karar: "ENGELLE", mesaj: "Yetki sözleşmesinin bitiş tarihi başlangıçtan sonra olmalıdır." });
  }
  const oran = parseTrNumber(values.hizmet_bedeli_orani);
  const tavan = paramsFor().satisHizmetBedeliTavanOrani.deger;
  if (oran !== null && oran > tavan) {
    r.push({ kural: "HIZMET_BEDELI_TAVAN", karar: "ENGELLE", mesaj: `Hizmet bedeli oranı yasal tavanı (%${tavan} + KDV) aşıyor.` });
  }
  return r;
}

/**
 * İmzaya gönderim kararı: zorunlu alanlar (Uyum Motoru `evaluateContractSign`),
 * şablona özgü kontroller ve hukuk onayı durumu (taslak şablon → UYAR).
 */
export function evaluateTemplateSign(t: Template, values: Record<string, string | undefined>, bugun?: Date): Evaluation {
  const base = evaluateContractSign({ zorunluAlanlar: requiredForSending(t), degerler: values });
  const extra = templateChecks(t, values);
  if (t.taslak) {
    extra.push({
      kural: "SABLON_TASLAK",
      karar: "UYAR",
      mesaj: "Şablon taslaktır — hukuk onayı bekliyor. Müşteriye göndermeden önce hukuk danışmanı onayı alınmalıdır.",
    });
  }
  const sonuclar = [...base.sonuclar, ...extra];
  const karar: Karar = sonuclar.some((s) => s.karar === "ENGELLE") ? "ENGELLE" : sonuclar.some((s) => s.karar === "UYAR") ? "UYAR" : "GEC";
  return { karar, sonuclar, paramSurum: bugun ? paramsFor(bugun).surum : base.paramSurum };
}
