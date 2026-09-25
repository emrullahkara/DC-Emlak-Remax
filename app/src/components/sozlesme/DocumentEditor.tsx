"use client";

/**
 * Belge düzenleyici: tüm yer tutucular için form (önce zorunlular, gruplu) +
 * canlı önizleme. Mobilde sekmeli, masaüstünde yan yana.
 */
import { useId, useState } from "react";
import { Badge, Field, Input, Tabs, cx } from "@/components/ui";
import { FIELD_OPTIONS, editableFields, fieldLabel, groupFields, requiredMissing, type Template } from "@/domain/templates";
import { DocumentView } from "./DocumentView";

function FieldInput({ name, value, required, onChange }: { name: string; value: string; required: boolean; onChange: (v: string) => void }) {
  const listId = useId();
  const opts = FIELD_OPTIONS[name];
  const long = /(ozel_sartlar|notlar|aciklama|beyani|listesi|demirbaslar|hasar|degerlendirmesi|notu)$/.test(name);
  const missing = required && !value.trim();
  return (
    <Field label={fieldLabel(name)} required={required}>
      {long ? (
        <textarea
          name={name}
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={missing || undefined}
          className={cx("min-h-10 w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand", missing ? "border-block/50" : "border-border")}
        />
      ) : (
        <>
          <Input
            name={name}
            value={value}
            list={opts ? listId : undefined}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={missing || undefined}
            placeholder={/tarihi$/.test(name) ? "GG.AA.YYYY" : undefined}
            className={missing ? "border-block/50" : undefined}
            autoComplete="off"
          />
          {opts && (
            <datalist id={listId}>
              {opts.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          )}
        </>
      )}
    </Field>
  );
}

export function DocumentForm({ template, values, onChange }: { template: Template; values: Record<string, string>; onChange: (name: string, v: string) => void }) {
  const { zorunlu, opsiyonel } = editableFields(template);
  const req = new Set(zorunlu);
  const render = (fields: string[]) =>
    groupFields(fields).map((g) => (
      <fieldset key={g.grup} className="min-w-0">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{g.grup}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {g.alanlar.map((f) => (
            <FieldInput key={f} name={f} required={req.has(f)} value={values[f] ?? ""} onChange={(v) => onChange(f, v)} />
          ))}
        </div>
      </fieldset>
    ));
  return (
    <div className="space-y-5">
      <div className="space-y-4">{render(zorunlu)}</div>
      {opsiyonel.length > 0 && (
        <details className="rounded-lg border border-border p-3">
          <summary className="cursor-pointer text-sm font-medium">Opsiyonel alanlar ({opsiyonel.length})</summary>
          <p className="mt-1 text-xs text-muted">Boş bırakılabilir; çıktıda “—” basılır, boş tekrarlı satırlar gizlenir.</p>
          <div className="mt-3 space-y-4">{render(opsiyonel)}</div>
        </details>
      )}
    </div>
  );
}

export function MissingSummary({ template, values }: { template: Template; values: Record<string, string> }) {
  const missing = requiredMissing(template, values);
  if (!missing.length) return <Badge tone="ok">Zorunlu alanlar tamam</Badge>;
  return (
    <Badge tone="block">
      {missing.length} zorunlu alan eksik
    </Badge>
  );
}

export function DocumentEditor({ template, values, onChange }: { template: Template; values: Record<string, string>; onChange: (name: string, v: string) => void }) {
  const [tab, setTab] = useState<"form" | "onizleme">("form");
  return (
    <div>
      <div className="mb-3 md:hidden">
        <Tabs
          tabs={[
            { id: "form", label: "Alanlar" },
            { id: "onizleme", label: "Önizleme" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className={cx("min-w-0", tab !== "form" && "hidden md:block")}>
          <DocumentForm template={template} values={values} onChange={onChange} />
        </div>
        <div className={cx("min-w-0", tab !== "onizleme" && "hidden md:block")}>
          <div className="md:sticky md:top-4 md:max-h-[calc(100dvh-2rem)] md:overflow-y-auto">
            <DocumentView template={template} values={values} />
          </div>
        </div>
      </div>
    </div>
  );
}
