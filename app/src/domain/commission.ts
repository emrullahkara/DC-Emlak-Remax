import { round2 } from "./money";
import { paramsFor, type RuleParams } from "./params";

export interface CommissionLine {
  taraf: "alici" | "satici" | "kiraci" | "kiraya_veren";
  matrah: number;
  kdv: number;
  toplam: number;
}

export interface CommissionResult {
  satirlar: CommissionLine[];
  toplamMatrah: number;
  toplamKdv: number;
  genelToplam: number;
  paramSurum: string;
}

export class CommissionCapError extends Error {}

function line(
  taraf: CommissionLine["taraf"],
  matrah: number,
  kdvOrani: number,
): CommissionLine {
  const m = round2(matrah);
  const kdv = round2((m * kdvOrani) / 100);
  return { taraf, matrah: m, kdv, toplam: round2(m + kdv) };
}

function sum(satirlar: CommissionLine[], p: RuleParams): CommissionResult {
  const toplamMatrah = round2(satirlar.reduce((a, s) => a + s.matrah, 0));
  const toplamKdv = round2(satirlar.reduce((a, s) => a + s.kdv, 0));
  return {
    satirlar,
    toplamMatrah,
    toplamKdv,
    genelToplam: round2(toplamMatrah + toplamKdv),
    paramSurum: p.surum,
  };
}

/**
 * Satış hizmet bedeli. Oranlar tarafa göre ayrı verilir; yasal tavanı aşan
 * oran `CommissionCapError` fırlatır.
 */
export function saleCommission(
  satisBedeli: number,
  oranlar: { alici?: number; satici?: number },
  tarih?: Date,
): CommissionResult {
  if (satisBedeli <= 0) throw new RangeError("Satış bedeli pozitif olmalı");
  const p = paramsFor(tarih);
  const tavan = p.satisHizmetBedeliTavanOrani.deger;
  const kdv = p.hizmetKdvOrani.deger;
  const satirlar: CommissionLine[] = [];
  for (const taraf of ["alici", "satici"] as const) {
    const oran = oranlar[taraf];
    if (oran === undefined || oran === 0) continue;
    if (oran < 0 || oran > tavan) {
      throw new CommissionCapError(
        `${taraf === "alici" ? "Alıcı" : "Satıcı"} oranı %${oran}, yasal tavan %${tavan}`,
      );
    }
    satirlar.push(line(taraf, (satisBedeli * oran) / 100, kdv));
  }
  return sum(satirlar, p);
}

/**
 * Kiralama hizmet bedeli. Taraflardan alınan toplam, tavan (aylık kira katı)
 * ile sınırlıdır.
 */
export function rentCommission(
  aylikKira: number,
  paylar: { kiraci?: number; kiraya_veren?: number },
  tarih?: Date,
): CommissionResult {
  if (aylikKira <= 0) throw new RangeError("Kira bedeli pozitif olmalı");
  const p = paramsFor(tarih);
  const tavanAy = p.kiraHizmetBedeliTavanAy.deger;
  const toplamAy = (paylar.kiraci ?? 0) + (paylar.kiraya_veren ?? 0);
  if (toplamAy > tavanAy || (paylar.kiraci ?? 0) < 0 || (paylar.kiraya_veren ?? 0) < 0) {
    throw new CommissionCapError(
      `Toplam ${toplamAy} aylık kira, yasal tavan ${tavanAy} aylık kira`,
    );
  }
  const kdv = p.hizmetKdvOrani.deger;
  const satirlar: CommissionLine[] = [];
  for (const taraf of ["kiraci", "kiraya_veren"] as const) {
    const ay = paylar[taraf];
    if (!ay) continue;
    satirlar.push(line(taraf, aylikKira * ay, kdv));
  }
  return sum(satirlar, p);
}

export interface SplitRule {
  alici: string; // ör. "franchise", "ofis", "danisman", "portfoy_getiren"
  oran: number; // yüzde
}

export interface SplitLine {
  alici: string;
  tutar: number;
}

/**
 * Komisyon matrahını (KDV hariç) paylaşım kurallarına göre dağıtır.
 * Yuvarlama farkı son satıra eklenir; toplam her zaman matraha eşittir.
 */
export function splitCommission(matrah: number, kurallar: SplitRule[]): SplitLine[] {
  const toplamOran = kurallar.reduce((a, k) => a + k.oran, 0);
  if (Math.abs(toplamOran - 100) > 1e-9) {
    throw new RangeError(`Paylaşım oranları toplamı %100 olmalı (şu an %${toplamOran})`);
  }
  const satirlar = kurallar.map((k) => ({
    alici: k.alici,
    tutar: round2((matrah * k.oran) / 100),
  }));
  const fark = round2(matrah - satirlar.reduce((a, s) => a + s.tutar, 0));
  if (satirlar.length) satirlar[satirlar.length - 1].tutar = round2(satirlar[satirlar.length - 1].tutar + fark);
  return satirlar;
}
