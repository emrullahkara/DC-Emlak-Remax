"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useReadySession, useRow, useTable } from "@/data/session";
import type { Person, SearchProfile } from "@/data/types";
import { Badge, Button, ButtonLink, Card, EmptyState, Spinner, toast } from "@/components/ui";
import { coolingStatus, missingConsents, personHeatFromRows } from "@/domain/crm";
import { priceLabel, roomLabel } from "@/domain/crm-messages";
import { matchPortfoliosForProfiles } from "@/domain/matching-adapter";
import { ASAMA_ETIKET } from "@/domain/pipeline";
import { OZELLIKLER, PERSON_TYPES, fmtDateTime, relDay } from "@/lib/format";
import { Avatar, HeatBar, RIZA_ETIKET, budgetLabel, seesAll } from "./common";
import { KvkkPanel } from "./KvkkPanel";
import { SearchProfileDialog } from "./SearchProfileDialog";
import { Timeline } from "./Timeline";
import { waChatUrl } from "./whatsapp";

export function PersonDetail({ id }: { id: string }) {
  const { data: person, loading } = useRow("person", id);
  if (loading) return <Spinner />;
  if (!person) {
    return (
      <EmptyState title="Müşteri bulunamadı" action={<ButtonLink href="/musteriler">Müşterilere dön</ButtonLink>}>
        Kayıt silinmiş veya görme yetkiniz yok.
      </EmptyState>
    );
  }
  return <Detail person={person} />;
}

