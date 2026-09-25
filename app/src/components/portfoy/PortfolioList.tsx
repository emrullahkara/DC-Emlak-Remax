"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ButtonLink, cx, EmptyState, ErrorNote, Input, PageHeader, Select, Spinner, Table } from "@/components/ui";
import { useReadySession, useTable } from "@/data/session";
import type { Media, Portfolio } from "@/data/types";
import {
  DEFAULT_FILTER,
  filterPortfolios,
  healthInput,
  odaLabel,
  ownersKvkk,
  portfolioName,
  STAGE_LABEL,
  yetkiDurumu,
  type PortfolioFilter,
} from "@/domain/portfoy";
import { portfolioHealth } from "@/domain/scoring";
import { ILAN_TIPLERI } from "@/lib/format";
import { useMediaUrls } from "./media";
import { CoverImage, EidsBadge, HealthBadge, KvkkBadge, priceText, StageBadge, YetkiBadge } from "./shared";

const VIEW_KEY = "dc-portfoy-gorunum";
type View = "grid" | "list";

export function PortfolioList() {
  const { officeId, supabase } = useReadySession();
  const bugun = useMemo(() => new Date(), []);
  const portfolios = useTable("portfolio", { eq: { office_id: officeId } });
  const contracts = useTable("authorization_contract");
  const owners = useTable("portfolio_owner");
  const media = useTable("media", { order: { column: "sira", ascending: true } });
  const ownerIds = useMemo(() => [...new Set(owners.data.map((o) => o.person_id))], [owners.data]);
  const consents = useTable("consent", { in: { person_id: ownerIds } }, ownerIds.length > 0);

  const [f, setF] = useState<PortfolioFilter>(DEFAULT_FILTER);
  const [view, setView] = useState<View>("grid");
  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === "grid" || v === "list") setView(v);
    } catch {
      // depolama kapalı olabilir
    }
  }, []);
  const changeView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      // yok say
    }
  };

  const mediaBy = useMemo(() => {
    const m = new Map<string, Media[]>();
    for (const x of media.data) m.set(x.portfolio_id, [...(m.get(x.portfolio_id) ?? []), x]);
    return m;
  }, [media.data]);

  const covers = useMemo(
    () => [...mediaBy.values()].map((list) => list.find((x) => x.tur === "foto" || x.tur === "sanal_mobilya")).filter((x): x is Media => Boolean(x)),
    [mediaBy],
  );
  const urls = useMediaUrls(covers, supabase);

  const score = useMemo(() => {
    const cache = new Map<string, number>();
    for (const p of portfolios.data) {
      cache.set(p.id, p.saglik_skoru ?? portfolioHealth(healthInput(p, { media: mediaBy.get(p.id) ?? [], offers: [] }, bugun)).puan);
    }
    return (p: Portfolio) => cache.get(p.id) ?? 0;
  }, [portfolios.data, mediaBy, bugun]);

  const ilceler = useMemo(() => [...new Set(portfolios.data.map((p) => p.ilce).filter((x): x is string => Boolean(x)))].sort((a, b) => a.localeCompare(b, "tr")), [portfolios.data]);
  const rows = useMemo(() => filterPortfolios(portfolios.data, f, score), [portfolios.data, f, score]);

  const info = (p: Portfolio) => {
    const y = yetkiDurumu(
      contracts.data.filter((c) => c.portfolio_id === p.id),
      bugun,
    );
    const ids = owners.data.filter((o) => o.portfolio_id === p.id).map((o) => o.person_id);
    const cover = mediaBy.get(p.id)?.find((x) => x.tur === "foto" || x.tur === "sanal_mobilya");
    return { y, kvkk: ownersKvkk(ids, consents.data), cover: cover ? urls[cover.id] : null };
  };

  const yayinda = portfolios.data.filter((p) => p.asama === "yayinda").length;
  const aktif = portfolios.data.filter((p) => p.asama !== "arsiv").length;

  return (
    <div>
      <PageHeader
        title="Portföyler"
        subtitle={portfolios.loading ? "Yükleniyor…" : `${aktif} aktif kayıt · ${yayinda} yayında`}
        actions={
          <>
            <ButtonLink href="/iceri-aktar">İçe aktar</ButtonLink>
            <ButtonLink href="/portfoyler/yeni" variant="primary">
              + Yeni portföy
            </ButtonLink>
          </>
        }
      />

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="İlan tipi" className="flex flex-wrap gap-1">
            {(["tumu", "satilik", "kiralik", "devren"] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={f.ilanTipi === t}
                onClick={() => setF({ ...f, ilanTipi: t })}
                className={cx(
                  "min-h-9 rounded-full border px-3 text-sm",
                  f.ilanTipi === t ? "border-brand bg-brand text-white" : "border-border bg-surface hover:bg-bg",
                )}
              >
                {t === "tumu" ? "Tümü" : ILAN_TIPLERI[t]}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-1" role="group" aria-label="Görünüm">
            {(["grid", "list"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                aria-label={v === "grid" ? "Kart görünümü" : "Liste görünümü"}
                onClick={() => changeView(v)}
                className={cx("grid h-9 w-9 place-items-center rounded-lg border", view === v ? "border-brand text-brand" : "border-border text-muted hover:bg-surface")}
              >
                {v === "grid" ? "▦" : "☰"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-[1fr_auto_auto_auto]">
          <Input
            type="search"
            placeholder="Ara: başlık, mahalle, ada/parsel…"
            aria-label="Portföy ara"
            value={f.q}
            onChange={(e) => setF({ ...f, q: e.target.value })}
            className="col-span-2 md:col-span-1"
          />
          <Select aria-label="İlçe" value={f.ilce} onChange={(e) => setF({ ...f, ilce: e.target.value })}>
            <option value="tumu">Tüm ilçeler</option>
            {ilceler.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </Select>
          <Select aria-label="Aşama" value={f.asama} onChange={(e) => setF({ ...f, asama: e.target.value as PortfolioFilter["asama"] })}>
            <option value="aktif">Aktif aşamalar</option>
            <option value="tumu">Tümü (arşiv dahil)</option>
            {Object.entries(STAGE_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
          <Select aria-label="Sıralama" value={f.siralama} onChange={(e) => setF({ ...f, siralama: e.target.value as PortfolioFilter["siralama"] })} className="col-span-2 md:col-span-1">
            <option value="guncel">Son güncellenen</option>
            <option value="yeni">En yeni</option>
            <option value="fiyat_artan">Fiyat (artan)</option>
            <option value="fiyat_azalan">Fiyat (azalan)</option>
            <option value="saglik">Sağlık (düşük önce)</option>
          </Select>
        </div>
      </div>

      <ErrorNote error={portfolios.error} />
      {portfolios.loading ? (
        <Spinner />
      ) : !portfolios.data.length ? (
        <EmptyState
          title="Henüz portföy yok"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <ButtonLink href="/portfoyler/yeni" variant="primary">
                + Yeni portföy
              </ButtonLink>
              <ButtonLink href="/iceri-aktar">Excel/CSV’den aktar</ButtonLink>
            </div>
          }
        >
          İlk portföyünüzü ekleyin ya da mevcut listenizi içe aktarın.
        </EmptyState>
      ) : !rows.length ? (
        <EmptyState title="Filtreye uyan portföy yok" action={<button type="button" className="text-sm text-brand underline" onClick={() => setF(DEFAULT_FILTER)}>Filtreleri temizle</button>} />
      ) : view === "grid" ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => {
            const i = info(p);
            return (
              <li key={p.id} className="min-w-0">
                <Link href={`/portfoyler/${p.id}`} className="block h-full overflow-hidden rounded-xl border border-border bg-surface transition hover:border-brand/40 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none">
                  <CoverImage url={i.cover} alt={portfolioName(p)} className="aspect-[2/1] sm:aspect-[16/10]">
                    <span className="absolute left-2 top-2">
                      <StageBadge asama={p.asama} />
                    </span>
                  </CoverImage>
                  <div className="space-y-1.5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-lg font-semibold tabular-nums">{priceText(p, true)}</span>
                      <HealthBadge puan={score(p)} />
                    </div>
                    <p className="truncate font-medium">{portfolioName(p)}</p>
                    <p className="truncate text-sm text-muted">
                      {[p.ilce, p.mahalle].filter(Boolean).join(" / ") || "Konum yok"}
                      {odaLabel(p) && ` · ${odaLabel(p)}`}
                      {p.brut_m2 && ` · ${p.brut_m2} m²`}
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      <YetkiBadge y={i.y} />
                      <EidsBadge durum={p.eids_durum} />
                      <KvkkBadge durum={i.kvkk} />
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Portföy</th>
              <th className="text-right">Fiyat</th>
              <th>Aşama</th>
              <th>Sağlık</th>
              <th>Uyum</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const i = info(p);
              return (
                <tr key={p.id} className="hover:bg-bg">
                  <td className="min-w-48">
                    <Link href={`/portfoyler/${p.id}`} className="font-medium text-brand hover:underline">
                      {portfolioName(p)}
                    </Link>
                    <div className="text-xs text-muted">
                      {[p.ilce, p.mahalle].filter(Boolean).join(" / ")}
                      {odaLabel(p) && ` · ${odaLabel(p)}`}
                      {p.brut_m2 && ` · ${p.brut_m2} m²`}
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-right font-semibold tabular-nums">{priceText(p, true)}</td>
                  <td>
                    <StageBadge asama={p.asama} />
                  </td>
                  <td>
                    <HealthBadge puan={score(p)} />
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <YetkiBadge y={i.y} />
                      <EidsBadge durum={p.eids_durum} />
                      <KvkkBadge durum={i.kvkk} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
