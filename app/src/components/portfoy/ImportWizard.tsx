"use client";

import { useMemo, useRef, useState } from "react";
import { Badge, Button, ButtonLink, Card, Checkbox, cx, ErrorNote, PageHeader, Select, Table, toast } from "@/components/ui";
import { useReadySession, useTable } from "@/data/session";
import type { Person, Portfolio } from "@/data/types";
import {
  cellText,
  fieldsFor,
  guessMapping,
  missingRequired,
  parseCsv,
  phoneKey,
  splitHeader,
  templateCsv,
  validateAll,
  type Cell,
  type ImportKind,
  type Mapping,
  type RowResult,
} from "@/domain/import";
import { healthInput } from "@/domain/portfoy";
import { portfolioHealth } from "@/domain/scoring";

type Step = 1 | 2 | 3 | 4 | 5;
const STEPS: [Step, string][] = [
  [1, "Tür"],
  [2, "Dosya"],
  [3, "Sütunlar"],
  [4, "Önizleme"],
  [5, "Sonuç"],
];
const MAX_ROWS = 2000;
const KIND_LABEL: Record<ImportKind, string> = { portfoy: "Portföy", kisi: "Kişi" };

interface Sheet {
  name: string;
  table: Cell[][];
}

/** UTF-8 değilse Windows-1254 (Türkçe Excel CSV) olarak çöz */
async function readText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("windows-1254").decode(buf);
  }
}

async function readFile(file: File): Promise<Sheet[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) {
    const mod = await import("read-excel-file/browser");
    const sheets = await mod.default(file);
    return sheets.map((s) => ({ name: s.sheet, table: s.data as unknown as Cell[][] }));
  }
  if (name.endsWith(".xls")) throw new Error("Eski .xls biçimi desteklenmiyor. Excel'de “Farklı kaydet → .xlsx” ya da CSV seçin.");
  if (name.endsWith(".csv") || name.endsWith(".txt") || file.type.includes("csv") || file.type.startsWith("text/")) {
    return [{ name: file.name, table: parseCsv(await readText(file)) }];
  }
  throw new Error("Desteklenen biçimler: .xlsx ve .csv");
}

