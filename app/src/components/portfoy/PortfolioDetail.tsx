"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, ButtonLink, Card, EmptyState, ErrorNote, Select, Spinner, Stat, Tabs, toast } from "@/components/ui";
import { useReadySession, useTable } from "@/data/session";
import type { Portfolio } from "@/data/types";
import { rankMatches } from "@/domain/matching";
import { odaLabel, PAYLASIM_LABEL, portfolioName, TAPU_TURLERI, toMatchPortfolio, toMatchProfile, type EvrakItem } from "@/domain/portfoy";
import { EMLAK_TIPLERI, fmtDate, ILAN_TIPLERI, initials, num, OZELLIKLER, PERSON_TYPES, shortTL, tl, todayISO } from "@/lib/format";
import { CompliancePanel, DaskDialog, HealthPanel, OwnerReportDialog, YetkiDialog } from "./ComplianceRail";
import { MediaTab } from "./MediaTab";
import { useMediaUrls } from "./media";
import { CoverImage, HealthBadge, KV, priceText, StageBadge, YesNo } from "./shared";
import { StageControl } from "./StageControl";
import { usePortfolioBundle, type PortfolioBundle } from "./usePortfolioBundle";

type Tab = "genel" | "tapu" | "medya" | "evrak" | "eslesmeler" | "performans";

