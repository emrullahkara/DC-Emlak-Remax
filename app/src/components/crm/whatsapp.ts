import { freeWhatsApp } from "@/lib/integrations";
import { isTrPhone, waNumber } from "@/domain/crm";

/** Sohbeti aç (mesajsız) — bağlantı olarak kullanılır */
export function waChatUrl(tel: string) {
  return `https://wa.me/${waNumber(tel)}`;
}

/**
 * Mesajlı WhatsApp bağlantısı üretir ve yeni sekmede açar.
 * TR numaralarında ücretsiz sağlayıcı (wa.me) kullanılır; yabancı numaralarda
 * ülke kodu korunarak bağlantı doğrudan kurulur.
 */
export async function sendWhatsApp(tel: string, text: string): Promise<string | null> {
  let url: string | undefined;
  if (isTrPhone(tel)) {
    const r = await freeWhatsApp.send(tel, text);
    url = r.fallbackUrl;
    if (!r.ok && !url) return null;
  } else {
    url = `https://wa.me/${waNumber(tel)}?text=${encodeURIComponent(text)}`;
  }
  if (url && typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
  return url ?? null;
}
