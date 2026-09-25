"use client";

/**
 * Portföyün işlem hattı aşamasını değiştirir. Her geçişte Uyum Motoru
 * (`canTransition`) çalışır ve karar denetim kaydına yazılır:
 *   GEC     → taşınır
 *   UYAR    → gerekçe istenir, onaylanırsa taşınır
 *   ENGELLE → taşınmaz, eksikler gösterilir
 * "Satıldı / Kiralandı"ya geçiş için işlem (deal) kaydı gerekir.
 */
import { useCallback, useState } from "react";
import { ButtonLink, Button, ComplianceDialog, Dialog, toast } from "@/components/ui";
import { recordEvaluation } from "@/data/compliance-log";
import { useReadySession } from "@/data/session";
import type { Deal, Portfolio } from "@/data/types";
import type { Evaluation } from "@/domain/compliance";
import { buildClosingContext, buildListingContext } from "@/domain/deal";
import { ASAMALAR, ASAMA_ETIKET, canTransition, type Asama } from "@/domain/pipeline";

export type MoveResult = "moved" | "blocked" | "pending" | "need_deal" | "noop" | "error";

export type RequestMove = (p: Portfolio, to: Asama, onMoved?: () => void) => Promise<MoveResult>;

type Pending ={ p: Portfolio; from: Asama; to: Asama; ev: Evaluation; onMoved?: () => void };

export function latestDeal(deals: Deal[]): Deal | null {
  return [...deals].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0] ?? null;
}

export function useStageMover() {
  const { store, office, officeId, userId } = useReadySession();
  const [pending, setPending] = useState<Pending | null>(null);
  const [needDeal, setNeedDeal] = useState<Portfolio | null>(null);

  const log = useCallback(
    (x: Pending, gerekce?: string) =>
      recordEvaluation(store, { officeId, userId }, `asama_gecisi:${x.from}>${x.to}`, "portfolio", x.p.id, x.ev, gerekce),
    [store, officeId, userId],
  );

  const apply = useCallback(
    async (x: Pending) => {
      await store.update("portfolio", x.p.id, { asama: x.to });
      toast(`${x.p.baslik ?? "Portföy"} → ${ASAMA_ETIKET[x.to]}`);
      x.onMoved?.();
    },
    [store],
  );

  const requestMove = useCallback(
    async (p: Portfolio, to: Asama, onMoved?: () => void): Promise<MoveResult> => {
      const from: Asama = p.asama === "arsiv" ? "aday" : p.asama;
      if (p.asama === to) return "noop";
      try {
        const now = new Date();
        const [contracts, deals] = await Promise.all([
          store.list("authorization_contract", { eq: { portfolio_id: p.id } }),
          store.list("deal", { eq: { portfolio_id: p.id } }),
        ]);
        const ilan = buildListingContext(office, p, contracts, now);
        const kapanisGerekli = ASAMALAR.indexOf(from) < ASAMALAR.indexOf("tamamlandi") && to === "tamamlandi";
        const deal = latestDeal(deals);
        if (kapanisGerekli && !deal) {
          setNeedDeal(p);
          return "need_deal";
        }
        const ev = canTransition(from, to, { ilan, kapanis: deal ? buildClosingContext(deal, now) : undefined });
        const x: Pending = { p, from, to, ev, onMoved };
        if (ev.karar === "UYAR") {
          setPending(x);
          return "pending";
        }
        await log(x);
        if (ev.karar === "ENGELLE") {
          setPending(x);
          return "blocked";
        }
        await apply(x);
        return "moved";
      } catch (e) {
        toast(`Aşama değiştirilemedi: ${(e as Error).message}`);
        return "error";
      }
    },
    [store, office, log, apply],
  );

  const dialogs = (
    <>
      <ComplianceDialog
        ev={pending?.ev ?? null}
        open={!!pending}
        title={pending ? `Uyum Motoru · ${ASAMA_ETIKET[pending.to]}` : undefined}
        onClose={() => {
          const x = pending;
          setPending(null);
          if (x?.ev.karar === "UYAR") void log(x, "Kullanıcı geçişten vazgeçti");
        }}
        onProceed={async (gerekce) => {
          const x = pending;
          setPending(null);
          if (!x) return;
          try {
            await log(x, gerekce);
            await apply(x);
          } catch (e) {
            toast(`Aşama değiştirilemedi: ${(e as Error).message}`);
          }
        }}
      />
      <Dialog
        open={!!needDeal}
        onClose={() => setNeedDeal(null)}
        title="Önce işlem kaydı oluşturun"
        footer={
          <>
            <Button onClick={() => setNeedDeal(null)}>Kapat</Button>
            {needDeal && (
              <ButtonLink variant="primary" href={`/islemler/${needDeal.id}?sekme=islem`}>
                İşlem oluştur
              </ButtonLink>
            )}
          </>
        }
      >
        <p className="text-sm">
          <b>{needDeal?.baslik}</b> için henüz işlem (alıcı, bedel, kapanış kontrol listesi) yok. Satış/kiralama tamamlanmadan önce Uyum Motoru
          DASK, tapu kaydı sorgusu ve müşteriyi tanıma (MASAK) adımlarını işlem kaydı üzerinden kontrol eder.
        </p>
      </Dialog>
    </>
  );

  return { requestMove, dialogs };
}
