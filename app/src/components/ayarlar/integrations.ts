/**
 * Ofis entegrasyon anahtarları (office_integration).
 *
 * Supabase modunda düz anahtar asla tabloya yazılmaz: `set_integration_secret`
 * RPC'si anahtarı Supabase Vault'ta şifreler, tabloda yalnızca Vault kaydının
 * kimliği (anahtar_ref) durur. Demo modunda yalnızca maskelenmiş bir referans
 * bu tarayıcıda saklanır — anahtarın kendisi hiçbir yerde tutulmaz.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaidService } from "@/lib/plans";

export interface IntegrationRow {
  servis: PaidService;
  saglayici: string;
  anahtar_ref: string;
  aktif: boolean;
}

export const PAID_SERVICES: PaidService[] = ["sms", "whatsapp_api", "yapay_zeka", "e_imza", "e_fatura"];

/** "sk-abc…wxyz" → "••••wxyz" (4 karakterden kısa anahtarlar tamamen gizlenir) */
export function maskKey(key: string): string {
  const k = key.trim();
  return k.length <= 8 ? "••••" : `••••${k.slice(-4)}`;
}

interface Ctx {
  mode: "demo" | "supabase";
  supabase: SupabaseClient | null;
  officeId: string;
}

const demoKey = (officeId: string) => `dc-emlak-demo-entegrasyon:${officeId}`;

function readDemo(officeId: string): IntegrationRow[] {
  try {
    const raw = window.localStorage.getItem(demoKey(officeId));
    return raw ? (JSON.parse(raw) as IntegrationRow[]) : [];
  } catch {
    return [];
  }
}

function writeDemo(officeId: string, rows: IntegrationRow[]) {
  try {
    window.localStorage.setItem(demoKey(officeId), JSON.stringify(rows));
  } catch {
    // depolama engelli
  }
}

export async function listIntegrations(c: Ctx): Promise<IntegrationRow[]> {
  if (c.mode === "demo" || !c.supabase) return readDemo(c.officeId);
  const { data, error } = await c.supabase.from("office_integration").select("servis, saglayici, anahtar_ref, aktif").eq("office_id", c.officeId);
  if (error) throw error;
  return (data ?? []) as IntegrationRow[];
}

export async function saveIntegration(c: Ctx, servis: PaidService, saglayici: string, anahtar: string): Promise<void> {
  if (c.mode === "demo" || !c.supabase) {
    const rows = readDemo(c.officeId).filter((r) => r.servis !== servis);
    rows.push({ servis, saglayici, anahtar_ref: `demo:${maskKey(anahtar)}`, aktif: true });
    writeDemo(c.officeId, rows);
    return;
  }
  const { error } = await c.supabase.rpc("set_integration_secret", { p_office: c.officeId, p_servis: servis, p_saglayici: saglayici, p_anahtar: anahtar });
  if (error) throw error;
}

export async function clearIntegration(c: Ctx, servis: PaidService): Promise<void> {
  if (c.mode === "demo" || !c.supabase) {
    writeDemo(
      c.officeId,
      readDemo(c.officeId).filter((r) => r.servis !== servis),
    );
    return;
  }
  const { error } = await c.supabase.rpc("clear_integration_secret", { p_office: c.officeId, p_servis: servis });
  if (error) throw error;
}
