"use client";

/**
 * Portföy modülü ortak küçük bileşenleri: aşama/sağlık/uyum rozetleri,
 * fiyat etiketi, kapak görseli.
 */
import { useMemo } from "react";
import { Badge, cx } from "@/components/ui";
import type { Portfolio, PortfolioStage } from "@/data/types";
import { EIDS_LABEL, STAGE_LABEL, type KvkkDurum, type YetkiDurum } from "@/domain/portfoy";
import { shortTL, tl } from "@/lib/format";

type Tone = "neutral" | "ok" | "warn" | "block" | "info" | "brand";

const STAGE_TONE: Record<PortfolioStage, Tone> = {
  aday: "neutral",
  degerleme: "info",
  yetki: "info",
  yayinda: "ok",
  teklif: "brand",
  kapora: "brand",
  tapu: "warn",
  tamamlandi: "ok",
  arsiv: "neutral",
};

export function StageBadge({ asama }: { asama: PortfolioStage }) {
  return <Badge tone={STAGE_TONE[asama]}>{STAGE_LABEL[asama]}</Badge>;
}

export function healthTone(puan: number | null | undefined): Tone {
  if (puan === null || puan === undefined) return "neutral";
  return puan >= 75 ? "ok" : puan >= 50 ? "warn" : "block";
}

export function HealthBadge({ puan }: { puan: number | null | undefined }) {
  return (
    <Badge tone={healthTone(puan)} className="relative tabular-nums">
      <span aria-hidden>♥</span>
      <span className="sr-only">Sağlık skoru</span> {puan ?? "—"}
    </Badge>
  );
}

export function YetkiBadge({ y }: { y: YetkiDurum }) {
  if (y.durum === "yok") return <Badge tone="block">Yetki yok</Badge>;
  if (y.durum === "imzasiz") return <Badge tone="warn">Yetki imzasız</Badge>;
  if (y.durum === "doldu") return <Badge tone="block">Yetki doldu</Badge>;
  return <Badge tone={y.kalan <= 15 ? "warn" : "ok"}>Yetki {y.kalan} gün</Badge>;
}

export function EidsBadge({ durum }: { durum: Portfolio["eids_durum"] }) {
  const tone: Tone = durum === "onaylandi" ? "ok" : durum === "talep_edildi" ? "warn" : "block";
  return <Badge tone={tone}>EİDS {durum === "onaylandi" ? "✓" : durum === "talep_edildi" ? "bekliyor" : durum === "reddedildi" ? "red" : "yok"}</Badge>;
}

export function EidsText({ durum }: { durum: Portfolio["eids_durum"] }) {
  return <>{EIDS_LABEL[durum]}</>;
}

export function KvkkBadge({ durum }: { durum: KvkkDurum }) {
  if (durum === "tamam") return <Badge tone="ok">KVKK ✓</Badge>;
  if (durum === "malik_yok") return <Badge tone="neutral">Malik yok</Badge>;
  return <Badge tone="warn">KVKK eksik</Badge>;
}

export function priceText(p: Pick<Portfolio, "fiyat" | "ilan_tipi">, short = false) {
  if (p.fiyat === null || p.fiyat === undefined) return "Fiyat yok";
  const s = short ? shortTL(p.fiyat) : tl(p.fiyat);
  return p.ilan_tipi === "kiralik" ? `${s} / ay` : s;
}

/** Görsel yoksa konuma göre renk tonlu yer tutucu */
export function CoverImage({ url, alt, className, children }: { url?: string | null; alt: string; className?: string; children?: React.ReactNode }) {
  const hue = useMemo(() => {
    let h = 0;
    for (const ch of alt) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return h;
  }, [alt]);
  return (
    <div
      className={cx("relative overflow-hidden bg-bg", className)}
      style={url ? undefined : { background: `linear-gradient(135deg, hsl(${hue} 45% 55% / .35), hsl(${(hue + 40) % 360} 45% 45% / .15))` }}
    >
      {url ? (
        // Kullanıcı yüklemesi / imzalı depolama bağlantısı; next/image optimizasyonu gerekmez
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="grid h-full w-full place-items-center text-3xl text-muted/60" aria-hidden>
          ⌂
        </div>
      )}
      {children}
    </div>
  );
}

export function KV({ items }: { items: [React.ReactNode, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {items.map(([k, v], i) => (
        <div key={i} className="flex min-w-0 items-baseline justify-between gap-3 border-b border-border/60 pb-2">
          <dt className="text-muted">{k}</dt>
          <dd className="min-w-0 text-right font-medium break-words">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function YesNo({ v }: { v: boolean | null | undefined }) {
  if (v === null || v === undefined) return <span className="text-muted">Bilinmiyor</span>;
  return v ? <span className="text-ok">✓ Var</span> : <span className="text-block">✕ Yok</span>;
}
