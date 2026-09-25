"use client";

import { Badge, cx } from "@/components/ui";
import { PLANS, type PlanId } from "@/lib/plans";
import { FEATURE_LABEL, SERVICE_LABEL, SERVICE_MODE_LABEL } from "./labels";

const ORDER: PlanId[] = ["temel", "profesyonel", "premium"];

/**
 * Paket kartları. `onSelect` verilirse kartlar seçilebilir (radyo grubu).
 * `compact` kurulum ekranında özellik listesini kısaltır.
 */
export function PlanCards({
  value,
  current,
  onSelect,
  compact,
  disabled,
}: {
  value?: PlanId;
  current?: PlanId;
  onSelect?: (p: PlanId) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <div role={onSelect ? "radiogroup" : undefined} aria-label="Paket" className="grid gap-3 md:grid-cols-3">
      {ORDER.map((id, i) => {
        const p = PLANS[id];
        const onceki = i > 0 ? PLANS[ORDER[i - 1]] : null;
        const yeni = p.ozellikler.filter((f) => !onceki?.ozellikler.includes(f));
        const secili = value === id;
        const Tag = onSelect ? "button" : "div";
        return (
          <Tag
            key={id}
            {...(onSelect
              ? { type: "button" as const, role: "radio", "aria-checked": secili, disabled, onClick: () => onSelect(id) }
              : {})}
            className={cx(
              "flex min-w-0 flex-col rounded-xl border bg-surface p-4 text-left",
              secili ? "border-brand ring-2 ring-brand" : "border-border",
              onSelect && "transition hover:border-brand disabled:opacity-60",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold">{p.ad}</h3>
              {current === id && <Badge tone="brand">Mevcut paket</Badge>}
              {id === "profesyonel" && current !== id && <Badge tone="info">Önerilen</Badge>}
            </div>
            <p className="mt-1 text-xs text-muted">{p.aciklama}</p>
            <ul className="mt-3 space-y-1 text-sm">
              {onceki && <li className="text-muted">✓ {onceki.ad} paketindeki her şey</li>}
              {(compact ? yeni.slice(0, 4) : yeni).map((f) => (
                <li key={f}>✓ {FEATURE_LABEL[f]}</li>
              ))}
              {compact && yeni.length > 4 && <li className="text-muted">+ {yeni.length - 4} özellik daha</li>}
            </ul>
            {!compact && (
              <dl className="mt-3 space-y-0.5 border-t border-border pt-2 text-xs">
                {(Object.keys(p.servisler) as (keyof typeof p.servisler)[]).map((s) => (
                  <div key={s} className="flex justify-between gap-2">
                    <dt className="truncate text-muted">{SERVICE_LABEL[s].ad.split(" (")[0]}</dt>
                    <dd className={cx("shrink-0", p.servisler[s] === "dahil" ? "text-ok" : p.servisler[s] === "kapali" ? "text-muted" : "")}>
                      {SERVICE_MODE_LABEL[p.servisler[s]]}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="mt-auto pt-3 text-xs text-muted">{p.denemeGun} gün ücretsiz deneme · fiyat pilot sonrası</p>
          </Tag>
        );
      })}
    </div>
  );
}
