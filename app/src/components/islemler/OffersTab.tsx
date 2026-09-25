"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, cx, Dialog, EmptyState, ErrorNote, Field, Input, Select, Table, Textarea, toast } from "@/components/ui";
import { useReadySession } from "@/data/session";
import type { Deal, Offer, Person, Portfolio } from "@/data/types";
import { acceptOfferPatches, defaultChecklist, isExpired, offerChains } from "@/domain/deal";
import { paramsFor } from "@/domain/params";
import { ASAMALAR } from "@/domain/pipeline";
import { fmtDate, fmtDateTime, tl } from "@/lib/format";
import type { RequestMove } from "./useStageMover";

const DURUM: Record<Offer["durum"], { label: string; tone: "info" | "warn" | "ok" | "block" | "neutral" }> = {
  acik: { label: "Açık", tone: "info" },
  karsi_teklif: { label: "Karşı teklif verildi", tone: "warn" },
  kabul: { label: "Kabul edildi", tone: "ok" },
  red: { label: "Reddedildi", tone: "block" },
  suresi_doldu: { label: "Süresi doldu", tone: "neutral" },
};

const ODEME: Record<string, string> = { nakit: "Nakit", kredi: "Kredi", karma: "Nakit + kredi" };

type Taraf = "alici" | "satici";

interface Kosullar {
  taraf?: Taraf;
  odeme?: string;
  teslim?: string;
  not?: string;
}

function kosul(o: Offer): Kosullar {
  return (o.kosullar ?? {}) as Kosullar;
}

interface FormState {
  parent: Offer | null;
  personId: string;
  yeniAd: string;
  yeniTel: string;
  tutar: string;
  gecerlilik: string;
  taraf: Taraf;
  odeme: string;
  teslim: string;
  not: string;
}

const parseAmount = (s: string) => Number(s.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "")) || 0;

