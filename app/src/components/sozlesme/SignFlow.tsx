"use client";

/**
 * İmzaya gönderim akışı (Sözleşmeler ve Takvim ortak kullanır):
 *   Uyum Motoru değerlendirmesi → ENGELLE/UYAR diyaloğu → denetim kaydı →
 *   tek kullanımlık bağlantı → WhatsApp / e-posta / kopyala paylaşımı.
 * Ayrıca ıslak imza kaydı ve imzayı geri çekme.
 */
import { useState } from "react";
import { Button, ComplianceDialog, Dialog, Field, Input, Textarea, toast } from "@/components/ui";
import { useReadySession } from "@/data/session";
import type { DocumentRow } from "@/data/types";
import type { Evaluation } from "@/domain/compliance";
import { mailtoLink, maskPhone, signingMessage, signingUrl, whatsappLink } from "@/domain/signing";
import { evaluateTemplateSign, getTemplate } from "@/domain/templates";
import { toLocalInput } from "@/domain/calendar";
import { logSignEvaluation, openForSigning, recordWetSignature, withdrawSigning } from "./actions";

export interface Recipient {
  ad?: string | null;
  telefon?: string | null;
  eposta?: string | null;
}

const PARTY_PREFIXES = ["gosterilen", "malik", "alici", "kiraci", "ilgili_kisi", "musteri", "satici", "kiraya_veren", "teslim_alan"];

/** Belge alanlarından imzalayacak kişinin iletişim bilgisi */
export function recipientFromValues(v: Record<string, string> | null | undefined): Recipient {
  const a = v ?? {};
  for (const p of PARTY_PREFIXES) {
    const ad = a[`${p}_ad_soyad`] || a[`${p}_ad_soyad_unvan`];
    if (ad) return { ad, telefon: a[`${p}_telefon`] || null, eposta: a[`${p}_eposta`] || null };
  }
  return {};
}

function origin() {
  return typeof window !== "undefined" ? window.location.origin : "";
}

export function ShareDialog({ doc, recipient, open, onClose }: { doc: DocumentRow | null; recipient: Recipient; open: boolean; onClose: () => void }) {
  const { office, mode } = useReadySession();
  if (!doc?.imza_token) return null;
  const t = getTemplate(doc.sablon);
  const url = signingUrl(origin(), doc.imza_token);
  const baslik = t?.baslik ?? doc.sablon;
  const msg = signingMessage({ baslik, unvan: office.unvan, url, ad: recipient.ad });
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast("İmza bağlantısı kopyalandı");
    } catch {
      toast("Kopyalanamadı; bağlantıyı seçip kopyalayın");
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title="İmza bağlantısını paylaş" footer={<Button onClick={onClose}>Kapat</Button>}>
      <div className="space-y-3 text-sm">
        <p className="text-muted">
          <b className="text-text">{baslik}</b> imzaya açıldı. Bağlantı tek kullanımlıktır; imzalandığında geçersiz olur.
        </p>
        {recipient.ad && (
          <p>
            İmzalayacak: <b>{recipient.ad}</b>
            {recipient.telefon && <span className="text-muted"> · {maskPhone(recipient.telefon)}</span>}
          </p>
        )}
        <Field label="İmza bağlantısı">
          <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="İmza bağlantısı" />
        </Field>
        <div className="grid gap-2 sm:grid-cols-2">
          <a className="inline-flex min-h-10 items-center justify-center rounded-lg border border-ok bg-ok px-4 text-sm font-medium text-white hover:opacity-90" href={whatsappLink(recipient.telefon, msg)} target="_blank" rel="noopener noreferrer">
            WhatsApp ile gönder
          </a>
          <a className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-bg" href={mailtoLink(recipient.eposta, `${baslik} — imza`, msg)}>
            E-posta ile gönder
          </a>
          <Button onClick={copy}>Bağlantıyı kopyala</Button>
          <a className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-bg" href={url} target="_blank" rel="noopener noreferrer">
            Bu cihazda aç
          </a>
        </div>
        {mode === "demo" && (
          <p className="rounded-lg border border-warn/30 bg-warn/10 p-2 text-xs text-warn">
            Demo modu: veriler yalnızca bu tarayıcıda olduğundan bağlantı yalnızca bu tarayıcıda açılır. Gerçek kullanımda (Supabase) müşteri kendi telefonundan imzalar.
          </p>
        )}
      </div>
    </Dialog>
  );
}

