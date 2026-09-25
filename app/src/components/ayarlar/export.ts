/** Ofis verisinin JSON olarak dışa aktarımı (KVKK: veri taşınabilirliği, yedek). */
import type { DataStore } from "@/data/store";
import type { TableName } from "@/data/types";

/** Dışa aktarılan tablolar — `Tables` tipindeki tüm tablolar (derleyici eksikleri yakalar) */
const ALL: Record<TableName, true> = {
  office: true,
  office_member: true,
  person: true,
  consent: true,
  portfolio: true,
  portfolio_owner: true,
  portfolio_price_history: true,
  media: true,
  document: true,
  signature: true,
  authorization_contract: true,
  search_profile: true,
  showing: true,
  offer: true,
  deal: true,
  commission_line: true,
  commission_split: true,
  fsbo_listing: true,
  activity: true,
  compliance_log: true,
};
export const EXPORT_TABLES = Object.keys(ALL) as TableName[];

export interface ExportFile {
  uygulama: "DC Emlak";
  surum: 1;
  olusturulma: string;
  ofis_id: string;
  mod: "demo" | "supabase";
  tablolar: Partial<Record<TableName, unknown[]>>;
  hatalar?: Partial<Record<TableName, string>>;
}

export async function buildExport(store: DataStore, officeId: string, now = new Date()): Promise<ExportFile> {
  const tablolar: ExportFile["tablolar"] = {};
  const hatalar: ExportFile["hatalar"] = {};
  await Promise.all(
    EXPORT_TABLES.map(async (t) => {
      try {
        const rows = await store.list(t);
        // Yalnızca bu ofisin satırları (RLS'e ek güvence); ofis_id'si olmayan alt
        // tablolar (rıza, imza…) RLS ile zaten ofise bağlı kayıtlarla sınırlıdır.
        tablolar[t] = rows.filter((r) => {
          const row = r as { id?: string; office_id?: string };
          if (t === "office") return row.id === officeId;
          return row.office_id === undefined || row.office_id === officeId;
        });
      } catch (e) {
        hatalar[t] = e instanceof Error ? e.message : String(e);
      }
    }),
  );
  return {
    uygulama: "DC Emlak",
    surum: 1,
    olusturulma: now.toISOString(),
    ofis_id: officeId,
    mod: store.mode,
    tablolar,
    ...(Object.keys(hatalar).length ? { hatalar } : {}),
  };
}

export function exportFileName(now = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `dc-emlak-yedek-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}
