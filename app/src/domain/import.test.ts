import { describe, expect, it } from "vitest";
import {
  detectDelimiter,
  guessMapping,
  KISI_FIELDS,
  missingRequired,
  normalizePhone,
  parseBool,
  parseCsv,
  parseEmlakTipi,
  parseIlanTipi,
  parseNumberTR,
  parseOda,
  parsePersonTypes,
  phoneKey,
  PORTFOY_FIELDS,
  splitHeader,
  templateCsv,
  toCsv,
  validateAll,
  validatePersonRow,
  validatePortfolioRow,
} from "./import";

describe("CSV ayrıştırma", () => {
  it("ayraç tespiti: ; , ve sekme", () => {
    expect(detectDelimiter("a;b;c\n1;2;3")).toBe(";");
    expect(detectDelimiter("a,b,c\n1,2,3")).toBe(",");
    expect(detectDelimiter("a\tb\tc")).toBe("\t");
    // Tırnak içindeki virgül sayılmaz
    expect(detectDelimiter('"Kadıköy, Moda";fiyat\n')).toBe(";");
  });

  it("BOM, CRLF, tırnak, kaçış ve alan içi satır sonu", () => {
    const csv = '﻿Başlık;Fiyat;Açıklama\r\n"Moda; 3+1";"12.500.000 TL";"Satır 1\nSatır 2 ""alıntı"""\r\nŞişli 2+1;8.750.000;\r\n\r\n';
    const rows = parseCsv(csv);
    expect(rows).toEqual([
      ["Başlık", "Fiyat", "Açıklama"],
      ["Moda; 3+1", "12.500.000 TL", 'Satır 1\nSatır 2 "alıntı"'],
      ["Şişli 2+1", "8.750.000", ""],
    ]);
  });

  it("virgül ayraçlı ve son satırda satır sonu olmayan dosya", () => {
    expect(parseCsv('ad,telefon\n"Aydın, Zeynep",0532 111 22 33')).toEqual([
      ["ad", "telefon"],
      ["Aydın, Zeynep", "0532 111 22 33"],
    ]);
  });

  it("toCsv → parseCsv gidiş-dönüş", () => {
    const data = [
      ["a;b", 'x"y', "çğıöşü"],
      ["1", "", "satır\nsonu"],
    ];
    expect(parseCsv(toCsv(data))).toEqual(data);
  });

  it("şablon başlıkları otomatik eşlenir", () => {
    for (const kind of ["portfoy", "kisi"] as const) {
      const fields = kind === "portfoy" ? PORTFOY_FIELDS : KISI_FIELDS;
      const { headers } = splitHeader(parseCsv(templateCsv(kind)));
      const m = guessMapping(headers, fields);
      for (const f of fields.filter((x) => x.ornek)) expect(m[f.key], f.key).toBe(headers.indexOf(f.label));
    }
  });
});

describe("sayı ayrıştırma", () => {
  it.each([
    ["12.500.000 TL", 12_500_000],
    ["12.500.000", 12_500_000],
    ["₺42.000", 42_000],
    ["12,5", 12.5],
    ["12.5", 12.5],
    ["1.250,75", 1250.75],
    ["1,250.75", 1250.75],
    ["12,5 M", 12_500_000],
    ["12,5 milyon TL", 12_500_000],
    ["850 bin", 850_000],
    ["140 m²", 140],
    ["1 250 000", 1_250_000],
    ["-3", -3],
  ])("%s → %d", (s, n) => {
    expect(parseNumberTR(s)).toBe(n);
  });

  it("sayı olmayanları reddeder", () => {
    expect(parseNumberTR("")).toBeNull();
    expect(parseNumberTR("yok")).toBeNull();
    expect(parseNumberTR("12a")).toBeNull();
    expect(parseNumberTR(null)).toBeNull();
    expect(parseNumberTR(3.5)).toBe(3.5);
  });

  it("oda: 3+1, stüdyo, 3,5+1", () => {
    expect(parseOda("3+1")).toEqual({ oda: 3, salon: 1 });
    expect(parseOda("3,5 + 1")).toEqual({ oda: 3.5, salon: 1 });
    expect(parseOda("Stüdyo")).toEqual({ oda: 1, salon: 0 });
    expect(parseOda(4)).toEqual({ oda: 4 });
    expect(parseOda("çok")).toBeNull();
  });

  it("evet/hayır", () => {
    expect(parseBool("Evet")).toBe(true);
    expect(parseBool("VAR")).toBe(true);
    expect(parseBool("Hayır")).toBe(false);
    expect(parseBool("yok")).toBe(false);
    expect(parseBool("belki")).toBeNull();
  });
});

