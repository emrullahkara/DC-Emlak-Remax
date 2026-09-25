"use client";

import { useState } from "react";
import { Button, Dialog, Field, Input } from "@/components/ui";
import type { TargetProgress } from "@/domain/kokpit";
import { tl } from "@/lib/format";
import { parseAmount, readTarget, writeTarget } from "./target";

export function TargetCard({
  officeId,
  userId,
  gerceklesen,
  now,
  progress,
}: {
  officeId: string;
  userId: string;
  gerceklesen: number;
  now: Date;
  progress: (hedef: number) => TargetProgress;
}) {
  const [hedef, setHedef] = useState<number | null>(() => readTarget(officeId, userId));
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const ay = now.toLocaleDateString("tr-TR", { month: "long" });
  const p = hedef ? progress(hedef) : null;

  const openEdit = () => {
    setDraft(hedef ? String(hedef) : "");
    setErr(null);
    setOpen(true);
  };

  const save = () => {
    const n = parseAmount(draft);
    if (draft.trim() && (n === null || n <= 0)) {
      setErr("Geçerli bir tutar girin (ör. 600.000).");
      return;
    }
    writeTarget(officeId, userId, n);
    setHedef(n && n > 0 ? n : null);
    setOpen(false);
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted">
          <span className="capitalize">{ay}</span> hedefi
        </p>
        <button type="button" onClick={openEdit} className="-m-1 rounded p-1 text-xs text-brand hover:bg-bg">
          {hedef ? "Düzenle" : "Hedef belirle"}
        </button>
      </div>
      {p ? (
        <>
          <p className="mt-1 text-xl font-semibold tabular-nums">%{p.oran}</p>
          <div className="mt-2 h-2 rounded-full bg-bg" role="progressbar" aria-label="Hedef ilerlemesi" aria-valuenow={p.oran} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-2 rounded-full bg-brand" style={{ width: `${p.oran}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted tabular-nums">
            {tl(p.gerceklesen)} / {tl(p.hedef)}
            {p.kalan > 0 && ` · kalan ${tl(p.kalan)}, ${p.kalanGun} gün`}
          </p>
        </>
      ) : (
        <>
          <p className="mt-1 text-xl font-semibold tabular-nums">{tl(gerceklesen)}</p>
          <p className="mt-1 text-xs text-muted">Bu ay gerçekleşen (KDV hariç). Aylık hedef belirleyin.</p>
        </>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Aylık ciro hedefi"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Vazgeç</Button>
            <Button variant="primary" onClick={save}>
              Kaydet
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <Field label="Hedef (₺, KDV hariç hizmet bedeli)" hint="Boş bırakırsanız hedef kaldırılır. Hedef bu cihazda, size özel saklanır.">
            <Input inputMode="decimal" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="ör. 600.000" />
          </Field>
          {err && <p className="mt-2 text-sm text-block">{err}</p>}
        </form>
        <p className="mt-3 text-xs text-muted">Gerçekleşen: bu ay açılan işlemlerin komisyon satırlarındaki matrah toplamı.</p>
      </Dialog>
    </div>
  );
}
