"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReadySession, useTable } from "@/data/session";
import { recordEvaluation } from "@/data/compliance-log";
import type { Person, Portfolio, SearchProfile } from "@/data/types";
import { Badge, Button, ButtonLink, Card, ComplianceDialog, EmptyState, Field, PageHeader, Select, Spinner, Tabs, cx, toast } from "@/components/ui";
import { evaluateMessageSend, type Evaluation } from "@/domain/compliance";
import { hasConsent } from "@/domain/crm";
import { buildCatalogMessage, priceLabel, roomLabel } from "@/domain/crm-messages";
import { isMatchable, matchPersonsForPortfolio, matchPortfoliosForProfile, type PortfolioMatch } from "@/domain/matching-adapter";
import { ASAMA_ETIKET } from "@/domain/pipeline";
import { ILAN_TIPLERI, OZELLIKLER } from "@/lib/format";
import { profileSummary, seesAll } from "./common";
import { sendWhatsApp } from "./whatsapp";

type Mod = "kisi" | "portfoy";

const asama = (p: Portfolio) => ASAMA_ETIKET[p.asama as keyof typeof ASAMA_ETIKET] ?? p.asama;
/** Motorun gerekçelerindeki özellik kodlarını ("deniz_manzarasi") Türkçe etikete çevirir */
export function prettyReason(g: string) {
  const m = /^Tercihler: (.*)$/.exec(g);
  if (!m) return g;
  return `Tercihler: ${m[1]!
    .split(", ")
    .map((k) => OZELLIKLER[k] ?? k)
    .join(", ")}`;
}

const scoreTone = (n: number) => (n >= 75 ? "text-ok" : n >= 60 ? "text-warn" : "text-muted");