describe("telefon normalizasyonu", () => {
  it.each([
    ["0532 418 22 47", "0532 418 22 47"],
    ["+90 (532) 418-22-47", "0532 418 22 47"],
    ["905324182247", "0532 418 22 47"],
    ["5324182247", "0532 418 22 47"],
    ["0090 532 418 2247", "0532 418 22 47"],
    ["0216 555 12 12", "0216 555 12 12"],
    ["+7 916 000 00 12", "+79160000012"],
  ])("%s → %s", (i, o) => {
    expect(normalizePhone(i)).toEqual({ ok: true, value: o });
  });

  it("Excel'den sayı olarak gelen numara", () => {
    expect(normalizePhone(5324182247)).toEqual({ ok: true, value: "0532 418 22 47" });
  });

  it("hatalı numaralar", () => {
    expect(normalizePhone("0532 418")?.ok).toBe(false);
    expect(normalizePhone("1234567890")?.ok).toBe(false);
    expect(normalizePhone("")).toBeNull();
  });

  it("karşılaştırma anahtarı biçimden bağımsız", () => {
    expect(phoneKey("+90 532 418 22 47")).toBe(phoneKey("05324182247"));
  });
});

describe("başlık tahmini", () => {
  it("Türkçe başlıklar", () => {
    const h = ["İlan Başlığı", "Satılık/Kiralık", "Fiyatı", "Oda Sayısı", "Brüt m²", "Net m²", "İlçe", "Mahalle", "Bulunduğu Kat", "Kat Sayısı", "Açıklama"];
    const m = guessMapping(h, PORTFOY_FIELDS);
    expect(m.baslik).toBe(0);
    expect(m.ilan_tipi).toBe(1);
    expect(m.fiyat).toBe(2);
    expect(m.oda).toBe(3);
    expect(m.brut_m2).toBe(4);
    expect(m.net_m2).toBe(5);
    expect(m.ilce).toBe(6);
    expect(m.mahalle).toBe(7);
    expect(m.kat).toBe(8);
    expect(m.toplam_kat).toBe(9);
    expect(m.aciklama).toBe(10);
    expect(m.ada).toBe(-1);
  });

  it("İngilizce başlıklar ve ayrı ad/soyad", () => {
    const m = guessMapping(["First Name", "Surname", "Mobile", "E-mail", "Type", "Source"], KISI_FIELDS);
    expect(m).toMatchObject({ ad_soyad: 0, soyad: 1, telefon: 2, eposta: 3, tipler: 4, kaynak: 5 });
  });

  it("bir sütun tek alana atanır; eksik zorunlular raporlanır", () => {
    const m = guessMapping(["Fiyat", "Fiyat"], PORTFOY_FIELDS);
    expect(m.fiyat).toBe(0);
    expect(Object.values(m).filter((x) => x === 1)).toHaveLength(0);
    expect(missingRequired(m, PORTFOY_FIELDS).map((f) => f.key)).toEqual(["baslik", "ilan_tipi"]);
  });

  it("boş satırlardan sonraki ilk dolu satır başlıktır", () => {
    const r = splitHeader([[null, ""], ["Ad", "Tel"], ["A", "1"], ["", null]]);
    expect(r.headers).toEqual(["Ad", "Tel"]);
    expect(r.rows).toEqual([["A", "1"]]);
  });
});

