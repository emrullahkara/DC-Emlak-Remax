/**
 * Supabase bağlanana kadar kullanılan örnek veri. Kokpit uyarıları bu veri
 * üzerinde gerçek uyum motoru ve skor fonksiyonlarıyla hesaplanır.
 */
import type { ListingContext } from "@/domain/compliance";
import type { Asama } from "@/domain/pipeline";
import type { FsboListing, PortfolioHealthInput } from "@/domain/scoring";

export interface DemoPortfolio {
  id: string;
  baslik: string;
  fiyat: number;
  asama: Asama;
  ilan: Omit<ListingContext, "bugun">;
  saglik: PortfolioHealthInput;
  beklenenKomisyonOrani: number; // her iki taraf toplamı, %
  olasilik: number; // 0-1
}

export const DEMO_PORTFOLIOS: DemoPortfolio[] = [
  {
    id: "p1",
    baslik: "Moda 3+1, 140 m², deniz manzaralı",
    fiyat: 12_500_000,
    asama: "yayinda",
    ilan: {
      ofisYetkiBelgesiGecerlilik: "2029-05-01",
      yetkiSozlesmesi: { imzaTarihi: "2026-04-10", baslangic: "2026-04-10", bitis: "2026-10-10" },
      eidsOnayli: true,
      ilanMetni: "Moda sahiline 3 dakika, yeni tadilatlı, deniz manzaralı 3+1.",
    },
    saglik: { fotoSayisi: 18, katPlaniVar: false, aciklamaKarakter: 850, piyasayaGoreFark: 6, sonGuncellemeGun: 4, yayindaGun: 34, teklifSayisi: 1, goruntulenme: 1240, arama: 18 },
    beklenenKomisyonOrani: 4,
    olasilik: 0.5,
  },
  {
    id: "p2",
    baslik: "Caddebostan 2+1, site içi, otoparklı",
    fiyat: 9_200_000,
    asama: "yetki",
    ilan: {
      ofisYetkiBelgesiGecerlilik: "2029-05-01",
      yetkiSozlesmesi: { imzaTarihi: "2026-09-20", baslangic: "2026-09-20", bitis: "2027-03-20" },
      eidsOnayli: false,
    },
    saglik: { fotoSayisi: 7, katPlaniVar: false, aciklamaKarakter: 220, piyasayaGoreFark: 2, sonGuncellemeGun: 1, yayindaGun: 0, teklifSayisi: 0, goruntulenme: 0, arama: 0 },
    beklenenKomisyonOrani: 4,
    olasilik: 0.3,
  },
  {
    id: "p3",
    baslik: "Göztepe 4+1 dubleks, bahçe kullanımlı",
    fiyat: 16_800_000,
    asama: "yayinda",
    ilan: {
      ofisYetkiBelgesiGecerlilik: "2029-05-01",
      yetkiSozlesmesi: { imzaTarihi: "2026-03-01", baslangic: "2026-03-01", bitis: "2026-12-01" },
      eidsOnayli: true,
      ilanMetni: "Bölgenin en ucuz dubleksi, kaçırılmayacak fırsat!",
    },
    saglik: { fotoSayisi: 22, katPlaniVar: true, aciklamaKarakter: 600, piyasayaGoreFark: 18, sonGuncellemeGun: 20, yayindaGun: 58, teklifSayisi: 0, goruntulenme: 2100, arama: 6 },
    beklenenKomisyonOrani: 4,
    olasilik: 0.2,
  },
  {
    id: "p4",
    baslik: "Ataşehir 1+1 kiralık, eşyalı",
    fiyat: 32_000,
    asama: "teklif",
    ilan: {
      ofisYetkiBelgesiGecerlilik: "2029-05-01",
      yetkiSozlesmesi: { imzaTarihi: "2026-08-15", baslangic: "2026-08-15", bitis: "2026-11-15" },
      eidsOnayli: true,
    },
    saglik: { fotoSayisi: 14, katPlaniVar: true, aciklamaKarakter: 500, piyasayaGoreFark: 0, sonGuncellemeGun: 2, yayindaGun: 12, teklifSayisi: 2, goruntulenme: 400, arama: 11 },
    beklenenKomisyonOrani: 0, // kira: 1 aylık, aşağıda ayrıca hesaplanır
    olasilik: 0.8,
  },
];

export const DEMO_FSBO: (FsboListing & { id: string; baslik: string; fiyat: number })[] = [
  { id: "f1", baslik: "Fenerbahçe 3+1", fiyat: 9_800_000, ilanYasiGun: 47, fiyatDusumSayisi: 2, piyasayaGoreFark: 11, aciklama: "Acil satılık, yurt dışına taşınıyoruz", fotoSayisi: 5 },
  { id: "f2", baslik: "Caddebostan 2+1", fiyat: 7_200_000, ilanYasiGun: 33, fiyatDusumSayisi: 1, piyasayaGoreFark: 4, aciklama: "Tayin nedeniyle satılık, pazarlık payı var", fotoSayisi: 9 },
  { id: "f3", baslik: "Göztepe 4+1 dubleks", fiyat: 14_500_000, ilanYasiGun: 12, fiyatDusumSayisi: 0, piyasayaGoreFark: -2, aciklama: "Sahibinden satılık dubleks", fotoSayisi: 16 },
];

export const DEMO_HEDEF = { aylikCiroHedefi: 600_000, gerceklesen: 468_000 };