export function Matching() {
  const { officeId, userId, member } = useReadySession();
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();

  const persons = useTable("person", { eq: { office_id: officeId }, order: { column: "ad_soyad" } });
  const profiles = useTable("search_profile");
  const portfolios = useTable("portfolio", { eq: { office_id: officeId }, order: { column: "created_at", ascending: false } });

  const mod: Mod = params.get("portfoy") ? "portfoy" : params.get("mod") === "portfoy" ? "portfoy" : "kisi";
  const setQuery = (q: Record<string, string>) => router.replace(`${path}?${new URLSearchParams(q).toString()}`, { scroll: false });

  // Danışman kendi müşterileri; yöneticiler tüm ofis
  const visiblePersons = useMemo(
    () => persons.data.filter((p) => seesAll(member.rol) || p.owner_id === userId),
    [persons.data, member.rol, userId],
  );
  const visibleIds = useMemo(() => new Set(visiblePersons.map((p) => p.id)), [visiblePersons]);
  const activeProfiles = useMemo(() => profiles.data.filter((sp) => sp.aktif && visibleIds.has(sp.person_id)), [profiles.data, visibleIds]);
  const buyers = useMemo(() => {
    const ids = new Set(activeProfiles.map((sp) => sp.person_id));
    return visiblePersons.filter((p) => ids.has(p.id));
  }, [activeProfiles, visiblePersons]);

  if (persons.loading || profiles.loading || portfolios.loading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Eşleştirme" subtitle="Arayış profili ↔ portföy, ağırlıklı puan ve gerekçeleriyle" />
      <div className="mb-4">
        <Tabs<Mod>
          tabs={[
            { id: "kisi", label: "Müşteriye göre portföy" },
            { id: "portfoy", label: "Portföye göre müşteri" },
          ]}
          value={mod}
          onChange={(m) => setQuery(m === "portfoy" ? { mod: "portfoy" } : {})}
        />
      </div>
      {mod === "kisi" ? (
        <ByPerson
          buyers={buyers}
          profiles={activeProfiles}
          portfolios={portfolios.data}
          selectedId={params.get("kisi")}
          onSelect={(id) => setQuery({ kisi: id })}
        />
      ) : (
        <ByPortfolio
          portfolios={portfolios.data}
          profiles={activeProfiles}
          persons={visiblePersons}
          selectedId={params.get("portfoy")}
          onSelect={(id) => setQuery({ mod: "portfoy", portfoy: id })}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Müşteriye göre
// ---------------------------------------------------------------------------

function ByPerson({
  buyers,
  profiles,
  portfolios,
  selectedId,
  onSelect,
}: {
  buyers: Person[];
  profiles: SearchProfile[];
  portfolios: Portfolio[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const person = buyers.find((b) => b.id === selectedId) ?? buyers[0] ?? null;

  if (!buyers.length) {
    return (
      <EmptyState title="Aktif arayışı olan müşteri yok" action={<ButtonLink href="/musteriler">Müşterilere git</ButtonLink>}>
        Müşteri kartından bir arayış profili (bütçe, bölge, kriterler) ekleyin.
      </EmptyState>
    );
  }
  if (selectedId && !buyers.some((b) => b.id === selectedId)) {
    // Seçilen kişinin aktif arayışı yok
    return (
      <div className="space-y-4">
        <PersonChips buyers={buyers} selected={null} onSelect={onSelect} />
        <EmptyState title="Bu kişinin aktif arayış profili yok" action={<ButtonLink href={`/musteriler/${selectedId}`}>Müşteri kartını aç</ButtonLink>}>
          Eşleştirme için müşteri kartından arayış profili ekleyin veya aktifleştirin.
        </EmptyState>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <PersonChips buyers={buyers} selected={person?.id ?? null} onSelect={onSelect} />
      {person && <PersonMatches key={person.id} person={person} profiles={profiles.filter((sp) => sp.person_id === person.id)} portfolios={portfolios} />}
    </div>
  );
}

function PersonChips({ buyers, selected, onSelect }: { buyers: Person[]; selected: string | null; onSelect: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  // Mobilde yatay kaydırmalı listede seçili kişiyi görünür yap
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    const box = ref.current;
    if (el && box) box.scrollLeft = el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2;
  }, [selected]);
  return (
    <div ref={ref} className="relative -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Müşteri seç">
      {buyers.map((b) => (
        <button
          key={b.id}
          type="button"
          aria-pressed={b.id === selected}
          onClick={() => onSelect(b.id)}
          className={cx(
            "min-h-9 flex-none rounded-full border px-3 text-sm",
            b.id === selected ? "border-brand bg-brand text-white" : "border-border bg-surface hover:bg-bg",
          )}
        >
          {b.ad_soyad}
        </button>
      ))}
    </div>
  );
}

function PersonMatches({ person, profiles, portfolios }: { person: Person; profiles: SearchProfile[]; portfolios: Portfolio[] }) {
  const { store, officeId, userId, office, member } = useReadySession();
  const consents = useTable("consent", { eq: { person_id: person.id } });
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? "");
  const profile = profiles.find((p) => p.id === profileId) ?? profiles[0]!;
  const matches = useMemo(() => matchPortfoliosForProfile(portfolios, profile), [portfolios, profile]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(matches.filter((m) => m.puan >= 75).slice(0, 3).map((m) => m.portfoyId)));
  const [ev, setEv] = useState<Evaluation | null>(null);
  const [sending, setSending] = useState(false);

  const ticariRiza = hasConsent(consents.data, "ticari_ileti");
  const chosen = matches.filter((m) => selected.has(m.portfoyId));

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function send() {
    if (!chosen.length) return toast("Önce portföy seçin");
    if (!person.telefon) return toast("Müşterinin telefonu kayıtlı değil");
    const evaluation = evaluateMessageSend({ ticariIleti: true, kanal: "whatsapp", kvkkAcikRiza: ticariRiza, iysIzni: ticariRiza });
    const ctx = { officeId, userId };
    if (evaluation.karar === "ENGELLE") {
      setEv(evaluation);
      recordEvaluation(store, ctx, "mesaj_gonder", "person", person.id, evaluation, "WhatsApp katalog").catch(() => {});
      return;
    }
    setSending(true);
    try {
      const text = buildCatalogMessage({
        kisiAdi: person.ad_soyad,
        portfoyler: chosen.map((m) => m.portfolio),
        danismanAdi: member.ad_soyad,
        ofisUnvani: office.unvan,
        danismanTelefon: member.telefon,
      });
      const url = await sendWhatsApp(person.telefon, text);
      if (!url) {
        toast("WhatsApp bağlantısı oluşturulamadı");
        return;
      }
      await Promise.all([
        recordEvaluation(store, ctx, "mesaj_gonder", "person", person.id, evaluation, "WhatsApp katalog").catch(() => {}),
        store.insert("activity", {
          office_id: officeId,
          user_id: userId,
          person_id: person.id,
          tur: "mesaj",
          icerik: `WhatsApp ile ${chosen.length} portföylük katalog gönderildi: ${chosen.map((m) => m.portfolio.baslik ?? "Portföy").join(", ")}`,
        }),
        store.update("person", person.id, { son_temas: new Date().toISOString() }),
      ]);
      toast("Katalog WhatsApp'ta açıldı, zaman tüneline işlendi");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gönderilemedi");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <Card
        title={
          <span>
            <Link href={`/musteriler/${person.id}`} className="hover:underline">
              {person.ad_soyad}
            </Link>{" "}
            için {matches.length} portföy
          </span>
        }
        actions={<span className="hidden text-xs text-muted sm:inline">Yetki · Yayında · Teklif</span>}
      >
        {!matches.length ? (
          <div className="text-sm">
            <p className="font-medium">Bu arayışa uygun portföy yok</p>
            <p className="mt-1 text-muted">Ters eşleştirme: FSBO Radar&apos;da ve sfer listesinde hedefli portföy avı başlatın.</p>
            <div className="mt-3">
              <ButtonLink href="/fsbo" size="sm">
                FSBO Radar →
              </ButtonLink>
            </div>
          </div>
        ) : (
          <ul className="-my-2 divide-y divide-border">
            {matches.map((m) => (
              <MatchRow key={m.portfoyId} m={m} checked={selected.has(m.portfoyId)} onToggle={() => toggle(m.portfoyId)} />
            ))}
          </ul>
        )}
      </Card>

      <aside className="min-w-0 space-y-4">
        <Card title="Arayış">
          {profiles.length > 1 && (
            <div className="mb-3">
              <Field label="Profil">
                <Select
                  value={profile.id}
                  onChange={(e) => {
                    setProfileId(e.target.value);
                    setSelected(new Set());
                  }}
                >
                  {profiles.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {profileSummary(sp)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}
          <p className="text-sm">{profileSummary(profile)}</p>
          <p className="mt-2 text-xs text-muted">
            {profile.kredi_kullanacak ? (profile.kredi_on_onay ? "Kredi · ön onaylı" : "Kredi kullanacak") : "Peşin / kredisiz"}
            {profile.zorunlu.length > 0 && ` · Olmazsa olmaz: ${profile.zorunlu.map((z) => OZELLIKLER[z] ?? z).join(", ")}`}
          </p>
          <p className="mt-3 text-xs text-muted">Puan: fiyat 30 · konum 25 · oda/m² 25 · tercihler 20. Bütçe üstü (tolerans hariç), kredi uygunsuzluğu ve zorunlu kriter eksikliği eler.</p>
        </Card>
        <Card title="Katalog paylaş">
          <p className="text-sm text-muted">Seçilen portföyler WhatsApp mesajı olarak hazırlanır. Göndermeden önce KVKK açık rıza ve İYS izni kontrol edilir.</p>
          <div className="mt-2">
            {consents.loading ? null : ticariRiza ? <Badge tone="ok">Ticari ileti izni var</Badge> : <Badge tone="block">Ticari ileti izni yok</Badge>}
          </div>
          <Button variant="primary" className="mt-3 w-full" onClick={send} disabled={sending || !chosen.length || consents.loading}>
            WhatsApp ile katalog gönder ({chosen.length})
          </Button>
          {!person.telefon && <p className="mt-2 text-xs text-block">Müşterinin telefonu kayıtlı değil.</p>}
        </Card>
      </aside>

      <ComplianceDialog ev={ev} open={!!ev} onClose={() => setEv(null)} title="Katalog gönderilemez" />
    </div>
  );
}

function MatchRow({ m, checked, onToggle }: { m: PortfolioMatch; checked: boolean; onToggle: () => void }) {
  const p = m.portfolio;
  return (
    <li className="py-3">
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={checked} onChange={onToggle} className="mt-1 h-5 w-5 flex-none accent-brand" aria-label={`${p.baslik ?? "Portföy"} seç`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link href={`/portfoyler/${p.id}`} className="block truncate text-sm font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                {p.baslik ?? "Portföy"}
              </Link>
              <p className="truncate text-xs text-muted">
                {priceLabel(p)} · {roomLabel(p) ?? "—"} · {p.net_m2 ?? p.brut_m2 ?? "—"} m² · {[p.mahalle, p.ilce].filter(Boolean).join(", ")}
              </p>
            </div>
            <div className="flex-none text-right">
              <div className={cx("text-lg font-semibold tabular-nums", scoreTone(m.puan))}>%{m.puan}</div>
              <div className="text-[10px] text-muted">uyum</div>
            </div>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Badge tone="neutral">{asama(p)}</Badge>
            {m.gerekceler.map((g) => (
              <Badge key={g} tone={g.startsWith("Bütçeyi") ? "warn" : "ok"}>
                {prettyReason(g)}
              </Badge>
            ))}
          </div>
        </div>
      </label>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Portföye göre (ters görünüm)
// ---------------------------------------------------------------------------

function ByPortfolio({
  portfolios,
  profiles,
  persons,
  selectedId,
  onSelect,
}: {
  portfolios: Portfolio[];
  profiles: SearchProfile[];
  persons: Person[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const matchable = portfolios.filter(isMatchable);
  const portfolio = matchable.find((p) => p.id === selectedId) ?? matchable[0] ?? null;
  const results = useMemo(() => (portfolio ? matchPersonsForPortfolio(portfolio, profiles, persons) : []), [portfolio, profiles, persons]);

  if (!matchable.length) {
    return (
      <EmptyState title="Eşleştirilebilir portföy yok" action={<ButtonLink href="/portfoyler">Portföylere git</ButtonLink>}>
        Yetki alınmış, yayında veya teklif aşamasındaki portföyler eşleştirilir.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      <div className="max-w-xl">
        <Field label="Portföy">
          <Select value={portfolio?.id ?? ""} onChange={(e) => onSelect(e.target.value)}>
            {matchable.map((p) => (
              <option key={p.id} value={p.id}>
                {p.baslik ?? "Portföy"} — {priceLabel(p)} ({ILAN_TIPLERI[p.ilan_tipi]})
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {portfolio && (
        <Card
          title={`${portfolio.baslik ?? "Portföy"} için ${results.length} müşteri`}
          actions={
            <Link href={`/portfoyler/${portfolio.id}`} className="text-xs text-brand underline">
              Portföy kartı →
            </Link>
          }
        >
          <p className="mb-3 text-xs text-muted">
            {priceLabel(portfolio)} · {roomLabel(portfolio) ?? "—"} · {portfolio.net_m2 ?? portfolio.brut_m2 ?? "—"} m² · {[portfolio.mahalle, portfolio.ilce].filter(Boolean).join(", ")} · {asama(portfolio)}
          </p>
          {!results.length ? (
            <p className="text-sm text-muted">Bu portföye uyan aktif arayış yok. Sfer listesi ve ağ üzerinden alıcı arayın.</p>
          ) : (
            <ul className="-my-2 divide-y divide-border">
              {results.map((r) => (
                <li key={r.person.id} className="flex flex-wrap items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/musteriler/${r.person.id}`} className="text-sm font-medium hover:underline">
                      {r.person.ad_soyad}
                    </Link>
                    <p className="truncate text-xs text-muted">{profileSummary(r.profile)}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {r.gerekceler.map((g) => (
                        <Badge key={g} tone={g.startsWith("Bütçeyi") ? "warn" : "ok"}>
                          {prettyReason(g)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-none items-center gap-3">
                    <span className={cx("text-lg font-semibold tabular-nums", scoreTone(r.puan))}>%{r.puan}</span>
                    <ButtonLink href={`/eslestirme?kisi=${r.person.id}`} size="sm">
                      Katalog
                    </ButtonLink>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
