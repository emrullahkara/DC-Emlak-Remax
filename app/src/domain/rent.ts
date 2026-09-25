import { round2 } from "./money";
import { paramsFor } from "./params";

/**
 * Konut kirasında yenilenen kira yılı için yasal azami kira.
 * TBK md. 344: artış, bir önceki kira yılında TÜFE'nin on iki aylık
 * ortalamasına göre değişim oranını geçemez. (Geçici %25 sınırı 2 Temmuz 2024'te sona erdi.)
 *
 * @param mevcutKira  Mevcut aylık kira
 * @param tufe12AyOrtalama  TÜİK 12 aylık ortalamalara göre değişim (%), ör. 35.4
 */
export function maxRenewedRent(mevcutKira: number, tufe12AyOrtalama: number) {
  if (mevcutKira <= 0) throw new RangeError("Kira pozitif olmalı");
  const oran = Math.max(0, tufe12AyOrtalama);
  const yeniKira = round2(mevcutKira * (1 + oran / 100));
  return { azamiArtisOrani: oran, yeniKira, artisTutari: round2(yeniKira - mevcutKira) };
}

/** Güvence bedeli (depozito) üst sınır kontrolü. */
export function checkDeposit(aylikKira: number, depozito: number, tarih?: Date) {
  const tavanAy = paramsFor(tarih).guvenceBedeliTavanAy.deger;
  const tavan = round2(aylikKira * tavanAy);
  return { gecerli: depozito <= tavan, tavan, tavanAy };
}

/**
 * Kira sözleşmesinin kritik tarihleri: 5 yıl sonrası kira tespiti hakkı ve
 * 10 yıllık uzama süresinin sonu (kiraya verenin gerekçesiz fesih imkânı).
 */
export function leaseMilestones(baslangic: Date) {
  const add = (y: number) => {
    const d = new Date(baslangic);
    d.setFullYear(d.getFullYear() + y);
    return d;
  };
  return { besinciYil: add(5), onYillikUzamaSonu: add(10) };
}
