"use client";

import { useState } from "react";
import { Badge, Button, Card, ErrorNote, Field, Input, Select, Spinner, Table, toast } from "@/components/ui";
import { useReadySession, useTable } from "@/data/session";
import type { AuthorizationContract, CommissionLineRow, CommissionSplitRow, Deal, OfficeMember, Portfolio } from "@/data/types";
import { CommissionCapError, rentCommission, saleCommission, splitCommission, type CommissionResult } from "@/domain/commission";
import { buyerTotalCost, sellerNet, type CostBreakdown } from "@/domain/costs";
import { buildSplitRules, feeRate, PAY_ROL_ETIKET, type ExtraShare } from "@/domain/deal";
import { round2 } from "@/domain/money";
import { paramsFor } from "@/domain/params";
import { tl } from "@/lib/format";

const TARAF: Record<string, string> = { alici: "Alıcı", satici: "Satıcı", kiraci: "Kiracı", kiraya_veren: "Kiraya veren" };
const num = (s: string) => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export function CommissionTab(props: { portfolio: Portfolio; deal: Deal; contracts: AuthorizationContract[]; members: OfficeMember[] }) {
  const lines = useTable("commission_line", { eq: { deal_id: props.deal.id } });
  const splits = useTable("commission_split", { eq: { deal_id: props.deal.id } });
  if (lines.loading || splits.loading) return <Spinner />;
  return <CommissionEditor {...props} lines={lines.data} splits={splits.data} />;
}

