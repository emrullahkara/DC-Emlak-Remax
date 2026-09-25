"use client";

import { useRef, useState } from "react";
import { Badge, Button, Dialog, EmptyState, ErrorNote, Select, toast } from "@/components/ui";
import { useReadySession } from "@/data/session";
import type { Media, MediaType, Portfolio } from "@/data/types";
import { deleteMedia, MEDIA_TUR_LABEL, uploadMedia, useMediaUrls } from "./media";

const UPLOAD_TYPES: MediaType[] = ["foto", "kat_plani", "sanal_mobilya"];

export function MediaTab({ portfolio, media }: { portfolio: Portfolio; media: Media[] }) {
  const { store, supabase, officeId, mode } = useReadySession();
  const urls = useMediaUrls(media, supabase);
  const input = useRef<HTMLInputElement>(null);
  const [tur, setTur] = useState<MediaType>("foto");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Media | null>(null);
  const [busy, setBusy] = useState(false);

  const sorted = [...media].sort((a, b) => a.sira - b.sira);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = [...files];
    setProgress({ done: 0, total: list.length });
    let sira = sorted.length ? Math.max(...sorted.map((m) => m.sira)) + 1 : 0;
    const errs: string[] = [];
    for (const [i, file] of list.entries()) {
      try {
        await uploadMedia({ store, supabase, officeId, portfolioId: portfolio.id, file, tur, sira: sira++ });
      } catch (e) {
        errs.push(e instanceof Error ? e.message : `${file.name}: yüklenemedi`);
        if (e instanceof Error && e.message.includes("depolama alanı doldu")) break;
      }
      setProgress({ done: i + 1, total: list.length });
    }
    setProgress(null);
    if (input.current) input.current.value = "";
    if (errs.length) setError(errs.join(" · "));
    else toast(`${list.length} görsel yüklendi`);
  }

  async function reorder(next: Media[]) {
    setBusy(true);
    try {
      for (const [i, m] of next.entries()) if (m.sira !== i) await store.update("media", m.id, { sira: i });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sıralama kaydedilemedi");
    } finally {
      setBusy(false);
    }
  }

  const move = (idx: number, delta: number) => {
    const next = [...sorted];
    const j = idx + delta;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j]!, next[idx]!];
    void reorder(next);
  };

  const toFront = (idx: number) => {
    const next = [...sorted];
    const [m] = next.splice(idx, 1);
    void reorder([m!, ...next]);
  };

  return (
    <div className="space-y-4">
      <div className="relative flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="text-muted">Yükleme türü</span>
          <Select value={tur} onChange={(e) => setTur(e.target.value as MediaType)} className="mt-1 min-w-40">
            {UPLOAD_TYPES.map((t) => (
              <option key={t} value={t}>
                {MEDIA_TUR_LABEL[t]}
              </option>
            ))}
          </Select>
        </label>
        <input ref={input} type="file" accept="image/*" multiple className="sr-only" id="pf-media-input" onChange={(e) => void onFiles(e.target.files)} />
        <Button variant="primary" onClick={() => input.current?.click()} disabled={Boolean(progress)}>
          {progress ? `Yükleniyor ${progress.done}/${progress.total}…` : "+ Görsel yükle"}
        </Button>
      </div>
      <p className="text-xs text-muted">
        Görseller en uzun kenarı 1280 px olacak şekilde küçültülür (JPEG).{" "}
        {mode === "demo" ? "Demo modunda tarayıcıda saklanır; alan sınırlıdır." : "Ofisinize özel depolama alanında saklanır."} Sanal mobilya görselleri ilanda zorunlu olarak “temsilîdir” etiketiyle yayınlanır.
      </p>
      <ErrorNote error={error} />

      {!sorted.length ? (
        <EmptyState title="Henüz görsel yok">En az 12 fotoğraf ve bir kat planı, portföy sağlık skorunu belirgin şekilde yükseltir.</EmptyState>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map((m, i) => (
            <li key={m.id} className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface">
              <div className="relative aspect-[4/3] bg-bg">
                {urls[m.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urls[m.id]} alt={`${MEDIA_TUR_LABEL[m.tur]} ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="grid h-full place-items-center text-xs text-muted">Yükleniyor…</div>
                )}
                <div className="absolute left-1.5 top-1.5 flex flex-wrap gap-1">
                  {i === 0 && <Badge tone="brand">Kapak</Badge>}
                  {m.tur !== "foto" && <Badge tone="info">{MEDIA_TUR_LABEL[m.tur]}</Badge>}
                  {m.temsili && <Badge tone="warn">Temsilîdir</Badge>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1 p-2">
                <Button size="sm" variant="ghost" aria-label="Öne al" onClick={() => move(i, -1)} disabled={busy || i === 0}>
                  ←
                </Button>
                <Button size="sm" variant="ghost" aria-label="Sona al" onClick={() => move(i, 1)} disabled={busy || i === sorted.length - 1}>
                  →
                </Button>
                {i > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => toFront(i)} disabled={busy}>
                    Kapak yap
                  </Button>
                )}
                <label className="flex min-h-8 items-center gap-1 px-1 text-xs">
                  <input
                    type="checkbox"
                    className="accent-brand"
                    checked={m.temsili}
                    disabled={m.tur === "sanal_mobilya"}
                    onChange={(e) => void store.update("media", m.id, { temsili: e.target.checked })}
                  />
                  Temsilî
                </label>
                <Button size="sm" variant="ghost" className="ml-auto text-block" aria-label="Sil" onClick={() => setConfirm(m)}>
                  Sil
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title="Görseli sil"
        footer={
          <>
            <Button onClick={() => setConfirm(null)}>Vazgeç</Button>
            <Button
              variant="danger"
              onClick={() => {
                const m = confirm!;
                setConfirm(null);
                deleteMedia(store, supabase, m)
                  .then(() => toast("Görsel silindi"))
                  .catch((e: Error) => setError(e.message));
              }}
            >
              Sil
            </Button>
          </>
        }
      >
        <p className="text-sm">Bu görsel kalıcı olarak silinecek.</p>
      </Dialog>
    </div>
  );
}
