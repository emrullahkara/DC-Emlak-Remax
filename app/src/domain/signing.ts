/**
 * Uzaktan imza yardımcıları — tasarım §5.8, §5.10, §11.
 *
 * Belge "imzada" durumuna geçerken tek kullanımlık, tahmin edilemez bir belirteç
 * (`imza_token`) üretilir ve `/imza/<token>` bağlantısı müşteriye gönderilir.
 * İmza anında imzalayanın gördüğü metnin SHA-256 özeti kanıt olarak saklanır.
 */
import { normalizeTrPhone } from "../lib/integrations";
import { parseDateTr, parseTrNumber } from "./templates";

const B64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Kriptografik rastgele, URL güvenli belirteç (varsayılan 32 bayt → 43 karakter). */
export function generateToken(bytes = 32): string {
  if (bytes < 24) throw new Error("Belirteç en az 24 bayt olmalı");
  const buf = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(buf);
  let out = "";
  // 6 bitlik gruplar hâlinde base64url (dolgu yok)
  let acc = 0;
  let bits = 0;
  for (const b of buf) {
    acc = (acc << 8) | b;
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      out += B64URL[(acc >> bits) & 63];
    }
    acc &= (1 << bits) - 1;
  }
  if (bits > 0) out += B64URL[(acc << (6 - bits)) & 63];
  return out;
}

export function isValidToken(t: string | null | undefined): t is string {
  return !!t && /^[A-Za-z0-9_-]{32,128}$/.test(t);
}

/** Metnin SHA-256 özeti (onaltılık). Tarayıcıda ve Node 20+'da `crypto.subtle` ile. */
export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text.normalize("NFC"));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function signingUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/imza/${encodeURIComponent(token)}`;
}

export function signingMessage(opts: { baslik: string; unvan?: string | null; url: string; ad?: string | null }): string {
  const hitap = opts.ad ? `Merhaba ${opts.ad}, ` : "Merhaba, ";
  return `${hitap}${opts.unvan ?? "ofisimiz"} tarafından hazırlanan "${opts.baslik}" belgesini aşağıdaki bağlantıdan okuyup onaylayabilirsiniz:\n${opts.url}`;
}

export function whatsappLink(phone: string | null | undefined, text: string): string {
  const to = phone ? normalizeTrPhone(phone) : "";
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

export function mailtoLink(email: string | null | undefined, subject: string, body: string): string {
  return `mailto:${email ? encodeURIComponent(email) : ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** 0532 418 22 47 → 0532 *** ** 47 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const d = phone.replace(/\D/g, "");
  if (d.length < 6) return "***";
  return `${d.slice(0, 4)} *** ** ${d.slice(-2)}`;
}

export interface SignEvidenceInput {
  adSoyad: string;
  userAgent: string;
  zaman: Date;
  sha256: string;
  konum?: { lat: number; lng: number; dogruluk?: number } | null;
  kvkkOnay: boolean;
  okudumOnay: boolean;
}

/** `signature.kanit` içeriği ve belgeye işlenecek doğrulama alanları */
export function buildEvidence(i: SignEvidenceInput) {
  const iso = i.zaman.toISOString();
  const tsi = i.zaman.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  const kanit = {
    ad_soyad: i.adSoyad.trim(),
    user_agent: i.userAgent,
    zaman: iso,
    sha256: i.sha256,
    okudum_onayliyorum: i.okudumOnay,
    kvkk_aydinlatma: i.kvkkOnay,
    konum: i.konum ?? null,
  };
  const alanlar: Record<string, string> = {
    zaman_damgasi: `${iso} (UTC) · ${tsi} (TSİ)`,
    belge_ozet_degeri: i.sha256,
    cihaz_bilgisi: i.userAgent.slice(0, 200),
  };
  if (i.konum) {
    alanlar.konum_enlem = i.konum.lat.toFixed(6);
    alanlar.konum_boylam = i.konum.lng.toFixed(6);
    if (i.konum.dogruluk !== undefined) alanlar.konum_dogruluk_m = String(Math.round(i.konum.dogruluk));
  }
  return { kanit, alanlar };
}

/** Ad soyad makul mü? (en az iki kelime, harf içerir) */
export function validSignerName(s: string): boolean {
  const words = s.trim().split(/\s+/).filter((w) => /\p{L}{2,}/u.test(w));
  return words.length >= 2;
}

/** Yetki sözleşmesi alanlarından `authorization_contract` satırı türetir. */
export function authorizationFromValues(values: Record<string, string | undefined>, imzaTarihi: string) {
  const baslangic = parseDateTr(values.baslangic_tarihi) ?? imzaTarihi;
  let bitis = parseDateTr(values.bitis_tarihi);
  if (!bitis || bitis <= baslangic) {
    const d = new Date(baslangic + "T00:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + 3);
    bitis = d.toISOString().slice(0, 10);
  }
  const tur = (values.yetki_turu ?? "").toLocaleLowerCase("tr");
  const munhasir = tur.includes("münhasır") || tur.includes("munhasir") ? !/(olmayan|değil|degil|genel)/.test(tur) : false;
  return {
    baslangic,
    bitis,
    munhasir,
    hizmet_bedeli_orani: parseTrNumber(values.hizmet_bedeli_orani),
    imza_tarihi: imzaTarihi,
  };
}
