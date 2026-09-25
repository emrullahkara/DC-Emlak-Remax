"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Dialog, Field, Input, toast } from "@/components/ui";
import { useReadySession } from "@/data/session";
import type { DocumentRow, OfficeMember, Person, Portfolio, Showing } from "@/data/types";
import { fieldLabel, requiredMissing } from "@/domain/templates";
import { maskPhone } from "@/domain/signing";
import { DocumentView } from "@/components/sozlesme/DocumentView";
import { createYgbForShowing, ygbTemplate, ygbValues } from "./ygb";

/**
 * Gösterim için Yer Gösterme Belgesi: otomatik dolan taslak, eksik zorunlu
 * alanların hızlı girişi, ardından imzaya gönderim (SignFlow).
 */
export function YgbDialog({
  showing,
  doc,
  portfolio,
  person,
  agent,
  onClose,
  onSend,
}: {
  showing: Showing;
  doc: DocumentRow | null;
  portfolio: Portfolio | null;
  person: Person | null;
  agent: OfficeMember | null;
  onClose: () => void;
  onSend: (doc: DocumentRow) => void;
}) {
  const s = useReadySession();
  const t = ygbTemplate();
  const [values, setValues] = useState<Record<string, string>>(() => doc?.alanlar ?? ygbValues({ showing, office: s.office, agent, portfolio, person }));
  // Eksik alan listesi ilk açılışta sabitlenir; kullanıcı yazdıkça alanlar kaybolmaz
  const [fields] = useState(() => requiredMissing(t, values));
  const [busy, setBusy] = useState(false);
  const missing = requiredMissing(t, values);

  const persist = async (): Promise<DocumentRow | null> => {
    const alanlar: Record<string, string> = {};
    for (const [k, v] of Object.entries(values)) if (v.trim()) alanlar[k] = v.trim();
    setBusy(true);
    try {
      const ctx = { officeId: s.officeId, userId: s.userId };
      const saved = doc ? await s.store.update("document", doc.id, { alanlar }) : await createYgbForShowing(s.store, ctx, showing, alanlar);
      return saved;
    } catch (e) {
      toast(`Belge kaydedilemedi: ${(e as Error).message}`);
      return null;
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      wide
      onClose={onClose}
      title="Yer Gösterme Belgesi"
      footer={
        <>
          <Button
            onClick={async () => {
              const d = await persist();
              if (d) {
                toast(doc ? "Belge güncellendi" : "Belge taslağı oluşturuldu");
                onClose();
              }
            }}
            disabled={busy}
          >
            {doc ? "Kaydet" : "Taslak oluştur"}
          </Button>
          <Button
            variant="primary"
            disabled={busy}
            onClick={async () => {
              const d = await persist();
              if (d) onSend(d);
            }}
          >
            Kaydet ve imzaya gönder
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="text-sm">
          <p>
            <b>{person?.ad_soyad ?? "Müşteri"}</b> — {portfolio?.baslik ?? "Portföy"}
          </p>
          <p className="text-muted">
            Belge; ofis, danışman, portföy ve kişi kartından otomatik doldu. İmza bağlantısı {person?.telefon ? maskPhone(person.telefon) : "müşteriye"} gönderilir; imza anında zaman damgası, cihaz bilgisi ve (izin verilirse) konum eklenir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="warn">{t.durum}</Badge>
          {missing.length ? <Badge tone="block">{missing.length} zorunlu alan eksik</Badge> : <Badge tone="ok">Zorunlu alanlar tamam</Badge>}
        </div>
        {fields.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <Field key={f} label={fieldLabel(f)} required>
                <Input
                  value={values[f] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f]: e.target.value }))}
                  inputMode={/tckn|_ay$/.test(f) ? "numeric" : undefined}
                  autoComplete="off"
                />
              </Field>
            ))}
          </div>
        )}
        <details className="rounded-lg border border-border p-3">
          <summary className="cursor-pointer text-sm font-medium">Belge önizlemesi</summary>
          <DocumentView template={t} values={values} className="mt-3" />
        </details>
        {doc && (
          <p className="text-xs text-muted">
            Tüm alanları düzenlemek için{" "}
            <Link className="text-brand underline" href={`/sozlesmeler/${doc.id}`}>
              belge sayfasını açın
            </Link>
            .
          </p>
        )}
      </div>
    </Dialog>
  );
}
