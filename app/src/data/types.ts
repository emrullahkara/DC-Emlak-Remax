/**
 * Veritabanı satır tipleri — supabase/migrations/0001_init.sql ile birebir.
 * Coğrafi alanlar istemcide { lat, lng } olarak taşınır.
 */
import type { PlanId } from "@/lib/plans";

export type UUID = string;
export type ISODate = string; // 2026-09-24
export type ISODateTime = string; // 2026-09-24T10:00:00.000Z

export type MemberRole = "broker" | "takim_lideri" | "danisman" | "asistan";
export type ListingType = "satilik" | "kiralik" | "devren";
export type PortfolioStage =
  | "aday"
  | "degerleme"
  | "yetki"
  | "yayinda"
  | "teklif"
  | "kapora"
  | "tapu"
  | "tamamlandi"
  | "arsiv";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Office {
  id: UUID;
  unvan: string;
  vergi_no?: string | null;
  mersis_no?: string | null;
  yetki_belgesi_no?: string | null;
  yetki_belgesi_gecerlilik?: ISODate | null;
  plan: PlanId;
  deneme_bitis?: ISODate | null;
  /** Varsayılan komisyon paylaşımı (ofis %), kalan danışmana */
  varsayilan_ofis_payi?: number;
  created_at: ISODateTime;
}

export interface OfficeMember {
  office_id: UUID;
  user_id: UUID;
  rol: MemberRole;
  ad_soyad: string;
  telefon?: string | null;
  yetki_belgesi_no?: string | null;
  aktif: boolean;
}

export type PersonType = "alici" | "satici" | "kiraci" | "kiraya_veren" | "yatirimci" | "yabanci_alici" | "referans";

export interface Person {
  id: UUID;
  office_id: UUID;
  owner_id: UUID;
  ad_soyad: string;
  telefon?: string | null;
  eposta?: string | null;
  tipler: PersonType[];
  kaynak?: string | null;
  isi_skoru?: number | null;
  son_temas?: ISODateTime | null;
  sonraki_adim?: string | null;
  sonraki_adim_tarihi?: ISODateTime | null;
  created_at: ISODateTime;
}

export type ConsentPurpose = "aydinlatma" | "ticari_ileti" | "arama_kaydi" | "yurt_disi_aktarim" | "gorsel";

export interface Consent {
  id: UUID;
  person_id: UUID;
  amac: ConsentPurpose;
  kanal?: string | null;
  verildi: boolean;
  kaynak: string;
  belge_id?: UUID | null;
  created_at: ISODateTime;
  geri_alindi_at?: ISODateTime | null;
}

export type EidsStatus = "yok" | "talep_edildi" | "onaylandi" | "reddedildi";

