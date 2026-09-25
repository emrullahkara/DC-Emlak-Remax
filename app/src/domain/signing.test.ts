import { describe, expect, it } from "vitest";
import { authorizationFromValues, buildEvidence, generateToken, isValidToken, mailtoLink, maskPhone, sha256Hex, signingUrl, validSignerName, whatsappLink } from "./signing";

describe("imza belirteci", () => {
  it("en az 32 karakter, URL güvenli ve benzersiz üretir", () => {
    const set = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const t = generateToken();
      expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(isValidToken(t)).toBe(true);
      set.add(t);
    }
    expect(set.size).toBe(200);
    expect(generateToken(48)).toHaveLength(64);
    expect(() => generateToken(8)).toThrow();
    expect(isValidToken("kisa")).toBe(false);
    expect(isValidToken("a/b".repeat(20))).toBe(false);
  });
});

describe("SHA-256", () => {
  it("bilinen özet değerini üretir", async () => {
    expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(await sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });
  it("Unicode normalizasyonundan etkilenmez", async () => {
    expect(await sha256Hex("Ş")).toBe(await sha256Hex("Ş"));
  });
});

describe("bağlantılar", () => {
  it("imza, WhatsApp ve e-posta bağlantısı kurar", () => {
    expect(signingUrl("https://app.example.com/", "tok_1")).toBe("https://app.example.com/imza/tok_1");
    expect(whatsappLink("0532 418 22 47", "a b")).toBe("https://wa.me/905324182247?text=a%20b");
    expect(mailtoLink("z@x.com", "Konu", "Gövde")).toBe("mailto:z%40x.com?subject=Konu&body=G%C3%B6vde");
  });
  it("telefonu maskeler", () => {
    expect(maskPhone("0532 418 22 47")).toBe("0532 *** ** 47");
    expect(maskPhone(null)).toBe("");
  });
});

describe("kanıt ve yetki", () => {
  it("kanıt ve belge doğrulama alanlarını üretir", () => {
    const { kanit, alanlar } = buildEvidence({
      adSoyad: " Zeynep Aydın ",
      userAgent: "UA",
      zaman: new Date("2026-09-24T07:30:00Z"),
      sha256: "abc",
      konum: { lat: 40.98471234, lng: 29.0275, dogruluk: 12.4 },
      kvkkOnay: true,
      okudumOnay: true,
    });
    expect(kanit.ad_soyad).toBe("Zeynep Aydın");
    expect(kanit.zaman).toBe("2026-09-24T07:30:00.000Z");
    expect(alanlar.belge_ozet_degeri).toBe("abc");
    expect(alanlar.konum_enlem).toBe("40.984712");
    expect(alanlar.konum_dogruluk_m).toBe("12");
    expect(alanlar.zaman_damgasi).toContain("10:30");
  });

  it("ad soyadı doğrular", () => {
    expect(validSignerName("Zeynep Aydın")).toBe(true);
    expect(validSignerName("Zeynep")).toBe(false);
    expect(validSignerName("1 2")).toBe(false);
  });

  it("yetki sözleşmesi alanlarını çözer", () => {
    expect(authorizationFromValues({ baslangic_tarihi: "01.10.2026", bitis_tarihi: "01.04.2027", yetki_turu: "Münhasır (tek yetkili)", hizmet_bedeli_orani: "2" }, "2026-09-24")).toEqual({
      baslangic: "2026-10-01",
      bitis: "2027-04-01",
      munhasir: true,
      hizmet_bedeli_orani: 2,
      imza_tarihi: "2026-09-24",
    });
    const r = authorizationFromValues({ yetki_turu: "Münhasır olmayan (genel)" }, "2026-09-24");
    expect(r).toMatchObject({ baslangic: "2026-09-24", bitis: "2026-12-24", munhasir: false, hizmet_bedeli_orani: null });
  });
});