describe("etiket ayrıştırma", () => {
  it("ilan tipi", () => {
    expect(parseIlanTipi("SATILIK")).toBe("satilik");
    expect(parseIlanTipi("Kiralık")).toBe("kiralik");
    expect(parseIlanTipi("for rent")).toBe("kiralik");
    expect(parseIlanTipi("Devren Kiralık")).toBe("devren");
    expect(parseIlanTipi("?")).toBeNull();
  });
  it("emlak tipi", () => {
    expect(parseEmlakTipi("Daire")).toBe("daire");
    expect(parseEmlakTipi("Müstakil Ev")).toBe("mustakil");
    expect(parseEmlakTipi("Dükkan")).toBe("dukkan");
    expect(parseEmlakTipi("apartment")).toBe("daire");
    expect(parseEmlakTipi("uzay üssü")).toBeNull();
  });
  it("kişi tipleri", () => {
    expect(parsePersonTypes("Alıcı, Yatırımcı")).toEqual(["alici", "yatirimci"]);
    expect(parsePersonTypes("mal sahibi")).toEqual(["satici"]);
    expect(parsePersonTypes("")).toEqual([]);
  });
});

describe("satır doğrulama", () => {
  const h = ["Başlık", "İlan tipi", "Emlak tipi", "Fiyat", "Oda", "Brüt m²", "Net m²", "İlçe", "İskân"];
  const m = guessMapping(h, PORTFOY_FIELDS);

  it("geçerli portföy satırı", () => {
    const r = validatePortfolioRow(["Moda 3+1", "Satılık", "Daire", "12.500.000 TL", "3+1", "140", "122", "Kadıköy", "Evet"], m, 2);
    expect(r.errors).toEqual([]);
    expect(r.value).toMatchObject({ baslik: "Moda 3+1", ilan_tipi: "satilik", emlak_tipi: "daire", fiyat: 12_500_000, oda: 3, salon: 1, brut_m2: 140, net_m2: 122, ilce: "Kadıköy", iskan_var: true });
  });

  it("hatalı portföy satırı", () => {
    const r = validatePortfolioRow(["", "Takas", "Uzay", "pahalı", "çok", "", "", "", "belki"], m, 3);
    expect(r.errors).toEqual(expect.arrayContaining(["Başlık boş", "İlan tipi anlaşılamadı: “Takas”", "Fiyat: “pahalı” sayı değil", "Oda: “çok” anlaşılamadı (ör. 3+1)"]));
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.value.emlak_tipi).toBe("daire");
  });

  it("kişi: telefon/e-posta zorunluluğu ve normalizasyon", () => {
    const km = guessMapping(["Ad Soyad", "Telefon", "E-posta", "Tip"], KISI_FIELDS);
    const ok = validatePersonRow(["  Zeynep   Aydın ", "+90 532 418 22 47", "ZEYNEP@Example.com", "Satıcı"], km, 2);
    expect(ok.errors).toEqual([]);
    expect(ok.value).toMatchObject({ ad_soyad: "Zeynep Aydın", telefon: "0532 418 22 47", eposta: "zeynep@example.com", tipler: ["satici"] });
    const bad = validatePersonRow(["Ali", "", "ali@", ""], km, 3);
    expect(bad.errors).toContain("E-posta geçersiz: “ali@”");
    const none = validatePersonRow(["Ali", "", "", ""], km, 4);
    expect(none.errors).toContain("Telefon veya e-posta gerekli");
  });

  it("kişi: mevcut ve dosya içi yinelenen telefonlar", () => {
    const km = guessMapping(["Ad", "Telefon"], KISI_FIELDS);
    const res = validateAll(
      "kisi",
      [
        ["Ali", "0532 111 22 33"],
        ["Can", "5321112233"],
        ["Ece", "0533 000 00 00"],
      ],
      km,
      { existingPhones: new Set([phoneKey("0533 000 00 00")]) },
    );
    expect(res.map((r) => r.satir)).toEqual([2, 3, 4]);
    expect(res[0]!.errors).toEqual([]);
    expect(res[1]!.errors).toEqual(["Aynı telefon 2. satırda da var"]);
    expect(res[2]!.errors).toEqual(["Bu telefonla kayıtlı kişi zaten var"]);
  });
});
