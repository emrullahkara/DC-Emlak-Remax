"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, ComplianceDialog, EmptyState, ErrorNote, PageHeader, Spinner, cx, toast } from "@/components/ui";
import { recordEvaluation } from "@/data/compliance-log";
import { useReadySession, useTable } from "@/data/session";
import type { Activity, DocumentRow, OfficeMember, Person, Portfolio, Showing } from "@/data/types";
import { fmtTime } from "@/lib/format";
import { GUN_KISA, addDays, agendaItems, countByDay, directionsUrl, feedbackSummary, sameDay, startOfDay, startOfWeek, weekDays } from "@/domain/calendar";
import { evaluateShowingComplete, type Evaluation } from "@/domain/compliance";
import { useSignFlow } from "@/components/sozlesme/SignFlow";
import { Checkin } from "./Checkin";
import { FeedbackDialog } from "./FeedbackDialog";
import { NewShowingDialog } from "./NewShowingDialog";
import { YgbDialog } from "./YgbDialog";
import { YGB_KOD } from "./ygb";

type View = "gun" | "hafta";

const DURUM: Record<Showing["durum"], { label: string; tone: "neutral" | "ok" | "block" }> = {
  planli: { label: "Planlı", tone: "neutral" },
  tamamlandi: { label: "Tamamlandı", tone: "ok" },
  iptal: { label: "İptal", tone: "block" },
};

interface Lookups {
  portfolio: Map<string, Portfolio>;
  person: Map<string, Person>;
  member: Map<string, OfficeMember>;
  doc: Map<string, DocumentRow>;
}

function YgbStatus({ doc }: { doc: DocumentRow | null }) {
  if (!doc) return <p className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">Yer gösterme belgesi hazırlanmadı. Gösterim bu belge olmadan tamamlanamaz.</p>;
  if (doc.durum === "imzalandi")
    return (
      <p className="rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-xs text-ok">
        <b>Yer gösterme belgesi imzalı</b>
        {doc.alanlar?.zaman_damgasi ? ` · ${doc.alanlar.zaman_damgasi.split(" · ")[1] ?? ""}` : ""}
        {doc.alanlar?.konum_enlem ? ` · ${doc.alanlar.konum_enlem}, ${doc.alanlar.konum_boylam}` : ""}
      </p>
    );
  if (doc.durum === "imzada") return <p className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">Yer gösterme belgesi müşterinin imzasını bekliyor.</p>;
  if (doc.durum === "iptal") return <p className="rounded-lg border border-block/30 bg-block/10 px-3 py-2 text-xs text-block">Bağlı belge iptal edildi; yeni belge hazırlayın.</p>;
  return <p className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">Belge taslak — imzaya gönderin.</p>;
}

