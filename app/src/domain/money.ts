/** Kuruş hassasiyetinde yuvarlama (ondalık kayan nokta hatalarını önler). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

const TRY = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 2,
});

export function formatTL(n: number): string {
  return TRY.format(n);
}
