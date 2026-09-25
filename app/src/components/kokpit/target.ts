/** Aylık ciro hedefi — kullanıcı başına bu tarayıcıda saklanır. */

const key = (officeId: string, userId: string) => `dc-emlak-hedef:${officeId}:${userId}`;

export function readTarget(officeId: string, userId: string): number | null {
  try {
    const raw = window.localStorage.getItem(key(officeId, userId));
    const n = raw === null ? NaN : Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function writeTarget(officeId: string, userId: string, value: number | null) {
  try {
    if (value && value > 0) window.localStorage.setItem(key(officeId, userId), String(Math.round(value)));
    else window.localStorage.removeItem(key(officeId, userId));
  } catch {
    // Depolama engelli: hedef yalnızca bu oturumda kalır
  }
}

/** "600.000", "600000 ₺", "1,5 M" → sayı */
export function parseAmount(s: string): number | null {
  const t = s.trim().toLocaleLowerCase("tr").replace(/₺|tl/g, "").trim();
  if (!t) return null;
  const milyon = /\s*(m|milyon)$/.test(t);
  const body = t.replace(/\s*(m|milyon)$/, "").replace(/\s/g, "");
  // Türkçe biçim: nokta binlik, virgül ondalık
  const n = Number(body.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return milyon ? n * 1_000_000 : n;
}
