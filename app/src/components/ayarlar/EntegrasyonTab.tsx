"use client";

import { useCallback, useEffect, useState } from "react";
import { rpcErrorMessage } from "@/app/kurulum/validation";
import { Badge, Button, Card, Dialog, ErrorNote, Field, Input, Select, Spinner, toast } from "@/components/ui";
import { useReadySession } from "@/data/session";
import { PLANS, serviceEnabled, type PaidService } from "@/lib/plans";
import { clearIntegration, listIntegrations, PAID_SERVICES, saveIntegration, type IntegrationRow } from "./integrations";
import { SERVICE_LABEL, SERVICE_MODE_LABEL } from "./labels";

export function EntegrasyonTab() {
  const { office, member, mode, supabase, officeId } = useReadySession();
  const broker = member.rol === "broker";
  const ctx = { mode, supabase, officeId };
  const [rows, setRows] = useState<IntegrationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<PaidService | null>(null);
  const [saglayici, setSaglayici] = useState("");
  const [anahtar, setAnahtar] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await listIntegrations({ mode, supabase, officeId }));
    } catch (e) {
      setError(rpcErrorMessage(e));
      setRows([]);
    }
  }, [mode, supabase, officeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = (s: PaidService) => {
    const r = rows?.find((x) => x.servis === s);
    setSaglayici(r?.saglayici ?? SERVICE_LABEL[s].saglayicilar[0]);
    setAnahtar("");
    setError(null);
    setEdit(s);
  };

  const save = async () => {
    if (!edit) return;
    if (anahtar.trim().length < 8) {
      setError("API anahtarı çok kısa görünüyor.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveIntegration(ctx, edit, saglayici, anahtar);
      setAnahtar("");
      setEdit(null);
      toast("Anahtar kaydedildi");
      await load();
    } catch (e) {
      setError(rpcErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (s: PaidService) => {
    setError(null);
    try {
      await clearIntegration(ctx, s);
      toast("Entegrasyon kaldırıldı");
      await load();
    } catch (e) {
      setError(rpcErrorMessage(e));
    }
  };

  if (!rows) return <Spinner />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Ücretli servisler kapalı gelir; uygulama ücretsiz karşılıklarıyla çalışmaya devam eder. Paketiniz: <b className="text-text">{PLANS[office.plan].ad}</b>.
      </p>
      <ErrorNote error={edit ? null : error} />
      <Card title="Entegrasyonlar">
        <ul className="divide-y divide-border">
          {PAID_SERVICES.map((s) => {
            const mod = PLANS[office.plan].servisler[s];
            const row = rows.find((r) => r.servis === s);
            const acik = serviceEnabled(office.plan, s, Boolean(row?.aktif));
            const L = SERVICE_LABEL[s];
            return (
              <li key={s} className="flex flex-wrap items-start gap-3 py-3">
                <div className="min-w-0 flex-1 basis-60">
                  <p className="font-medium">{L.ad}</p>
                  <p className="text-xs text-muted">{L.aciklama}</p>
                  <p className="mt-1 flex flex-wrap gap-1.5">
                    <Badge tone={mod === "dahil" ? "ok" : mod === "kapali" ? "neutral" : "info"}>{SERVICE_MODE_LABEL[mod]}</Badge>
                    <Badge tone={acik ? "ok" : "neutral"}>{acik ? "Açık" : "Kapalı"}</Badge>
                    {row && (
                      <Badge tone="neutral">
                        {row.saglayici} · {row.anahtar_ref.startsWith("demo:") ? row.anahtar_ref.slice(5) : "Vault'ta şifreli"}
                      </Badge>
                    )}
                  </p>
                  {!acik && <p className="mt-1 text-xs text-muted">{L.ucretsiz}</p>}
                </div>
                {broker && mod === "kendi_anahtari" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => open(s)}>
                      {row ? "Anahtarı değiştir" : "Anahtar gir"}
                    </Button>
                    {row && (
                      <Button size="sm" variant="ghost" onClick={() => void remove(s)}>
                        Kaldır
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
      <div className="rounded-lg border border-border bg-surface p-3 text-xs text-muted">
        <p>
          <b className="text-text">Anahtar güvenliği:</b> API anahtarları tarayıcıda veya tabloda düz metin olarak tutulmaz. Supabase bağlıyken anahtar{" "}
          <b>Supabase Vault</b>&apos;ta şifrelenir; tabloda yalnızca Vault kaydının kimliği saklanır ve anahtarı yalnızca sunucu tarafı işlevler okuyabilir.
          {mode === "demo" && " Demo modunda anahtar hiçbir yere kaydedilmez; yalnızca maskelenmiş bir referans bu tarayıcıda tutulur."}
        </p>
      </div>
      {!broker && <p className="text-sm text-muted">Entegrasyonları yalnızca broker yönetebilir.</p>}

      <Dialog
        open={edit !== null}
        onClose={() => setEdit(null)}
        title={edit ? SERVICE_LABEL[edit].ad : ""}
        footer={
          <>
            <Button onClick={() => setEdit(null)}>Vazgeç</Button>
            <Button variant="primary" disabled={busy} onClick={() => void save()}>
              {busy ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </>
        }
      >
        {edit && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <Field label="Sağlayıcı">
              <Select value={saglayici} onChange={(e) => setSaglayici(e.target.value)}>
                {SERVICE_LABEL[edit].saglayicilar.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </Field>
            <Field label="API anahtarı" hint="Sağlayıcı panelinizden alın. Kaydettikten sonra tekrar gösterilmez.">
              <Input type="password" autoComplete="off" value={anahtar} onChange={(e) => setAnahtar(e.target.value)} />
            </Field>
            <ErrorNote error={error} />
          </form>
        )}
      </Dialog>
    </div>
  );
}
