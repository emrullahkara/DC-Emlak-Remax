import type { Feature, PaidService, ServiceMode } from "@/lib/plans";
import type { MemberRole } from "@/data/types";

export const FEATURE_LABEL: Record<Feature, string> = {
  portfoy: "Portföy yönetimi",
  crm: "Müşteri yönetimi (CRM)",
  eslestirme: "Eşleştirme motoru",
  takvim: "Takvim & Yer Gösterme Belgesi",
  uyum_motoru: "Uyum Motoru (EİDS, yetki, KVKK)",
  hesaplayicilar: "Komisyon & maliyet hesaplayıcıları",
  fsbo_radar: "FSBO Radar",
  cma_degerleme: "CMA değerleme",
  mal_sahibi_raporu: "Mal sahibi raporu",
  islem_hatti: "İşlem hattı & kapanış listeleri",
  komisyon_paylasimi: "Komisyon paylaşımı",
  ofis_raporlari: "Ofis raporları",
  pazarlama_studyosu: "Pazarlama Stüdyosu",
  coklu_yayin: "Çok kanallı yayın (XML)",
  musteri_portali: "Müşteri portalı",
  kira_yonetimi: "Kira yönetimi",
};

export const SERVICE_LABEL: Record<PaidService, { ad: string; aciklama: string; saglayicilar: string[]; ucretsiz: string }> = {
  sms: {
    ad: "SMS (toplu ileti + OTP)",
    aciklama: "İYS izin kontrolüyle SMS gönderimi ve imza için tek kullanımlık kod.",
    saglayicilar: ["Netgsm", "İleti Merkezi", "Mutlucell", "Diğer"],
    ucretsiz: "Kapalıyken telefonun kendi SMS uygulaması açılır.",
  },
  whatsapp_api: {
    ad: "WhatsApp Business API",
    aciklama: "Şablon mesajlar, katalog gönderimi, birleşik gelen kutusu.",
    saglayicilar: ["Meta Cloud API", "360dialog", "Diğer"],
    ucretsiz: "Kapalıyken wa.me bağlantısıyla hazır mesaj açılır.",
  },
  yapay_zeka: {
    ad: "Yapay Zekâ (ilan metni, sesli not özeti)",
    aciklama: "Kendi API anahtarınızla; veriler model eğitiminde kullanılmaz.",
    saglayicilar: ["Anthropic", "OpenAI", "Diğer"],
    ucretsiz: "Kapalıyken kurallı şablon metinler kullanılır.",
  },
  e_imza: {
    ad: "e-İmza / Nitelikli elektronik imza",
    aciklama: "Yetki ve kira sözleşmeleri için nitelikli imza.",
    saglayicilar: ["E-Güven", "TÜRKTRUST", "Diğer"],
    ucretsiz: "Kapalıyken bağlantı + tek kullanımlık kod ile onay kaydı alınır.",
  },
  e_fatura: {
    ad: "e-Fatura / e-Arşiv",
    aciklama: "GİB özel entegratörü üzerinden hizmet bedeli faturası.",
    saglayicilar: ["Paraşüt", "Logo", "Mikro", "Diğer"],
    ucretsiz: "Kapalıyken taslak PDF fatura üretilir.",
  },
};

export const SERVICE_MODE_LABEL: Record<ServiceMode, string> = {
  kapali: "Pakette yok",
  kendi_anahtari: "Kendi anahtarınızla",
  dahil: "Pakete dâhil",
};

export const ROLE_LABEL: Record<MemberRole, string> = {
  broker: "Broker (yönetici)",
  takim_lideri: "Takım lideri",
  danisman: "Danışman",
  asistan: "Asistan",
};
