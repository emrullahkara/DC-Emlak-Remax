"use client";

/**
 * Şablon + değerlerden belgeyi React öğeleri olarak çizer. Değerler her zaman
 * metin düğümü olarak basılır (HTML yorumlanmaz); eksik zorunlu alanlar
 * vurgulanır, boş opsiyonel alanlar "—" olur, boş tekrarlı tablo satırları gizlenir.
 */
import { Fragment } from "react";
import { cx } from "@/components/ui";
import { fieldLabel, templateBlocks, type Template } from "@/domain/templates";
import { resolveField, visibleRows, type Block, type Inline, type RenderValues } from "@/domain/templates-markdown";

type Mode = "fill" | "preview";

function InlineNodes({ c, r, mode }: { c: Inline[]; r: RenderValues; mode: Mode }) {
  return (
    <>
      {c.map((x, i) => {
        switch (x.t) {
          case "text":
            return <Fragment key={i}>{x.v}</Fragment>;
          case "code":
            return (
              <code key={i} className="rounded bg-bg px-1 text-[0.9em]">
                {x.v}
              </code>
            );
          case "strong":
            return (
              <strong key={i} className="font-semibold">
                <InlineNodes c={x.c} r={r} mode={mode} />
              </strong>
            );
          case "em":
            return (
              <em key={i}>
                <InlineNodes c={x.c} r={r} mode={mode} />
              </em>
            );
          case "br":
            return <br key={i} />;
          case "check":
            return (
              <span key={i} aria-label={x.checked ? "işaretli" : "işaretsiz"}>
                {x.checked ? "☒" : "☐"}
              </span>
            );
          case "field": {
            const f = resolveField(x.name, r);
            if (f.kind === "value") {
              return (
                <span key={i} data-alan={x.name} className="alan rounded-sm bg-brand/5 px-0.5 font-medium text-text print:bg-transparent">
                  {f.text}
                </span>
              );
            }
            if (f.kind === "missing" || mode === "preview") {
              return (
                <mark
                  key={i}
                  data-alan={x.name}
                  title={mode === "preview" ? "Yer tutucu" : "Zorunlu alan eksik"}
                  className={cx(
                    "rounded px-1 text-[0.85em]",
                    mode === "preview" ? "bg-info/10 text-info" : "bg-block/15 font-medium text-block ring-1 ring-block/40",
                  )}
                >
                  [{fieldLabel(x.name)}]
                </mark>
              );
            }
            return <Fragment key={i}>—</Fragment>;
          }
        }
      })}
    </>
  );
}

const H = ["text-xl", "text-lg", "text-base", "text-sm", "text-sm", "text-sm"];

function Blocks({ blocks, r, mode }: { blocks: Block[]; r: RenderValues; mode: Mode }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case "heading": {
            const Tag = `h${Math.min(6, b.level)}` as "h1";
            return (
              <Tag key={i} className={cx("mt-5 font-semibold first:mt-0", H[b.level - 1], b.level === 1 && "text-center")}>
                <InlineNodes c={b.c} r={r} mode={mode} />
              </Tag>
            );
          }
          case "p":
            return (
              <p key={i} className="mt-2 leading-relaxed">
                <InlineNodes c={b.c} r={r} mode={mode} />
              </p>
            );
          case "ul":
            return (
              <ul key={i} className="mt-2 list-disc space-y-1 pl-5">
                {b.items.map((it, k) => (
                  <li key={k}>
                    <InlineNodes c={it} r={r} mode={mode} />
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} start={b.start} className="mt-2 list-decimal space-y-1 pl-5">
                {b.items.map((it, k) => (
                  <li key={k}>
                    <InlineNodes c={it} r={r} mode={mode} />
                  </li>
                ))}
              </ol>
            );
          case "quote":
            return (
              <blockquote key={i} className="mt-3 rounded-lg border-l-4 border-warn bg-warn/10 px-3 py-2 text-[0.95em] print:bg-transparent">
                <Blocks blocks={b.blocks} r={r} mode={mode} />
              </blockquote>
            );
          case "table": {
            const rows = visibleRows(b.rows, r);
            return (
              <div key={i} className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse text-[0.95em] [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_td]:align-top [&_th]:border [&_th]:border-border [&_th]:bg-bg [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold">
                  {b.head && (
                    <thead>
                      <tr>
                        {b.head.map((c, k) => (
                          <th key={k}>
                            <InlineNodes c={c} r={r} mode={mode} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {rows.map((row, k) => (
                      <tr key={k}>
                        {row.map((c, j) => (
                          <td key={j}>
                            <InlineNodes c={c} r={r} mode={mode} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          case "hr":
            return <hr key={i} className="my-4 border-border" />;
          case "code":
            return (
              <pre key={i} className="mt-2 overflow-x-auto rounded bg-bg p-2 text-xs">
                {b.v}
              </pre>
            );
        }
      })}
    </>
  );
}

/** Belge alanlarından sistem anahtarlarını (`_kisi_id` vb.) ayıklar. */
export function publicValues(alanlar: Record<string, string> | null | undefined): Record<string, string> {
  return Object.fromEntries(Object.entries(alanlar ?? {}).filter(([k]) => !k.startsWith("_")));
}

export function renderValues(t: Template, values: Record<string, string>): RenderValues {
  return { values: publicValues(values), required: t.zorunlu, label: fieldLabel };
}

export function DocumentView({ template, values, mode = "fill", className }: { template: Template; values: Record<string, string>; mode?: Mode; className?: string }) {
  const r = mode === "preview" ? { values: {}, required: [], label: fieldLabel } : renderValues(template, values);
  return (
    <article className={cx("belge min-w-0 break-words rounded-xl border border-border bg-surface p-4 text-sm text-text sm:p-6", className)} lang="tr">
      <Blocks blocks={templateBlocks(template)} r={r} mode={mode} />
    </article>
  );
}

/** Yazdırma: yalnızca `.belge-yazdir` içeriği kâğıda çıkar. */
export function PrintStyles() {
  return (
    <style>{`@media print {
  body * { visibility: hidden !important; }
  .belge-yazdir, .belge-yazdir * { visibility: visible !important; }
  .belge-yazdir { position: absolute; left: 0; top: 0; width: 100%; border: 0 !important; padding: 0 !important; color: #000; background: #fff; }
  .belge-yazdir mark { background: #fff3 !important; color: #000 !important; }
  @page { margin: 16mm; }
}`}</style>
  );
}
