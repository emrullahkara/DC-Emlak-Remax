"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Badge, Button, Card, Dialog, EmptyState, ErrorNote, PageHeader, Spinner, toast } from "@/components/ui";
import { useReadySession, useRow, useTable } from "@/data/session";
import type { DocumentRow } from "@/data/types";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { fieldLabel, getTemplate, requiredMissing } from "@/domain/templates";
import { DOC_STATUS, YONTEM_LABEL, docTitle, syncAuthorizationContract } from "./actions";
import { DocumentEditor, MissingSummary } from "./DocumentEditor";
import { DocumentView, PrintStyles } from "./DocumentView";
import { recipientFromValues, useSignFlow } from "./SignFlow";

/** Şablondan üretilmemiş kayıt belgesi (ör. DASK poliçesi): salt okunur alan listesi. */
function RecordView({ doc }: { doc: DocumentRow }) {
  const entries = Object.entries(doc.alanlar ?? {}).filter(([k]) => !k.startsWith("_"));
  return (
    <div>
      <PageHeader back="/sozlesmeler" title={docTitle(doc.sablon)} subtitle={<span className="flex flex-wrap items-center gap-2"><Badge tone="info">Kayıt</Badge><span>{fmtDate(doc.created_at)}</span></span>} />
      <Card title="Kayıt bilgileri">
        {entries.length === 0 ? (
          <p className="text-sm text-muted">Alan yok.</p>
        ) : (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {entries.map(([k, v]) => (
              <div key={k} className="min-w-0 rounded-lg border border-border p-2">
                <dt className="text-xs text-muted">{fieldLabel(k)}</dt>
                <dd className="break-words font-medium">{/^\d{4}-\d{2}-\d{2}$/.test(v) ? fmtDate(v) : v}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="mt-3 text-xs text-muted">Bu kayıt başka bir modülde oluşturuldu; şablon ve imza akışı yoktur. Saklama bitişi: {fmtDate(doc.saklama_bitis)}</p>
      </Card>
    </div>
  );
}

export function DocumentDetail({ id }: { id: string }) {
  const s = useReadySession();
  const docQ = useRow("document", id);
  const doc = docQ.data;
  const sigs = useTable("signature", { eq: { document_id: id } });
  const portfolio = useRow("portfolio", doc?.portfolio_id ?? null);
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const flow = useSignFlow(() => {
    docQ.reload();
    sigs.reload();
  });
  const synced = useRef<string | null>(null);

  // Uzaktan imzalanan yetki sözleşmesini portföyün yetki kaydına işle (idempotent)
  useEffect(() => {
    if (!doc || doc.durum !== "imzalandi" || doc.sablon !== "yetki-sozlesmesi" || synced.current === doc.id) return;
    synced.current = doc.id;
    syncAuthorizationContract(s.store, doc)
      .then((changed) => changed && toast("Portföyün yetki sözleşmesi kaydı güncellendi"))
      .catch(() => {});
  }, [doc, s.store]);

  // İmza beklenirken durum değişikliğini yakala (Supabase'de müşteri başka cihazda imzalar)
  const { reload: reloadDoc } = docQ;
  const { reload: reloadSigs } = sigs;
  useEffect(() => {
    if (doc?.durum !== "imzada") return;
    const t = setInterval(() => {
      reloadDoc();
      reloadSigs();
    }, 15_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.durum]);

  if (docQ.loading) return <Spinner />;
  if (docQ.error) return <ErrorNote error={docQ.error} />;
  if (!doc) return <EmptyState title="Belge bulunamadı" action={<Link href="/sozlesmeler" className="text-brand underline">Sözleşmelere dön</Link>} />;
  const t = getTemplate(doc.sablon);
  if (!t) return <RecordView doc={doc} />;

  const values = draft ?? doc.alanlar ?? {};
  const dirty = draft !== null;
  const editable = doc.durum === "taslak";
  const st = DOC_STATUS[doc.durum];
  const recipient = recipientFromValues(values);

  const save = async (): Promise<DocumentRow | null> => {
    if (!draft) return doc;
    try {
      const alanlar: Record<string, string> = {};
      for (const [k, v] of Object.entries(draft)) if (v.trim()) alanlar[k] = v.trim();
      const u = await s.store.update("document", doc.id, { alanlar });
      setDraft(null);
      toast("Belge kaydedildi");
      return u;
    } catch (e) {
      toast(`Kaydedilemedi: ${(e as Error).message}`);
      return null;
    }
  };

  const send = async () => {
    const u = await save();
    if (u) flow.send(u);
  };
  const wet = async () => {
    const u = await save();
    if (u) flow.wet(u);
  };
  const cancelDoc = async () => {
    await s.store.update("document", doc.id, { durum: "iptal", imza_token: null });
    setConfirmCancel(false);
    toast("Belge iptal edildi (saklama süresince arşivde kalır)");
  };

  return (
    <div>
      <PrintStyles />
      <PageHeader
        back="/sozlesmeler"
        title={t.baslik}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={st.tone}>{st.label}</Badge>
            <span>
              {values.belge_no || values.sozlesme_no || values.protokol_no || values.tutanak_no || values.form_no || ""} · {fmtDate(doc.created_at)}
            </span>
          </span>
        }
        actions={
          <>
            {editable && (
              <>
                {dirty && (
                  <Button onClick={() => void save()} variant="secondary">
                    Kaydet
                  </Button>
                )}
                <Button variant="primary" onClick={() => void send()} disabled={flow.busy}>
                  İmzaya gönder
                </Button>
              </>
            )}
            {doc.durum === "imzada" && (
              <Button variant="primary" onClick={() => flow.share(doc, recipient)}>
                Bağlantıyı paylaş
              </Button>
            )}
            <Button onClick={() => window.print()}>Yazdır / PDF</Button>
          </>
        }
      />

      {doc.durum === "imzada" && (
        <p className="mb-4 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">
          İmza bekleniyor{recipient.ad ? ` — ${recipient.ad}` : ""}. Belge imza sürecindeyken düzenlenemez; değişiklik için bağlantıyı geri çekin.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0">
          {editable ? (
            <DocumentEditor template={t} values={values} onChange={(k, v) => setDraft({ ...values, [k]: v })} />
          ) : (
            <DocumentView template={t} values={values} />
          )}
        </div>

        <aside className="min-w-0 space-y-4">
          <Card title="Durum">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Zorunlu alanlar</dt>
                <dd>
                  <MissingSummary template={t} values={values} />
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Şablon sürümü</dt>
                <dd className="text-right">{doc.sablon_surum}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Kural seti</dt>
                <dd>{doc.kural_surum}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Saklama bitişi</dt>
                <dd>{fmtDate(doc.saklama_bitis)}</dd>
              </div>
              {portfolio.data && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">Portföy</dt>
                  <dd className="min-w-0 truncate text-right">
                    <Link className="text-brand underline" href={`/portfoyler/${portfolio.data.id}`}>
                      {portfolio.data.baslik}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-4 flex flex-col gap-2">
              {(doc.durum === "taslak" || doc.durum === "imzada") && (
                <Button onClick={() => void wet()} disabled={flow.busy}>
                  Islak imza ile imzalandı
                </Button>
              )}
              {doc.durum === "imzada" && <Button onClick={() => void flow.withdraw(doc)}>Geri çek ve düzenle</Button>}
              {(doc.durum === "taslak" || doc.durum === "imzada") && (
                <Button variant="ghost" className="text-block" onClick={() => setConfirmCancel(true)}>
                  Belgeyi iptal et
                </Button>
              )}
            </div>
            {editable && requiredMissing(t, values).length > 0 && <p className="mt-3 text-xs text-muted">Eksik zorunlu alanlar kırmızı işaretlidir; tamamlanmadan imzaya gönderilemez.</p>}
          </Card>

          <Card title={`İmzalar (${sigs.data.length})`}>
            {sigs.data.length === 0 ? (
              <p className="text-sm text-muted">Henüz imza yok.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {sigs.data.map((g) => {
                  const k = g.kanit as { ad_soyad?: string; sha256?: string };
                  return (
                    <li key={g.id} className="rounded-lg border border-border p-3">
                      <p className="font-medium">{k.ad_soyad ?? "—"}</p>
                      <p className="text-xs text-muted">
                        {YONTEM_LABEL[g.yontem]} · {fmtDateTime(g.imzalandi_at)}
                      </p>
                      {g.konum && (
                        <p className="text-xs text-muted">
                          Konum: {g.konum.lat.toFixed(4)}, {g.konum.lng.toFixed(4)}
                        </p>
                      )}
                      {k.sha256 && (
                        <p className="mt-1 break-all font-mono text-[11px] text-muted" title="Belge özet değeri (SHA-256)">
                          SHA-256: {k.sha256}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </aside>
      </div>

      {/* Yalnızca yazdırmada görünen temiz kopya */}
      <div className="belge-yazdir hidden print:block">
        <DocumentView template={t} values={values} className="border-0 p-0" />
        {sigs.data.length > 0 && (
          <p className="mt-4 text-xs">
            İmzalar:{" "}
            {sigs.data
              .map((g) => `${(g.kanit as { ad_soyad?: string }).ad_soyad ?? "—"} (${YONTEM_LABEL[g.yontem]}, ${fmtDateTime(g.imzalandi_at)})`)
              .join("; ")}
          </p>
        )}
      </div>

      <Dialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Belge iptal edilsin mi?"
        footer={
          <>
            <Button onClick={() => setConfirmCancel(false)}>Vazgeç</Button>
            <Button variant="danger" onClick={() => void cancelDoc()}>
              İptal et
            </Button>
          </>
        }
      >
        <p className="text-sm">Belge silinmez; saklama süresi boyunca “İptal” durumunda arşivde kalır. Açık imza bağlantısı geçersiz olur.</p>
      </Dialog>
      {flow.ui}
    </div>
  );
}