export function PortfolioDetail({ id }: { id: string }) {
  const b = usePortfolioBundle(id);
  const { store, supabase } = useReadySession();
  const [tab, setTab] = useState<Tab>("genel");
  const [reportOpen, setReportOpen] = useState(false);
  const p = b.portfolio;
  const d = b.derived;

  // Hesaplanan sağlık skorunu diğer modüller için kaydet
  const puan = d?.health.puan;
  useEffect(() => {
    if (!p || puan === undefined || p.saglik_skoru === puan) return;
    store.update("portfolio", p.id, { saglik_skoru: puan }).catch(() => undefined);
  }, [p, puan, store]);

  const photos = useMemo(() => b.media.filter((m) => m.tur === "foto" || m.tur === "sanal_mobilya").slice(0, 3), [b.media]);
  const urls = useMediaUrls(photos, supabase);

  if (b.loading) return <Spinner />;
  if (b.error) return <ErrorNote error={b.error} />;
  if (!p || !d) return <EmptyState title="Portföy bulunamadı" action={<ButtonLink href="/portfoyler">Portföylere dön</ButtonLink>} />;

  return (
    <div>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <Link href="/portfoyler" aria-label="Portföylere dön" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg hover:bg-surface">
            ←
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold break-words md:text-2xl">{portfolioName(p)}</h1>
            <p className="mt-0.5 text-sm text-muted">
              {[p.il, p.ilce, p.mahalle].filter(Boolean).join(" / ") || "Konum yok"}
              {odaLabel(p) && ` · ${odaLabel(p)}`}
              {p.brut_m2 && ` · ${p.brut_m2} m²`} · {ILAN_TIPLERI[p.ilan_tipi]}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xl font-semibold tabular-nums md:text-2xl">{priceText(p)}</span>
          <StageBadge asama={p.asama} />
          <HealthBadge puan={d.health.puan} />
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3">
        <StageControl b={b} />
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Paylaşım</span>
          <Select
            aria-label="Paylaşım seviyesi"
            value={p.paylasim_seviyesi}
            onChange={(e) =>
              store
                .update("portfolio", p.id, { paylasim_seviyesi: e.target.value as Portfolio["paylasim_seviyesi"] })
                .then(() => toast("Paylaşım seviyesi güncellendi"))
                .catch((err: Error) => toast(err.message))
            }
          >
            {Object.entries(PAYLASIM_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </label>
        <ButtonLink href={`/portfoyler/${p.id}/duzenle`} size="sm" className="ml-auto">
          ✎ Düzenle
        </ButtonLink>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <CoverImage url={photos[0] ? urls[photos[0].id] : null} alt={portfolioName(p)} className="col-span-3 aspect-[16/9] rounded-xl sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:min-h-56">
              {photos[0]?.temsili && (
                <span className="absolute left-2 top-2">
                  <Badge tone="warn">Temsilîdir</Badge>
                </span>
              )}
              <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-xs text-white">{b.media.length} medya</span>
            </CoverImage>
            {[1, 2].map((i) => (
              <CoverImage key={i} url={photos[i] ? urls[photos[i].id] : null} alt={`${portfolioName(p)} ${i}`} className="hidden aspect-[4/3] rounded-xl sm:block" />
            ))}
          </div>

          <section className="min-w-0 rounded-xl border border-border bg-surface">
            <div className="px-2">
              <Tabs<Tab>
                value={tab}
                onChange={setTab}
                tabs={[
                  { id: "genel", label: "Genel" },
                  { id: "tapu", label: "Tapu & Hukuk" },
                  { id: "medya", label: `Medya (${b.media.length})` },
                  { id: "evrak", label: `Evrak (${d.evrak.filter((e) => e.tamam).length}/${d.evrak.length})` },
                  { id: "eslesmeler", label: "Eşleşmeler" },
                  { id: "performans", label: "Performans" },
                ]}
              />
            </div>
            <div className="p-4">
              {tab === "genel" && <GenelTab b={b} />}
              {tab === "tapu" && <TapuTab b={b} />}
              {tab === "medya" && <MediaTab portfolio={p} media={b.media} />}
              {tab === "evrak" && <EvrakTab b={b} />}
              {tab === "eslesmeler" && <MatchesTab portfolio={p} />}
              {tab === "performans" && <PerformansTab b={b} />}
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-4">
          <HealthPanel health={d.health} />
          <CompliancePanel b={b} onReport={() => setReportOpen(true)} />
        </aside>
      </div>
      <OwnerReportDialog open={reportOpen} onClose={() => setReportOpen(false)} b={b} />
    </div>
  );
}

// ---- Genel ------------------------------------------------------------------------

function GenelTab({ b }: { b: PortfolioBundle }) {
  const p = b.portfolio!;
  const d = b.derived!;
  const m2Fiyat = p.fiyat && p.brut_m2 && p.ilan_tipi !== "kiralik" ? tl(Math.round(p.fiyat / p.brut_m2)) : null;
  return (
    <div className="space-y-5">
      <KV
        items={[
          ["Tip", `${EMLAK_TIPLERI[p.emlak_tipi] ?? p.emlak_tipi} · ${ILAN_TIPLERI[p.ilan_tipi]}`],
          ["Oda", odaLabel(p)],
          ["m² (brüt / net)", `${p.brut_m2 ?? "—"} / ${p.net_m2 ?? "—"}`],
          ["Kat", p.kat !== null && p.kat !== undefined ? `${p.kat}${p.toplam_kat ? ` / ${p.toplam_kat}` : ""}` : null],
          ["Bina yaşı", p.bina_yasi],
          ["Isınma", p.isinma],
          ["Aidat", p.aidat ? tl(p.aidat) : null],
          ["m² fiyatı", m2Fiyat],
          ["Paylaşım", PAYLASIM_LABEL[p.paylasim_seviyesi]],
          ["Kayıt tarihi", fmtDate(p.created_at)],
        ]}
      />

      {p.ozellikler.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Özellikler</h3>
          <div className="flex flex-wrap gap-1.5">
            {p.ozellikler.map((o) => (
              <Badge key={o}>{OZELLIKLER[o] ?? o}</Badge>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold">Malikler</h3>
        {d.ownerPersons.length ? (
          <ul className="space-y-2">
            {d.ownerPersons.map((o) => {
              const row = b.owners.find((x) => x.person_id === o.id);
              return (
                <li key={o.id} className="flex items-center gap-3 text-sm">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-semibold text-brand">{initials(o.ad_soyad)}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/musteriler/${o.id}`} className="font-medium text-brand hover:underline">
                      {o.ad_soyad}
                    </Link>
                    <p className="text-xs text-muted">
                      {row?.hisse ? `Hisse ${row.hisse}` : "Hisse belirtilmedi"}
                      {row?.vekil ? " · vekil aracılığıyla" : ""}
                      {o.telefon ? ` · ${o.telefon}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            Malik eklenmemiş.{" "}
            <Link href={`/portfoyler/${p.id}/duzenle`} className="text-brand underline">
              Malik ekle
            </Link>
          </p>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Fiyat geçmişi</h3>
        {b.history.length ? (
          <ol className="flex flex-wrap items-center gap-1.5 text-sm">
            {b.history.map((h, i) => (
              <li key={String(h.id)} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-muted">→</span>}
                <Badge tone={i === b.history.length - 1 ? "brand" : "neutral"} className="tabular-nums">
                  {fmtDate(h.created_at, { day: "numeric", month: "short" })}: {shortTL(h.fiyat)}
                </Badge>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted">Fiyat değişikliği kaydı yok.</p>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Açıklama</h3>
        {p.aciklama ? <p className="whitespace-pre-line text-sm leading-relaxed">{p.aciklama}</p> : <p className="text-sm text-muted">Açıklama yok.</p>}
        {d.publishEval.sonuclar.some((r) => r.kural === "ILAN_METNI") ? (
          <p className="mt-2 text-xs text-warn">Mevzuat filtresi: metinde yanıltıcı olabilecek ifade var; yayından önce düzenleyin.</p>
        ) : (
          p.aciklama && <p className="mt-2 text-xs text-muted">Mevzuat filtresi: yanıltıcı ifade bulunamadı · Yetki belgesi no ilan alt bilgisine eklenir.</p>
        )}
      </div>
    </div>
  );
}

// ---- Tapu & Hukuk --------------------------------------------------------------------

function TapuTab({ b }: { b: PortfolioBundle }) {
  const p = b.portfolio!;
  const t = p.takyidat ?? {};
  return (
    <div className="space-y-4">
      <KV
        items={[
          ["İl / İlçe / Mahalle", [p.il, p.ilce, p.mahalle].filter(Boolean).join(" / ") || null],
          ["Adres", p.adres],
          ["Ada / Parsel", p.ada || p.parsel ? `${p.ada ?? "—"} / ${p.parsel ?? "—"}` : null],
          ["Bağımsız bölüm", p.bagimsiz_bolum],
          ["Tapu türü", p.tapu_turu ? (TAPU_TURLERI[p.tapu_turu] ?? p.tapu_turu) : null],
          ["İskân", <YesNo key="i" v={p.iskan_var} />],
          ["İpotek", t.ipotek ? <Badge tone="warn">Var</Badge> : <Badge tone="ok">Yok</Badge>],
          ["Haciz", t.haciz ? <Badge tone="block">Var</Badge> : <Badge tone="ok">Yok</Badge>],
          ["Şerh / beyan", t.serh],
          ["Takyidat sorgusu", t.sorgu_tarihi ? fmtDate(t.sorgu_tarihi) : null],
          ["Krediye uygun", <YesNo key="k" v={p.krediye_uygun} />],
          ["İmar durumu", p.imar?.durum],
          ["TAKS / KAKS", p.imar?.taks !== undefined || p.imar?.kaks !== undefined ? `${p.imar?.taks ?? "—"} / ${p.imar?.kaks ?? "—"}` : null],
          ["Konum", p.konum ? `${p.konum.lat.toFixed(5)}, ${p.konum.lng.toFixed(5)}` : null],
        ]}
      />
      {p.iskan_var === false && (
        <p className="rounded-lg border border-warn/30 bg-warn/10 p-3 text-sm">
          <b>İskân yok:</b> konut kredisi kullanılamaz. Alıcıya yazılı bilgilendirme yapılmalı.
        </p>
      )}
      {t.ipotek && <p className="rounded-lg border border-info/30 bg-info/10 p-3 text-sm">İpotek kaydı var: tapu günü fek (kapatma) yazısı gerekir; satıcı net hesabında kalan kredi borcunu dikkate alın.</p>}
      {t.haciz && <p className="rounded-lg border border-block/30 bg-block/10 p-3 text-sm">Haciz kaydı var: kaldırılmadan devir yapılamaz.</p>}
      {p.konum && (
        <a href={`https://www.google.com/maps?q=${p.konum.lat},${p.konum.lng}`} target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-brand underline">
          Haritada aç
        </a>
      )}
      <p className="text-xs text-muted">Malik iletişim bilgisi KVKK aydınlatması kapsamında yalnızca portföy sahibine ve yöneticilere gösterilir.</p>
    </div>
  );
}

// ---- Evrak ---------------------------------------------------------------------------

function EvrakTab({ b }: { b: PortfolioBundle }) {
  const { store } = useReadySession();
  const p = b.portfolio!;
  const d = b.derived!;
  const [yetki, setYetki] = useState(false);
  const [dask, setDask] = useState(false);

  const action = (e: EvrakItem) => {
    if (e.tamam && e.kod !== "yetki") return null;
    switch (e.kod) {
      case "yetki":
        return (
          <Button size="sm" onClick={() => setYetki(true)}>
            {e.tamam ? "Yenile" : "Ekle"}
          </Button>
        );
      case "dask":
        return e.zorunlu ? (
          <Button size="sm" onClick={() => setDask(true)}>
            Poliçe gir
          </Button>
        ) : null;
      case "takyidat":
        return (
          <Button
            size="sm"
            onClick={() =>
              store
                .update("portfolio", p.id, { takyidat: { ...p.takyidat, sorgu_tarihi: todayISO(b.bugun) } })
                .then(() => toast("Takyidat sorgusu bugün olarak işlendi"))
                .catch((err: Error) => toast(err.message))
            }
          >
            Bugün sorgulandı
          </Button>
        );
      case "kvkk":
        return d.ownerPersons.find((o) => !b.consents.some((c) => c.person_id === o.id && c.amac === "aydinlatma" && c.verildi && !c.geri_alindi_at)) ? (
          <ButtonLink size="sm" href={`/musteriler/${d.ownerPersons.find((o) => !b.consents.some((c) => c.person_id === o.id && c.amac === "aydinlatma" && c.verildi && !c.geri_alindi_at))!.id}`}>
            Rıza al
          </ButtonLink>
        ) : (
          <ButtonLink size="sm" href={`/portfoyler/${p.id}/duzenle`}>
            Malik ekle
          </ButtonLink>
        );
      default:
        return (
          <ButtonLink size="sm" href={`/portfoyler/${p.id}/duzenle`}>
            Düzenle
          </ButtonLink>
        );
    }
  };

  return (
    <div>
      <ul className="divide-y divide-border">
        {d.evrak.map((e) => (
          <li key={e.kod} className="flex items-center gap-3 py-3">
            <span className={e.tamam ? "text-ok" : e.zorunlu ? "text-block" : "text-warn"} aria-hidden>
              {e.tamam ? "✓" : "○"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {e.baslik} {!e.zorunlu && <span className="text-xs font-normal text-muted">(isteğe bağlı)</span>}
              </p>
              <p className="text-xs text-muted">{e.detay}</p>
            </div>
            {action(e)}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">
        Belge şablonları ve imza süreçleri için{" "}
        <Link href={`/sozlesmeler/yeni?sablon=yetki-sozlesmesi&portfoy=${encodeURIComponent(p.id)}`} className="text-brand underline">
          Sözleşmeler
        </Link>{" "}
        modülünü kullanın. Liste portföy verisinden otomatik türetilir.
      </p>
      <YetkiDialog open={yetki} onClose={() => setYetki(false)} portfolio={p} contract={d.contract} bugun={b.bugun} />
      <DaskDialog open={dask} onClose={() => setDask(false)} portfolio={p} />
    </div>
  );
}

// ---- Eşleşmeler ------------------------------------------------------------------------

function MatchesTab({ portfolio }: { portfolio: Portfolio }) {
  const { officeId } = useReadySession();
  const profiles = useTable("search_profile", { eq: { aktif: true, ilan_tipi: portfolio.ilan_tipi } });
  const persons = useTable("person", { eq: { office_id: officeId } });
  const mp = toMatchPortfolio(portfolio);

  const results = useMemo(() => {
    if (!mp) return [];
    return profiles.data
      .map((s) => {
        const person = persons.data.find((x) => x.id === s.person_id);
        const r = rankMatches([mp], toMatchProfile(s))[0];
        return person && r ? { person, profile: s, r } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.r.puan - a.r.puan);
  }, [mp, profiles.data, persons.data]);

  if (profiles.loading || persons.loading) return <Spinner />;
  if (!mp) return <p className="text-sm text-muted">Eşleştirme için portföyün fiyatı ve ilçesi girilmiş olmalı.</p>;
  if (portfolio.asama === "arsiv" || portfolio.asama === "tamamlandi") return <p className="text-sm text-muted">Arşivdeki / tamamlanan portföyler eşleştirmeye dahil edilmez.</p>;
  if (!results.length)
    return (
      <p className="text-sm text-muted">
        Bu portföye uygun aktif arama profili yok.{" "}
        <Link href="/eslestirme" className="text-brand underline">
          Eşleştirme ekranı
        </Link>
      </p>
    );

  return (
    <ul className="divide-y divide-border">
      {results.map(({ person, profile, r }) => (
        <li key={profile.id}>
          <Link href={`/musteriler/${person.id}`} className="flex items-center gap-3 py-3 hover:bg-bg">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-semibold text-brand">{initials(person.ad_soyad)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {person.ad_soyad} <span className="text-xs font-normal text-muted">· {person.tipler.map((t) => PERSON_TYPES[t] ?? t).join(", ")}</span>
              </p>
              <p className="text-xs text-muted">
                Bütçe {shortTL(profile.butce_min ?? null)} – {shortTL(profile.butce_max)}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {r.gerekceler.slice(0, 3).map((g) => (
                  <Badge key={g} tone="info">
                    {g}
                  </Badge>
                ))}
              </div>
            </div>
            <span className={`text-lg font-semibold tabular-nums ${r.puan >= 75 ? "text-ok" : "text-warn"}`}>%{r.puan}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ---- Performans --------------------------------------------------------------------------

function PerformansTab({ b }: { b: PortfolioBundle }) {
  const perf = b.derived!.perf;
  const feedback = b.showings.filter((s) => s.geri_bildirim?.not || s.geri_bildirim?.puan);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Portföyde" value={`${perf.ilandaGun} gün`} />
        <Stat label="Fiyat değişikliği" value={perf.fiyatDegisimi} hint={perf.degisimYuzde !== null && perf.fiyatDegisimi ? `%${perf.degisimYuzde.toLocaleString("tr-TR")}` : undefined} />
        <Stat label="Gösterim" value={perf.gosterim} hint={`Son 7 gün: ${perf.gosterimSon7}`} />
        <Stat label="Teklif" value={perf.teklif} hint={perf.ortPuan !== null ? `Ort. puan ${perf.ortPuan.toLocaleString("tr-TR")}/5` : undefined} />
      </div>
      {perf.ilkFiyat !== null && perf.sonFiyat !== null && perf.fiyatDegisimi > 0 && (
        <p className="text-sm">
          İlk fiyat {tl(perf.ilkFiyat)} → güncel {tl(perf.sonFiyat)}
        </p>
      )}
      {feedback.length > 0 && (
        <Card title="Gösterim geri bildirimleri">
          <ul className="space-y-2 text-sm">
            {feedback.map((s) => (
              <li key={s.id} className="flex gap-2">
                <span className="text-muted">{fmtDate(s.planlanan, { day: "numeric", month: "short" })}</span>
                <span>
                  {s.geri_bildirim?.puan ? `${num(s.geri_bildirim.puan)}/5 · ` : ""}
                  {s.geri_bildirim?.not ?? ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <p className="rounded-lg border border-border bg-bg p-3 text-sm text-muted">
        Kanal bazında görüntülenme ve arama istatistikleri (sahibinden, hepsiemlak vb.) portal entegrasyonları bağlandığında burada gösterilecek. Şu an yalnızca uygulama içindeki gösterim, teklif ve fiyat verisi kullanılıyor.
      </p>
    </div>
  );
}
