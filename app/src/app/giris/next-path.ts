/**
 * `?next=` parametresini yalnızca uygulama içi göreli yola izin verecek
 * şekilde temizler (açık yönlendirme / open redirect koruması).
 */
export function safeNext(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  let v = raw.trim();
  try {
    v = decodeURIComponent(v);
  } catch {
    return fallback;
  }
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\") || /[\u0000-\u001f]/.test(v)) return fallback;
  // Giriş sayfasının kendisine geri dönmek döngü yaratır
  if (v === "/giris" || v.startsWith("/giris?") || v.startsWith("/giris/")) return fallback;
  return v;
}

export function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
}

/** "123 456" → "123456"; 6–10 hane kabul eder (Supabase varsayılanı 6) */
export function normalizeOtp(s: string): string | null {
  const d = s.replace(/\D/g, "");
  return d.length >= 6 && d.length <= 10 ? d : null;
}
