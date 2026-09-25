"use client";

import { useState } from "react";
import { Button, Dialog, Field, Textarea, cx, toast } from "@/components/ui";
import { useReadySession } from "@/data/session";
import type { Portfolio, Showing } from "@/data/types";
import { feedbackSummary, normalizeFeedback, type Feedback } from "@/domain/calendar";

function Rating({ label, value, onChange }: { label: string; value?: number; onChange: (n: number) => void }) {
  return (
    <fieldset>
      <legend className="text-sm text-muted">{label}</legend>
      <div className="mt-1 flex gap-1.5" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${label}: ${n}`}
            onClick={() => onChange(n)}
            className={cx(
              "grid h-10 w-10 place-items-center rounded-lg border text-sm font-semibold tabular-nums",
              value !== undefined && n <= value ? "border-brand bg-brand text-white" : "border-border bg-surface text-muted hover:text-text",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Gösterim sonrası 2 dakikalık geri bildirim (tasarım §5.8) → mal sahibi raporuna gider. */
export function FeedbackDialog({ showing, portfolio, onClose }: { showing: Showing; portfolio: Portfolio | null; onClose: () => void }) {
  const s = useReadySession();
  const [f, setF] = useState<Feedback>(showing.geri_bildirim ?? {});
  const [busy, setBusy] = useState(false);

  const logActivity = async (fb: Feedback | null) => {
    const summary = feedbackSummary(fb);
    await s.store.insert("activity", {
      office_id: s.officeId,
      user_id: s.userId,
      person_id: showing.person_id,
      portfolio_id: showing.portfolio_id,
      tur: "gosterim",
      icerik: `Gösterim tamamlandı: ${portfolio?.baslik ?? "portföy"}${summary ? `. Geri bildirim: ${summary}` : ""}`,
      tamamlandi: true,
    });
  };

  const save = async () => {
    const fb = normalizeFeedback(f);
    setBusy(true);
    try {
      await s.store.update("showing", showing.id, { geri_bildirim: fb });
      await logActivity(fb);
      toast("Geri bildirim kaydedildi");
      onClose();
    } catch (e) {
      toast(`Kaydedilemedi: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {
    setBusy(true);
    try {
      await logActivity(null);
    } finally {
      setBusy(false);
      onClose();
    }
  };

  return (
    <Dialog
      open
      onClose={() => void skip()}
      title="Gösterim geri bildirimi"
      footer={
        <>
          <Button onClick={() => void skip()} disabled={busy}>
            Atla
          </Button>
          <Button variant="primary" onClick={() => void save()} disabled={busy}>
            Kaydet
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted">Müşterinin izlenimini 1–5 arası puanlayın. Mal sahibi raporunda kullanılır.</p>
        <Rating label="Genel izlenim" value={f.puan} onChange={(n) => setF({ ...f, puan: n })} />
        <Rating label="Fiyat" value={f.fiyat} onChange={(n) => setF({ ...f, fiyat: n })} />
        <Rating label="Konum" value={f.konum} onChange={(n) => setF({ ...f, konum: n })} />
        <Field label="Not">
          <Textarea rows={3} value={f.not ?? ""} onChange={(e) => setF({ ...f, not: e.target.value })} placeholder="Ör. Mutfak küçük bulundu, eşiyle tekrar görmek istiyor" />
        </Field>
      </div>
    </Dialog>
  );
}
