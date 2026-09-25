/**
 * SaaS paketleri ve özellik kapıları — tasarım §15.1.
 * Fiyatlar pilot sonrası belirlenecek; burada yalnızca özellik seti tanımlıdır.
 */

export type PlanId = "temel" | "profesyonel" | "premium";

export type Feature =
  | "portfoy"
  | "crm"
  | "eslestirme"
  | "takvim"
  | "uyum_motoru"
  | "hesaplayicilar"
  | "fsbo_radar"
  | "cma_degerleme"
  | "mal_sahibi_raporu"
  | "islem_hatti"
  | "komisyon_paylasimi"
  | "ofis_raporlari"
  | "pazarlama_studyosu"
  | "coklu_yayin"
  | "musteri_portali"
  | "kira_yonetimi";

/** Ücretli dış servisler: "kendi_anahtari" = ofis kendi hesabıyla açar, "dahil" = paket kotası */
export type ServiceMode = "kapali" | "kendi_anahtari" | "dahil";
export type PaidService = "sms" | "whatsapp_api" | "yapay_zeka" | "e_imza" | "e_fatura";

export interface Plan {
  id: PlanId;
  ad: string;
  aciklama: string;
  ozellikler: Feature[];
  servisler: Record<PaidService, ServiceMode>;
  denemeGun: number;
}

const TEMEL: Feature[] = ["portfoy", "crm", "eslestirme", "takvim", "uyum_motoru", "hesaplayicilar"];
const PRO: Feature[] = [
  ...TEMEL,
  "fsbo_radar",
  "cma_degerleme",
  "mal_sahibi_raporu",
  "islem_hatti",
  "komisyon_paylasimi",
  "ofis_raporlari",
  "pazarlama_studyosu",
  "coklu_yayin",
];

export const PLANS: Record<PlanId, Plan> = {
  temel: {
    id: "temel",
    ad: "Temel",
    aciklama: "Yeni başlayan ve tek danışmanlı ofisler",
    ozellikler: TEMEL,
    servisler: { sms: "kendi_anahtari", whatsapp_api: "kendi_anahtari", yapay_zeka: "kapali", e_imza: "kendi_anahtari", e_fatura: "kendi_anahtari" },
    denemeGun: 14,
  },
  profesyonel: {
    id: "profesyonel",
    ad: "Profesyonel",
    aciklama: "Aktif portföy ve müşteri yöneten ofisler",
    ozellikler: PRO,
    servisler: { sms: "kendi_anahtari", whatsapp_api: "kendi_anahtari", yapay_zeka: "kendi_anahtari", e_imza: "kendi_anahtari", e_fatura: "kendi_anahtari" },
    denemeGun: 14,
  },
  premium: {
    id: "premium",
    ad: "Premium",
    aciklama: "Büyüyen, çok danışmanlı ofisler",
    ozellikler: [...PRO, "musteri_portali", "kira_yonetimi"],
    servisler: { sms: "dahil", whatsapp_api: "dahil", yapay_zeka: "dahil", e_imza: "dahil", e_fatura: "dahil" },
    denemeGun: 14,
  },
};

export function hasFeature(plan: PlanId, f: Feature): boolean {
  return PLANS[plan].ozellikler.includes(f);
}

/**
 * Bir servisin gerçekten çalışıp çalışmayacağı: paket izin vermeli ve
 * "kendi_anahtari" modunda ofis anahtarını girmiş olmalı.
 */
export function serviceEnabled(plan: PlanId, s: PaidService, ofisAnahtariVar: boolean): boolean {
  const mode = PLANS[plan].servisler[s];
  return mode === "dahil" || (mode === "kendi_anahtari" && ofisAnahtariVar);
}