function ShowingCard({
  s,
  lk,
  onYgb,
  onShare,
  onWet,
  onComplete,
  onCancel,
  onFeedback,
}: {
  s: Showing;
  lk: Lookups;
  onYgb: () => void;
  onShare: (d: DocumentRow) => void;
  onWet: (d: DocumentRow) => void;
  onComplete: () => void;
  onCancel: () => void;
  onFeedback: () => void;
}) {
  const p = lk.portfolio.get(s.portfolio_id) ?? null;
  const c = lk.person.get(s.person_id) ?? null;
  const agent = lk.member.get(s.agent_id);
  const doc = s.yer_gosterme_belgesi_id ? (lk.doc.get(s.yer_gosterme_belgesi_id) ?? null) : null;
  const liveDoc = doc && doc.durum !== "iptal" ? doc : null;
  const route = p ? directionsUrl(p) : null;
  const planli = s.durum === "planli";
  const signed = liveDoc?.durum === "imzalandi";

  return (
    <article className={cx("min-w-0 flex-1 space-y-2.5 rounded-xl border border-l-4 border-border bg-surface p-3", s.durum === "iptal" ? "border-l-block opacity-70" : signed || s.durum === "tamamlandi" ? "border-l-ok" : "border-l-brand")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">Gösterim</p>
          {p ? (
            <Link href={`/portfoyler/${p.id}`} className="block truncate font-semibold hover:underline">
              {p.baslik ?? "Portföy"}
            </Link>
          ) : (
            <p className="font-semibold">Portföy</p>
          )}
          <p className="truncate text-sm text-muted">
            {c ? (
              <Link href={`/musteriler/${c.id}`} className="hover:underline">
                {c.ad_soyad}
              </Link>
            ) : (
              "Kişi"
            )}
            {p && ` · ${[p.ilce, p.mahalle].filter(Boolean).join("/")}`}
            {agent && ` · ${agent.ad_soyad}`}
          </p>
        </div>
        <Badge tone={DURUM[s.durum].tone}>{DURUM[s.durum].label}</Badge>
      </div>

      {s.durum !== "iptal" && <YgbStatus doc={liveDoc} />}
      {s.geri_bildirim && <p className="text-xs text-muted">Geri bildirim: {feedbackSummary(s.geri_bildirim)}</p>}

      <div className="flex flex-wrap gap-2">
        {planli && (!liveDoc || liveDoc.durum === "taslak") && (
          <Button size="sm" variant="primary" onClick={onYgb}>
            {liveDoc ? "Belgeyi imzaya gönder" : "Belgeyi hazırla"}
          </Button>
        )}
        {liveDoc?.durum === "imzada" && (
          <>
            <Button size="sm" variant="primary" onClick={() => onShare(liveDoc)}>
              Bağlantıyı paylaş
            </Button>
            <Button size="sm" onClick={() => onWet(liveDoc)}>
              Islak imza
            </Button>
          </>
        )}
        {planli && (
          <Button size="sm" variant={signed ? "ok" : "secondary"} onClick={onComplete} title={signed ? undefined : "Önce yer gösterme belgesi imzalanmalı"}>
            ✓ Tamamlandı
          </Button>
        )}
        {s.durum === "tamamlandi" && !s.geri_bildirim && (
          <Button size="sm" onClick={onFeedback}>
            Geri bildirim ekle
          </Button>
        )}
        {route && (
          <a href={route} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center rounded-lg border border-transparent px-2.5 text-xs font-medium hover:bg-bg">
            ➚ Yol tarifi
          </a>
        )}
        {liveDoc && (
          <Link href={`/sozlesmeler/${liveDoc.id}`} className="inline-flex min-h-8 items-center rounded-lg border border-transparent px-2.5 text-xs font-medium hover:bg-bg">
            Belgeyi aç
          </Link>
        )}
        {planli && (
          <Button size="sm" variant="ghost" className="text-block" onClick={onCancel}>
            İptal
          </Button>
        )}
      </div>
    </article>
  );
}

function TaskCard({ a, person, onToggle }: { a: Activity; person: Person | null; onToggle: () => void }) {
  return (
    <article className="flex min-w-0 flex-1 items-start gap-3 rounded-xl border border-l-4 border-border border-l-info bg-surface p-3">
      <input type="checkbox" className="mt-1 h-4 w-4 accent-brand" checked={!!a.tamamlandi} onChange={onToggle} aria-label="Görevi tamamla" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-info">Görev</p>
        <p className={cx("text-sm font-medium", a.tamamlandi && "text-muted line-through")}>{a.icerik ?? "Görev"}</p>
        {person && <p className="text-xs text-muted">{person.ad_soyad}</p>}
      </div>
    </article>
  );
}

export function CalendarPage() {
  const s = useReadySession();
  const [view, setView] = useState<View>("gun");
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [newOpen, setNewOpen] = useState(false);
  const [ygbFor, setYgbFor] = useState<Showing | null>(null);
  const [feedbackFor, setFeedbackFor] = useState<Showing | null>(null);
  const [ev, setEv] = useState<Evaluation | null>(null);

  const showings = useTable("showing", { order: { column: "planlanan", ascending: true } });
  const tasks = useTable("activity", { eq: { tur: "gorev" } });
  const portfolios = useTable("portfolio");
  const persons = useTable("person", { order: { column: "ad_soyad", ascending: true } });
  const members = useTable("office_member", { eq: { office_id: s.officeId } });
  const docs = useTable("document", { eq: { sablon: YGB_KOD } });
  const flow = useSignFlow();

  const lk: Lookups = useMemo(
    () => ({
      portfolio: new Map(portfolios.data.map((p) => [p.id, p])),
      person: new Map(persons.data.map((p) => [p.id, p])),
      member: new Map(members.data.map((m) => [m.user_id, m])),
      doc: new Map(docs.data.map((d) => [d.id, d])),
    }),
    [portfolios.data, persons.data, members.data, docs.data],
  );

  const today = startOfDay(new Date());
  const days = weekDays(day);
  const from = view === "gun" ? day : startOfWeek(day);
  const to = addDays(from, view === "gun" ? 1 : 7);
  const items = agendaItems(showings.data, tasks.data, from, to);
  const counts = countByDay(
    [...showings.data.filter((x) => x.durum !== "iptal").map((x) => new Date(x.planlanan)), ...tasks.data.filter((t) => t.vade && !t.tamamlandi).map((t) => new Date(t.vade!))],
    days,
  );

  const complete = async (sh: Showing) => {
    const doc = sh.yer_gosterme_belgesi_id ? lk.doc.get(sh.yer_gosterme_belgesi_id) : undefined;
    const e = evaluateShowingComplete({ yerGostermeBelgesiImzali: doc?.durum === "imzalandi" });
    try {
      await recordEvaluation(s.store, { officeId: s.officeId, userId: s.userId }, "gosterim.tamamla", "showing", sh.id, e);
    } catch {
      // denetim kaydı yazılamadı; karar yine uygulanır
    }
    if (e.karar === "ENGELLE") {
      setEv(e);
      return;
    }
    try {
      const updated = await s.store.update("showing", sh.id, { durum: "tamamlandi" });
      toast("Gösterim tamamlandı");
      setFeedbackFor(updated);
    } catch (err) {
      toast(`Güncellenemedi: ${(err as Error).message}`);
    }
  };

  const cancel = async (sh: Showing) => {
    await s.store.update("showing", sh.id, { durum: "iptal" });
    toast("Randevu iptal edildi");
  };

  const toggleTask = async (a: Activity) => {
    await s.store.update("activity", String(a.id), { tamamlandi: !a.tamamlandi });
  };

  const loading = showings.loading || portfolios.loading || persons.loading;
  const title = day.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
  const nShow = items.filter((i) => i.kind === "gosterim").length;

  const renderItem = (it: (typeof items)[number]) => (
    <li key={`${it.kind}-${String(it.row.id)}`} className="flex gap-3">
      <div className="w-12 shrink-0 pt-3 text-right text-sm font-semibold tabular-nums">{fmtTime(it.at.toISOString())}</div>
      {it.kind === "gosterim" ? (
        <ShowingCard
          s={it.row}
          lk={lk}
          onYgb={() => setYgbFor(it.row)}
          onShare={(d) => flow.share(d, { ad: lk.person.get(it.row.person_id)?.ad_soyad, telefon: lk.person.get(it.row.person_id)?.telefon, eposta: lk.person.get(it.row.person_id)?.eposta })}
          onWet={(d) => flow.wet(d)}
          onComplete={() => void complete(it.row)}
          onCancel={() => void cancel(it.row)}
          onFeedback={() => setFeedbackFor(it.row)}
        />
      ) : (
        <TaskCard a={it.row} person={it.row.person_id ? (lk.person.get(it.row.person_id) ?? null) : null} onToggle={() => void toggleTask(it.row)} />
      )}
    </li>
  );

  const ygbShowing = ygbFor;
  const ygbDoc = ygbShowing?.yer_gosterme_belgesi_id ? (lk.doc.get(ygbShowing.yer_gosterme_belgesi_id) ?? null) : null;

  return (
    <div>
      <PageHeader
        title="Takvim & Gösterim"
        subtitle={`${view === "gun" ? title : `${days[0]!.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} – ${days[6]!.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}`} · ${nShow} gösterim`}
        actions={
          <Button variant="primary" onClick={() => setNewOpen(true)}>
            + Randevu
          </Button>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button size="sm" aria-label={view === "gun" ? "Önceki gün" : "Önceki hafta"} onClick={() => setDay(addDays(day, view === "gun" ? -1 : -7))}>
            ‹
          </Button>
          <Button size="sm" onClick={() => setDay(today)} disabled={sameDay(day, today)}>
            Bugün
          </Button>
          <Button size="sm" aria-label={view === "gun" ? "Sonraki gün" : "Sonraki hafta"} onClick={() => setDay(addDays(day, view === "gun" ? 1 : 7))}>
            ›
          </Button>
        </div>
        <div role="group" aria-label="Görünüm" className="ml-auto flex rounded-lg border border-border bg-surface p-0.5">
          {(["gun", "hafta"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={cx("min-h-8 rounded-md px-3 text-xs font-medium", view === v ? "bg-brand text-white" : "text-muted hover:text-text")}
            >
              {v === "gun" ? "Gün" : "Hafta"}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const sel = view === "gun" ? sameDay(d, day) : true;
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => {
                setDay(d);
                setView("gun");
              }}
              aria-pressed={view === "gun" && sel}
              aria-label={`${d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}, ${counts[i]} kayıt`}
              className={cx(
                "flex min-h-14 flex-col items-center justify-center rounded-lg border text-xs",
                view === "gun" && sel ? "border-brand bg-brand text-white" : "border-border bg-surface hover:bg-bg",
                sameDay(d, today) && !(view === "gun" && sel) && "border-brand text-brand",
              )}
            >
              <span>{GUN_KISA[d.getDay()]}</span>
              <b className="text-base tabular-nums">{d.getDate()}</b>
              <span className={cx("h-1.5 w-1.5 rounded-full", counts[i] ? (view === "gun" && sel ? "bg-white" : "bg-brand") : "bg-transparent")} aria-hidden />
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <section className="min-w-0" aria-label="Ajanda">
          <ErrorNote error={showings.error} />
          {loading ? (
            <Spinner />
          ) : items.length === 0 ? (
            <EmptyState title={view === "gun" ? "Bu gün için randevu yok" : "Bu hafta randevu yok"} action={<Button onClick={() => setNewOpen(true)}>Randevu oluştur</Button>}>
              Gösterim randevuları ve vadeli görevler burada listelenir.
            </EmptyState>
          ) : view === "gun" ? (
            <ul className="space-y-3">{items.map(renderItem)}</ul>
          ) : (
            <div className="space-y-5">
              {days.map((d) => {
                const dayItems = items.filter((i) => sameDay(i.at, d));
                if (!dayItems.length) return null;
                return (
                  <div key={d.toISOString()}>
                    <h2 className={cx("mb-2 text-sm font-semibold", sameDay(d, today) && "text-brand")}>
                      {d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}
                    </h2>
                    <ul className="space-y-3">{dayItems.map(renderItem)}</ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside className="min-w-0 space-y-4">
          <Card title="Yer Gösterme Belgesi">
            <p className="text-sm text-muted">
              Randevu oluşturulunca taslak hazırlanır; müşteri telefonundan bağlantıyla imzalar, zaman damgası ve (izinle) konum eklenir. <b className="text-text">Belge imzalanmadan gösterim tamamlanamaz.</b>
            </p>
          </Card>
          <Checkin members={members.data} />
        </aside>
      </div>

      {newOpen && <NewShowingDialog day={day} portfolios={portfolios.data} persons={persons.data} members={members.data} onClose={() => setNewOpen(false)} />}
      {ygbShowing && (
        <YgbDialog
          key={ygbShowing.id}
          showing={ygbShowing}
          doc={ygbDoc && ygbDoc.durum === "taslak" ? ygbDoc : null}
          portfolio={lk.portfolio.get(ygbShowing.portfolio_id) ?? null}
          person={lk.person.get(ygbShowing.person_id) ?? null}
          agent={lk.member.get(ygbShowing.agent_id) ?? null}
          onClose={() => setYgbFor(null)}
          onSend={(d) => {
            const c = lk.person.get(ygbShowing.person_id);
            setYgbFor(null);
            flow.send(d, { ad: c?.ad_soyad, telefon: c?.telefon, eposta: c?.eposta });
          }}
        />
      )}
      {feedbackFor && <FeedbackDialog key={feedbackFor.id} showing={feedbackFor} portfolio={lk.portfolio.get(feedbackFor.portfolio_id) ?? null} onClose={() => setFeedbackFor(null)} />}
      <ComplianceDialog ev={ev} open={!!ev} onClose={() => setEv(null)} title="Gösterim kapatılamıyor" />
      {flow.ui}
    </div>
  );
}
