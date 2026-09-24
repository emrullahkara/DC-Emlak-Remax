import { saleCommission } from "./commission";
import { round2 } from "./money";
import { paramsFor } from "./params";

export interface CostItem {
  kalem: string;
  tutar: number;
  not?: string;
}

export interface CostBreakdown {
  kalemler: CostItem[];
  toplam: number;
}

export interface SaleCostInput {
  satisBedeli: number;
  /** Tapuda beyan edilecek değer; boşsa satış bedeli kullanılır. */
  beyanDegeri?: number;
  aliciKomisyonOrani: number;
  saticiKomisyonOrani: number;
  daskPrimi?: number;
  ekspertizUcreti?: number;
  ipotekMasrafi?: number;
  kalanKrediBorcu?: number;
  tarih?: Date;
}

/** Alıcının cebinden çıkacak toplam (satış bedeli dâhil). */
export function buyerTotalCost(i: SaleCostInput): CostBreakdown {
  const p = paramsFor(i.tarih);
  const beyan = i.beyanDegeri ?? i.satisBedeli;
  const kom = saleCommission(i.satisBedeli, { alici: i.aliciKomisyonOrani }, i.tarih);
  const kalemler: CostItem[] = [
    { kalem: "Satış bedeli", tutar: i.satisBedeli },
    {
      kalem: "Tapu harcı (alıcı)",
      tutar: round2((beyan * p.tapuHarciBindeAlici.deger) / 1000),
      not: "Beyan değeri emlak vergisi değerinin altında olamaz",
    },
    {
      kalem: "Döner sermaye",
      tutar: p.donerSermayeUcreti.deger,
      not: p.donerSermayeUcreti.teyitGerekli ? "Güncel tutar teyit edilmeli" : undefined,
    },
    { kalem: "Hizmet bedeli (KDV dâhil)", tutar: kom.genelToplam },
  ];
  if (i.daskPrimi) kalemler.push({ kalem: "DASK", tutar: i.daskPrimi });
  if (i.ekspertizUcreti) kalemler.push({ kalem: "Ekspertiz", tutar: i.ekspertizUcreti });
  if (i.ipotekMasrafi) kalemler.push({ kalem: "İpotek tesis masrafı", tutar: i.ipotekMasrafi });
  return { kalemler, toplam: round2(kalemler.reduce((a, k) => a + k.tutar, 0)) };
}

/** Satıcının eline geçecek net tutar. */
export function sellerNet(i: SaleCostInput): CostBreakdown {
  const p = paramsFor(i.tarih);
  const beyan = i.beyanDegeri ?? i.satisBedeli;
  const kom = saleCommission(i.satisBedeli, { satici: i.saticiKomisyonOrani }, i.tarih);
  const kalemler: CostItem[] = [
    { kalem: "Satış bedeli", tutar: i.satisBedeli },
    {
      kalem: "Tapu harcı (satıcı)",
      tutar: -round2((beyan * p.tapuHarciBindeSatici.deger) / 1000),
    },
    { kalem: "Hizmet bedeli (KDV dâhil)", tutar: -kom.genelToplam },
  ];
  if (i.kalanKrediBorcu) kalemler.push({ kalem: "Kalan kredi borcu", tutar: -i.kalanKrediBorcu });
  return { kalemler, toplam: round2(kalemler.reduce((a, k) => a + k.tutar, 0)) };
}
