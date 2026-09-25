import { describe, expect, it } from "vitest";
import {
  autoValues,
  editableFields,
  evaluateTemplateSign,
  extractPlaceholders,
  fieldGroup,
  fieldLabel,
  getTemplate,
  listTemplates,
  parseDateTr,
  parseFrontMatter,
  parseTemplate,
  parseTrNumber,
  pickFor,
  requiredMissing,
  templateBlocks,
} from "./templates";
import { escapeHtml, parseInline, parseMarkdown, renderHtml, renderPlainText, visibleRows } from "./templates-markdown";

const bugun = new Date("2026-09-24T10:00:00");

describe("ön bilgi ayrıştırıcı", () => {
  it("skaler ve liste alanlarını okur, gövdeyi ayırır", () => {
    const src = `---
baslik: "Yer \\"Gösterme\\" Belgesi"
kod: yer-gosterme-belgesi   # yorum
surum: '2026.09-taslak'
zorunlu_alanlar:
  - isletme_unvani
  - "belge_no"
opsiyonel_alanlar: []
dayanak:
  - "6098 sayılı TBK md. 520 — teyit: edilmeli"
---

# Başlık
Metin {{isletme_unvani}}`;
    const { data, body } = parseFrontMatter(src);
    expect(data.baslik).toBe('Yer "Gösterme" Belgesi');
    expect(data.kod).toBe("yer-gosterme-belgesi");
    expect(data.surum).toBe("2026.09-taslak");
    expect(data.zorunlu_alanlar).toEqual(["isletme_unvani", "belge_no"]);
    expect(data.opsiyonel_alanlar).toEqual([]);
    expect(data.dayanak).toEqual(["6098 sayılı TBK md. 520 — teyit: edilmeli"]);
    expect(body.trim().startsWith("# Başlık")).toBe(true);
  });

  it("ön bilgi yoksa tüm metni gövde sayar", () => {
    expect(parseFrontMatter("# Merhaba").data).toEqual({});
    expect(parseFrontMatter("# Merhaba").body).toBe("# Merhaba");
  });
});

describe("şablon kütüphanesi", () => {
  const all = listTemplates();

  it("11 şablonun tamamını yükler ve taslak olarak işaretler", () => {
    expect(all).toHaveLength(11);
    expect(all[0]!.kod).toBe("yetki-sozlesmesi");
    for (const t of all) {
      expect(t.taslak).toBe(true);
      expect(t.surum).toBe("2026.09-taslak");
      expect(t.zorunlu.length).toBeGreaterThan(0);
    }
  });

  it("gövdedeki her yer tutucu zorunlu veya opsiyonel listededir", () => {
    for (const t of all) {
      const tanimli = new Set([...t.zorunlu, ...t.opsiyonel]);
      const eksik = t.alanlar.filter((a) => !tanimli.has(a));
      expect(eksik, t.kod).toEqual([]);
    }
  });

  it("yer tutucuları sırayla ve tekil çıkarır", () => {
    expect(extractPlaceholders("{{a}} {{ b_2 }} {{a}} {c} {{Z}}")).toEqual(["a", "b_2"]);
  });

  it("zorunlu alanları önce listeler, imza kanıt alanlarını formdan çıkarır", () => {
    const t = getTemplate("yer-gosterme-belgesi")!;
    const f = editableFields(t);
    expect(f.zorunlu).toContain("gosterilen_ad_soyad");
    expect(f.zorunlu).not.toContain("zaman_damgasi");
    expect(f.opsiyonel).not.toContain("belge_ozet_degeri");
    expect(f.opsiyonel).toContain("notlar");
  });
});

describe("etiket ve gruplar", () => {
  it("snake_case alan adını Türkçe etikete çevirir", () => {
    expect(fieldLabel("malik_ad_soyad")).toBe("Malik ad soyad");
    expect(fieldLabel("gosterilen_tckn")).toBe("Gösterilen T.C. kimlik no");
    expect(fieldLabel("tasinmaz_2_fiyat")).toBe("Taşınmaz 2. fiyat");
  });
  it("alanları gruplar", () => {
    expect(fieldGroup("isletme_unvani")).toBe("İşletme ve danışman");
    expect(fieldGroup("malik_tckn")).toBe("Malik / satıcı / kiraya veren");
    expect(fieldGroup("gosterilen_telefon")).toBe("Karşı taraf");
    expect(fieldGroup("ada")).toBe("Taşınmaz");
    expect(fieldGroup("satis_bedeli")).toBe("Bedel ve ödeme");
    expect(fieldGroup("bitis_tarihi")).toBe("Tarih ve süre");
  });
});

