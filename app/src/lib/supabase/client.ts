import { createBrowserClient } from "@supabase/ssr";

/** Supabase yapılandırılmamışsa null döner; uygulama demo verisiyle çalışır. */
export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}
