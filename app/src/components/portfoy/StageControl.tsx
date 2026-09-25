"use client";

import { useState } from "react";
import { Button, ComplianceDialog, Dialog, Select, toast } from "@/components/ui";
import { recordEvaluation } from "@/data/compliance-log";
import { useReadySession } from "@/data/session";
import type { PortfolioStage } from "@/data/types";
import type { Evaluation } from "@/domain/compliance";
import { ASAMALAR, canTransition, type Asama } from "@/domain/pipeline";
import { STAGE_LABEL } from "@/domain/portfoy";
import type { PortfolioBundle } from "./usePortfolioBundle";

const OLAY = "portfoy.asama_degistir";

/**
 * Aşama değiştirici. İleri geçişler uyum motorundan (`canTransition`) geçer:
 * ENGELLE → geçiş yapılmaz, UYAR → gerekçe ile devam; kararlar denetim kaydına yazılır.
 */
export function StageControl({ b }: { b: PortfolioBundle }) {
  const { store, officeId, userId } = useReadySession();
  const p = b.portfolio!;
  const d = b.derived!;
  const [ev, setEv] = useState<Evaluation | null>(null);
  const [pending, setPending] = useState<Asama | null>(null);
  const [busy, setBusy] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const apply = async (to: PortfolioStage, e: Evaluation | null, gerekce?: string) => {
    setBusy(true);
    try {
      if (e) await recordEvaluation(store, { officeId, userId }, OLAY, "portfolio", p.id, e, gerekce ?? `${STAGE_LABEL[p.asama]} → ${STAGE_LABEL[to]}`);
      await store.update("portfolio", p.id, { asama: to });
      toast(`Aşama: ${STAGE_LABEL[to]}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Aşama değiştirilemedi");
    } finally {
      setBusy(false);
    }
  };

  const change = async (to: Asama) => {
    if (to === p.asama) return;
    // Arşivden dönüşte tüm kapılar baştan değerlendirilir
    const from: Asama = p.asama === "arsiv" ? "aday" : (p.asama as Asama);
    let e: Evaluation;
    try {
      e = canTransition(from, to, { ilan: d.ilan, kapanis: d.kapanis });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Geçiş değerlendirilemedi");
      return;
    }
    const kritik = ASAMALAR.indexOf(to) > ASAMALAR.indexOf(from) && (to === "yayinda" || to === "tamamlandi" || e.sonuclar.length > 0);
    if (e.karar === "GEC") {
      await apply(to, kritik ? e : null);
      return;
    }
    if (e.karar === "ENGELLE") {
      await recordEvaluation(store, { officeId, userId }, OLAY, "portfolio", p.id, e, `${STAGE_LABEL[p.asama]} → ${STAGE_LABEL[to]} engellendi`).catch(() => undefined);
    }
    setPending(to);
    setEv(e);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted">Aşama</span>
        <Select aria-label="Aşama" value={p.asama === "arsiv" ? "" : p.asama} onChange={(e) => void change(e.target.value as Asama)} disabled={busy} className="min-w-44">
          {p.asama === "arsiv" && <option value="">Arşivde</option>}
          {ASAMALAR.map((a) => (
            <option key={a} value={a}>
              {STAGE_LABEL[a]}
            </option>
          ))}
        </Select>
      </label>
      {p.asama !== "arsiv" ? (
        <Button size="sm" variant="ghost" onClick={() => setArchiveOpen(true)}>
          Arşivle
        </Button>
      ) : (
        <Button size="sm" onClick={() => void change("aday")}>
          Arşivden çıkar
        </Button>
      )}

      <ComplianceDialog
        ev={ev}
        open={Boolean(ev)}
        title={pending ? `${STAGE_LABEL[p.asama]} → ${STAGE_LABEL[pending]}` : "Uyum Motoru"}
        onClose={() => {
          setEv(null);
          setPending(null);
        }}
        onProceed={
          ev?.karar === "UYAR" && pending
            ? (gerekce) => {
                const to = pending;
                const e = ev;
                setEv(null);
                setPending(null);
                void apply(to, e, gerekce);
              }
            : undefined
        }
      />

      <Dialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        title="Portföyü arşivle"
        footer={
          <>
            <Button onClick={() => setArchiveOpen(false)}>Vazgeç</Button>
            <Button
              variant="danger"
              onClick={() => {
                setArchiveOpen(false);
                void apply("arsiv", null);
              }}
            >
              Arşivle
            </Button>
          </>
        }
      >
        <p className="text-sm">Portföy listelerden ve eşleştirmeden çıkar; kayıtlar ve belgeler saklanmaya devam eder. İstediğiniz zaman arşivden çıkarabilirsiniz.</p>
      </Dialog>
    </div>
  );
}
