"use client";

import { useState } from "react";
import { Badge, Button, Card, Dialog, ErrorNote, toast } from "@/components/ui";
import { useReadySession } from "@/data/session";
import { calendarDaysUntil } from "@/domain/kokpit";
import { fmtDate } from "@/lib/format";
import { PLANS, type PlanId } from "@/lib/plans";
import { PlanCards } from "./PlanCards";

export function PaketTab() {
  const { office, member, store, refresh } = useReadySession();
  const broker = member.rol === "broker";
  const [secim, setSecim] = useState<PlanId | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const kalan = office.deneme_bitis ? calendarDaysUntil(office.deneme_bitis, new Date()) : null;

  const change = async () => {
    if (!secim) return;
    setBusy(true);
    setError(null);
    try {
      await store.update("office", office.id, { plan: secim });
      await refresh();
      toast(`${PLANS[secim].ad} paketine geçildi`);
      setSecim(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card title="Aboneliğiniz">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>
            Mevcut paket: <b>{PLANS[office.plan].ad}</b>
          </span>
          {kalan !== null &&
            (kalan >= 0 ? (
              <Badge tone={kalan <= 3 ? "warn" : "info"}>
                Deneme {fmtDate(office.deneme_bitis)} tarihinde bitiyor ({kalan} gün)
              </Badge>
            ) : (
              <Badge tone="neutral">Deneme süresi {fmtDate(office.deneme_bitis)} tarihinde bitti</Badge>
            ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          Fiyatlandırma danışman başına aylık olacak ve pilot sonrası belirlenecek. Ödeme altyapısı (iyzico / PayTR sanal POS adaptörü) sonraki sürümde
          eklenecek; şimdilik paket değişikliği hemen uygulanır ve ücretlendirilmez.
        </p>
      </Card>

      <PlanCards current={office.plan} value={office.plan} onSelect={broker ? (p) => p !== office.plan && setSecim(p) : undefined} />
      {!broker && <p className="text-sm text-muted">Paketi yalnızca broker değiştirebilir.</p>}
      <p className="text-xs text-muted">
        Ücretli dış servisler (SMS, WhatsApp API, e-İmza, e-Fatura, Yapay Zekâ) &quot;kendi anahtarınızla&quot; modunda kendi sağlayıcı hesabınızla bağlanır; maliyeti
        doğrudan sağlayıcıya ödersiniz. Premium pakette kota dâhilinde gelir.
      </p>
      <ErrorNote error={error} />

      <Dialog
        open={secim !== null}
        onClose={() => setSecim(null)}
        title="Paket değişikliği"
        footer={
          <>
            <Button onClick={() => setSecim(null)}>Vazgeç</Button>
            <Button variant="primary" disabled={busy} onClick={() => void change()}>
              {busy ? "Uygulanıyor…" : "Onayla"}
            </Button>
          </>
        }
      >
        {secim && (
          <p className="text-sm">
            <b>{PLANS[office.plan].ad}</b> paketinden <b>{PLANS[secim].ad}</b> paketine geçilecek.
            {PLANS[secim].ozellikler.length < PLANS[office.plan].ozellikler.length &&
              " Alt pakete geçişte bazı modüller (ör. FSBO Radar, işlem hattı) menüde kilitli görünür; verileriniz silinmez."}
          </p>
        )}
      </Dialog>
    </div>
  );
}
