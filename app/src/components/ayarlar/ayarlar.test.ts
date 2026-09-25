import { describe, expect, it } from "vitest";
import { buildSeed, DEMO_OFFICE_ID } from "../../data/seed";
import { LocalStore } from "../../data/store";
import { buildExport, EXPORT_TABLES, exportFileName } from "./export";
import { maskKey } from "./integrations";

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe("Ayarlar yardımcıları", () => {
  it("anahtarı maskeler", () => {
    expect(maskKey("sk-live-1234567890abcd")).toBe("••••abcd");
    expect(maskKey("kisa")).toBe("••••");
  });

  it("tüm tabloları dışa aktarır", async () => {
    const store = new LocalStore("t", () => buildSeed(new Date("2026-09-24T09:00:00")), memoryStorage());
    const f = await buildExport(store, DEMO_OFFICE_ID, new Date("2026-09-24T09:00:00Z"));
    expect(Object.keys(f.tablolar).sort()).toEqual([...EXPORT_TABLES].sort());
    expect(f.tablolar.office).toHaveLength(1);
    expect(f.tablolar.portfolio!.length).toBeGreaterThan(5);
    expect(f.hatalar).toBeUndefined();
    expect(exportFileName(new Date("2026-09-24T09:00:00"))).toBe("dc-emlak-yedek-2026-09-24.json");
  });
});
