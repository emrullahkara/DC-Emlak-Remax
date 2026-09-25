"use client";

import { useState } from "react";
import { useReadySession, useTable } from "@/data/session";
import type { Activity, Person } from "@/data/types";
import { Badge, Button, Card, Checkbox, ErrorNote, Field, Input, Select, Spinner, Textarea, cx, toast } from "@/components/ui";
import { daysSince } from "@/domain/crm";
import { fmtDateTime } from "@/lib/format";
import { AKTIVITE_TURLERI, defaultNextStepLocal, fromLocalInput } from "./common";
import { useSpeechNote } from "./useSpeechNote";

type Tur = Activity["tur"];
const EKLENEBILIR: Tur[] = ["arama", "mesaj", "not", "sesli_not", "gosterim", "eposta", "gorev"];

/** Temas sayılan aktiviteler son_temas'ı günceller (görev/not planlamadır) */
const TEMAS: Tur[] = ["arama", "mesaj", "gosterim", "eposta"];

export function Timeline({ person }: { person: Person }) {
  const { store, officeId, userId } = useReadySession();
  const acts = useTable("activity", { eq: { person_id: person.id }, order: { column: "created_at", ascending: false } });

  const [tur, setTur] = useState<Tur>("arama");
  const [icerik, setIcerik] = useState("");
  const [vade, setVade] = useState(defaultNextStepLocal);
  const [sonrakiAdim, setSonrakiAdim] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const speech = useSpeechNote((text) => {
    setIcerik((s) => (s ? `${s} ${text}` : text));
    setTur((t) => (t === "not" || t === "arama" ? "sesli_not" : t));
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!icerik.trim()) return setError("İçerik yazın.");
    const vadeIso = tur === "gorev" ? fromLocalInput(vade) : null;
    if (tur === "gorev" && !vadeIso) return setError("Görev için tarih seçin.");
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await store.insert("activity", {
        office_id: officeId,
        user_id: userId,
        person_id: person.id,
        tur,
        icerik: icerik.trim(),
        vade: vadeIso,
        tamamlandi: tur === "gorev" ? false : null,
      });
      const patch: Partial<Person> = {};
      if (TEMAS.includes(tur) || tur === "not" || tur === "sesli_not") patch.son_temas = now;
      if (tur === "gorev" && sonrakiAdim) {
        patch.sonraki_adim = icerik.trim();
        patch.sonraki_adim_tarihi = vadeIso;
      }
      if (Object.keys(patch).length) await store.update("person", person.id, patch);
      setIcerik("");
      toast("Zaman tüneline eklendi");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eklenemedi");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(a: Activity) {
    try {
      await store.update("activity", String(a.id), { tamamlandi: !a.tamamlandi });
      if (!a.tamamlandi) {
        toast("Görev tamamlandı — sonraki adımı güncellemeyi unutmayın");
        if (person.sonraki_adim === a.icerik) await store.update("person", person.id, { son_temas: new Date().toISOString() });
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Güncellenemedi");
    }
  }

  return (
    <Card
      title="Zaman tüneli"
      actions={
        speech.supported !== false && (
          <Button size="sm" variant={speech.listening ? "danger" : "secondary"} onClick={speech.listening ? speech.stop : speech.start} aria-pressed={speech.listening}>
            🎙 {speech.listening ? "Dinleniyor… Durdur" : "Sesle not"}
          </Button>
        )
      }
    >
      <form onSubmit={add} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          <Field label="Tür">
            <Select value={tur} onChange={(e) => setTur(e.target.value as Tur)}>
              {EKLENEBILIR.map((t) => (
                <option key={t} value={t}>
                  {AKTIVITE_TURLERI[t].label}
                </option>
              ))}
            </Select>
          </Field>
          {tur === "gorev" ? (
            <Field label="Ne zaman" required>
              <Input type="datetime-local" value={vade} onChange={(e) => setVade(e.target.value)} />
            </Field>
          ) : (
            <div className="hidden sm:block" />
          )}
        </div>
        <Field label={tur === "gorev" ? "Görev" : "Not / içerik"}>
          <Textarea
            rows={3}
            value={icerik}
            onChange={(e) => setIcerik(e.target.value)}
            placeholder={tur === "gorev" ? "ör. Salı 14:00 tekrar ara, eşi de görmek istiyor" : "Görüşmenin özeti…"}
          />
        </Field>
        {speech.listening && <p className="text-xs text-block">● Kayıt açık — konuşun, metin buraya eklenecek.</p>}
        {speech.error && <p className="text-xs text-warn">{speech.error}</p>}
        {speech.supported === false && (
          <p className="text-xs text-muted">Bu tarayıcı sesle notu desteklemiyor. Telefon klavyesindeki mikrofon (dikte) tuşuyla yazdırabilirsiniz.</p>
        )}
        {tur === "gorev" && <Checkbox label="Müşterinin sonraki adımı olarak ayarla" checked={sonrakiAdim} onChange={(e) => setSonrakiAdim(e.target.checked)} />}
        <ErrorNote error={error} />
        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Ekleniyor…" : "Ekle"}
          </Button>
        </div>
      </form>

      <div className="mt-4 border-t border-border pt-4">
        {acts.loading ? (
          <Spinner />
        ) : !acts.data.length ? (
          <p className="text-sm text-muted">Henüz kayıt yok. İlk aramanızı veya notunuzu ekleyin.</p>
        ) : (
          <ol className="space-y-3">
            {acts.data.map((a) => {
              const t = AKTIVITE_TURLERI[a.tur] ?? { label: a.tur, icon: "•" };
              const gecikti = a.tur === "gorev" && !a.tamamlandi && (daysSince(a.vade, new Date()) ?? 0) > 0;
              return (
                <li key={String(a.id)} className="flex gap-3">
                  <span aria-hidden className="grid h-8 w-8 flex-none place-items-center rounded-full bg-brand/10 text-sm text-brand">
                    {t.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-2">
                      <span className="text-sm font-semibold">{t.label}</span>
                      <span className="text-xs text-muted">{fmtDateTime(a.created_at)}</span>
                    </div>
                    {a.tur === "gorev" ? (
                      <label className="mt-0.5 flex items-start gap-2 text-sm">
                        <input type="checkbox" checked={!!a.tamamlandi} onChange={() => toggleTask(a)} className="mt-0.5 h-4 w-4 flex-none accent-brand" aria-label="Görevi tamamla" />
                        <span className={cx("break-words", a.tamamlandi && "text-muted line-through")}>
                          {a.icerik}
                          <span className="ml-1 whitespace-nowrap">
                            {a.tamamlandi ? <Badge tone="ok">Tamamlandı</Badge> : <Badge tone={gecikti ? "block" : "info"}>{fmtDateTime(a.vade)}</Badge>}
                          </span>
                        </span>
                      </label>
                    ) : (
                      <p className="whitespace-pre-line break-words text-sm text-muted">{a.icerik}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Card>
  );
}
