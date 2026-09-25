import { describe, expect, it } from "vitest";
import { isValidTckn, isValidVkn, normalizeInviteCode, normalizeTrMobile, validateOffice, yetkiBelgesiDurumu } from "./validation";

describe("ofis formu doğrulaması", () => {
  it("VKN ve TCKN kontrol hanelerini doğrular", () => {
    expect(isValidVkn("1234567890")).toBe(true);
    expect(isValidVkn("1234567891")).toBe(false);
    expect(isValidTckn("10000000146")).toBe(true);
    expect(isValidTckn("10000000147")).toBe(false);
    expect(isValidTckn("01234567890")).toBe(false);
  });

  it("telefonu normalize eder", () => {
    expect(normalizeTrMobile("0532 000 00 01")).toBe("5320000001");
    expect(normalizeTrMobile("+90 532 000 00 01")).toBe("5320000001");
    expect(normalizeTrMobile("12345")).toBeNull();
  });

  it("zorunlu alanları ve biçimleri denetler", () => {
    const ok = validateOffice(
      { unvan: "DC Emlak", vergi_no: "1234567890", mersis_no: "0123456789000015", yetki_belgesi_no: "3401-1", yetki_belgesi_gecerlilik: "2029-01-01", ad_soyad: "Ali Veli", telefon: "0532 000 00 01", plan: "temel" },
      { requireOwner: true },
    );
    expect(ok).toEqual({});
    const bad = validateOffice({ unvan: "", vergi_no: "123", mersis_no: "12", yetki_belgesi_gecerlilik: "2029-01-01", ad_soyad: "Ali", telefon: "12" }, { requireOwner: true });
    expect(Object.keys(bad).sort()).toEqual(["ad_soyad", "mersis_no", "telefon", "unvan", "vergi_no", "yetki_belgesi_no"]);
    // Sahip alanları yalnızca kurulumda zorunlu
    expect(validateOffice({ unvan: "DC Emlak" })).toEqual({});
  });

  it("yetki belgesi durumunu hesaplar", () => {
    const bugun = new Date("2026-09-24T10:00:00");
    expect(yetkiBelgesiDurumu(null, bugun).ton).toBe("block");
    expect(yetkiBelgesiDurumu("2026-09-01", bugun).ton).toBe("block");
    expect(yetkiBelgesiDurumu("2026-10-10", bugun)).toEqual({ ton: "warn", metin: "16 gün içinde bitiyor" });
    expect(yetkiBelgesiDurumu("2029-01-01", bugun).ton).toBe("ok");
  });

  it("davet kodunu normalize eder", () => {
    expect(normalizeInviteCode(" ab3d-ef7h k9 ")).toBe("AB3DEF7HK9");
  });
});