describe("markdown", () => {
  it("satır içi kalın, italik, kutucuk ve alanları ayrıştırır", () => {
    expect(parseInline("**%{{oran}} + KDV**'si")).toEqual([
      { t: "strong", c: [{ t: "text", v: "%" }, { t: "field", name: "oran" }, { t: "text", v: " + KDV" }] },
      { t: "text", v: "'si" },
    ]);
    expect(parseInline("*not* [ ] a")).toEqual([{ t: "em", c: [{ t: "text", v: "not" }] }, { t: "text", v: " " }, { t: "check", checked: false }, { t: "text", v: " a" }]);
  });

  it("blokları ayrıştırır", () => {
    const b = parseMarkdown("# Başlık\n\n> **Not**\n\n| A | B |\n|---|---|\n| 1 | {{x}} |\n\n- bir\n- iki\n\n1. ilk\n\n---\nSatır 1\nSatır 2");
    expect(b.map((x) => x.t)).toEqual(["heading", "quote", "table", "ul", "ol", "hr", "p"]);
    const p = b[6]!;
    expect(p.t === "p" && p.c.some((x) => x.t === "br")).toBe(true);
  });

  it("değerleri kaçışlar; eksik zorunlu alanı işaretler; boş opsiyonel alana tire basar", () => {
    const blocks = parseMarkdown("Ad: {{ad}} — Not: {{not}} — TC: {{tc}}");
    const html = renderHtml(blocks, { values: { ad: '<script>alert("x")</script>' }, required: ["ad", "tc"], label: (n) => n.toUpperCase() });
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain('<mark class="alan-eksik">[TC]</mark>');
    expect(html).toContain("Not: —");
    expect(escapeHtml(`a&b'`)).toBe("a&amp;b&#39;");
  });

  it("tamamen boş opsiyonel tablo satırlarını gizler", () => {
    const b = parseMarkdown("| # | Ad |\n|---|---|\n| 1 | {{t1}} |\n| 2 | {{t2}} |\n| 3 | sabit |");
    const tbl = b[0]!;
    if (tbl.t !== "table") throw new Error();
    expect(visibleRows(tbl.rows, { values: { t1: "A" }, required: [] })).toHaveLength(2);
    expect(visibleRows(tbl.rows, { values: {}, required: ["t2"] })).toHaveLength(2);
  });

  it("düz metin kararlıdır", () => {
    const t = getTemplate("yer-gosterme-belgesi")!;
    const r = { values: { gosterilen_ad_soyad: "Zeynep Aydın" }, required: t.zorunlu };
    const a = renderPlainText(templateBlocks(t), r);
    expect(a).toBe(renderPlainText(templateBlocks(t), r));
    expect(a).toContain("Zeynep Aydın");
    expect(a).toContain("YER GÖSTERME BELGESİ");
  });
});

