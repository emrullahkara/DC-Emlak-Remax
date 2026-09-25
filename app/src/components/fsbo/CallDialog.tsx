"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, ButtonLink, cx, Dialog, Field, Input, Select, Textarea, toast } from "@/components/ui";
import { useReadySession } from "@/data/session";
import type { FsboListingRow, OfficeMember } from "@/data/types";
import {
  cadence,
  dayDiff,
  fsboToPortfolioDraft,
  ITIRAZLAR,
  nextStatus,
  openingScript,
  parseDay,
  SONUC_ETIKET,
  type CallResult,
  type FsboRow,
} from "@/domain/fsbo";
import { safeHttpUrl, fmtDate, fmtDateTime, shortTL, todayISO } from "@/lib/format";
import { DurumBadge, ScoreBadge, SignalBadges } from "./shared";

function defaultAppointment(now: Date) {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T10:00`;
}

function at10(d: Date) {
  const x = new Date(d);
  x.setHours(10, 0, 0, 0);
  return x;
}

export function CallDialog({ row, skor, sinyaller, members, onClose }: { row: FsboRow; skor: number; sinyaller: string[]; members: OfficeMember[]; onClose: () => void }) {
  const { store, officeId, userId, office, member } = useReadySession();
  const router = useRouter();
  const [now] = useState(() => new Date());
  const [not, setNot] = useState("");
  const [randevu, setRandevu] = useState(() => defaultAppointment(new Date()));
  const [busy, setBusy] = useState(false);

  const c = cadence(row.ilk_temas, now);
  const yas = Math.max(0, dayDiff(parseDay(row.ilk_gorulme), now));
  const atanan = members.find((m) => m.user_id === row.atanan_id);
  const cakisma = row.atanan_id && row.atanan_id !== userId ? atanan?.ad_soyad ?? "başka bir danışman" : null;
  const tel = row.malik_telefon?.replace(/[^\d+]/g, "");

  const update = (patch: Partial<FsboRow>) => store.update("fsbo_listing", row.id, patch as Partial<FsboListingRow>);

  const record = async (r: CallResult) => {
    setBusy(true);
    try {
      const t = new Date();
      const ilk = row.ilk_temas ?? todayISO(t);
      const cad = cadence(ilk, t);
      await update({ durum: nextStatus(row.durum, r), atanan_id: userId, ilk_temas: ilk, son_temas: t.toISOString() });
      const kim = row.malik_ad || "Malik";
      const ilan = row.baslik ?? "FSBO ilanı";
      await store.insert("activity", {
        office_id: officeId,
        user_id: userId,
        portfolio_id: row.portfolio_id ?? null,
        tur: "arama",
        icerik: `FSBO · ${kim} (${ilan}): ${SONUC_ETIKET[r]}${not.trim() ? ` — ${not.trim()}` : ""}`,
      });
      let gorev: { icerik: string; vade: Date } | null = null;
      if (r === "ulasilamadi") gorev = { icerik: `FSBO tekrar ara: ${kim} — ${ilan}`, vade: new Date(t.getTime() + 2 * 3_600_000) };
      else if (r === "gorusuldu" && cad.sonrakiGorev)
        gorev = { icerik: `FSBO ${cad.sonrakiGorev.gun}. gün: ${cad.sonrakiGorev.baslik} — ${kim} (${ilan})`, vade: at10(cad.sonrakiGorev.tarih) };
      else if (r === "degerleme") gorev = { icerik: `Değerleme randevusu: ${kim} — ${ilan}`, vade: randevu ? new Date(randevu) : at10(new Date(t.getTime() + 86_400_000)) };
      if (gorev) {
        await store.insert("activity", {
          office_id: officeId,
          user_id: userId,
          portfolio_id: row.portfolio_id ?? null,
          tur: "gorev",
          icerik: gorev.icerik,
          vade: gorev.vade.toISOString(),
          tamamlandi: false,
        });
      }
      toast(`${SONUC_ETIKET[r]} kaydedildi${gorev ? ` · görev: ${fmtDateTime(gorev.vade.toISOString())}` : ""}`);
      setNot("");
      onClose();
    } catch (e) {
      toast(`Kaydedilemedi: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const assign = async (uid: string) => {
    try {
      await update({ atanan_id: uid || null });
      toast(uid ? `Atandı: ${members.find((m) => m.user_id === uid)?.ad_soyad ?? ""}` : "Atama kaldırıldı");
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const convert = async () => {
    if (!window.confirm("Malik satıcı olarak kaydedilecek ve “Değerleme” aşamasında portföy açılacak. Devam edilsin mi?")) return;
    setBusy(true);
    try {
      const d = fsboToPortfolioDraft(row, { officeId, userId });
      const person = await store.insert("person", d.person);
      const portfolio = await store.insert("portfolio", d.portfolio);
      await store.insert("portfolio_owner", { portfolio_id: portfolio.id, person_id: person.id, hisse: "1/1", vekil: false });
      await update({
        portfolio_id: portfolio.id,
        durum: row.durum === "yetki_alindi" ? "yetki_alindi" : "degerleme",
        atanan_id: row.atanan_id ?? userId,
      });
      toast("Portföy oluşturuldu");
      onClose();
      router.push(`/portfoyler/${portfolio.id}`);
    } catch (e) {
      toast(`Dönüştürülemedi: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      wide
      onClose={onClose}
      title={`Arama · ${row.malik_ad || "Malik"}`}
      footer={
        <>
          <Button disabled={busy} onClick={() => void record("ulasilamadi")}>
            Ulaşılamadı
          </Button>
          <Button disabled={busy} onClick={() => void record("vazgecti")}>
            Vazgeçti
          </Button>
          <Button disabled={busy} onClick={() => void record("gorusuldu")}>
            Görüşüldü
          </Button>
          <Button variant="primary" disabled={busy} onClick={() => void record("degerleme")}>
            Değerleme randevusu
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <ScoreBadge skor={skor} size="lg" />
          <div className="min-w-0">
            <p className="font-semibold">{row.baslik ?? "Başlıksız ilan"}</p>
            <p className="text-sm text-muted">
              {shortTL(row.fiyat)} · {yas} gündür yayında · {row.fiyat_dusum_sayisi ? `${row.fiyat_dusum_sayisi} fiyat düşüşü` : "fiyat düşüşü yok"} ·{" "}
              {[row.ilce, row.mahalle].filter(Boolean).join(" / ")}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <DurumBadge durum={row.durum} />
              <SignalBadges sinyaller={sinyaller} />
            </div>
          </div>
        </div>

        {cakisma && (
          <p className="rounded-lg border border-warn/30 bg-warn/10 p-3 text-sm text-warn" role="alert">
            <b>Ekip çakışması:</b> bu ilan {cakisma} üzerinde. Aramadan önce koordine edin; sonuç kaydederseniz ilan size atanır.
          </p>
        )}

        {tel ? (
          <a
            href={`tel:${tel}`}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-ok px-4 text-base font-semibold text-bg hover:opacity-90"
          >
            ☎ {row.malik_telefon} · Ara
          </a>
        ) : (
          <p className="rounded-lg border border-dashed border-border p-3 text-center text-sm text-muted">
            Malik telefonu kayıtlı değil.{" "}
            {safeHttpUrl(row.kaynak_url) && (
              <a className="text-brand underline" href={safeHttpUrl(row.kaynak_url)!} target="_blank" rel="noopener noreferrer">
                İlana git
              </a>
            )}
          </p>
        )}

        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Açılış senaryosu</h3>
          <p className="rounded-lg border border-brand/20 bg-brand/5 p-3 text-sm leading-relaxed">
            “{openingScript(row, { ad: member.ad_soyad, ofis: office.unvan })}”
          </p>
        </section>

        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">İtiraz karşılama</h3>
          <div className="space-y-1.5">
            {ITIRAZLAR.map((i) => (
              <details key={i.soru} className="group rounded-lg border border-border">
                <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-medium">
                  {i.soru}
                  <span className="text-muted transition group-open:rotate-90">›</span>
                </summary>
                <p className="px-3 pb-3 text-sm text-muted">{i.cevap}</p>
              </details>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            Takip kadansı · {c.basladi ? `${c.gun}. gün` : "henüz başlamadı"}
            {c.sonrakiVade && ` · sıradaki ${fmtDate(c.sonrakiVade.toISOString(), { day: "numeric", month: "short" })}`}
          </h3>
          <ol className="grid grid-cols-5 gap-1" aria-label="Takip kadansı">
            {c.adimlar.map((a) => (
              <li
                key={a.gun}
                className={cx(
                  "rounded-lg border p-1.5 text-center text-[11px] leading-tight",
                  a.durum === "done" && "border-ok/30 bg-ok/10 text-ok",
                  a.durum === "current" && "border-brand bg-brand/10 font-semibold text-brand",
                  a.durum === "upcoming" && "border-border text-muted",
                )}
                aria-current={a.durum === "current" ? "step" : undefined}
              >
                <span className="block text-sm font-semibold tabular-nums">{a.gun}.</span>
                <span className="block">{a.baslik}</span>
              </li>
            ))}
          </ol>
          <p className="mt-1 text-xs text-muted">Sonuç kaydedildiğinde bir sonraki adım görev olarak Kokpit&apos;e düşer.</p>
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Görüşme notu">
            <Textarea rows={2} value={not} onChange={(e) => setNot(e.target.value)} placeholder="ör. Hafta sonu müsait, eşiyle görüşecek" />
          </Field>
          <Field label="Değerleme randevusu">
            <Input type="datetime-local" value={randevu} onChange={(e) => setRandevu(e.target.value)} />
          </Field>
          <Field label="Atanan danışman">
            <Select value={row.atanan_id ?? ""} onChange={(e) => void assign(e.target.value)}>
              <option value="">Atanmadı</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.ad_soyad}
                  {m.user_id === userId ? " (ben)" : ""}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            {row.portfolio_id ? (
              <ButtonLink href={`/portfoyler/${row.portfolio_id}`} className="w-full">
                Portföye git
              </ButtonLink>
            ) : (
              <Button variant="secondary" className="w-full" disabled={busy} onClick={() => void convert()}>
                ⌂ Portföye dönüştür
              </Button>
            )}
          </div>
        </div>
        {safeHttpUrl(row.kaynak_url) && (
          <p className="text-xs text-muted">
            Kaynak:{" "}
            <a className="break-all text-brand underline" href={safeHttpUrl(row.kaynak_url)!} target="_blank" rel="noopener noreferrer">
              {row.kaynak_url}
            </a>{" "}
            <Badge>{row.kaynak === "danisman_linki" ? "Danışman bağlantısı" : row.kaynak === "manuel" ? "Manuel" : row.kaynak}</Badge>
          </p>
        )}
      </div>
    </Dialog>
  );
}
