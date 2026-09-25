import { describe, expect, it } from "vitest";
import { parseAmount } from "./target";

describe("hedef tutarı ayrıştırma", () => {
  it("Türkçe biçimleri okur", () => {
    expect(parseAmount("600.000")).toBe(600_000);
    expect(parseAmount("600000 ₺")).toBe(600_000);
    expect(parseAmount("1,5 M")).toBe(1_500_000);
    expect(parseAmount("2 milyon")).toBe(2_000_000);
    expect(parseAmount("12.500,50 TL")).toBe(12_500.5);
  });
  it("geçersiz girdide null döner", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("-5")).toBeNull();
  });
});