describe("otomatik doldurma ve imza kapısı", () => {
  const ctx = {
    now: bugun,
    when: new Date("2026-09-25T14:30:00"),
    belgeNo: "YGB-TEST",
    office: { unvan: "DC Emlak Kadıköy", yetki_belgesi_no: "3401-2231", mersis_no: "0123", vergi_no: "1234567890" },
    member: { ad_soyad: "Emrullah Kara", telefon: "0532 000 00 01", yetki_belgesi_no: "3401-2231-01" },
    portfolio: { id: "10000000-0000-4000-8000-000000000001", ilan_tipi: "satilik" as const, emlak_tipi: "daire", il: "İstanbul", ilce: "Kadıköy", mahalle: "Moda", ada: "1234", parsel: "5", bagimsiz_bolum: "9", fiyat: 12_500_000, para_birimi: "TRY", tapu_turu: "kat_mulkiyeti" },
    person: { ad_soyad: "Zeynep Aydın", telefon: "0532 418 22 47", eposta: "z@example.com", tipler: ["alici" as const] },
    owner: { ad_soyad: "Hülya Ertem", telefon: "0532 555 12 18", tipler: ["satici" as const] },
  };

  it("şablonlarda gerçekten kullanılan alanları doldurur", () => {
    const v = autoValues(ctx);
    expect(v.isletme_unvani).toBe("DC Emlak Kadıköy");
    expect(v.yetki_belgesi_no).toBe("3401-2231");
    expect(v.isletme_mersis_no).toBe("0123");
    expect(v.danisman_ad_soyad).toBe("Emrullah Kara");
    expect(v.gosterilen_ad_soyad).toBe("Zeynep Aydın");
    expect(v.malik_ad_soyad).toBe("Hülya Ertem");
    expect(v.gosterim_tarihi).toBe("25.09.2026");
    expect(v.gosterim_saati).toBe("14:30");
    expect(v.sozlesme_tarihi).toBe("24.09.2026");
    expect(v.tasinmaz_1_fiyat).toBe("12.500.000 TL");
    expect(v.talep_edilen_fiyat).toBe("12.500.000");
    expect(v.tasinmaz_1_ada_parsel).toBe("1234 / 5 / 9");
    expect(v.tapu_turu).toBe("Kat mülkiyeti");
    expect(v.hizmet_bedeli_orani).toBe("2");
    expect(v.belge_no).toBe("YGB-TEST");

    const known = new Set(listTemplates().flatMap((t) => t.alanlar));
    const unused = Object.keys(v).filter((k) => !known.has(k));
    expect(unused).toEqual([]);

    const t = getTemplate("yer-gosterme-belgesi")!;
    const picked = pickFor(t, v);
    expect(picked.malik_ad_soyad).toBeUndefined();
    expect(requiredMissing(t, picked).sort()).toEqual(["gosterilen_tckn", "isletme_adres", "koruma_suresi_ay"].sort());
  });

  it("satıcı tipli kişiyi malik olarak kullanır", () => {
    const v = autoValues({ now: bugun, person: { ad_soyad: "Gülay Sezer", tipler: ["satici"] } });
    expect(v.malik_ad_soyad).toBe("Gülay Sezer");
    expect(v.alici_ad_soyad).toBeUndefined();
  });

  it("eksik zorunlu alanda ENGELLE, tamamında taslak UYARI verir", () => {
    const t = getTemplate("kvkk-aydinlatma-metni")!;
    const bos = evaluateTemplateSign(t, {}, bugun);
    expect(bos.karar).toBe("ENGELLE");
    expect(bos.sonuclar[0]!.kural).toBe("ZORUNLU_ALAN");
    const dolu = Object.fromEntries(t.zorunlu.map((f) => [f, "x"]));
    const ev = evaluateTemplateSign(t, dolu, bugun);
    expect(ev.karar).toBe("UYAR");
    expect(ev.sonuclar.map((s) => s.kural)).toEqual(["SABLON_TASLAK"]);
    expect(ev.paramSurum).toBe("2026.09");
  });

  it("onaylı şablonda uyarı yoktur; tavanı aşan oran engellenir", () => {
    const t = parseTemplate("x.md", `---\nkod: x\ndurum: "Onaylı — Av. X"\nzorunlu_alanlar:\n  - hizmet_bedeli_orani\n---\n{{hizmet_bedeli_orani}}`);
    expect(evaluateTemplateSign(t, { hizmet_bedeli_orani: "2" }).karar).toBe("GEC");
    expect(evaluateTemplateSign(t, { hizmet_bedeli_orani: "%3" }).karar).toBe("ENGELLE");
  });

  it("tahliye taahhüdü tarih kontrollerini uygular", () => {
    const t = getTemplate("tahliye-taahhutnamesi")!;
    const base = Object.fromEntries(t.zorunlu.map((f) => [f, "x"]));
    const kotu = evaluateTemplateSign(t, { ...base, kira_sozlesmesi_tarihi: "01.09.2026", teslim_tarihi: "01.09.2026", taahhut_tarihi: "01.09.2026", tahliye_tarihi: "01.09.2027" });
    expect(kotu.sonuclar.map((s) => s.kural)).toEqual(expect.arrayContaining(["TAHLIYE_TESLIM_SONRASI", "TAHLIYE_SOZLESME_AYNI_GUN"]));
    const iyi = evaluateTemplateSign(t, { ...base, kira_sozlesmesi_tarihi: "01.09.2026", teslim_tarihi: "01.09.2026", taahhut_tarihi: "10.09.2026", tahliye_tarihi: "01.09.2027" });
    expect(iyi.karar).toBe("UYAR");
  });
});

describe("tarih ve sayı", () => {
  it("Türkçe tarihleri çözer", () => {
    expect(parseDateTr("24.09.2026")).toBe("2026-09-24");
    expect(parseDateTr("2026-09-24")).toBe("2026-09-24");
    expect(parseDateTr("31.02.2026")).toBeNull();
    expect(parseDateTr("yarın")).toBeNull();
  });
  it("Türkçe sayıları çözer", () => {
    expect(parseTrNumber("12.500.000")).toBe(12_500_000);
    expect(parseTrNumber("%2")).toBe(2);
    expect(parseTrNumber("2,5")).toBe(2.5);
    expect(parseTrNumber("")).toBeNull();
  });
});
