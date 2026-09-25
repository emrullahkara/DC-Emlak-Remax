"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, ButtonLink, Card, cx, ErrorNote, Spinner } from "@/components/ui";
import { useReadySession, useTable } from "@/data/session";
import {
  buildTodayActions,
  complianceAlertCount,
  monthlyRealized,
  pipelineSummary,
  targetProgress,
  type ActionKind,
  type KokpitScope,
  type TodayAction,
} from "@/domain/kokpit";
import { tl } from "@/lib/format";
import { TargetCard } from "./TargetCard";

const ASAMA_KISA: Record<string, string> = {
  aday: "Aday",
  degerleme: "Değerleme",
  yetki: "Yetki",
  yayinda: "Yayında",
  teklif: "Teklif",
  kapora: "Kapora",
  tapu: "Tapu",
};

const KIND_ICON: Record<ActionKind, string> = {
  uyum: "⛔",
  yetki_belgesi: "🪪",
  yetki_bitis: "⏳",
  gosterim: "🏠",
  gorev: "✓",
  soguyan: "☎",
  fsbo: "◎",
  fiyat: "↘",
};

const LEVEL_STYLE: Record<TodayAction["level"], { border: string; icon: string; label: string; tone: "block" | "warn" | "info" }> = {
  ENGELLE: { border: "border-l-block", icon: "bg-block/10 text-block", label: "Engel", tone: "block" },
  UYAR: { border: "border-l-warn", icon: "bg-warn/10 text-warn", label: "Uyarı", tone: "warn" },
  BILGI: { border: "border-l-info", icon: "bg-info/10 text-info", label: "Bilgi", tone: "info" },
};

function greeting(d: Date) {
  const h = d.getHours();
  return h < 12 ? "Günaydın" : h < 18 ? "İyi günler" : "İyi akşamlar";
}

function ActionRow({ a }: { a: TodayAction }) {
  const s = LEVEL_STYLE[a.level];
  return (
    <li>
      <Link
        href={a.href}
        className={cx("flex items-start gap-3 rounded-lg border border-l-4 border-border bg-surface p-3 transition hover:bg-bg", s.border)}
      >
        <span aria-hidden className={cx("grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm", s.icon)}>
          {KIND_ICON[a.kind]}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words text-sm font-medium">{a.title}</span>
          {a.detail && <span className="mt-0.5 block break-words text-xs text-muted">{a.detail}</span>}
        </span>
        {a.level !== "BILGI" && (
          <Badge tone={s.tone} className="hidden sm:inline-flex">
            {s.label}
          </Badge>
        )}
      </Link>
    </li>
  );
}

