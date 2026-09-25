import { describe, expect, it } from "vitest";
import { normalizeTrPhone } from "./index";

describe("normalizeTrPhone", () => {
  it("Türk numaralarını 90 ile başlatır", () => {
    expect(normalizeTrPhone("0532 418 22 47")).toBe("905324182247");
    expect(normalizeTrPhone("532 418 22 47")).toBe("905324182247");
    expect(normalizeTrPhone("+90 532 418 22 47")).toBe("905324182247");
  });
  it("yabancı numaraları korur", () => {
    expect(normalizeTrPhone("+7 916 000 00 12")).toBe("79160000012");
    expect(normalizeTrPhone("0049 170 1234567")).toBe("491701234567");
  });
});
