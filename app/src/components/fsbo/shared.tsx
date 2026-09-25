"use client";

import { Badge, cx } from "@/components/ui";
import type { FsboStatus } from "@/data/types";
import { DURUM_ETIKET } from "@/domain/fsbo";

export function ScoreBadge({ skor, size = "md" }: { skor: number; size?: "md" | "lg" }) {
  const tone = skor >= 70 ? "bg-block text-bg" : skor >= 50 ? "bg-warn text-bg" : "bg-bg text-muted border border-border";
  return (
    <span
      className={cx("grid shrink-0 place-items-center rounded-full font-semibold tabular-nums", tone, size === "lg" ? "h-12 w-12 text-lg" : "h-10 w-10 text-sm")}
      title="FSBO sıcaklık skoru (0–100)"
      aria-label={`Skor ${skor}`}
    >
      {skor}
    </span>
  );
}

const DURUM_TONE: Record<FsboStatus, "info" | "neutral" | "brand" | "ok" | "block" | "warn"> = {
  yeni: "info",
  arandi: "neutral",
  gorusuldu: "brand",
  degerleme: "warn",
  yetki_alindi: "ok",
  vazgecildi: "block",
};

export function DurumBadge({ durum }: { durum: FsboStatus }) {
  return <Badge tone={DURUM_TONE[durum]}>{DURUM_ETIKET[durum]}</Badge>;
}

export function SignalBadges({ sinyaller }: { sinyaller: string[] }) {
  if (!sinyaller.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {sinyaller.map((s) => (
        <Badge key={s} tone={/acil|tayin|yurt|borç|miras/i.test(s) ? "block" : "warn"} className="whitespace-normal">
          {s}
        </Badge>
      ))}
    </span>
  );
}
