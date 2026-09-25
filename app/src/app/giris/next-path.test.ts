import { describe, expect, it } from "vitest";
import { isValidEmail, normalizeOtp, safeNext } from "./next-path";

describe("giriş yardımcıları", () => {
  it("next parametresini güvenli hale getirir", () => {
    expect(safeNext(null)).toBe("/");
    expect(safeNext("/portfoyler/abc?x=1")).toBe("/portfoyler/abc?x=1");
    expect(safeNext("%2Fmusteriler")).toBe("/musteriler");
    expect(safeNext("https://kotu.example")).toBe("/");
    expect(safeNext("//kotu.example")).toBe("/");
    expect(safeNext("/\\kotu.example")).toBe("/");
    expect(safeNext("/giris?next=/")).toBe("/");
    expect(safeNext("%E0%A4%A")).toBe("/");
  });

  it("e-posta ve kod doğrular", () => {
    expect(isValidEmail("ofis@dcemlak.com")).toBe(true);
    expect(isValidEmail("ofis@dcemlak")).toBe(false);
    expect(normalizeOtp("123 456")).toBe("123456");
    expect(normalizeOtp("12345")).toBeNull();
  });
});