function WetDialog({ doc, open, onClose, onDone }: { doc: DocumentRow | null; open: boolean; onClose: () => void; onDone: () => void }) {
  const s = useReadySession();
  const [ad, setAd] = useState("");
  const [tarih, setTarih] = useState(() => toLocalInput(new Date()));
  const [not, setNot] = useState("");
  const [busy, setBusy] = useState(false);
  if (!doc) return null;
  const defaultAd = recipientFromValues(doc.alanlar).ad ?? "";
  const name = ad || defaultAd;
  const save = async () => {
    if (name.trim().length < 3) return toast("İmzalayanın adını yazın");
    setBusy(true);
    try {
      await recordWetSignature(s.store, { officeId: s.officeId, userId: s.userId }, doc, { adSoyad: name, tarih, not });
      toast("Islak imza kaydedildi");
      onDone();
    } catch (e) {
      toast(`Kaydedilemedi: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Islak imza ile imzalandı"
      footer={
        <>
          <Button onClick={onClose}>Vazgeç</Button>
          <Button variant="primary" onClick={save} disabled={busy}>
            Kaydet
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-muted">Belge kâğıt üzerinde imzalandıysa kaydı buradan düşün. İmzalı nüshayı taratıp evrak kasasında saklayın.</p>
        <Field label="İmzalayan ad soyad" required>
          <Input value={name} onChange={(e) => setAd(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="İmza zamanı" required>
          <Input type="datetime-local" value={tarih} onChange={(e) => setTarih(e.target.value)} />
        </Field>
        <Field label="Not (isteğe bağlı)">
          <Textarea rows={2} value={not} onChange={(e) => setNot(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}

type Pending = { doc: DocumentRow; recipient: Recipient; kind: "link" | "islak" };

export function useSignFlow(onChange?: (doc: DocumentRow) => void) {
  const s = useReadySession();
  const ctx = { officeId: s.officeId, userId: s.userId };
  const [ev, setEv] = useState<Evaluation | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [share, setShare] = useState<{ doc: DocumentRow; recipient: Recipient } | null>(null);
  const [wetDoc, setWetDoc] = useState<DocumentRow | null>(null);
  const [busy, setBusy] = useState(false);

  const proceed = async (p: Pending, evaluation: Evaluation, gerekce?: string) => {
    setBusy(true);
    try {
      await logSignEvaluation(s.store, ctx, p.doc, evaluation, p.kind === "link" ? "sozlesme.imzaya_gonder" : "sozlesme.islak_imza", gerekce);
      setEv(null);
      if (p.kind === "islak") {
        setWetDoc(p.doc);
        return;
      }
      const updated = await openForSigning(s.store, p.doc);
      onChange?.(updated);
      setShare({ doc: updated, recipient: p.recipient });
    } catch (e) {
      toast(`İşlem yapılamadı: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const gate = async (doc: DocumentRow, recipient: Recipient | undefined, kind: Pending["kind"]) => {
    const t = getTemplate(doc.sablon);
    if (!t) return toast("Şablon bulunamadı");
    const p = { doc, recipient: recipient ?? recipientFromValues(doc.alanlar), kind };
    const evaluation = evaluateTemplateSign(t, doc.alanlar ?? {});
    setPending(p);
    if (evaluation.karar === "GEC") return proceed(p, evaluation);
    if (evaluation.karar === "ENGELLE") await logSignEvaluation(s.store, ctx, doc, evaluation, kind === "link" ? "sozlesme.imzaya_gonder" : "sozlesme.islak_imza");
    setEv(evaluation);
  };

  const ui = (
    <>
      <ComplianceDialog
        ev={ev}
        open={!!ev}
        title={pending?.kind === "islak" ? "Islak imza kaydı" : "İmzaya gönderim"}
        onClose={() => setEv(null)}
        onProceed={ev?.karar === "UYAR" && pending ? (g) => void proceed(pending, ev, g) : undefined}
      />
      <ShareDialog doc={share?.doc ?? null} recipient={share?.recipient ?? {}} open={!!share} onClose={() => setShare(null)} />
      <WetDialog
        key={wetDoc?.id ?? "none"}
        doc={wetDoc}
        open={!!wetDoc}
        onClose={() => setWetDoc(null)}
        onDone={() => {
          if (wetDoc) onChange?.(wetDoc);
          setWetDoc(null);
        }}
      />
    </>
  );

  return {
    busy,
    ui,
    /** Uyum kontrolü ile imzaya gönder */
    send: (doc: DocumentRow, recipient?: Recipient) => void gate(doc, recipient, "link"),
    /** Islak imza kaydı (aynı uyum kontrolü) */
    wet: (doc: DocumentRow) => void gate(doc, undefined, "islak"),
    /** Mevcut bağlantıyı yeniden paylaş */
    share: (doc: DocumentRow, recipient?: Recipient) => setShare({ doc, recipient: recipient ?? recipientFromValues(doc.alanlar) }),
    withdraw: async (doc: DocumentRow) => {
      const updated = await withdrawSigning(s.store, doc);
      onChange?.(updated);
      toast("İmza bağlantısı iptal edildi; belge yeniden taslak");
    },
  };
}
