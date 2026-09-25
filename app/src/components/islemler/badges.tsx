"use client";

import { Badge } from "@/components/ui";
import type { AuthorizationContract, EidsStatus } from "@/data/types";
import { contractStatus } from "@/domain/deal";

export function YetkiBadge({ contracts, now }: { contracts: AuthorizationContract[]; now: Date }) {
  const s = contractStatus(contracts, now);
  switch (s.durum) {
    case "gecerli":
      return <Badge tone="ok">Yetki ✓</Badge>;
    case "bitiyor":
      return <Badge tone="warn">Yetki {s.kalanGun} gün</Badge>;
    case "doldu":
      return <Badge tone="block">Yetki süresi doldu</Badge>;
    case "imzasiz":
      return <Badge tone="warn">Yetki imza bekliyor</Badge>;
    default:
      return <Badge tone="block">Yetki yok</Badge>;
  }
}

export function EidsBadge({ durum }: { durum: EidsStatus }) {
  if (durum === "onaylandi") return <Badge tone="ok">EİDS ✓</Badge>;
  if (durum === "talep_edildi") return <Badge tone="warn">EİDS bekliyor</Badge>;
  if (durum === "reddedildi") return <Badge tone="block">EİDS reddedildi</Badge>;
  return <Badge tone="block">EİDS yok</Badge>;
}