function CommissionEditor({
  portfolio,
  deal,
  contracts,
  members,
  lines,
  splits,
}: {
  portfolio: Portfolio;
  deal: Deal;
  contracts: AuthorizationContract[];
  members: OfficeMember[];
  lines: CommissionLineRow[];
  splits: CommissionSplitRow[];
}) {
  const { store, office } = useReadySession();
  const kira = portfolio.ilan_tipi === "kiralik";
  const [now] = useState(() => new Date());
  const params = paramsFor(now);
  const rate = feeRate(contracts);
  const savedRate = (taraf: string, fallback: number) => {
    const l = lines.find((x) => x.taraf === taraf);
    if (!l) return lines.length ? 0 : fallback;
    return kira ? round2(l.matrah / deal.bedel) : round2((l.matrah / deal.bedel) * 100);
  };
  const [a, setA] = useState(String(savedRate(kira ? "kiraci" : "alici", kira ? 1 : rate)));
  const [b, setB] = useState(String(savedRate(kira ? "kiraya_veren" : "satici", kira ? 0 : rate)));

  const ofisSaved = splits.find((s) => s.alici_rol === "ofis");
  const danSaved = splits.find((s) => s.alici_rol === "danisman");
  const initOfis =
    ofisSaved && danSaved && ofisSaved.oran + danSaved.oran > 0
      ? round2((ofisSaved.oran / (ofisSaved.oran + danSaved.oran)) * 100)
      : (office.varsayilan_ofis_payi ?? 50);
  const [ofisPayi, setOfisPayi] = useState(String(initOfis));
  const [extras, setExtras] = useState<ExtraShare[]>(
    splits
      .filter((s) => s.alici_rol in { portfoy_getiren: 1, musteri_getiren: 1, referans: 1 })
      .map((s) => ({ rol: s.alici_rol as ExtraShare["rol"], oran: s.oran, userId: s.user_id ?? null })),
  );
  const [busy, setBusy] = useState(false);

  // ---- Hesap
  let result: CommissionResult | null = null;
  let calcErr: string | null = null;
  try {
    result = kira
      ? rentCommission(deal.bedel, { kiraci: num(a), kiraya_veren: num(b) }, now)
      : saleCommission(deal.bedel, { alici: num(a), satici: num(b) }, now);
  } catch (e) {
    calcErr = e instanceof CommissionCapError ? `Yasal tavan aşıldı: ${e.message}` : (e as Error).message;
  }

  let split: { alici: string; oran: number; tutar: number; userId?: string | null }[] = [];
  let splitErr: string | null = null;
  if (result) {
    try {
      const rules = buildSplitRules(num(ofisPayi), extras);
      const out = splitCommission(result.toplamMatrah, rules);
      split = rules.map((r, i) => ({ ...r, tutar: out[i].tutar, userId: r.alici === "danisman" ? portfolio.owner_id : r.userId }));
    } catch (e) {
      splitErr = (e as Error).message;
    }
  }

  let alici: CostBreakdown | null = null;
  let satici: CostBreakdown | null = null;
  if (!kira && result) {
    try {
      const input = { satisBedeli: deal.bedel, aliciKomisyonOrani: num(a), saticiKomisyonOrani: num(b), tarih: now };
      alici = buyerTotalCost(input);
      satici = sellerNet(input);
    } catch {
      alici = satici = null;
    }
  }

  const memberName = (id?: string | null) => members.find((m) => m.user_id === id)?.ad_soyad;

  const save = async () => {
    if (!result || splitErr) return;
    setBusy(true);
    try {
      const tahsil = new Map(lines.map((l) => [l.taraf, l.tahsil_edildi]));
      for (const l of lines) await store.remove("commission_line", l.id);
      for (const s of splits) await store.remove("commission_split", s.id);
      for (const l of result.satirlar)
        await store.insert("commission_line", { deal_id: deal.id, taraf: l.taraf, matrah: l.matrah, kdv: l.kdv, tahsil_edildi: tahsil.get(l.taraf) ?? false });
      for (const s of split) await store.insert("commission_split", { deal_id: deal.id, alici_rol: s.alici, user_id: s.userId ?? null, oran: s.oran, tutar: s.tutar });
      toast("Komisyon ve paylaşım kaydedildi");
    } catch (e) {
      toast(`Kaydedilemedi: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const toggleTahsil = async (l: CommissionLineRow) => {
    try {
      await store.update("commission_line", l.id, { tahsil_edildi: !l.tahsil_edildi });
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const tahsilEdilen = lines.filter((l) => l.tahsil_edildi).reduce((s, l) => s + l.matrah + l.kdv, 0);
  const toplamKayitli = lines.reduce((s, l) => s + l.matrah + l.kdv, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Hizmet bedeli" actions={<Badge tone="info">Kural seti {params.surum}</Badge>}>
        <div className="space-y-3">
          <p className="text-sm text-muted">
            {kira ? "Aylık kira" : "İşlem bedeli"}: <b className="text-text">{tl(deal.bedel)}</b> · Yasal tavan:{" "}
            {kira ? `toplam ${params.kiraHizmetBedeliTavanAy.deger} aylık kira + KDV` : `taraf başına %${params.satisHizmetBedeliTavanOrani.deger} + KDV`}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={kira ? "Kiracıdan (ay)" : "Alıcıdan (%)"}>
              <Input type="number" step={kira ? 0.25 : 0.1} min={0} value={a} onChange={(e) => setA(e.target.value)} />
            </Field>
            <Field label={kira ? "Kiraya verenden (ay)" : "Satıcıdan (%)"}>
              <Input type="number" step={kira ? 0.25 : 0.1} min={0} value={b} onChange={(e) => setB(e.target.value)} />
            </Field>
          </div>
          {calcErr && <ErrorNote error={`Uyum Motoru — ENGELLE: ${calcErr}`} />}
          {result && (
            <ul className="divide-y divide-border rounded-lg border border-border text-sm">
              {result.satirlar.map((l) => (
                <li key={l.taraf} className="flex items-start justify-between gap-3 px-3 py-2">
                  <span>{TARAF[l.taraf]} tarafı</span>
                  <span className="text-right">
                    <b className="tabular-nums">{tl(l.toplam)}</b>
                    <span className="block text-xs tabular-nums text-muted">
                      {tl(l.matrah)} + KDV {tl(l.kdv)}
                    </span>
                  </span>
                </li>
              ))}
              <li className="flex items-start justify-between gap-3 bg-bg px-3 py-2 font-semibold">
                <span>Toplam</span>
                <span className="text-right">
                  <span className="tabular-nums">{tl(result.genelToplam)}</span>
                  <span className="block text-xs font-normal tabular-nums text-muted">
                    {tl(result.toplamMatrah)} + KDV {tl(result.toplamKdv)}
                  </span>
                </span>
              </li>
            </ul>
          )}
        </div>
      </Card>

      <Card title="Paylaşım (KDV hariç)">
        <div className="space-y-3">
          <Field label="Ofis payı (%) — kalan danışmana" hint="Ek paylar önce ayrılır, kalan ofis/danışman arasında bölünür">
            <Input type="number" min={0} max={100} step={5} value={ofisPayi} onChange={(e) => setOfisPayi(e.target.value)} />
          </Field>
          {extras.map((x, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_5rem_auto] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5rem_auto]">
              <Field label="Rol">
                <Select value={x.rol} onChange={(e) => setExtras(extras.map((y, j) => (j === i ? { ...y, rol: e.target.value as ExtraShare["rol"] } : y)))}>
                  <option value="portfoy_getiren">Portföy getiren</option>
                  <option value="musteri_getiren">Müşteri getiren</option>
                  <option value="referans">Referans</option>
                </Select>
              </Field>
              <div className="col-span-3 row-start-2 sm:col-span-1 sm:row-start-auto">
                <Field label="Kişi">
                  <Select value={x.userId ?? ""} onChange={(e) => setExtras(extras.map((y, j) => (j === i ? { ...y, userId: e.target.value || null } : y)))}>
                    <option value="">Ofis dışı / belirtilmedi</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.ad_soyad}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="%">
                <Input type="number" min={0} max={100} value={String(x.oran)} onChange={(e) => setExtras(extras.map((y, j) => (j === i ? { ...y, oran: num(e.target.value) } : y)))} />
              </Field>
              <Button aria-label="Payı kaldır" onClick={() => setExtras(extras.filter((_, j) => j !== i))}>
                ✕
              </Button>
            </div>
          ))}
          <Button size="sm" onClick={() => setExtras([...extras, { rol: "portfoy_getiren", oran: 10, userId: null }])}>
            + Ek pay (portföy/müşteri getiren, referans)
          </Button>
          <ErrorNote error={splitErr} />
          {split.length > 0 && (
            <Table>
              <thead>
                <tr>
                  <th>Alıcı</th>
                  <th className="text-right">Oran</th>
                  <th className="text-right">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {split.map((s, i) => (
                  <tr key={i}>
                    <td>
                      {PAY_ROL_ETIKET[s.alici] ?? s.alici}
                      {memberName(s.userId) && <span className="block text-xs text-muted">{memberName(s.userId)}</span>}
                    </td>
                    <td className="text-right tabular-nums">%{s.oran.toLocaleString("tr-TR")}</td>
                    <td className="text-right tabular-nums">{tl(s.tutar)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <Button variant="primary" disabled={!result || !!splitErr || busy} onClick={() => void save()}>
            Komisyonu ve paylaşımı kaydet
          </Button>
        </div>
      </Card>

      <Card title="Tahsilat" className="lg:col-span-2">
        {!lines.length ? (
          <p className="text-sm text-muted">Kaydedilmiş komisyon yok. Hesaplamayı kaydedince tahsilat takibi burada görünür.</p>
        ) : (
          <div className="space-y-2">
            {lines.map((l) => (
              <label key={l.id} className="flex min-h-10 flex-wrap items-center gap-3 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-brand" checked={l.tahsil_edildi} onChange={() => void toggleTahsil(l)} />
                <span className="flex-1">{TARAF[l.taraf] ?? l.taraf} tarafı</span>
                <span className="tabular-nums">{tl(l.matrah + l.kdv)}</span>
                {l.tahsil_edildi ? <Badge tone="ok">Tahsil edildi</Badge> : <Badge tone="warn">Bekliyor</Badge>}
              </label>
            ))}
            <p className="border-t border-border pt-2 text-sm">
              Tahsil edilen <b className="tabular-nums">{tl(tahsilEdilen)}</b> / {tl(toplamKayitli)} · Bekleyen{" "}
              <b className="tabular-nums text-warn">{tl(round2(toplamKayitli - tahsilEdilen))}</b>
            </p>
            {splits.length > 0 && (
              <p className="text-xs text-muted">
                Kayıtlı paylaşım: {splits.map((s) => `${PAY_ROL_ETIKET[s.alici_rol] ?? s.alici_rol} ${tl(s.tutar)}`).join(" · ")}
              </p>
            )}
          </div>
        )}
      </Card>

      {!kira && alici && satici && (
        <>
          <CostCard title="Alıcının toplam maliyeti" cost={alici} />
          <CostCard title="Satıcının eline geçecek net" cost={satici} />
        </>
      )}
    </div>
  );
}

function CostCard({ title, cost }: { title: string; cost: CostBreakdown }) {
  return (
    <Card title={title}>
      <ul className="space-y-1.5 text-sm">
        {cost.kalemler.map((k) => (
          <li key={k.kalem} className="flex justify-between gap-3">
            <span className="min-w-0 text-muted">
              {k.kalem}
              {k.not && <span className="block text-xs">{k.not}</span>}
            </span>
            <span className="whitespace-nowrap tabular-nums">{tl(k.tutar)}</span>
          </li>
        ))}
        <li className="flex justify-between gap-3 border-t border-border pt-2 font-semibold">
          <span>Toplam</span>
          <span className="tabular-nums">{tl(cost.toplam)}</span>
        </li>
      </ul>
    </Card>
  );
}