function download(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ImportWizard() {
  const { store, officeId, userId } = useReadySession();
  const persons = useTable("person", { eq: { office_id: officeId } });
  const [step, setStep] = useState<Step>(1);
  const [kind, setKind] = useState<ImportKind>("portfoy");
  const [fileName, setFileName] = useState("");
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [mapping, setMapping] = useState<Mapping>({});
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ ok: number; fail: { satir: number; mesaj: string }[]; skipped: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const fields = fieldsFor(kind);
  const parsed = useMemo(() => splitHeader(sheets[sheetIdx]?.table ?? []), [sheets, sheetIdx]);
  const existingPhones = useMemo(() => new Set(persons.data.map((p) => phoneKey(p.telefon)).filter(Boolean)), [persons.data]);
  const rows = useMemo(() => parsed.rows.slice(0, MAX_ROWS), [parsed.rows]);
  const results = useMemo(
    () => (step >= 4 ? (validateAll(kind, rows, mapping, { existingPhones }) as RowResult<Portfolio | Person>[]) : []),
    [step, kind, rows, mapping, existingPhones],
  );
  const valid = results.filter((r) => !r.errors.length);
  const missing = missingRequired(mapping, fields);

  const reset = () => {
    setSheets([]);
    setFileName("");
    setMapping({});
    setResult(null);
    setError(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setReading(true);
    try {
      const list = (await readFile(file)).filter((s) => s.table.some((r) => r.some((c) => cellText(c) !== "")));
      if (!list.length) throw new Error("Dosyada veri bulunamadı");
      setSheets(list);
      setSheetIdx(0);
      setFileName(file.name);
      const { headers } = splitHeader(list[0]!.table);
      setMapping(guessMapping(headers, fields));
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dosya okunamadı");
    } finally {
      setReading(false);
    }
  }

  function chooseSheet(i: number) {
    setSheetIdx(i);
    setMapping(guessMapping(splitHeader(sheets[i]!.table).headers, fields));
  }

  async function runImport() {
    setProgress({ done: 0, total: valid.length });
    const fail: { satir: number; mesaj: string }[] = [];
    let ok = 0;
    const bugun = new Date();
    for (const [i, r] of valid.entries()) {
      try {
        if (kind === "portfoy") {
          const v = r.value as Partial<Portfolio>;
          const now = bugun.toISOString();
          const base: Partial<Portfolio> = {
            ...v,
            office_id: officeId,
            owner_id: userId,
            asama: "aday",
            para_birimi: "TRY",
            takyidat: {},
            imar: {},
            ozellikler: [],
            paylasim_seviyesi: "ofis",
            eids_durum: "yok",
          };
          base.saglik_skoru = portfolioHealth(healthInput({ aciklama: v.aciklama ?? null, updated_at: now, created_at: now, asama: "aday" }, { media: [], offers: [] }, bugun)).puan;
          const p = await store.insert("portfolio", base);
          if (v.fiyat) await store.insert("portfolio_price_history", { portfolio_id: p.id, fiyat: v.fiyat });
        } else {
          const v = r.value as Partial<Person>;
          await store.insert("person", { ...v, office_id: officeId, owner_id: userId });
        }
        ok++;
      } catch (e) {
        fail.push({ satir: r.satir, mesaj: e instanceof Error ? e.message : "Kaydedilemedi" });
      }
      setProgress({ done: i + 1, total: valid.length });
    }
    setProgress(null);
    setResult({ ok, fail, skipped: results.length - valid.length });
    setStep(5);
    toast(`${ok} kayıt içe aktarıldı`);
  }

  const shown = onlyErrors ? results.filter((r) => r.errors.length) : results;
  const previewCols = kind === "portfoy" ? ["baslik", "ilan_tipi", "fiyat", "ilce", "oda"] : ["ad_soyad", "telefon", "eposta", "tipler"];

  return (
    <div>
      <PageHeader title="İçe aktar" subtitle="Excel (.xlsx) veya CSV dosyasından portföy ve kişi aktarımı" />

      <ol className="mb-4 flex gap-1 overflow-x-auto text-xs" aria-label="Adımlar">
        {STEPS.map(([n, l]) => (
          <li
            key={n}
            aria-current={step === n ? "step" : undefined}
            className={cx("flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1", step === n ? "border-brand bg-brand text-white" : step > n ? "border-ok/40 text-ok" : "border-border text-muted")}
          >
            <span className="font-semibold">{step > n ? "✓" : n}</span> {l}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <Card title="1. Ne içe aktarılacak?">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(["portfoy", "kisi"] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => {
                  setKind(k);
                  reset();
                }}
                className={cx("rounded-xl border p-4 text-left", kind === k ? "border-brand bg-brand/5 ring-2 ring-brand" : "border-border hover:bg-bg")}
              >
                <p className="font-semibold">{k === "portfoy" ? "⌂ Portföyler" : "☺ Kişiler (müşteri / malik)"}</p>
                <p className="mt-1 text-sm text-muted">
                  {k === "portfoy" ? "Başlık, ilan tipi, fiyat, konum, oda, m², tapu bilgileri… Yeni portföyler “Aday” aşamasında açılır." : "Ad soyad, telefon, e-posta, tip, kaynak. Telefonlar standart biçime çevrilir, mevcut kayıtlarla çakışanlar atlanır."}
                </p>
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <Button onClick={() => download(`dc-emlak-${kind === "portfoy" ? "portfoy" : "kisi"}-sablonu.csv`, templateCsv(kind))}>⇩ {KIND_LABEL[kind]} şablonunu indir (CSV)</Button>
            <Button variant="primary" onClick={() => setStep(2)}>
              Devam →
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card title={`2. ${KIND_LABEL[kind]} dosyasını seçin`}>
          <label
            className="relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center hover:bg-bg"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void onFile(e.dataTransfer.files[0]);
            }}
          >
            <span className="text-3xl" aria-hidden>
              ⇪
            </span>
            <span className="font-medium">{reading ? "Okunuyor…" : "Dosyayı sürükleyin ya da seçmek için dokunun"}</span>
            <span className="text-xs text-muted">.xlsx veya .csv (; veya , ayraçlı, UTF-8 / Windows-1254) · en fazla {MAX_ROWS.toLocaleString("tr-TR")} satır</span>
            <input ref={fileInput} type="file" accept=".xlsx,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} />
          </label>
          <ErrorNote error={error} />
          <div className="mt-4 flex flex-wrap justify-between gap-2">
            <Button onClick={() => setStep(1)}>← Geri</Button>
            <Button variant="ghost" onClick={() => download(`dc-emlak-${kind}-sablonu.csv`, templateCsv(kind))}>
              ⇩ Şablon
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card title="3. Sütunları eşleyin" actions={<span className="max-w-40 truncate text-xs text-muted sm:max-w-none">{fileName}</span>}>
          {sheets.length > 1 && (
            <label className="mb-4 block text-sm">
              <span className="text-muted">Sayfa</span>
              <Select className="mt-1" value={sheetIdx} onChange={(e) => chooseSheet(Number(e.target.value))}>
                {sheets.map((s, i) => (
                  <option key={i} value={i}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </label>
          )}
          <p className="mb-3 text-sm text-muted">
            {parsed.rows.length.toLocaleString("tr-TR")} veri satırı, {parsed.headers.length} sütun bulundu. Başlıklar otomatik eşlendi; gerekirse düzeltin.
            {parsed.rows.length > MAX_ROWS && <span className="text-warn"> İlk {MAX_ROWS.toLocaleString("tr-TR")} satır aktarılacak.</span>}
          </p>
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
            {fields.map((f) => {
              const idx = mapping[f.key] ?? -1;
              const sample = idx >= 0 ? parsed.rows.map((r) => cellText(r[idx])).find(Boolean) : "";
              return (
                <div key={f.key} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] items-center gap-2">
                  <span className="text-sm">
                    {f.label}
                    {f.required && <span className="text-block"> *</span>}
                  </span>
                  <div className="min-w-0">
                    <Select
                      aria-label={`${f.label} sütunu`}
                      value={idx}
                      onChange={(e) => setMapping({ ...mapping, [f.key]: Number(e.target.value) })}
                      className={cx(f.required && idx < 0 && "border-block")}
                    >
                      <option value={-1}>— Aktarma —</option>
                      {parsed.headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h || `Sütun ${i + 1}`}
                        </option>
                      ))}
                    </Select>
                    {sample && <p className="mt-0.5 truncate text-xs text-muted">ör. {sample}</p>}
                  </div>
                </div>
              );
            })}
          </div>
          {missing.length > 0 && <p className="mt-3 text-sm text-block">Zorunlu alan eşlenmedi: {missing.map((f) => f.label).join(", ")}</p>}
          <div className="mt-4 flex flex-wrap justify-between gap-2">
            <Button
              onClick={() => {
                reset();
                setStep(2);
              }}
            >
              ← Başka dosya
            </Button>
            <Button variant="primary" disabled={missing.length > 0} onClick={() => setStep(4)}>
              Önizle →
            </Button>
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card title="4. Önizleme ve doğrulama">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone="ok">{valid.length} geçerli</Badge>
            <Badge tone={results.length - valid.length ? "block" : "neutral"}>{results.length - valid.length} hatalı</Badge>
            <Badge tone="warn">{results.filter((r) => r.warnings.length).length} uyarılı</Badge>
            <span className="ml-auto">
              <Checkbox label="Yalnız hatalıları göster" checked={onlyErrors} onChange={(e) => setOnlyErrors(e.target.checked)} />
            </span>
          </div>
          <Table>
            <thead>
              <tr>
                <th>Satır</th>
                <th>Durum</th>
                {previewCols.map((c) => (
                  <th key={c}>{fields.find((f) => f.key === c)?.label}</th>
                ))}
                <th>Notlar</th>
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, 200).map((r) => {
                const v = r.value as Record<string, unknown>;
                return (
                  <tr key={r.satir} className={r.errors.length ? "bg-block/5" : undefined}>
                    <td className="tabular-nums text-muted">{r.satir}</td>
                    <td>{r.errors.length ? <Badge tone="block">Hata</Badge> : r.warnings.length ? <Badge tone="warn">Uyarı</Badge> : <Badge tone="ok">Tamam</Badge>}</td>
                    {previewCols.map((c) => (
                      <td key={c} className="max-w-48 truncate">
                        {fmtCell(c, v[c])}
                      </td>
                    ))}
                    <td className="min-w-56 text-xs">
                      {r.errors.map((e) => (
                        <p key={e} className="text-block">
                          {e}
                        </p>
                      ))}
                      {r.warnings.map((w) => (
                        <p key={w} className="text-warn">
                          {w}
                        </p>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          {shown.length > 200 && <p className="mt-2 text-xs text-muted">İlk 200 satır gösteriliyor ({shown.length} satır).</p>}
          {kind === "kisi" && <p className="mt-3 text-xs text-muted">KVKK: İçe aktarılan kişiler için aydınlatma/açık rıza kaydı oluşturulmaz. Ticari ileti göndermeden önce Müşteriler modülünden rıza alın.</p>}
          <div className="mt-4 flex flex-wrap justify-between gap-2">
            <Button onClick={() => setStep(3)} disabled={Boolean(progress)}>
              ← Eşlemeye dön
            </Button>
            <Button variant="primary" disabled={!valid.length || Boolean(progress)} onClick={() => void runImport()}>
              {progress ? `Aktarılıyor ${progress.done}/${progress.total}…` : `${valid.length} kaydı içe aktar`}
            </Button>
          </div>
        </Card>
      )}

      {step === 5 && result && (
        <Card title="5. Sonuç">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-ok/30 bg-ok/10 p-3 text-center">
              <p className="text-2xl font-semibold text-ok tabular-nums">{result.ok}</p>
              <p className="text-xs">aktarıldı</p>
            </div>
            <div className="rounded-xl border border-border p-3 text-center">
              <p className="text-2xl font-semibold tabular-nums">{result.skipped}</p>
              <p className="text-xs">hatalı, atlandı</p>
            </div>
            <div className={cx("rounded-xl border p-3 text-center", result.fail.length ? "border-block/30 bg-block/10" : "border-border")}>
              <p className="text-2xl font-semibold tabular-nums">{result.fail.length}</p>
              <p className="text-xs">kaydedilemedi</p>
            </div>
          </div>
          {result.fail.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-block">
              {result.fail.slice(0, 20).map((f) => (
                <li key={f.satir}>
                  Satır {f.satir}: {f.mesaj}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <ButtonLink href={kind === "portfoy" ? "/portfoyler" : "/musteriler"} variant="primary">
              {kind === "portfoy" ? "Portföylere git" : "Müşterilere git"}
            </ButtonLink>
            <Button
              onClick={() => {
                reset();
                setStep(1);
              }}
            >
              Yeni aktarım
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

const ILAN: Record<string, string> = { satilik: "Satılık", kiralik: "Kiralık", devren: "Devren" };

function fmtCell(key: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (key === "fiyat" && typeof v === "number") return v.toLocaleString("tr-TR");
  if (key === "ilan_tipi") return ILAN[String(v)] ?? String(v);
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}
