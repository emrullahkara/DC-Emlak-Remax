/**
 * Açıklanabilir skorlar: FSBO sıcaklık skoru (§5.3) ve Portföy Sağlık Skoru (§5.2).
 */

export interface FsboListing {
  ilanYasiGun: number;
  fiyatDusumSayisi: number;
  /** Bölge m² medyanına göre fiyat farkı (%), ör. +12 = medyanın %12 üstü */
  piyasayaGoreFark: number;
  aciklama: string;
  fotoSayisi: number;
}

export interface Score {
  puan: number;
  sinyaller: string[];
}

const MOTIVASYON = [
  { re: /acil/i, etiket: "“acil” ifadesi" },
  { re: /tayin/i, etiket: "tayin" },
  { re: /yurt ?dışı/i, etiket: "yurt dışına taşınma" },
  { re: /borç|kredi kapat/i, etiket: "borç kapatma" },
  { re: /miras|veraset/i, etiket: "miras" },
  { re: /pazarlık(lı)?/i, etiket: "pazarlık payı" },
];

export function fsboScore(l: FsboListing): Score {
  const s: string[] = [];
  let p = 0;

  // İlan yaşı: 3–8 hafta en verimli dönem (kendi satamayacağını anlamaya başlar)
  if (l.ilanYasiGun >= 21 && l.ilanYasiGun <= 60) {
    p += 25;
    s.push(`${l.ilanYasiGun} gündür yayında`);
  } else if (l.ilanYasiGun > 60) {
    p += 18;
    s.push("Uzun süredir satılamıyor");
  } else p += 8;

  p += Math.min(25, l.fiyatDusumSayisi * 12);
  if (l.fiyatDusumSayisi) s.push(`${l.fiyatDusumSayisi} kez fiyat düşürmüş`);

  const mot = MOTIVASYON.filter((m) => m.re.test(l.aciklama));
  p += Math.min(30, mot.length * 15);
  s.push(...mot.map((m) => m.etiket));

  // Fiyatı piyasanın çok üstündeyse profesyonel destek ihtiyacı yüksek
  if (l.piyasayaGoreFark >= 10) {
    p += 10;
    s.push("Fiyat piyasanın üstünde");
  } else if (l.piyasayaGoreFark <= -5) p += 5;

  if (l.fotoSayisi < 6) {
    p += 10;
    s.push("Zayıf ilan sunumu");
  }
  return { puan: Math.min(100, p), sinyaller: s };
}

export interface PortfolioHealthInput {
  fotoSayisi: number;
  katPlaniVar: boolean;
  aciklamaKarakter: number;
  piyasayaGoreFark: number;
  sonGuncellemeGun: number;
  yayindaGun: number;
  teklifSayisi: number;
  goruntulenme: number;
  arama: number;
}

export function portfolioHealth(i: PortfolioHealthInput): Score {
  const oneriler: string[] = [];
  let p = 100;

  if (i.fotoSayisi < 12) {
    p -= 15;
    oneriler.push(`Fotoğraf sayısı ${i.fotoSayisi}; en az 12 önerilir`);
  }
  if (!i.katPlaniVar) {
    p -= 8;
    oneriler.push("Kat planı ekleyin");
  }
  if (i.aciklamaKarakter < 400) {
    p -= 10;
    oneriler.push("Açıklama kısa; konum, ulaşım ve öne çıkan özellikleri ekleyin");
  }
  if (i.piyasayaGoreFark > 5) {
    const ceza = Math.min(30, Math.round(i.piyasayaGoreFark * 1.5));
    p -= ceza;
    oneriler.push(`Fiyat bölge medyanının %${i.piyasayaGoreFark} üzerinde`);
  }
  if (i.sonGuncellemeGun > 14) {
    p -= 7;
    oneriler.push("İlan 14 günden uzun süredir güncellenmedi");
  }
  if (i.yayindaGun > 21 && i.teklifSayisi === 0) {
    p -= 10;
    oneriler.push(`${i.yayindaGun} gündür teklif yok; fiyat revizyonu görüşün`);
  }
  if (i.goruntulenme > 500 && i.arama / i.goruntulenme < 0.005) {
    p -= 8;
    oneriler.push("Görüntülenme yüksek ama arama düşük; kapak fotoğrafı ve fiyatı gözden geçirin");
  }
  return { puan: Math.max(0, p), sinyaller: oneriler };
}