export interface Portfolio {
  id: UUID;
  office_id: UUID;
  owner_id: UUID;
  asama: PortfolioStage;
  ilan_tipi: ListingType;
  emlak_tipi: string;
  baslik?: string | null;
  aciklama?: string | null;
  fiyat?: number | null;
  para_birimi: string;
  brut_m2?: number | null;
  net_m2?: number | null;
  oda?: number | null;
  salon?: number | null;
  kat?: number | null;
  toplam_kat?: number | null;
  bina_yasi?: number | null;
  isinma?: string | null;
  aidat?: number | null;
  il?: string | null;
  ilce?: string | null;
  mahalle?: string | null;
  adres?: string | null;
  ada?: string | null;
  parsel?: string | null;
  bagimsiz_bolum?: string | null;
  tapu_turu?: string | null;
  iskan_var?: boolean | null;
  takyidat: { ipotek?: boolean; haciz?: boolean; serh?: string; sorgu_tarihi?: ISODate };
  imar: { durum?: string; taks?: number; kaks?: number };
  krediye_uygun?: boolean | null;
  ozellikler: string[];
  konum?: LatLng | null;
  paylasim_seviyesi: "ozel" | "ofis" | "ag";
  saglik_skoru?: number | null;
  eids_durum: EidsStatus;
  eids_ref?: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface PortfolioOwner {
  portfolio_id: UUID;
  person_id: UUID;
  hisse?: string | null;
  vekil: boolean;
}

export interface PortfolioPriceHistory {
  id: number | string;
  portfolio_id: UUID;
  fiyat: number;
  created_at: ISODateTime;
}

export type MediaType = "foto" | "video" | "tur360" | "kat_plani" | "sanal_mobilya";

export interface Media {
  id: UUID;
  portfolio_id: UUID;
  tur: MediaType;
  /** Supabase Storage yolu ya da demo modda data: URL / harici URL */
  storage_path: string;
  sira: number;
  temsili: boolean;
}

export type DocumentStatus = "taslak" | "imzada" | "imzalandi" | "iptal";

export interface DocumentRow {
  id: UUID;
  office_id: UUID;
  sablon: string;
  sablon_surum: string;
  kural_surum: string;
  portfolio_id?: UUID | null;
  alanlar: Record<string, string>;
  durum: DocumentStatus;
  pdf_path?: string | null;
  saklama_bitis?: ISODate | null;
  /** Uzaktan imza bağlantısı için tek kullanımlık belirteç */
  imza_token?: string | null;
  created_by: UUID;
  created_at: ISODateTime;
}

export interface Signature {
  id: UUID;
  document_id: UUID;
  person_id?: UUID | null;
  yontem: "otp" | "e_imza" | "islak" | "link";
  imzalandi_at?: ISODateTime | null;
  ip?: string | null;
  konum?: LatLng | null;
  kanit: Record<string, unknown>;
}

export interface AuthorizationContract {
  id: UUID;
  portfolio_id: UUID;
  document_id?: UUID | null;
  munhasir: boolean;
  hizmet_bedeli_orani?: number | null;
  baslangic: ISODate;
  bitis: ISODate;
  imza_tarihi?: ISODate | null;
}

export interface SearchProfile {
  id: UUID;
  person_id: UUID;
  ilan_tipi: ListingType;
  butce_min?: number | null;
  butce_max: number;
  butce_tolerans?: number | null;
  ilceler: string[];
  mahalleler: string[];
  oda_min?: number | null;
  m2_min?: number | null;
  kredi_kullanacak: boolean;
  kredi_on_onay: boolean;
  zorunlu: string[];
  tercih: string[];
  aktif: boolean;
}

export interface Showing {
  id: UUID;
  office_id: UUID;
  portfolio_id: UUID;
  person_id: UUID;
  agent_id: UUID;
  planlanan: ISODateTime;
  durum: "planli" | "tamamlandi" | "iptal";
  yer_gosterme_belgesi_id?: UUID | null;
  geri_bildirim?: { puan?: number; fiyat?: number; konum?: number; not?: string } | null;
}

export interface Offer {
  id: UUID;
  portfolio_id: UUID;
  person_id: UUID;
  tutar: number;
  kosullar: Record<string, unknown>;
  gecerlilik?: ISODateTime | null;
  durum: "acik" | "karsi_teklif" | "kabul" | "red" | "suresi_doldu";
  onceki_teklif_id?: UUID | null;
  created_at: ISODateTime;
}

export interface ChecklistItem {
  kod: string;
  baslik: string;
  tamam: boolean;
  zorunlu: boolean;
}

export interface Deal {
  id: UUID;
  office_id: UUID;
  portfolio_id: UUID;
  alici_id?: UUID | null;
  bedel: number;
  kapora?: number | null;
  tapu_tarihi?: ISODate | null;
  kontrol_listesi: ChecklistItem[];
  kural_surum: string;
  created_at: ISODateTime;
}

export interface CommissionLineRow {
  id: UUID;
  deal_id: UUID;
  taraf: string;
  matrah: number;
  kdv: number;
  tahsil_edildi: boolean;
}

export interface CommissionSplitRow {
  id: UUID;
  deal_id: UUID;
  alici_rol: string;
  user_id?: UUID | null;
  oran: number;
  tutar: number;
}

export type FsboStatus = "yeni" | "arandi" | "gorusuldu" | "degerleme" | "yetki_alindi" | "vazgecildi";

export interface FsboListingRow {
  id: UUID;
  office_id: UUID;
  kaynak: string;
  kaynak_url?: string | null;
  baslik?: string | null;
  fiyat?: number | null;
  ilce?: string | null;
  mahalle?: string | null;
  ilk_gorulme: ISODate;
  fiyat_dusum_sayisi: number;
  skor?: number | null;
  sinyaller: string[];
  atanan_id?: UUID | null;
  durum: FsboStatus;
  portfolio_id?: UUID | null;
  /** Skor girdileri (şemada 0004 ile eklenir) */
  aciklama?: string | null;
  foto_sayisi?: number | null;
  piyasaya_gore_fark?: number | null;
  malik_ad?: string | null;
  malik_telefon?: string | null;
  /** Takip kadansı (0004 ile eklenir) */
  ilk_temas?: ISODate | null;
  son_temas?: ISODateTime | null;
}

export interface Activity {
  id: number | string;
  office_id: UUID;
  user_id: UUID;
  person_id?: UUID | null;
  portfolio_id?: UUID | null;
  tur: "arama" | "mesaj" | "not" | "sesli_not" | "gosterim" | "eposta" | "gorev";
  icerik?: string | null;
  /** Görevler için planlanan tarih */
  vade?: ISODateTime | null;
  tamamlandi?: boolean | null;
  created_at: ISODateTime;
}

export interface ComplianceLogRow {
  id: number | string;
  office_id: UUID;
  user_id?: UUID | null;
  olay: string;
  varlik: string;
  varlik_id?: UUID | null;
  karar: "ENGELLE" | "UYAR" | "GEC";
  sonuclar: unknown;
  kural_surum: string;
  gerekce?: string | null;
  created_at: ISODateTime;
}

/** Tablo adı → satır tipi eşlemesi */
export interface Tables {
  office: Office;
  office_member: OfficeMember;
  person: Person;
  consent: Consent;
  portfolio: Portfolio;
  portfolio_owner: PortfolioOwner;
  portfolio_price_history: PortfolioPriceHistory;
  media: Media;
  document: DocumentRow;
  signature: Signature;
  authorization_contract: AuthorizationContract;
  search_profile: SearchProfile;
  showing: Showing;
  offer: Offer;
  deal: Deal;
  commission_line: CommissionLineRow;
  commission_split: CommissionSplitRow;
  fsbo_listing: FsboListingRow;
  activity: Activity;
  compliance_log: ComplianceLogRow;
}

export type TableName = keyof Tables;