export function Kokpit() {
  const { office, member, userId, officeId } = useReadySession();
  const [now] = useState(() => new Date());
  const canSeeOffice = member.rol === "broker" || member.rol === "takim_lideri";
  const [scopeSel, setScope] = useState<KokpitScope>("benim");
  const scope: KokpitScope = canSeeOffice ? scopeSel : "benim";
  const [showAll, setShowAll] = useState(false);

  const portfolios = useTable("portfolio", { eq: { office_id: officeId } });
  const contracts = useTable("authorization_contract");
  const showings = useTable("showing", { eq: { office_id: officeId, durum: "planli" } });
  const persons = useTable("person", { eq: { office_id: officeId } });
  const activities = useTable("activity", { eq: { office_id: officeId, tur: "gorev" } });
  const fsbo = useTable("fsbo_listing", { eq: { office_id: officeId } });
  const offers = useTable("offer", { in: { durum: ["acik", "karsi_teklif"] } });
  const media = useTable("media");
  const deals = useTable("deal", { eq: { office_id: officeId } });
  const lines = useTable("commission_line");

  const docIds = useMemo(
    () => [...new Set(showings.data.map((s) => s.yer_gosterme_belgesi_id).filter((x): x is string => Boolean(x)))].sort(),
    [showings.data],
  );
  const documents = useTable("document", { in: { id: docIds } }, docIds.length > 0);

  const all = [portfolios, contracts, showings, persons, activities, fsbo, offers, media, deals, lines];
  const loading = all.some((q) => q.loading);
  const error = all.find((q) => q.error)?.error ?? null;

  const actions = useMemo(
    () =>
      buildTodayActions(
        {
          office,
          userId,
          scope,
          portfolios: portfolios.data,
          contracts: contracts.data,
          showings: showings.data,
          persons: persons.data,
          activities: activities.data,
          fsbo: fsbo.data,
          documents: docIds.length ? documents.data : [],
          offers: offers.data,
          media: media.data,
        },
        now,
      ),
    [office, userId, scope, portfolios.data, contracts.data, showings.data, persons.data, activities.data, fsbo.data, documents.data, docIds.length, offers.data, media.data, now],
  );

  const hat = useMemo(() => pipelineSummary(portfolios.data, contracts.data, now, scope, userId), [portfolios.data, contracts.data, now, scope, userId]);
  const gerceklesen = useMemo(
    () => monthlyRealized(deals.data, lines.data, now, { scope, userId, portfolios: portfolios.data }),
    [deals.data, lines.data, now, scope, userId, portfolios.data],
  );

  const uyumSayisi = complianceAlertCount(actions);
  const engelSayisi = actions.filter((a) => a.level === "ENGELLE").length;
  const uyumListesi = actions.filter((a) => a.compliance && a.level !== "BILGI");
  const gorunen = showAll ? actions : actions.slice(0, 10);
  const yayinda = hat.asamalar.find((a) => a.asama === "yayinda")?.adet ?? 0;
  const maxBeklenen = Math.max(1, ...hat.asamalar.map((a) => a.beklenen));
  const ad = member.ad_soyad.split(/\s+/)[0] ?? "";

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">
            {greeting(now)}, {ad}
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            {now.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" })}
            {!loading && (
              <>
                {" · "}Bugün {actions.length} aksiyon{engelSayisi > 0 && `, ${engelSayisi}'${engelSayisi === 1 ? "i" : "si"} engel içeriyor`}
              </>
            )}
          </p>
        </div>
        {canSeeOffice && (
          <div role="radiogroup" aria-label="Kapsam" className="inline-flex rounded-lg border border-border bg-surface p-0.5 text-sm">
            {(["benim", "ofis"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={scope === s}
                onClick={() => setScope(s)}
                className={cx("min-h-9 rounded-md px-3", scope === s ? "bg-brand text-white" : "text-muted hover:text-text")}
              >
                {s === "benim" ? "Benim" : "Ofis"}
              </button>
            ))}
          </div>
        )}
      </header>

      <nav aria-label="Hızlı işlemler" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <ButtonLink href="/portfoyler/yeni" variant="primary">
          ＋ Yeni portföy
        </ButtonLink>
        <ButtonLink href="/musteriler/yeni">＋ Yeni müşteri</ButtonLink>
        <ButtonLink href="/takvim">▦ Gösterim planla</ButtonLink>
        <ButtonLink href="/hesaplayicilar">₺ Hesaplayıcı</ButtonLink>
      </nav>

      <ErrorNote error={error} />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TargetCard officeId={officeId} userId={userId} progress={(hedef) => targetProgress(hedef, gerceklesen, now)} gerceklesen={gerceklesen} now={now} />
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-muted" title="Aşama olasılığı × hizmet bedeli (KDV hariç). Aday %5 … Tapu %95.">
            Beklenen komisyon ⓘ
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{loading ? "…" : tl(hat.beklenenToplam)}</p>
          <p className="mt-1 text-xs text-muted">Olasılık ağırlıklı, KDV hariç · {hat.kayitSayisi} kayıt</p>
        </div>
        <Link href="#uyum" className="rounded-xl border border-border bg-surface p-4 hover:bg-bg">
          <p className="text-xs text-muted">Uyum uyarıları</p>
          <p className={cx("mt-1 text-xl font-semibold tabular-nums", uyumSayisi > 0 ? "text-block" : "text-ok")}>{loading ? "…" : uyumSayisi}</p>
          <p className="mt-1 text-xs text-muted">{uyumSayisi ? "EİDS, yetki, yer gösterme belgesi" : "Açık uyum sorunu yok"}</p>
        </Link>
        <Link href="/portfoyler" className="rounded-xl border border-border bg-surface p-4 hover:bg-bg">
          <p className="text-xs text-muted">Aktif portföy</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {loading ? "…" : yayinda} <span className="text-sm font-normal text-muted">yayında</span>
          </p>
          <p className="mt-1 text-xs text-muted">{hat.kayitSayisi} portföy satış hattında</p>
        </Link>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card
          title={
            <>
              Bugün <span className="font-normal text-muted">({actions.length})</span>
            </>
          }
          actions={<span className="text-xs text-muted">Öncelik sırasına göre</span>}
        >
          {loading ? (
            <Spinner />
          ) : actions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Bugün için bekleyen aksiyon yok. 🎉</p>
          ) : (
            <>
              <ul className="space-y-2">
                {gorunen.map((a) => (
                  <ActionRow key={a.id} a={a} />
                ))}
              </ul>
              {actions.length > 10 && (
                <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 min-h-10 w-full rounded-lg text-sm text-brand hover:bg-bg">
                  {showAll ? "Daha az göster" : `Tümünü göster (${actions.length - 10} daha)`}
                </button>
              )}
            </>
          )}
        </Card>

        <div className="min-w-0 space-y-5">
          <Card title="Satış hattı" actions={<Link href="/islemler" className="text-xs text-brand">İşlemlere git →</Link>}>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7 lg:grid-cols-4">
              {hat.asamalar.map((a) => (
                <div key={a.asama} className="min-w-0 rounded-lg bg-bg px-1 py-2 text-center" title={`${ASAMA_KISA[a.asama]}: ${a.adet} kayıt · beklenen ${tl(a.beklenen)}`}>
                  <p className="truncate text-[11px] text-muted">{ASAMA_KISA[a.asama]}</p>
                  <p className="text-lg font-semibold tabular-nums">{a.adet}</p>
                  <div className="mx-1.5 mt-1 h-1 overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${a.beklenen > 0 ? Math.max(6, (a.beklenen / maxBeklenen) * 100) : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">Çubuk: aşama başına beklenen komisyon (olasılık ağırlıklı).</p>
          </Card>

          <section id="uyum" className="min-w-0 scroll-mt-4">
            <Card
              title="Uyum uyarıları"
              actions={uyumSayisi > 0 ? <Badge tone="block">{uyumSayisi} açık</Badge> : <Badge tone="ok">Temiz</Badge>}
            >
              {uyumListesi.length === 0 ? (
                <p className="text-sm text-ok">Tüm uyum kontrolleri tamam.</p>
              ) : (
                <ul className="space-y-2">
                  {uyumListesi.slice(0, 6).map((a) => (
                    <ActionRow key={a.id} a={a} />
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
