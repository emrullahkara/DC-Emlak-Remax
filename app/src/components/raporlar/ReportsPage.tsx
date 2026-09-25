"use client";

import { useMemo, useState } from "react";
import { Card, ErrorNote, PageHeader, Spinner, Stat, Table, cx } from "@/components/ui";
import { useReadySession, useTable } from "@/data/session";
import { shortTL, tl } from "@/lib/format";
import {
  agentLeaderboard,
  averageDaysOnMarket,
  conversionFunnel,
  dealsByMonth,
  fsboConversion,
  fsboFunnel,
  leadSources,
  portfoliosByStage,
  stepRates,
} from "@/domain/reports";
import { BarChart, HBarChart } from "./Charts";

type Metric = "komisyon" | "ciro" | "adet";

const METRICS: { id: Metric; label: string }[] = [
  { id: "komisyon", label: "Komisyon" },
  { id: "ciro", label: "Ciro" },
  { id: "adet", label: "Adet" },
];

/** Eksen için kısa para: 1,2 Mn / 250 B */
function compactTL(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} Mn`;
  if (n >= 1e3) return `${Math.round(n / 1e3).toLocaleString("tr-TR")} B`;
  return n.toLocaleString("tr-TR");
}

export function ReportsPage() {
  const s = useReadySession();
  const [metric, setMetric] = useState<Metric>("komisyon");
  const portfolios = useTable("portfolio");
  const persons = useTable("person");
  const showings = useTable("showing");
  const offers = useTable("offer");
  const deals = useTable("deal");
  const lines = useTable("commission_line");
  const members = useTable("office_member", { eq: { office_id: s.officeId } });
  const fsbo = useTable("fsbo_listing");
  const logs = useTable("compliance_log", { eq: { varlik: "portfolio" } });

  const all = [portfolios, persons, showings, offers, deals, lines, members, fsbo];
  const loading = all.some((q) => q.loading);
  const error = all.find((q) => q.error)?.error ?? null;

  const r = useMemo(() => {
    const now = new Date();
    const monthly = dealsByMonth(deals.data, lines.data, now);
    const funnel = conversionFunnel(persons.data, showings.data, offers.data, deals.data);
    return {
      monthly,
      stages: portfoliosByStage(portfolios.data),
      sources: leadSources(persons.data),
      funnel,
      rates: stepRates(funnel),
      leaders: agentLeaderboard(members.data, portfolios.data, showings.data, deals.data, lines.data),
      dom: averageDaysOnMarket(portfolios.data, logs.data),
      fsbo: fsboFunnel(fsbo.data),
      fsboConv: fsboConversion(fsbo.data),
      kom12: monthly.reduce((a, m) => a + m.komisyon, 0),
      ciro12: monthly.reduce((a, m) => a + m.ciro, 0),
      adet12: monthly.reduce((a, m) => a + m.adet, 0),
      aktif: portfolios.data.filter((p) => !["arsiv", "tamamlandi"].includes(p.asama)).length,
    };
  }, [deals.data, lines.data, persons.data, showings.data, offers.data, portfolios.data, members.data, logs.data, fsbo.data]);

  if (loading) return <Spinner />;

  const monthlyData = r.monthly.map((m) => ({ key: m.key, label: m.label, value: m[metric] }));
  const money = metric !== "adet";
  const donusum = r.funnel[0]!.value ? Math.round((r.funnel[3]!.value / r.funnel[0]!.value) * 100) : null;

  return (
    <div>
      <PageHeader title="Raporlar" subtitle="Son 12 ay · ofis görünümü" />
      <ErrorNote error={error} />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="12 aylık komisyon (KDV hariç)" value={shortTL(r.kom12)} hint={`${r.adet12} kapanan işlem`} />
        <Stat label="12 aylık işlem cirosu" value={shortTL(r.ciro12)} hint="Tapu tarihine göre" />
        <Stat label="Ort. satış süresi" value={r.dom.ortalama === null ? "—" : `${r.dom.ortalama} gün`} hint={r.dom.adet ? `${r.dom.adet} tamamlanan portföy` : "Tamamlanan portföy yok"} />
        <Stat label="Aktif portföy" value={r.aktif} hint={`Kişi → işlem: ${donusum === null ? "—" : `%${donusum}`} · FSBO → yetki: ${r.fsboConv === null ? "—" : `%${r.fsboConv}`}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          className="lg:col-span-2"
          title={`Aylık ${metric === "komisyon" ? "komisyon (KDV hariç)" : metric === "ciro" ? "işlem cirosu" : "kapanan işlem adedi"}`}
          actions={
            <div role="group" aria-label="Ölçü" className="flex rounded-lg border border-border p-0.5">
              {METRICS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={metric === m.id}
                  onClick={() => setMetric(m.id)}
                  className={cx("min-h-7 rounded-md px-2.5 text-xs font-medium", metric === m.id ? "bg-brand text-white" : "text-muted hover:text-text")}
                >
                  {m.label}
                </button>
              ))}
            </div>
          }
        >
          <BarChart
            key={metric}
            data={monthlyData}
            title="Aylık işlemler"
            fmt={money ? tl : (n) => `${n} işlem`}
            axisFmt={money ? compactTL : (n) => String(n)}
            integer={!money}
            empty={metric === "komisyon" ? "Son 12 ayda komisyon kaydı yok. İşlem kapanışında komisyon satırları eklendikçe burada görünür." : "Son 12 ayda kapanan işlem yok."}
          />
        </Card>

        <Card title="Portföy aşamaları">
          <HBarChart data={r.stages} title="Aşamaya göre portföy sayısı" empty="Henüz portföy yok" />
        </Card>
        <Card title="Lead kaynağı (kişi sayısı)">
          <HBarChart data={r.sources} title="Kaynağa göre kişi sayısı" empty="Henüz kişi yok" />
        </Card>
        <Card title="Dönüşüm hunisi">
          <HBarChart data={r.funnel} rates={r.rates} title="Kişi, gösterim, teklif ve işlem sayıları" empty="Henüz kişi yok" />
          <p className="mt-1 text-xs text-muted">Tekil kişi sayısı; yüzde, önceki adıma oranıdır.</p>
        </Card>
        <Card title="FSBO Radar durumları">
          <HBarChart data={r.fsbo} title="Durumuna göre FSBO ilanı" empty="Henüz FSBO kaydı yok" />
        </Card>

        <div className="min-w-0 lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold">Danışman sıralaması</h2>
          {r.leaders.length === 0 ? (
            <p className="text-sm text-muted">Aktif danışman yok.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Danışman</th>
                  <th className="text-right">Portföy</th>
                  <th className="text-right">Gösterim</th>
                  <th className="text-right">İşlem</th>
                  <th className="text-right">Ciro</th>
                  <th className="text-right">Komisyon</th>
                </tr>
              </thead>
              <tbody>
                {r.leaders.map((a, i) => (
                  <tr key={a.user_id}>
                    <td className="tabular-nums text-muted">{i + 1}</td>
                    <td className="whitespace-nowrap font-medium">{a.ad_soyad}</td>
                    <td className="text-right tabular-nums">{a.portfoy}</td>
                    <td className="text-right tabular-nums">{a.gosterim}</td>
                    <td className="text-right tabular-nums">{a.islem}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{shortTL(a.ciro)}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{tl(a.komisyon)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">Grafik çubuklarının üzerine gelerek değerleri görebilir, her grafiğin altından tablo görünümünü açabilirsiniz.</p>
    </div>
  );
}
