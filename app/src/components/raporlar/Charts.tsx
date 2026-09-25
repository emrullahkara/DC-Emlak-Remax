"use client";

/**
 * Bağımlılıksız satır içi SVG grafikler. Renkler tema değişkenlerinden
 * (açık/koyu), her çubuğun üzerine gelince `<title>` ipucu, altında tablo görünümü.
 */
import { useEffect, useRef, useState } from "react";
import { niceScale, type Datum } from "@/domain/reports";

function useWidth<T extends HTMLElement>(fallback = 320) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(Math.max(200, Math.floor(el.clientWidth)));
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function roundTop(x: number, y: number, w: number, h: number, r: number) {
  r = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function roundRight(x: number, y: number, w: number, h: number, r: number) {
  r = Math.max(0, Math.min(r, h / 2, w));
  return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
}

function DataTable({ data, fmt, extra }: { data: Datum[]; fmt: (n: number) => string; extra?: (d: Datum, i: number) => string | null }) {
  return (
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer text-muted">Tablo olarak göster</summary>
      <table className="mt-2 w-full">
        <tbody>
          {data.map((d, i) => (
            <tr key={d.key} className="border-t border-border">
              <td className="py-1 pr-2">{d.label}</td>
              <td className="py-1 text-right tabular-nums">
                {fmt(d.value)}
                {extra?.(d, i) ? ` · ${extra(d, i)}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

function ChartEmpty({ children }: { children: React.ReactNode }) {
  return <p className="grid min-h-32 place-items-center rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted">{children}</p>;
}

export function BarChart({
  data,
  title,
  fmt = (n) => n.toLocaleString("tr-TR"),
  axisFmt,
  height = 220,
  integer = false,
  empty = "Henüz veri yok",
}: {
  data: Datum[];
  title: string;
  fmt?: (n: number) => string;
  axisFmt?: (n: number) => string;
  height?: number;
  integer?: boolean;
  empty?: string;
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const max = Math.max(0, ...data.map((d) => d.value));
  const af = axisFmt ?? fmt;
  const pad = { l: Math.min(64, Math.max(36, af(max).length * 7 + 8)), r: 8, t: 12, b: 24 };
  const iw = W - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const { step, top } = niceScale(max, 4, integer);
  const bw = data.length ? iw / data.length : 0;
  const gap = Math.max(2, bw * 0.28);
  const everyOther = bw < 34;
  const ticks: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);

  return (
    <figure className="min-w-0">
      <figcaption className="sr-only">{title}</figcaption>
      <div ref={ref} className="w-full">
        {max === 0 ? (
          <ChartEmpty>{empty}</ChartEmpty>
        ) : (
          <svg width={W} height={height} viewBox={`0 0 ${W} ${height}`} role="img" aria-label={title} className="block max-w-full">
            <title>{title}</title>
            {ticks.map((v) => {
              const y = pad.t + ih - (v / top) * ih;
              return (
                <g key={v}>
                  <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="var(--border)" strokeWidth={1} />
                  <text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize={11} fill="var(--muted)" className="tabular-nums">
                    {af(v)}
                  </text>
                </g>
              );
            })}
            {data.map((d, i) => {
              const x = pad.l + i * bw + gap / 2;
              const w = Math.max(1, bw - gap);
              const h = top ? (d.value / top) * ih : 0;
              const y = pad.t + ih - h;
              return (
                <g key={d.key} className="group">
                  <rect x={pad.l + i * bw} y={pad.t} width={bw} height={ih} fill="transparent" />
                  {h > 0 && <path d={roundTop(x, y, w, h, 4)} fill="var(--brand)" className="transition-opacity group-hover:opacity-75" />}
                  {(!everyOther || i % 2 === data.length % 2 || i === data.length - 1) && (
                    <text x={x + w / 2} y={height - 8} textAnchor="middle" fontSize={11} fill="var(--muted)">
                      {d.label}
                    </text>
                  )}
                  <title>{`${d.label}: ${fmt(d.value)}`}</title>
                </g>
              );
            })}
            <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih} y2={pad.t + ih} stroke="var(--muted)" strokeWidth={1} />
          </svg>
        )}
      </div>
      {max > 0 && <DataTable data={data} fmt={fmt} />}
    </figure>
  );
}

export function HBarChart({
  data,
  title,
  fmt = (n) => n.toLocaleString("tr-TR"),
  rates,
  empty = "Henüz veri yok",
}: {
  data: Datum[];
  title: string;
  fmt?: (n: number) => string;
  /** Huni: önceki adıma oran (%) */
  rates?: (number | null)[];
  empty?: string;
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const max = Math.max(0, ...data.map((d) => d.value));
  const rowH = 30;
  const labelW = Math.min(130, Math.max(72, Math.round(W * 0.32)));
  const valueW = rates ? 76 : 44;
  const iw = Math.max(20, W - labelW - valueW - 8);
  const H = data.length * rowH + 4;
  const clip = (s: string) => {
    const maxChars = Math.floor((labelW - 10) / 6.4);
    return s.length > maxChars ? s.slice(0, Math.max(3, maxChars - 1)) + "…" : s;
  };

  return (
    <figure className="min-w-0">
      <figcaption className="sr-only">{title}</figcaption>
      <div ref={ref} className="w-full">
        {max === 0 ? (
          <ChartEmpty>{empty}</ChartEmpty>
        ) : (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} className="block max-w-full">
            <title>{title}</title>
            {data.map((d, i) => {
              const y = i * rowH + 4;
              const w = d.value > 0 ? Math.max(3, (d.value / max) * iw) : 0;
              const r = rates?.[i];
              return (
                <g key={d.key} className="group">
                  <rect x={0} y={y} width={W} height={rowH} fill="transparent" />
                  <text x={labelW - 10} y={y + rowH / 2 + 4} textAnchor="end" fontSize={12} fill="var(--text)">
                    {clip(d.label)}
                  </text>
                  <line x1={labelW} x2={labelW} y1={y + 3} y2={y + rowH - 3} stroke="var(--border)" />
                  {w > 0 && <path d={roundRight(labelW, y + 6, w, rowH - 12, 4)} fill="var(--brand)" className="transition-opacity group-hover:opacity-75" />}
                  <text x={labelW + w + 6} y={y + rowH / 2 + 4} fontSize={12} fill="var(--muted)" className="tabular-nums">
                    {fmt(d.value)}
                    {r !== undefined && r !== null ? ` · %${r}` : ""}
                  </text>
                  <title>{`${d.label}: ${fmt(d.value)}${r !== undefined && r !== null ? ` (önceki adımın %${r}'i)` : ""}`}</title>
                </g>
              );
            })}
          </svg>
        )}
      </div>
      {max > 0 && <DataTable data={data} fmt={fmt} extra={rates ? (_, i) => (rates[i] !== null && rates[i] !== undefined ? `%${rates[i]}` : null) : undefined} />}
    </figure>
  );
}
