"use client";

import { mailtoLink } from "@/domain/signing";
import { useState } from "react";
import { Badge, Button, Card, Checkbox, Dialog, ErrorNote, EvaluationList, Field, Input, Select, Textarea, toast } from "@/components/ui";
import { recordEvaluation } from "@/data/compliance-log";
import { useReadySession } from "@/data/session";
import type { AuthorizationContract, EidsStatus, Person, Portfolio } from "@/data/types";
import { paramsFor } from "@/domain/params";
import {
  commissionCap,
  DASK_SABLON,
  EIDS_LABEL,
  eidsGuidanceText,
  ownerReportText,
  portfolioName,
  validateYetki,
  waLink,
  type Performance,
} from "@/domain/portfoy";
import type { Score } from "@/domain/scoring";
import { todayISO } from "@/lib/format";
import { healthTone } from "./shared";
import type { PortfolioBundle } from "./usePortfolioBundle";

type Derived = NonNullable<PortfolioBundle["derived"]>;

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Panoya kopyalandı");
  } catch {
    toast("Kopyalanamadı; metni seçip elle kopyalayın");
  }
}

const RING: Record<string, string> = { ok: "var(--ok)", warn: "var(--warn)", block: "var(--block)", neutral: "var(--muted)" };

export function HealthPanel({ health }: { health: Score }) {
  const color = RING[healthTone(health.puan)] ?? "var(--muted)";
  return (
    <Card>
      <div className="flex items-center gap-4">
        <div
          className="grid h-16 w-16 shrink-0 place-items-center rounded-full"
          style={{ background: `conic-gradient(${color} ${health.puan * 3.6}deg, var(--border) 0)` }}
          role="img"
          aria-label={`Sağlık skoru ${health.puan} / 100`}
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-surface text-lg font-semibold tabular-nums">{health.puan}</span>
        </div>
        <div>
          <h2 className="font-semibold">Sağlık skoru</h2>
          <p className="text-xs text-muted">Fotoğraf, açıklama, fiyat uyumu, güncellik ve teklif durumu</p>
        </div>
      </div>
      {health.sinyaller.length ? (
        <ul className="mt-3 space-y-1.5 text-sm">
          {health.sinyaller.map((s) => (
            <li key={s} className="flex gap-2">
              <span className="text-warn" aria-hidden>
                ▲
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-ok">Portföy sunumu güçlü görünüyor.</p>
      )}
      <p className="mt-2 text-xs text-muted">Bölge fiyat medyanı ve kanal istatistikleri henüz bağlı değil; bu kalemler skora dahil edilmedi.</p>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/60 py-2 text-sm last:border-0">
      <span>{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

export function CompliancePanel({ b, onReport }: { b: PortfolioBundle; onReport: () => void }) {
  const { office } = useReadySession();
  const p = b.portfolio!;
  const d: Derived = b.derived!;
  const [yetkiOpen, setYetkiOpen] = useState(false);
  const [eidsOpen, setEidsOpen] = useState(false);
  const y = d.yetki;
  const belgeGecerli = office.yetki_belgesi_gecerlilik && office.yetki_belgesi_gecerlilik >= todayISO(b.bugun);

  return (
    <Card title="Uyum" actions={<Badge tone={d.publishEval.karar === "GEC" ? "ok" : d.publishEval.karar === "UYAR" ? "warn" : "block"}>{d.publishEval.karar === "GEC" ? "Yayına uygun" : d.publishEval.karar === "UYAR" ? "Uyarı var" : "Yayın engelli"}</Badge>}>
      <Row label="Ofis yetki belgesi">{belgeGecerli ? <Badge tone="ok">Geçerli</Badge> : <Badge tone="block">Yok / süresi dolmuş</Badge>}</Row>
      <Row label="Yetki sözleşmesi">
        {y.durum === "yok" ? (
          <Badge tone="block">Yok</Badge>
        ) : y.durum === "imzasiz" ? (
          <Badge tone="warn">İmza bekliyor</Badge>
        ) : y.durum === "doldu" ? (
          <Badge tone="block">Süresi doldu</Badge>
        ) : (
          <Badge tone={y.kalan <= 15 ? "warn" : "ok"}>{y.kalan} gün kaldı</Badge>
        )}
      </Row>
      <Row label="EİDS doğrulama">
        <Badge tone={p.eids_durum === "onaylandi" ? "ok" : p.eids_durum === "talep_edildi" ? "warn" : "block"}>{EIDS_LABEL[p.eids_durum]}</Badge>
      </Row>
      <Row label="Malik KVKK">
        {d.kvkk === "tamam" ? <Badge tone="ok">Tamam</Badge> : d.kvkk === "malik_yok" ? <Badge>Malik yok</Badge> : <Badge tone="warn">Eksik</Badge>}
      </Row>
      <Row label="DASK">{d.kapanis.daskPolicesiVar ? <Badge tone="ok">Kayıtlı</Badge> : <Badge tone="warn">Yok</Badge>}</Row>

      {d.publishEval.sonuclar.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-muted">Yayın kontrolü ayrıntıları ({d.publishEval.sonuclar.length})</summary>
          <div className="mt-2">
            <EvaluationList ev={d.publishEval} />
          </div>
        </details>
      )}

      <div className="mt-3 grid gap-2">
        <Button onClick={() => setYetkiOpen(true)}>✎ {y.durum === "yok" ? "Yetki sözleşmesi ekle" : y.durum === "imzasiz" ? "Yetki sözleşmesini güncelle" : "Yetki sözleşmesini yenile"}</Button>
        <Button onClick={() => setEidsOpen(true)}>⛨ EİDS durumunu güncelle</Button>
        <Button variant="primary" onClick={onReport}>
          ✉ Mal sahibine rapor
        </Button>
      </div>

      <YetkiDialog open={yetkiOpen} onClose={() => setYetkiOpen(false)} portfolio={p} contract={d.contract} bugun={b.bugun} />
      <EidsDialog open={eidsOpen} onClose={() => setEidsOpen(false)} portfolio={p} owners={d.ownerPersons} />
    </Card>
  );
}

// ---- Yetki sözleşmesi ------------------------------------------------------------

function addDays(iso: string, n: number) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return todayISO(d);
}

export function YetkiDialog({ open, onClose, portfolio, contract, bugun }: { open: boolean; onClose: () => void; portfolio: Portfolio; contract: AuthorizationContract | null; bugun: Date }) {
  return open ? <YetkiForm onClose={onClose} portfolio={portfolio} contract={contract} bugun={bugun} /> : null;
}

function YetkiForm({ onClose, portfolio, contract, bugun }: { onClose: () => void; portfolio: Portfolio; contract: AuthorizationContract | null; bugun: Date }) {
  const { store, officeId, userId } = useReadySession();
  const today = todayISO(bugun);
  const cap = commissionCap(portfolio.ilan_tipi, bugun);
  const expired = contract ? contract.bitis < today : false;
  const nearing = contract ? contract.bitis <= addDays(today, 30) : false;
  const [yeniDonem, setYeniDonem] = useState(!contract || expired || (nearing && Boolean(contract.imza_tarihi)));
  const init = yeniDonem || !contract ? null : contract;
  const [munhasir, setMunhasir] = useState(init?.munhasir ?? contract?.munhasir ?? true);
  const [oran, setOran] = useState(String(init?.hizmet_bedeli_orani ?? contract?.hizmet_bedeli_orani ?? cap.deger).replace(".", ","));
  const [baslangic, setBaslangic] = useState(init?.baslangic ?? (contract && !expired ? contract.bitis : today));
  const [bitis, setBitis] = useState(init?.bitis ?? addDays(contract && !expired ? contract.bitis : today, 90));
  const [imza, setImza] = useState(init?.imza_tarihi ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<string | null>(null);

  const toggleDonem = (on: boolean) => {
    setYeniDonem(on);
    if (!on && contract) {
      setMunhasir(contract.munhasir);
      setOran(String(contract.hizmet_bedeli_orani ?? cap.deger).replace(".", ","));
      setBaslangic(contract.baslangic);
      setBitis(contract.bitis);
      setImza(contract.imza_tarihi ?? "");
    } else {
      const start = contract && !expired ? contract.bitis : today;
      setBaslangic(start);
      setBitis(addDays(start, 90));
      setImza("");
    }
  };

  async function save() {
    const oranNum = oran.trim() ? Number(oran.replace(",", ".")) : null;
    const e = validateYetki({ munhasir, oran: oranNum, baslangic, bitis, imzaTarihi: imza || null }, portfolio.ilan_tipi, bugun);
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setFail(null);
    try {
      const row = { munhasir, hizmet_bedeli_orani: oranNum, baslangic, bitis, imza_tarihi: imza || null };
      if (!yeniDonem && contract) await store.update("authorization_contract", contract.id, row);
      else await store.insert("authorization_contract", { ...row, portfolio_id: portfolio.id });
      // İmzalı yetki ile aday/değerleme aşamasındaki portföy "Yetki Alındı"ya geçer (yayın kapısı değil)
      if (imza && (portfolio.asama === "aday" || portfolio.asama === "degerleme")) {
        await store.update("portfolio", portfolio.id, { asama: "yetki" });
        await recordEvaluation(store, { officeId, userId }, "portfoy.asama_degistir", "portfolio", portfolio.id, { karar: "GEC", sonuclar: [], paramSurum: paramsFor(bugun).surum }, "İmzalı yetki sözleşmesi kaydedildi");
        toast("Yetki kaydedildi; aşama “Yetki Alındı” oldu");
      } else toast("Yetki sözleşmesi kaydedildi");
      onClose();
    } catch (err) {
      setFail(err instanceof Error ? err.message : "Kaydedilemedi");
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Yetki sözleşmesi"
      footer={
        <>
          <Button onClick={onClose}>Vazgeç</Button>
          <Button variant="primary" onClick={save} disabled={busy}>
            {busy ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {contract && (
          <div className="rounded-lg bg-bg p-3 text-sm">
            <p>
              Mevcut: {contract.munhasir ? "Münhasır" : "Münhasır değil"} · {contract.baslangic} → {contract.bitis}
              {contract.imza_tarihi ? ` · imza ${contract.imza_tarihi}` : " · imzasız"}
            </p>
            <Checkbox label="Yeni dönem olarak kaydet (yenileme; eskisi geçmişte kalır)" checked={yeniDonem} onChange={(e) => toggleDonem(e.target.checked)} />
          </div>
        )}
        <Checkbox label="Münhasır (yalnız bizim ofisimiz yetkili)" checked={munhasir} onChange={(e) => setMunhasir(e.target.checked)} />
        <Field label={cap.birim === "%" ? "Hizmet bedeli oranı (%, +KDV)" : "Hizmet bedeli (aylık kira katı, +KDV)"} hint={`Yasal tavan: ${cap.aciklama}`}>
          <Input inputMode="decimal" value={oran} onChange={(e) => setOran(e.target.value)} aria-invalid={!!errors.oran} />
        </Field>
        {errors.oran && <p className="text-xs text-block">{errors.oran}</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Field label="Başlangıç" required>
              <Input type="date" value={baslangic} onChange={(e) => setBaslangic(e.target.value)} aria-invalid={!!errors.baslangic} />
            </Field>
            {errors.baslangic && <p className="text-xs text-block">{errors.baslangic}</p>}
          </div>
          <div>
            <Field label="Bitiş" required>
              <Input type="date" value={bitis} onChange={(e) => setBitis(e.target.value)} aria-invalid={!!errors.bitis} />
            </Field>
            {errors.bitis && <p className="text-xs text-block">{errors.bitis}</p>}
          </div>
        </div>
        <Field label="İmza tarihi" hint="İmzasız sözleşme ile ilan yayınlanamaz">
          <Input type="date" value={imza} max={today} onChange={(e) => setImza(e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2 text-xs">
          {[30, 90, 180].map((n) => (
            <button key={n} type="button" className="rounded-full border border-border px-2 py-1 hover:bg-bg" onClick={() => setBitis(addDays(baslangic || today, n))}>
              +{n} gün
            </button>
          ))}
          {!imza && (
            <button type="button" className="rounded-full border border-border px-2 py-1 hover:bg-bg" onClick={() => setImza(today)}>
              Bugün imzalandı
            </button>
          )}
        </div>
        <ErrorNote error={fail} />
      </div>
    </Dialog>
  );
}

// ---- EİDS -------------------------------------------------------------------------

function EidsDialog({ open, onClose, portfolio, owners }: { open: boolean; onClose: () => void; portfolio: Portfolio; owners: Person[] }) {
  return open ? <EidsForm onClose={onClose} portfolio={portfolio} owners={owners} /> : null;
}

function EidsForm({ onClose, portfolio, owners }: { onClose: () => void; portfolio: Portfolio; owners: Person[] }) {
  const { store, office, member } = useReadySession();
  const [durum, setDurum] = useState<EidsStatus>(portfolio.eids_durum);
  const [ref, setRef] = useState(portfolio.eids_ref ?? "");
  const [ownerId, setOwnerId] = useState(owners.find((o) => o.telefon)?.id ?? owners[0]?.id ?? "");
  const owner = owners.find((o) => o.id === ownerId);
  const [text, setText] = useState(() =>
    eidsGuidanceText({
      malikAd: owner?.ad_soyad,
      ofisUnvan: office.unvan,
      yetkiBelgesiNo: office.yetki_belgesi_no,
      vergiNo: office.vergi_no,
      portfoyAdi: portfolioName(portfolio),
      adaParsel: portfolio.ada && portfolio.parsel ? `Ada ${portfolio.ada} / Parsel ${portfolio.parsel}` : null,
      danismanAd: member.ad_soyad,
    }),
  );
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<string | null>(null);

  const save = async (next: EidsStatus = durum, close = true) => {
    if (next === "onaylandi" && !ref.trim()) {
      setFail("Onaylı durum için EİDS doğrulama numarasını girin");
      return;
    }
    setBusy(true);
    setFail(null);
    try {
      await store.update("portfolio", portfolio.id, { eids_durum: next, eids_ref: ref.trim() || null });
      toast(`EİDS: ${EIDS_LABEL[next]}`);
      if (close) onClose();
      else setDurum(next);
    } catch (e) {
      setFail(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setBusy(false);
    }
  };

  const steps: EidsStatus[] = ["yok", "talep_edildi", "onaylandi", "reddedildi"];

  return (
    <Dialog
      open
      wide
      onClose={onClose}
      title="EİDS yetkilendirme"
      footer={
        <>
          <Button onClick={onClose}>Kapat</Button>
          <Button variant="primary" onClick={() => void save()} disabled={busy}>
            Durumu kaydet
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted">İlan yayınlanmadan önce malikin e-Devlet üzerinden işletmenize yetki vermesi gerekir. Malike adım adım yönlendirme gönderin, onay gelince doğrulama numarasını girin.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Durum">
            <Select value={durum} onChange={(e) => setDurum(e.target.value as EidsStatus)}>
              {steps.map((s) => (
                <option key={s} value={s}>
                  {EIDS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="EİDS doğrulama no" hint="Onaylandığında zorunlu">
            <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="EIDS-…" />
          </Field>
        </div>

        <div className="rounded-lg border border-border p-3">
          <h3 className="mb-2 text-sm font-semibold">Malike yönlendirme mesajı</h3>
          {owners.length > 1 && (
            <Field label="Malik">
              <Select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.ad_soyad}
                    {o.telefon ? ` · ${o.telefon}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {!owners.length && <p className="mb-2 text-sm text-warn">Portföyde malik kayıtlı değil; mesajı kopyalayıp elle gönderebilirsiniz.</p>}
          <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} aria-label="Mesaj metni" className="mt-2 text-xs" />
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href={waLink(owner?.telefon, text)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (portfolio.eids_durum === "yok" || portfolio.eids_durum === "reddedildi") void save("talep_edildi", false);
              }}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-ok bg-ok px-4 text-sm font-medium text-white hover:opacity-90"
            >
              WhatsApp ile gönder
            </a>
            <Button onClick={() => void copyText(text)}>Kopyala</Button>
          </div>
          {!owner?.telefon && owners.length > 0 && <p className="mt-2 text-xs text-muted">Malikin telefonu kayıtlı değil; WhatsApp’ta kişiyi siz seçersiniz.</p>}
        </div>
        <ErrorNote error={fail} />
      </div>
    </Dialog>
  );
}

// ---- Mal sahibi raporu -------------------------------------------------------------

export function OwnerReportDialog({ open, onClose, b }: { open: boolean; onClose: () => void; b: PortfolioBundle }) {
  return open && b.portfolio && b.derived ? <OwnerReportForm onClose={onClose} b={b} portfolio={b.portfolio} perf={b.derived.perf} /> : null;
}

function OwnerReportForm({ onClose, b, portfolio, perf }: { onClose: () => void; b: PortfolioBundle; portfolio: Portfolio; perf: Performance }) {
  const { store, office, member, officeId, userId } = useReadySession();
  const owners = b.derived!.ownerPersons;
  const [ownerId, setOwnerId] = useState(owners[0]?.id ?? "");
  const owner = owners.find((o) => o.id === ownerId);
  const y = b.derived!.yetki;
  const build = (o?: Person) =>
    ownerReportText({
      malikAd: o?.ad_soyad,
      portfoyAdi: portfolioName(portfolio),
      fiyat: portfolio.fiyat,
      perf,
      geriBildirimler: b.showings.map((s) => s.geri_bildirim?.not).filter((x): x is string => Boolean(x)),
      oneriler: b.derived!.health.sinyaller.filter((s) => !/Fotoğraf|Kat planı|Açıklama/.test(s)),
      yetkiKalan: y.durum === "gecerli" ? y.kalan : null,
      danismanAd: member.ad_soyad,
      ofisUnvan: office.unvan,
      bugun: b.bugun,
    });
  const [text, setText] = useState(() => build(owner));

  const log = (kanal: string) => {
    void store
      .insert("activity", {
        office_id: officeId,
        user_id: userId,
        person_id: owner?.id ?? null,
        portfolio_id: portfolio.id,
        tur: kanal === "eposta" ? "eposta" : "mesaj",
        icerik: `Mal sahibine haftalık rapor gönderildi (${kanal})`,
      })
      .catch(() => undefined);
  };

  const subject = `${portfolioName(portfolio)} — haftalık durum raporu`;
  return (
    <Dialog
      open
      wide
      onClose={onClose}
      title="Mal sahibine rapor"
      footer={
        <>
          <Button onClick={onClose}>Kapat</Button>
          <Button
            onClick={() => {
              void copyText(text);
              log("kopyala");
            }}
          >
            Kopyala
          </Button>
          <a
            href={mailtoLink(owner?.eposta, subject, text)}
            onClick={() => log("eposta")}
            className="inline-flex min-h-10 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-bg"
          >
            E-posta
          </a>
          <a
            href={waLink(owner?.telefon, text)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => log("whatsapp")}
            className="inline-flex min-h-10 items-center rounded-lg border border-ok bg-ok px-4 text-sm font-medium text-white hover:opacity-90"
          >
            WhatsApp
          </a>
        </>
      }
    >
      <div className="space-y-3">
        {owners.length > 1 && (
          <Field label="Malik">
            <Select
              value={ownerId}
              onChange={(e) => {
                setOwnerId(e.target.value);
                setText(build(owners.find((o) => o.id === e.target.value)));
              }}
            >
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.ad_soyad}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {!owners.length && <p className="text-sm text-warn">Malik kayıtlı değil. Rapor metnini kopyalayıp gönderebilirsiniz.</p>}
        <Textarea rows={14} value={text} onChange={(e) => setText(e.target.value)} aria-label="Rapor metni" className="text-sm" />
        <p className="text-xs text-muted">Portal görüntülenme/arama sayıları, kanal entegrasyonları bağlandığında rapora otomatik eklenecek. Gönderim, portföy geçmişine etkinlik olarak kaydedilir.</p>
      </div>
    </Dialog>
  );
}

// ---- DASK ----------------------------------------------------------------------------

export function DaskDialog({ open, onClose, portfolio }: { open: boolean; onClose: () => void; portfolio: Portfolio }) {
  const { store, officeId, userId } = useReadySession();
  const [police, setPolice] = useState("");
  const [bitis, setBitis] = useState("");
  const [fail, setFail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!police.trim() || !bitis) {
      setFail("Poliçe numarası ve bitiş tarihi gerekli");
      return;
    }
    setBusy(true);
    try {
      const surum = paramsFor().surum;
      await store.insert("document", {
        office_id: officeId,
        sablon: DASK_SABLON,
        sablon_surum: "kayit",
        kural_surum: surum,
        portfolio_id: portfolio.id,
        alanlar: { police_no: police.trim(), bitis },
        durum: "imzalandi",
        created_by: userId,
      });
      toast("DASK poliçesi kaydedildi");
      setPolice("");
      setBitis("");
      onClose();
    } catch (e) {
      setFail(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="DASK poliçesi"
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
        <Field label="Poliçe numarası" required>
          <Input value={police} onChange={(e) => setPolice(e.target.value)} />
        </Field>
        <Field label="Poliçe bitiş tarihi" required>
          <Input type="date" value={bitis} onChange={(e) => setBitis(e.target.value)} />
        </Field>
        <ErrorNote error={fail} />
      </div>
    </Dialog>
  );
}
