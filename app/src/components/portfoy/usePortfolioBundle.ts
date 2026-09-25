"use client";

import { useMemo } from "react";
import { useReadySession, useRow, useTable } from "@/data/session";
import {
  closingContext,
  currentContract,
  evrakListesi,
  healthInput,
  listingContext,
  ownersKvkk,
  performance,
  yetkiDurumu,
} from "@/domain/portfoy";
import { evaluateListingPublish } from "@/domain/compliance";
import { portfolioHealth } from "@/domain/scoring";

/** Portföy detay ekranının ihtiyaç duyduğu tüm satırlar ve türetilmiş durumlar */
export function usePortfolioBundle(id: string) {
  const { office } = useReadySession();
  const bugun = useMemo(() => new Date(), []);
  const portfolio = useRow("portfolio", id);
  const byPortfolio = { eq: { portfolio_id: id } } as const;
  const owners = useTable("portfolio_owner", byPortfolio);
  const contracts = useTable("authorization_contract", byPortfolio);
  const media = useTable("media", { ...byPortfolio, order: { column: "sira", ascending: true } });
  const history = useTable("portfolio_price_history", { ...byPortfolio, order: { column: "created_at", ascending: true } });
  const showings = useTable("showing", { ...byPortfolio, order: { column: "planlanan", ascending: false } });
  const offers = useTable("offer", byPortfolio);
  const docs = useTable("document", byPortfolio);
  const deals = useTable("deal", byPortfolio);
  const persons = useTable("person", { eq: { office_id: office.id } });
  const ownerIds = useMemo(() => owners.data.map((o) => o.person_id), [owners.data]);
  const consents = useTable("consent", { in: { person_id: ownerIds } }, ownerIds.length > 0);

  const p = portfolio.data;
  const derived = useMemo(() => {
    if (!p) return null;
    const deal = deals.data[0] ?? null;
    const ownerPersons = ownerIds.map((pid) => persons.data.find((x) => x.id === pid)).filter((x): x is NonNullable<typeof x> => Boolean(x));
    const ilan = listingContext(p, office, contracts.data, bugun);
    const health = portfolioHealth(healthInput(p, { media: media.data, offers: offers.data }, bugun));
    return {
      deal,
      ownerPersons,
      ilan,
      kapanis: closingContext(p, deal, docs.data, bugun),
      publishEval: evaluateListingPublish(ilan),
      yetki: yetkiDurumu(contracts.data, bugun),
      contract: currentContract(contracts.data),
      kvkk: ownersKvkk(ownerIds, consents.data),
      health,
      evrak: evrakListesi({ portfolio: p, contracts: contracts.data, docs: docs.data, deal, ownerIds, consents: consents.data }, bugun),
      perf: performance(p, history.data, showings.data, offers.data, bugun),
    };
  }, [p, deals.data, ownerIds, persons.data, office, contracts.data, bugun, media.data, offers.data, docs.data, consents.data, history.data, showings.data]);

  return {
    bugun,
    loading: portfolio.loading,
    error: portfolio.error,
    portfolio: p,
    owners: owners.data,
    contracts: contracts.data,
    media: media.data,
    history: history.data,
    showings: showings.data,
    offers: offers.data,
    docs: docs.data,
    persons: persons.data,
    consents: consents.data,
    derived,
  };
}

export type PortfolioBundle = ReturnType<typeof usePortfolioBundle>;