function Detail({ person }: { person: Person }) {
  const { store, officeId, userId, member } = useReadySession();
  const profiles = useTable("search_profile", { eq: { person_id: person.id } });
  const consents = useTable("consent", { eq: { person_id: person.id } });
  const showings = useTable("showing", { eq: { person_id: person.id }, order: { column: "planlanan", ascending: false } });
  const owned = useTable("portfolio_owner", { eq: { person_id: person.id } });
  const portfolios = useTable("portfolio", { eq: { office_id: officeId } });
  const members = useTable("office_member", { eq: { office_id: officeId } });

  const [dialog, setDialog] = useState<{ open: boolean; profile: SearchProfile | null }>({ open: false, profile: null });

  const now = useMemo(() => new Date(), []);
  const cooling = coolingStatus(person, now);
  const eksikRiza = missingConsents(consents.data);
  const heat = useMemo(() => personHeatFromRows(person, profiles.data, showings.data, now), [person, profiles.data, showings.data, now]);
  const ready = !profiles.loading && !showings.loading;

  // Isı skorunu kayda yaz (değiştiyse)
  useEffect(() => {
    if (!ready || person.isi_skoru === heat.puan) return;
    store.update("person", person.id, { isi_skoru: heat.puan }).catch(() => {
      // Yetki yoksa (başkasının kaydı) sessizce geç; skor ekranda hesaplanır
    });
  }, [ready, heat.puan, person.id, person.isi_skoru, store]);

  const portfolioById = useMemo(() => new Map(portfolios.data.map((p) => [p.id, p])), [portfolios.data]);
  const matches = useMemo(() => matchPortfoliosForProfiles(portfolios.data, profiles.data).slice(0, 5), [portfolios.data, profiles.data]);
  const ilceler = useMemo(() => [...new Set(portfolios.data.map((p) => p.ilce).filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, "tr")), [portfolios.data]);
  const mahalleler = useMemo(() => [...new Set(portfolios.data.map((p) => p.mahalle).filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, "tr")), [portfolios.data]);
  const sahibi = members.data.find((m) => m.user_id === person.owner_id);
  const aktifArayis = profiles.data.some((p) => p.aktif);

  async function removeProfile(sp: SearchProfile) {
    if (!window.confirm("Bu arayış profili silinsin mi?")) return;
    try {
      await store.remove("search_profile", sp.id);
      toast("Arayış silindi");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Silinemedi");
    }
  }

  async function toggleProfile(sp: SearchProfile) {
    try {
      await store.update("search_profile", sp.id, { aktif: !sp.aktif });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Güncellenemedi");
    }
  }

  async function logCall() {
    try {
      await store.insert("activity", { office_id: officeId, user_id: userId, person_id: person.id, tur: "arama", icerik: "Telefonla arandı" });
      await store.update("person", person.id, { son_temas: new Date().toISOString() });
    } catch {
      // Arama kaydı başarısız olsa da arama başlar
    }
  }

  return (
    <div>
      {/* Başlık */}
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/musteriler" aria-label="Müşterilere dön" className="grid h-9 w-9 flex-none place-items-center rounded-lg hover:bg-surface">
            ←
          </Link>
          <Avatar name={person.ad_soyad} size="lg" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold">{person.ad_soyad}</h1>
            <p className="truncate text-sm text-muted">
              {person.tipler.map((t) => PERSON_TYPES[t]).join(", ")}
              {person.telefon && ` · ${person.telefon}`}
              {person.kaynak && ` · Kaynak: ${person.kaynak}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {person.telefon && (
            <>
              <a href={`tel:${person.telefon.replace(/[^\d+]/g, "")}`} onClick={logCall} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-ok bg-ok px-4 text-sm font-medium text-white hover:opacity-90">
                ☎ Ara
              </a>
              <a href={waChatUrl(person.telefon)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-bg">
                WhatsApp
              </a>
            </>
          )}
          <ButtonLink href={`/eslestirme?kisi=${person.id}`} variant="primary">
            ⇄ Eşleştir
          </ButtonLink>
          <ButtonLink href={`/musteriler/${person.id}/duzenle`}>Düzenle</ButtonLink>
        </div>
      </header>

      {/* Uyarılar */}
      <div className="mb-4 space-y-2">
        {cooling.soguyor && (
          <div role="alert" className="rounded-lg border border-block/40 bg-block/10 p-3 text-sm">
            <b className="text-block">Müşteri soğuyor:</b> {cooling.nedenler.join(" · ")}.{" "}
            <Link href={`/musteriler/${person.id}/duzenle`} className="text-brand underline">
              Sonraki adımı planla
            </Link>
          </div>
        )}
        {eksikRiza.length > 0 && !consents.loading && (
          <div className="rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm">
            <b className="text-warn">KVKK rıza eksik:</b> {eksikRiza.map((a) => RIZA_ETIKET[a].label).join(", ")}.{" "}
            {eksikRiza.includes("ticari_ileti") && "Katalog ve pazarlama mesajları engellenir."}
          </div>
        )}
      </div>

      {/* Özet şeridi */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Mini label="Isı skoru">
          <HeatBar value={heat.puan} />
          <p className="mt-1 truncate text-xs text-muted" title={heat.sinyaller.join(" · ")}>
            {heat.sinyaller.slice(0, 2).join(" · ")}
          </p>
        </Mini>
        <Mini label="Son temas">
          <p className="text-sm font-semibold">{person.son_temas ? relDay(person.son_temas) : "Yok"}</p>
        </Mini>
        <Mini label="Sonraki adım">
          <p className="truncate text-sm font-semibold" title={person.sonraki_adim ?? ""}>
            {person.sonraki_adim || <span className="text-block">Planlanmamış</span>}
          </p>
          {person.sonraki_adim_tarihi && <p className="text-xs text-muted">{fmtDateTime(person.sonraki_adim_tarihi)}</p>}
        </Mini>
        <Mini label="Danışman">
          <p className="truncate text-sm font-semibold">{sahibi?.ad_soyad ?? "—"}</p>
          {seesAll(member.rol) && person.owner_id !== userId && <p className="text-xs text-muted">Başka danışmanın kaydı</p>}
        </Mini>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0 space-y-4">
          {/* Arayış profilleri */}
          <Card
            title="Arayış profilleri"
            actions={
              <Button size="sm" onClick={() => setDialog({ open: true, profile: null })}>
                + Arayış
              </Button>
            }
          >
            {profiles.loading ? (
              <Spinner />
            ) : !profiles.data.length ? (
              <p className="text-sm text-muted">
                Arayış profili yok. Bütçe, bölge ve kriterleri girin; uygun portföyler otomatik eşleşsin.
              </p>
            ) : (
              <ul className="space-y-3">
                {profiles.data.map((sp) => (
                  <li key={sp.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {sp.ilan_tipi === "kiralik" ? "Kiralık" : sp.ilan_tipi === "devren" ? "Devren" : "Satılık"} · {budgetLabel(sp)}
                        </p>
                        <p className="text-xs text-muted">Tolerans %{sp.butce_tolerans ?? 0}</p>
                      </div>
                      <Badge tone={sp.aktif ? "ok" : "neutral"}>{sp.aktif ? "Aktif" : "Pasif"}</Badge>
                    </div>
                    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                      <dt className="text-muted">Bölge</dt>
                      <dd className="break-words">
                        {sp.ilceler.join(", ") || "—"}
                        {sp.mahalleler.length > 0 && ` (${sp.mahalleler.join(", ")})`}
                      </dd>
                      <dt className="text-muted">Oda / m²</dt>
                      <dd>
                        {sp.oda_min ? `${sp.oda_min}+ oda` : "Farketmez"} · {sp.m2_min ? `≥ ${sp.m2_min} m²` : "m² farketmez"}
                      </dd>
                      <dt className="text-muted">Kredi</dt>
                      <dd>
                        {sp.kredi_kullanacak ? (sp.kredi_on_onay ? <Badge tone="ok">Kredi · ön onaylı</Badge> : "Kredi kullanacak (ön onay yok)") : "Peşin / kredisiz"}
                      </dd>
                      <dt className="text-muted">Olmazsa olmaz</dt>
                      <dd>{sp.zorunlu.map((z) => OZELLIKLER[z] ?? z).join(", ") || "—"}</dd>
                      <dt className="text-muted">Olsa iyi olur</dt>
                      <dd>{sp.tercih.map((z) => OZELLIKLER[z] ?? z).join(", ") || "—"}</dd>
                    </dl>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Button size="sm" onClick={() => setDialog({ open: true, profile: sp })}>
                        Düzenle
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleProfile(sp)}>
                        {sp.aktif ? "Pasife al" : "Aktifleştir"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeProfile(sp)}>
                        Sil
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Eşleşen portföyler */}
          {(aktifArayis || matches.length > 0) && (
            <Card
              title="Eşleşen portföyler"
              actions={
                <Link href={`/eslestirme?kisi=${person.id}`} className="text-xs text-brand underline">
                  Tümü ve katalog →
                </Link>
              }
            >
              {!matches.length ? (
                <p className="text-sm text-muted">Uygun portföy yok — FSBO Radar&apos;da hedefli portföy avı başlatın.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {matches.map((m) => (
                    <li key={m.portfoyId} className="flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <Link href={`/portfoyler/${m.portfoyId}`} className="block truncate text-sm font-medium hover:underline">
                          {m.portfolio.baslik ?? "Portföy"}
                        </Link>
                        <p className="truncate text-xs text-muted">
                          {priceLabel(m.portfolio)} · {roomLabel(m.portfolio) ?? "—"} · {ASAMA_ETIKET[m.portfolio.asama as keyof typeof ASAMA_ETIKET] ?? m.portfolio.asama}
                        </p>
                      </div>
                      <b className={m.puan >= 75 ? "text-ok" : m.puan >= 60 ? "text-warn" : "text-muted"}>%{m.puan}</b>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {/* Mülk sahibi olduğu portföyler */}
          {owned.data.length > 0 && (
            <Card title="Sahibi olduğu portföyler">
              <ul className="divide-y divide-border">
                {owned.data.map((o) => {
                  const p = portfolioById.get(o.portfolio_id);
                  return (
                    <li key={o.portfolio_id} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <Link href={`/portfoyler/${o.portfolio_id}`} className="min-w-0 truncate font-medium hover:underline">
                        {p?.baslik ?? "Portföy"}
                      </Link>
                      <span className="flex-none text-xs text-muted">
                        {p ? `${priceLabel(p)} · ${ASAMA_ETIKET[p.asama as keyof typeof ASAMA_ETIKET] ?? p.asama}` : ""}
                        {o.hisse ? ` · Hisse ${o.hisse}` : ""}
                        {o.vekil ? " · Vekil" : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {/* Gösterimler */}
          <Card
            title="Gösterimler"
            actions={
              <Link href="/takvim" className="text-xs text-brand underline">
                Takvim →
              </Link>
            }
          >
            {!showings.data.length ? (
              <p className="text-sm text-muted">Gösterim yok. Takvimden gösterim planlayın.</p>
            ) : (
              <ul className="divide-y divide-border">
                {showings.data.map((g) => {
                  const p = portfolioById.get(g.portfolio_id);
                  return (
                    <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <div className="min-w-0">
                        <Link href="/takvim" className="block truncate font-medium hover:underline">
                          {p?.baslik ?? "Portföy"}
                        </Link>
                        <p className="text-xs text-muted">
                          {fmtDateTime(g.planlanan)}
                          {g.geri_bildirim?.puan ? ` · Geri bildirim ${g.geri_bildirim.puan}/5` : ""}
                        </p>
                      </div>
                      <Badge tone={g.durum === "tamamlandi" ? "ok" : g.durum === "iptal" ? "neutral" : "info"}>
                        {g.durum === "tamamlandi" ? "Tamamlandı" : g.durum === "iptal" ? "İptal" : "Planlı"}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Timeline person={person} />
          <KvkkPanel person={person} consents={consents.data} />
        </div>
      </div>

      <SearchProfileDialog
        open={dialog.open}
        profile={dialog.profile}
        personId={person.id}
        ilceler={ilceler}
        mahalleler={mahalleler}
        onClose={() => setDialog({ open: false, profile: null })}
      />
    </div>
  );
}

function Mini({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-surface p-3">
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
