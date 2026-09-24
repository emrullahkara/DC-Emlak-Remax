import { describe, expect, it } from "vitest";
import { buildSeed, DEMO_OFFICE_ID, DEMO_USER_ID } from "./seed";
import { LocalStore } from "./store";

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe("LocalStore", () => {
  it("örnek veriyle açılır, filtreler ve sıralar", async () => {
    const s = new LocalStore("t", () => buildSeed(new Date("2026-09-24T09:00:00")), memoryStorage());
    const yayinda = await s.list("portfolio", { eq: { asama: "yayinda" }, order: { column: "fiyat", ascending: false } });
    expect(yayinda.length).toBeGreaterThan(2);
    expect(yayinda[0].fiyat! >= yayinda[1].fiyat!).toBe(true);
    expect(await s.get("office_member", `${DEMO_OFFICE_ID}|${DEMO_USER_ID}`)).not.toBeNull();
  });

  it("ekler, günceller, siler ve dinleyicileri uyarır", async () => {
    const storage = memoryStorage();
    const s = new LocalStore("t", () => ({}), storage);
    const events: string[] = [];
    s.subscribe((t) => events.push(t));
    const p = await s.insert("person", { office_id: "o", owner_id: "u", ad_soyad: "Test Kişi", tipler: ["alici"] });
    expect(p.id).toBeTruthy();
    await s.update("person", p.id, { telefon: "0532" });
    expect((await s.get("person", p.id))?.telefon).toBe("0532");
    // Kalıcılık: aynı depodan yeniden açılınca veri durur
    const s2 = new LocalStore("t", () => ({}), storage);
    expect(await s2.list("person")).toHaveLength(1);
    await s.remove("person", p.id);
    expect(await s.list("person")).toHaveLength(0);
    expect(events).toEqual(["person", "person", "person"]);
  });
});