export function OffersTab({
  portfolio,
  offers,
  persons,
  deal,
  requestMove,
  now,
}: {
  portfolio: Portfolio;
  offers: Offer[];
  persons: Person[];
  deal: Deal | null;
  requestMove: RequestMove;
  now: Date;
}) {
  const { store, officeId, userId } = useReadySession();
  const [form, setForm] = useState<FormState | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const chains = useMemo(() => offerChains(offers), [offers]);
  const personName = useMemo(() => new Map(persons.map((p) => [p.id, p.ad_soyad])), [persons]);
  const fiyat = portfolio.fiyat ?? 0;
  const pct = (t: number) => (fiyat ? `%${((t / fiyat) * 100).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}` : "");

  const openNew = () => {
    setErr(null);
    setForm({ parent: null, personId: persons.find((p) => p.tipler.some((t) => t !== "satici"))?.id ?? "", yeniAd: "", yeniTel: "", tutar: "", gecerlilik: "", taraf: "alici", odeme: "nakit", teslim: "", not: "" });
  };
  const openCounter = (o: Offer) => {
    setErr(null);
    const k = kosul(o);
    setForm({ parent: o, personId: o.person_id, yeniAd: "", yeniTel: "", tutar: String(o.tutar), gecerlilik: "", taraf: k.taraf === "satici" ? "alici" : "satici", odeme: k.odeme ?? "nakit", teslim: k.teslim ?? "", not: "" });
  };

  const save = async () => {
    if (!form) return;
    const tutar = parseAmount(form.tutar);
    if (tutar <= 0) return setErr("Teklif tutarı girin.");
    if (!form.parent && form.personId === "__yeni" && !form.yeniAd.trim()) return setErr("Yeni kişinin adını girin.");
    if (!form.personId) return setErr("Teklif veren kişiyi seçin.");
    setBusy(true);
    try {
      let personId = form.personId;
      if (personId === "__yeni") {
        const p = await store.insert("person", {
          office_id: officeId,
          owner_id: userId,
          ad_soyad: form.yeniAd.trim(),
          telefon: form.yeniTel.trim() || null,
          tipler: [portfolio.ilan_tipi === "kiralik" ? "kiraci" : "alici"],
          kaynak: "Teklif",
        });
        personId = p.id;
      }
      const kosullar: Kosullar = { taraf: form.taraf, odeme: form.odeme, teslim: form.teslim.trim() || undefined, not: form.not.trim() || undefined };
      await store.insert("offer", {
        portfolio_id: portfolio.id,
        person_id: personId,
        tutar,
        kosullar: kosullar as Record<string, unknown>,
        gecerlilik: form.gecerlilik ? new Date(form.gecerlilik + "T23:59:00").toISOString() : null,
        durum: "acik",
        onceki_teklif_id: form.parent?.id ?? null,
      });
      if (form.parent && form.parent.durum === "acik") await store.update("offer", form.parent.id, { durum: "karsi_teklif" });
      setForm(null);
      toast(form.parent ? "Karşı teklif kaydedildi" : "Teklif kaydedildi");
      if (portfolio.asama === "yayinda") await requestMove(portfolio, "teklif");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (o: Offer, durum: Offer["durum"]) => {
    try {
      await store.update("offer", o.id, { durum });
      toast(`Teklif: ${DURUM[durum].label}`);
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const accept = async (o: Offer) => {
    setBusy(true);
    try {
      const patches = acceptOfferPatches(offers, o.id);
      for (const [id, durum] of Object.entries(patches)) await store.update("offer", id, { durum });
      if (!deal) {
        await store.insert("deal", {
          office_id: officeId,
          portfolio_id: portfolio.id,
          alici_id: o.person_id,
          bedel: o.tutar,
          kapora: null,
          tapu_tarihi: null,
          kontrol_listesi: defaultChecklist(portfolio.ilan_tipi),
          kural_surum: paramsFor(now).surum,
        });
        toast("Teklif kabul edildi · işlem kaydı oluşturuldu");
      } else toast("Teklif kabul edildi");
      if (ASAMALAR.indexOf(portfolio.asama as never) < ASAMALAR.indexOf("kapora")) await requestMove(portfolio, "kapora");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (o: Offer) => {
    if (!window.confirm("Teklif silinsin mi?")) return;
    try {
      // Karşı teklif zincirini koru: bu teklife bağlı olanlar öncekine bağlanır
      for (const c of offers.filter((x) => x.onceki_teklif_id === o.id)) await store.update("offer", c.id, { onceki_teklif_id: o.onceki_teklif_id ?? null });
      await store.remove("offer", o.id);
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const latestOpen = chains.map((c) => c[c.length - 1]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          İlan fiyatı <b className="text-text">{tl(portfolio.fiyat)}</b> · {offers.length} teklif, {chains.length} görüşme zinciri
        </p>
        <Button variant="primary" onClick={openNew}>
          + Yeni teklif
        </Button>
      </div>

      {!offers.length ? (
        <EmptyState title="Henüz teklif yok">Gelen teklifleri kaydedin; karşı teklif zinciri ve karşılaştırma burada görünür.</EmptyState>
      ) : (
        <>
          {latestOpen.length > 1 && (
            <Table>
              <thead>
                <tr>
                  <th>Kişi</th>
                  <th>Son tutar</th>
                  <th>Ödeme</th>
                  <th>Teslim</th>
                  <th>Geçerlilik</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {latestOpen.map((o) => (
                  <tr key={o.id}>
                    <td className="whitespace-nowrap">{personName.get(o.person_id) ?? "—"}</td>
                    <td className="whitespace-nowrap tabular-nums">
                      {tl(o.tutar)} <span className="text-xs text-muted">{pct(o.tutar)}</span>
                    </td>
                    <td>{ODEME[kosul(o).odeme ?? ""] ?? "—"}</td>
                    <td>{kosul(o).teslim ?? "—"}</td>
                    <td className="whitespace-nowrap">{fmtDate(o.gecerlilik)}</td>
                    <td>
                      <Badge tone={DURUM[o.durum].tone}>{DURUM[o.durum].label}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          {chains.map((chain) => (
            <Card key={chain[0].id} title={`${personName.get(chain[0].person_id) ?? "Kişi"} · ${chain.length > 1 ? `${chain.length} adımlı pazarlık` : "teklif"}`}>
              <ol className="space-y-3">
                {chain.map((o, i) => {
                  const k = kosul(o);
                  const last = i === chain.length - 1;
                  const expired = isExpired(o, now);
                  return (
                    <li key={o.id} className={cx("rounded-lg border p-3", k.taraf === "satici" ? "border-info/30 bg-info/5 sm:ml-8" : "border-border")} data-testid="offer">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-muted">
                            {k.taraf === "satici" ? "Satıcının karşı teklifi" : i ? "Alıcının karşı teklifi" : "Alıcı teklifi"} · {fmtDateTime(o.created_at)}
                          </p>
                          <p className="text-lg font-semibold tabular-nums">
                            {tl(o.tutar)} <span className="text-xs font-normal text-muted">{pct(o.tutar)} ilan fiyatının</span>
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Badge tone={DURUM[o.durum].tone}>{DURUM[o.durum].label}</Badge>
                          {expired && <Badge tone="warn">Süresi geçti</Badge>}
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {[ODEME[k.odeme ?? ""], k.teslim && `Teslim: ${k.teslim}`, o.gecerlilik && `Geçerlilik: ${fmtDate(o.gecerlilik)}`].filter(Boolean).join(" · ") || "Koşul belirtilmedi"}
                      </p>
                      {k.not && <p className="mt-1 text-sm">{k.not}</p>}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {last && o.durum === "acik" && (
                          <>
                            <Button size="sm" variant="ok" disabled={busy} onClick={() => void accept(o)}>
                              Kabul et
                            </Button>
                            <Button size="sm" onClick={() => openCounter(o)}>
                              Karşı teklif
                            </Button>
                            <Button size="sm" onClick={() => void setStatus(o, "red")}>
                              Reddet
                            </Button>
                          </>
                        )}
                        {last && expired && (
                          <Button size="sm" variant="ghost" onClick={() => void setStatus(o, "suresi_doldu")}>
                            Süresi doldu işaretle
                          </Button>
                        )}
                        {o.durum !== "kabul" && (
                          <Button size="sm" variant="ghost" onClick={() => void remove(o)}>
                            Sil
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Card>
          ))}
        </>
      )}

      <Dialog
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.parent ? "Karşı teklif" : "Yeni teklif"}
        footer={
          <>
            <Button onClick={() => setForm(null)}>Vazgeç</Button>
            <Button variant="primary" disabled={busy} onClick={() => void save()}>
              Kaydet
            </Button>
          </>
        }
      >
        {form && (
          <div className="space-y-3">
            {form.parent ? (
              <p className="text-sm text-muted">
                {personName.get(form.parent.person_id)} ile pazarlık · önceki tutar <b className="text-text">{tl(form.parent.tutar)}</b>
              </p>
            ) : (
              <Field label="Teklif veren" required>
                <Select value={form.personId} onChange={(e) => setForm({ ...form, personId: e.target.value })}>
                  <option value="">Kişi seçin…</option>
                  {persons.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.ad_soyad}
                      {p.telefon ? ` · ${p.telefon}` : ""}
                    </option>
                  ))}
                  <option value="__yeni">+ Yeni kişi ekle</option>
                </Select>
              </Field>
            )}
            {form.personId === "__yeni" && !form.parent && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Ad soyad" required>
                  <Input value={form.yeniAd} onChange={(e) => setForm({ ...form, yeniAd: e.target.value })} />
                </Field>
                <Field label="Telefon">
                  <Input type="tel" value={form.yeniTel} onChange={(e) => setForm({ ...form, yeniTel: e.target.value })} />
                </Field>
              </div>
            )}
            {form.parent && (
              <Field label="Teklifi veren taraf">
                <Select value={form.taraf} onChange={(e) => setForm({ ...form, taraf: e.target.value as Taraf })}>
                  <option value="satici">Satıcı / kiraya veren (karşı teklif)</option>
                  <option value="alici">Alıcı / kiracı</option>
                </Select>
              </Field>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tutar (₺)" required hint={form.tutar && fiyat ? `İlan fiyatının ${pct(parseAmount(form.tutar))}` : undefined}>
                <Input inputMode="numeric" value={form.tutar} onChange={(e) => setForm({ ...form, tutar: e.target.value })} placeholder="ör. 12000000" />
              </Field>
              <Field label="Geçerlilik (son gün)">
                <Input type="date" value={form.gecerlilik} onChange={(e) => setForm({ ...form, gecerlilik: e.target.value })} />
              </Field>
              <Field label="Ödeme">
                <Select value={form.odeme} onChange={(e) => setForm({ ...form, odeme: e.target.value })}>
                  {Object.entries(ODEME).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Teslim">
                <Input value={form.teslim} onChange={(e) => setForm({ ...form, teslim: e.target.value })} placeholder="ör. 30 gün" />
              </Field>
            </div>
            <Field label="Koşullar / not">
              <Textarea rows={2} value={form.not} onChange={(e) => setForm({ ...form, not: e.target.value })} />
            </Field>
            <ErrorNote error={err} />
          </div>
        )}
      </Dialog>
    </div>
  );
}
