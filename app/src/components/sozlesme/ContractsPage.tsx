"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, ButtonLink, Dialog, EmptyState, ErrorNote, Input, PageHeader, Spinner, Tabs, cx } from "@/components/ui";
import { useTable } from "@/data/session";
import type { DocumentStatus } from "@/data/types";
import { fmtDate, norm } from "@/lib/format";
import { getTemplate, listTemplates, requiredForSending, type Template } from "@/domain/templates";
import { DOC_STATUS, docTitle } from "./actions";
import { DocumentView } from "./DocumentView";
import { recipientFromValues } from "./SignFlow";

type Filter = "hepsi" | DocumentStatus;

export function TemplatePreviewDialog({ template, onClose }: { template: Template | null; onClose: () => void }) {
  return (
    <Dialog
      open={!!template}
      onClose={onClose}
      wide
      title={template?.baslik ?? ""}
      footer={
        template && (
          <>
            <Button onClick={onClose}>Kapat</Button>
            <ButtonLink variant="primary" href={`/sozlesmeler/yeni?sablon=${template.kod}`}>
              Bu şablonla belge oluştur
            </ButtonLink>
          </>
        )
      }
    >
      {template && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge tone={template.taslak ? "warn" : "ok"}>{template.durum}</Badge>
            <Badge>Sürüm {template.surum}</Badge>
            <Badge>{requiredForSending(template).length} zorunlu alan</Badge>
          </div>
          {template.dayanak.length > 0 && (
            <details className="rounded-lg border border-border p-3 text-sm">
              <summary className="cursor-pointer font-medium">Dayanak ({template.dayanak.length})</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
                {template.dayanak.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </details>
          )}
          <DocumentView template={template} values={{}} mode="preview" />
        </div>
      )}
    </Dialog>
  );
}

export function ContractsPage() {
  const [tab, setTab] = useState<"belgeler" | "sablonlar">("belgeler");
  const [filter, setFilter] = useState<Filter>("hepsi");
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<Template | null>(null);
  const docs = useTable("document", { order: { column: "created_at", ascending: false } });
  const portfolios = useTable("portfolio");
  const templates = listTemplates();

  const pTitle = useMemo(() => new Map(portfolios.data.map((p) => [p.id, p.baslik ?? "Portföy"])), [portfolios.data]);

  const rows = useMemo(() => {
    const nq = norm(q.trim());
    return docs.data
      .filter((d) => filter === "hepsi" || (d.durum === filter && !!getTemplate(d.sablon)))
      .map((d) => ({
        d,
        baslik: docTitle(d.sablon, getTemplate(d.sablon)?.baslik),
        kayit: !getTemplate(d.sablon),
        taraf: recipientFromValues(d.alanlar).ad ?? "",
        portfoy: d.portfolio_id ? (pTitle.get(d.portfolio_id) ?? "") : "",
      }))
      .filter((r) => !nq || norm(`${r.baslik} ${r.taraf} ${r.portfoy}`).includes(nq));
  }, [docs.data, filter, q, pTitle]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { hepsi: docs.data.length };
    for (const d of docs.data) if (getTemplate(d.sablon)) c[d.durum] = (c[d.durum] ?? 0) + 1;
    return c;
  }, [docs.data]);

  return (
    <div>
      <PageHeader
        title="Sözleşmeler & Evrak"
        subtitle="Şablon kütüphanesi · akıllı alanlar portföy, müşteri ve ofis kartından dolar"
        actions={
          <ButtonLink variant="primary" href="/sozlesmeler/yeni">
            + Yeni belge
          </ButtonLink>
        }
      />
      <p className="mb-4 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">
        <b>Tüm şablonlar taslaktır — hukuk onayı bekliyor.</b> Canlı kullanımdan önce hukuk danışmanı tarafından güncel mevzuata göre onaylanmalıdır.
      </p>

      <Tabs
        tabs={[
          { id: "belgeler", label: `Belgeler (${docs.data.length})` },
          { id: "sablonlar", label: `Şablon kütüphanesi (${templates.length})` },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div className="mt-4">
        {tab === "belgeler" ? (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {(["hepsi", "taslak", "imzada", "imzalandi", "iptal"] as Filter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  className={cx(
                    "min-h-8 rounded-full border px-3 text-xs font-medium",
                    filter === f ? "border-brand bg-brand text-white" : "border-border bg-surface text-muted hover:text-text",
                  )}
                >
                  {f === "hepsi" ? "Tümü" : DOC_STATUS[f].label} ({counts[f] ?? 0})
                </button>
              ))}
              <Input className="sm:ml-auto sm:max-w-60" placeholder="Belge, kişi veya portföy ara" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Belgelerde ara" />
            </div>
            <ErrorNote error={docs.error} />
            {docs.loading ? (
              <Spinner />
            ) : rows.length === 0 ? (
              <EmptyState title={docs.data.length ? "Filtreye uyan belge yok" : "Henüz belge yok"} action={<ButtonLink href="/sozlesmeler/yeni" variant="primary">Yeni belge</ButtonLink>}>
                Şablon seçip portföy ve kişi kartından otomatik doldurun.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                {rows.map(({ d, baslik, kayit, taraf, portfoy }) => (
                  <li key={d.id}>
                    <Link href={`/sozlesmeler/${d.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-bg">
                      <span aria-hidden className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-lg text-base", d.durum === "imzalandi" ? "bg-ok/10 text-ok" : d.durum === "imzada" ? "bg-warn/10 text-warn" : "bg-bg text-muted")}>
                        {d.durum === "imzalandi" ? "✓" : "✎"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{baslik}</span>
                        <span className="block truncate text-xs text-muted">
                          {[taraf, portfoy, fmtDate(d.created_at)].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      {kayit ? <Badge tone="info">Kayıt</Badge> : <Badge tone={DOC_STATUS[d.durum].tone}>{DOC_STATUS[d.durum].label}</Badge>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <article key={t.kod} className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                    ✎
                  </span>
                  <Badge tone={t.taslak ? "warn" : "ok"} className="whitespace-normal text-right">
                    {t.durum}
                  </Badge>
                </div>
                <h3 className="font-semibold">{t.baslik}</h3>
                <p className="flex-1 text-xs text-muted">
                  Sürüm {t.surum} · {requiredForSending(t).length} zorunlu, {t.opsiyonel.length} opsiyonel alan
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setPreview(t)}>
                    Önizle
                  </Button>
                  <ButtonLink size="sm" variant="primary" href={`/sozlesmeler/yeni?sablon=${t.kod}`}>
                    Kullan
                  </ButtonLink>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <TemplatePreviewDialog template={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
