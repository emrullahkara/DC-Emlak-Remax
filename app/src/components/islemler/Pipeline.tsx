"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, ButtonLink, cx, Dialog, EmptyState, ErrorNote, PageHeader, Spinner, Stat, Tabs } from "@/components/ui";
import { useReadySession, useTable } from "@/data/session";
import type { AuthorizationContract, Portfolio } from "@/data/types";
import { ASAMA_OLASILIK, expectedCommission, feeRate, pipelineSummary } from "@/domain/deal";
import { ASAMALAR, ASAMA_ETIKET, type Asama } from "@/domain/pipeline";
import { shortTL, tl } from "@/lib/format";
import { EidsBadge, YetkiBadge } from "./badges";
import { useStageMover } from "./useStageMover";

type Kapsam = "tum" | "benim";

export function priceLabel(p: Pick<Portfolio, "fiyat" | "ilan_tipi">) {
  return p.ilan_tipi === "kiralik" ? `${tl(p.fiyat)}/ay` : shortTL(p.fiyat);
}

export function Pipeline() {
  const { officeId, userId } = useReadySession();
  const [now] = useState(() => new Date());
  const [kapsam, setKapsam] = useState<Kapsam>("tum");
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<Asama | null>(null);
  const [picker, setPicker] = useState<Portfolio | null>(null);
  const { requestMove, dialogs } = useStageMover();

  const portfolios = useTable("portfolio", { eq: { office_id: officeId } });
  const contracts = useTable("authorization_contract");
  const members = useTable("office_member", { eq: { office_id: officeId } });

  const contractsBy = useMemo(() => {
    const m = new Map<string, AuthorizationContract[]>();
    for (const c of contracts.data) m.set(c.portfolio_id, [...(m.get(c.portfolio_id) ?? []), c]);
    return m;
  }, [contracts.data]);
  const memberName = useMemo(() => new Map(members.data.map((m) => [m.user_id, m.ad_soyad])), [members.data]);

  const visible = useMemo(
    () => portfolios.data.filter((p) => p.asama !== "arsiv" && (kapsam === "tum" || p.owner_id === userId)),
    [portfolios.data, kapsam, userId],
  );
  const rateOf = (id: string) => feeRate(contractsBy.get(id) ?? []);
  const summary = pipelineSummary(visible, rateOf, now);
  const acik = ASAMALAR.filter((a) => a !== "tamamlandi");
  const toplamBeklenen = acik.reduce((a, s) => a + summary[s].beklenen, 0);
  const aktifSayi = acik.reduce((a, s) => a + summary[s].adet, 0);

  if (portfolios.loading) return <Spinner />;

  const drop = (to: Asama) => {
    const p = visible.find((x) => x.id === dragId);
    setDragId(null);
    setOver(null);
    if (p && p.asama !== to) void requestMove(p, to);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="İşlemler"
        subtitle="Sürükle-bırak ya da karta dokunarak aşama değiştirin · her geçişte Uyum Motoru çalışır"
        actions={
          <div className="flex flex-wrap gap-1.5 text-xs">
            <Badge tone="block">ENGELLE</Badge>
            <Badge tone="warn">UYAR</Badge>
            <Badge tone="ok">GEÇ</Badge>
          </div>
        }
      />
      <ErrorNote error={portfolios.error} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Açık işlem hattı" value={aktifSayi} hint="Satıldı/Kiralandı hariç" />
        <Stat label="Beklenen komisyon" value={shortTL(toplamBeklenen)} hint="Aşama olasılığıyla ağırlıklı, KDV hariç" />
        <Stat label="Teklif + kapora + tapu" value={summary.teklif.adet + summary.kapora.adet + summary.tapu.adet} />
        <Stat label="Tamamlanan" value={summary.tamamlandi.adet} hint={shortTL(summary.tamamlandi.beklenen)} />
      </div>

      <Tabs<Kapsam>
        tabs={[
          { id: "tum", label: "Tüm portföyler" },
          { id: "benim", label: "Benim portföylerim" },
        ]}
        value={kapsam}
        onChange={setKapsam}
      />

      {!visible.length ? (
        <EmptyState title="İşlem hattında portföy yok">
          Portföy ekleyin ya da FSBO Radar&apos;dan bir ilanı portföye dönüştürün.
        </EmptyState>
      ) : (
        <div className="md:overflow-x-auto md:pb-2" data-testid="board">
          <div className="flex flex-col gap-3 md:flex-row">
            {ASAMALAR.map((s) => {
              const items = visible.filter((p) => p.asama === s);
              return (
                <section
                  key={s}
                  data-stage={s}
                  aria-label={ASAMA_ETIKET[s]}
                  onDragOver={(e) => {
                    if (!dragId) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (over !== s) setOver(s);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver((o) => (o === s ? null : o));
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    drop(s);
                  }}
                  className={cx(
                    "flex w-full flex-col rounded-xl border bg-bg/60 transition md:w-64 md:shrink-0",
                    over === s ? "border-brand bg-brand/5" : "border-border",
                  )}
                >
                  <header className="flex items-start justify-between gap-2 border-b border-border px-3 py-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold">
                        {ASAMA_ETIKET[s]} <span className="font-normal text-muted">({items.length})</span>
                      </h2>
                      <p className="text-[11px] text-muted">Olasılık %{Math.round(ASAMA_OLASILIK[s] * 100)}</p>
                    </div>
                    <span className="whitespace-nowrap text-xs font-medium tabular-nums text-brand" title="Beklenen komisyon (KDV hariç)">
                      {shortTL(summary[s].beklenen)}
                    </span>
                  </header>
                  <div className="flex flex-col gap-2 p-2 md:min-h-24">
                    {items.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        draggable
                        data-id={p.id}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", p.id);
                          e.dataTransfer.effectAllowed = "move";
                          setDragId(p.id);
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setOver(null);
                        }}
                        onClick={() => setPicker(p)}
                        aria-label={`${p.baslik ?? "Portföy"} — ${ASAMA_ETIKET[s]}. Aşama değiştirmek için seçin`}
                        className={cx(
                          "w-full cursor-grab rounded-lg border border-border bg-surface p-2.5 text-left text-sm shadow-sm outline-none transition hover:border-brand focus-visible:ring-2 focus-visible:ring-brand active:cursor-grabbing",
                          dragId === p.id && "opacity-50",
                        )}
                      >
                        <span className="line-clamp-2 font-medium">{p.baslik ?? "Başlıksız portföy"}</span>
                        <span className="mt-1 flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold tabular-nums">{priceLabel(p)}</span>
                          <span className="truncate text-muted">{memberName.get(p.owner_id) ?? "—"}</span>
                        </span>
                        <span className="mt-1.5 flex flex-wrap gap-1">
                          <YetkiBadge contracts={contractsBy.get(p.id) ?? []} now={now} />
                          <EidsBadge durum={p.eids_durum} />
                        </span>
                        <span className="mt-1.5 block text-[11px] text-muted">
                          Beklenen: <b className="tabular-nums text-text">{tl(expectedCommission(p, rateOf(p.id), now))}</b>
                        </span>
                      </button>
                    ))}
                    {!items.length && (
                      <p className="py-2 text-center text-xs text-muted md:py-5">
                        <span className="md:hidden">Bu aşamada portföy yok</span>
                        <span className="hidden md:inline">Buraya sürükleyin</span>
                      </p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
      <p className="text-xs text-muted">
        &quot;Yayında&quot; ve sonrası: imzalı yetki sözleşmesi + EİDS onayı zorunlu · &quot;Satıldı / Kiralandı&quot;: DASK, tapu kaydı sorgusu ve
        müşteriyi tanıma kontrol edilir. Beklenen komisyon: satışta fiyat × yetki sözleşmesindeki oran × 2 taraf, kiralıkta 1 aylık kira; aşama
        olasılığıyla çarpılır.
      </p>

      <Dialog
        open={!!picker}
        onClose={() => setPicker(null)}
        title={picker?.baslik ?? "Portföy"}
        footer={
          picker && (
            <>
              <ButtonLink href={`/portfoyler/${picker.id}`}>Portföy kartı</ButtonLink>
              <ButtonLink variant="primary" href={`/islemler/${picker.id}`}>
                İşlem alanı
              </ButtonLink>
            </>
          )
        }
      >
        {picker && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-lg font-semibold tabular-nums">{priceLabel(picker)}</span>
              <span className="flex flex-wrap gap-1">
                <YetkiBadge contracts={contractsBy.get(picker.id) ?? []} now={now} />
                <EidsBadge durum={picker.eids_durum} />
              </span>
            </div>
            <p className="text-sm font-medium">Aşamaya taşı</p>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Aşama seç">
              {ASAMALAR.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={picker.asama === s}
                  disabled={picker.asama === s}
                  onClick={() => {
                    const p = picker;
                    setPicker(null);
                    void requestMove(p, s);
                  }}
                  className={cx(
                    "min-h-10 rounded-lg border px-3 text-left text-sm",
                    picker.asama === s ? "border-brand bg-brand/10 font-semibold text-brand" : "border-border hover:bg-bg",
                  )}
                >
                  {ASAMA_ETIKET[s]}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted">
              Beklenen komisyon: <b className="tabular-nums text-text">{tl(expectedCommission(picker, rateOf(picker.id), now))}</b> (olasılık %
              {Math.round(ASAMA_OLASILIK[picker.asama === "arsiv" ? "aday" : picker.asama] * 100)})
            </p>
            <p className="text-xs text-muted">
              Sorumlu: {memberName.get(picker.owner_id) ?? "—"} ·{" "}
              <Link className="text-brand underline" href={`/islemler/${picker.id}?sekme=teklifler`}>
                Teklifleri gör
              </Link>
            </p>
          </div>
        )}
      </Dialog>
      {dialogs}
    </div>
  );
}
