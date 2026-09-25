"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Badge, Button, ButtonLink, EmptyState, ErrorNote, PageHeader, Select, Spinner, Tabs } from "@/components/ui";
import { useReadySession, useRow, useTable } from "@/data/session";
import { ASAMALAR, ASAMA_ETIKET, type Asama } from "@/domain/pipeline";
import { ILAN_TIPLERI } from "@/lib/format";
import { EidsBadge, YetkiBadge } from "./badges";
import { CommissionTab } from "./CommissionTab";
import { DealTab } from "./DealTab";
import { OffersTab } from "./OffersTab";
import { priceLabel } from "./Pipeline";
import { latestDeal, useStageMover } from "./useStageMover";

type Sekme = "teklifler" | "islem" | "komisyon";
const SEKMELER: Sekme[] = ["teklifler", "islem", "komisyon"];

export function DealWorkspace() {
  const params = useParams<{ portfolioId: string }>();
  const id = decodeURIComponent(params.portfolioId);
  const search = useSearchParams();
  const ilk = search.get("sekme") as Sekme | null;
  const [sekme, setSekme] = useState<Sekme>(ilk && SEKMELER.includes(ilk) ? ilk : "teklifler");
  const [now] = useState(() => new Date());
  const { officeId } = useReadySession();

  const portfolio = useRow("portfolio", id);
  const deals = useTable("deal", { eq: { portfolio_id: id } });
  const offers = useTable("offer", { eq: { portfolio_id: id }, order: { column: "created_at", ascending: true } });
  const persons = useTable("person", { eq: { office_id: officeId }, order: { column: "ad_soyad" } });
  const contracts = useTable("authorization_contract", { eq: { portfolio_id: id } });
  const members = useTable("office_member", { eq: { office_id: officeId } });
  const { requestMove, dialogs } = useStageMover();

  if (portfolio.loading || deals.loading) return <Spinner />;
  const p = portfolio.data;
  if (!p) {
    return (
      <EmptyState title="Portföy bulunamadı" action={<ButtonLink href="/islemler">İşlemlere dön</ButtonLink>}>
        Kayıt silinmiş ya da erişim yetkiniz yok.
      </EmptyState>
    );
  }
  const deal = latestDeal(deals.data);
  const owner = members.data.find((m) => m.user_id === p.owner_id);

  return (
    <div className="space-y-4">
      <PageHeader
        back="/islemler"
        title={p.baslik ?? "Portföy"}
        subtitle={
          <>
            {priceLabel(p)} · {ILAN_TIPLERI[p.ilan_tipi]} · {[p.ilce, p.mahalle].filter(Boolean).join(" / ") || "—"} · Sorumlu: {owner?.ad_soyad ?? "—"}
          </>
        }
        actions={<ButtonLink href={`/portfoyler/${p.id}`}>Portföy kartı</ButtonLink>}
      />
      <ErrorNote error={portfolio.error ?? deals.error} />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-3">
        <label className="w-full text-sm sm:w-auto sm:min-w-56 sm:max-w-xs sm:flex-1">
          <span className="text-muted">Aşama</span>
          <Select
            className="mt-1"
            value={p.asama === "arsiv" ? "" : p.asama}
            onChange={(e) => void requestMove(p, e.target.value as Asama)}
            aria-label="Aşama"
          >
            {p.asama === "arsiv" && <option value="">Arşiv</option>}
            {ASAMALAR.map((s) => (
              <option key={s} value={s}>
                {ASAMA_ETIKET[s]}
              </option>
            ))}
          </Select>
        </label>
        <div className="flex flex-wrap gap-1 pb-2">
          <YetkiBadge contracts={contracts.data} now={now} />
          <EidsBadge durum={p.eids_durum} />
          {p.asama === "tamamlandi" && <Badge tone="ok">Tamamlandı</Badge>}
        </div>
        {p.asama !== "tamamlandi" && (
          <Button variant="ok" className="ml-auto" onClick={() => void requestMove(p, "tamamlandi")}>
            ✓ Tamamlandı
          </Button>
        )}
      </div>

      <Tabs<Sekme>
        tabs={[
          { id: "teklifler", label: `Teklifler (${offers.data.length})` },
          { id: "islem", label: deal ? "İşlem" : "İşlem · yok" },
          { id: "komisyon", label: "Komisyon" },
        ]}
        value={sekme}
        onChange={setSekme}
      />

      {sekme === "teklifler" && (
        <OffersTab portfolio={p} offers={offers.data} persons={persons.data} deal={deal} requestMove={requestMove} now={now} />
      )}
      {sekme === "islem" && <DealTab portfolio={p} deal={deal} persons={persons.data} requestMove={requestMove} now={now} />}
      {sekme === "komisyon" &&
        (deal ? (
          <CommissionTab key={deal.id} portfolio={p} deal={deal} contracts={contracts.data} members={members.data} />
        ) : (
          <EmptyState title="Önce işlem oluşturun" action={<Button variant="primary" onClick={() => setSekme("islem")}>İşlem oluştur</Button>}>
            Komisyon, işlem bedeli üzerinden hesaplanır.
          </EmptyState>
        ))}
      {dialogs}
    </div>
  );
}
