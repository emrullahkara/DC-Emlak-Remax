/**
 * Dış servis adaptörleri — tasarım §9.1 "Adaptör deseni".
 *
 * İş kodu yalnızca bu arayüzleri bilir. Paket ve ofis anahtarına göre gerçek
 * sağlayıcı ya da ücretsiz/boş (Null) uygulama döner. Ücretsiz uygulamalar
 * işlemi reddetmez; kullanıcıya uygulanabilir bir alternatif sunar
 * (ör. WhatsApp API yerine wa.me bağlantısı).
 */
import { serviceEnabled, type PlanId } from "../plans";

export interface SendResult {
  ok: boolean;
  /** Ücretsiz modda kullanıcının tıklayacağı alternatif (wa.me, mailto…) */
  fallbackUrl?: string;
  providerRef?: string;
  error?: string;
}

export interface SmsProvider {
  send(to: string, text: string): Promise<SendResult>;
}

export interface WhatsAppProvider {
  send(to: string, text: string): Promise<SendResult>;
}

export interface AiProvider {
  /** Portföy verisinden ilan metni üretir; kapalıysa kurallı şablon döner */
  listingText(input: { baslik: string; ozellikler: string[]; kanal: "portal" | "instagram" }): Promise<string>;
}

export interface SignatureProvider {
  /** İmza isteği başlatır; ücretsiz modda OTP bağlantısı ile onay kaydı */
  request(input: { belgeId: string; imzaciTelefon: string; imzaciAd: string }): Promise<SendResult>;
}

// ---- Ücretsiz / Null uygulamalar -------------------------------------------

export function normalizeTrPhone(tel: string): string {
  const d = tel.replace(/\D/g, "");
  if (d.startsWith("90")) return d;
  if (d.startsWith("0")) return "9" + d;
  return "90" + d;
}

export const freeWhatsApp: WhatsAppProvider = {
  async send(to, text) {
    return { ok: true, fallbackUrl: `https://wa.me/${normalizeTrPhone(to)}?text=${encodeURIComponent(text)}` };
  },
};

export const disabledSms: SmsProvider = {
  async send(to, text) {
    return {
      ok: false,
      error: "SMS modülü kapalı. Ayarlar → Entegrasyonlar'dan etkinleştirin.",
      fallbackUrl: `sms:${to}?body=${encodeURIComponent(text)}`,
    };
  },
};

export const templateAi: AiProvider = {
  async listingText({ baslik, ozellikler, kanal }) {
    const liste = ozellikler.map((o) => (kanal === "instagram" ? `✔ ${o}` : `• ${o}`)).join("\n");
    return `${baslik}\n\n${liste}\n\nDetaylı bilgi ve randevu için bize ulaşın.`;
  },
};

export const otpSignature: SignatureProvider = {
  async request({ belgeId }) {
    // Ücretsiz mod: uygulama içi OTP onay sayfası; tek kullanımlık kod SMS
    // modülü kapalıysa e-posta veya danışman ekranından gösterilir.
    return { ok: true, fallbackUrl: `/imza/${encodeURIComponent(belgeId)}` };
  },
};

// ---- Seçici -----------------------------------------------------------------

export interface OfficeIntegrationKeys {
  sms?: string;
  whatsapp_api?: string;
  yapay_zeka?: string;
  e_imza?: string;
}

/** Ücretli sağlayıcılar eklendikçe burada kaydedilir. */
const paid: {
  sms?: (key: string) => SmsProvider;
  whatsapp?: (key: string) => WhatsAppProvider;
  ai?: (key: string) => AiProvider;
  signature?: (key: string) => SignatureProvider;
} = {};

export function getProviders(plan: PlanId, keys: OfficeIntegrationKeys) {
  const on = (s: Parameters<typeof serviceEnabled>[1], k?: string) => serviceEnabled(plan, s, Boolean(k));
  return {
    sms: on("sms", keys.sms) && paid.sms ? paid.sms(keys.sms!) : disabledSms,
    whatsapp: on("whatsapp_api", keys.whatsapp_api) && paid.whatsapp ? paid.whatsapp(keys.whatsapp_api!) : freeWhatsApp,
    ai: on("yapay_zeka", keys.yapay_zeka) && paid.ai ? paid.ai(keys.yapay_zeka!) : templateAi,
    signature: on("e_imza", keys.e_imza) && paid.signature ? paid.signature(keys.e_imza!) : otpSignature,
  };
}
