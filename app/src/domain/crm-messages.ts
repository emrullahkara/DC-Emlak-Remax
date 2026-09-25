/**
 * Müşteriye gönderilen hazır mesaj metinleri (katalog, KVKK aydınlatma bağlantısı).
 */
import type { Portfolio } from "../data/types";

// lib/format ile aynı biçim (domain katmanı yol takma adlarından bağımsız kalsın)
const TL0 = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
const tl = (n: number) => TL0.format(n);
const shortTL = (n: number) =>
  Math.abs(n) >= 1e6 ? `${(n / 1e6).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} M ₺` : tl(n);

export function roomLabel(p: Pick<Portfolio, "oda" | "salon">): string | null {
  if (p.oda === null || p.oda === undefined) return null;
  return `${p.oda}+${p.salon ?? 1}`;
}

export function priceLabel(p: Pick<Portfolio, "fiyat" | "ilan_tipi">): string {
  if (p.fiyat === null || p.fiyat === undefined) return "Fiyat sorunuz";
  return p.ilan_tipi === "kiralik" ? `${tl(p.fiyat)}/ay` : shortTL(p.fiyat);
}

function firstName(adSoyad: string) {
  return adSoyad.trim().split(/\s+/)[0] ?? "";
}

export interface CatalogInput {
  kisiAdi: string;
  portfoyler: Pick<Portfolio, "baslik" | "fiyat" | "ilan_tipi" | "oda" | "salon" | "net_m2" | "brut_m2" | "mahalle" | "ilce">[];
  danismanAdi: string;
  ofisUnvani: string;
  danismanTelefon?: string | null;
}

export function buildCatalogMessage(i: CatalogInput): string {
  const satirlar = i.portfoyler.map((p, n) => {
    const m2 = p.net_m2 ?? p.brut_m2;
    const konum = [p.mahalle, p.ilce].filter(Boolean).join(", ");
    const detay = [priceLabel(p), roomLabel(p), m2 ? `${m2} m²` : null, konum || null].filter(Boolean).join(" · ");
    return `${n + 1}) ${p.baslik ?? "Portföy"}\n   ${detay}`;
  });
  const ad = firstName(i.kisiAdi);
  return [
    `Merhaba${ad ? ` ${ad}` : ""},`,
    "",
    `Arayışınıza uygun ${i.portfoyler.length} portföyü sizin için seçtim:`,
    "",
    ...satirlar,
    "",
    "Detaylı bilgi ve gösterim randevusu için bu mesaja yanıt verebilirsiniz.",
    "",
    `${i.danismanAdi} · ${i.ofisUnvani}${i.danismanTelefon ? ` · ${i.danismanTelefon}` : ""}`,
    "Bu tür mesajları almak istemiyorsanız \"RET\" yazmanız yeterli.",
  ].join("\n");
}

export function buildKvkkMessage(i: { kisiAdi: string; ofisUnvani: string; link: string; danismanAdi: string }): string {
  const ad = firstName(i.kisiAdi);
  return [
    `Merhaba${ad ? ` ${ad}` : ""},`,
    "",
    `${i.ofisUnvani} olarak kişisel verilerinizi 6698 sayılı KVKK kapsamında işliyoruz. Aydınlatma metnini okumak ve açık rıza tercihlerinizi (ticari ileti, arama kaydı, yurt dışı aktarım) belirtmek için:`,
    i.link,
    "",
    "Rızalarınızı dilediğiniz zaman geri alabilirsiniz.",
    `${i.danismanAdi}`,
  ].join("\n");
}
