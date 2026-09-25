"use client";

import { useMemo, useState } from "react";
import { CommissionCapError, rentCommission, saleCommission, splitCommission } from "@/domain/commission";
import { buyerTotalCost, sellerNet, type CostBreakdown } from "@/domain/costs";
import { formatTL } from "@/domain/money";
import { paramsFor } from "@/domain/params";
import { checkDeposit, maxRenewedRent } from "@/domain/rent";

type Tab = "satis" | "kira" | "artis";

function NumberField(props: { label: string; value: number; onChange: (n: number) => void; step?: number; suffix?: string }) {
  return (
    <label className="block text-sm">
      <span className="text-muted">{props.label}</span>
      <div className="mt-1 flex items-center rounded-lg border border-border bg-surface focus-within:ring-2 focus-within:ring-brand">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={props.step ?? 1}
          value={Number.isFinite(props.value) ? props.value : ""}
          onChange={(e) => props.onChange(e.target.valueAsNumber)}
          className="min-h-11 w-full bg-transparent px-3 outline-none"
        />
        {props.suffix && <span className="px-3 text-muted">{props.suffix}</span>}
      </div>
    </label>
  );
}

function Breakdown({ title, b }: { title: string; b: CostBreakdown }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <dl className="space-y-1 text-sm">
        {b.kalemler.map((k) => (
          <div key={k.kalem} className="flex justify-between gap-4">
            <dt>
              {k.kalem}
              {k.not && <span className="block text-xs text-muted">{k.not}</span>}
            </dt>
            <dd className="tabular-nums">{formatTL(k.tutar)}</dd>
          </div>
        ))}
        <div className="flex justify-between border-t border-border pt-2 font-semibold">
          <dt>Toplam</dt>
          <dd className="tabular-nums">{formatTL(b.toplam)}</dd>
        </div>
      </dl>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return <p className="rounded-lg border border-block/40 bg-block/10 p-3 text-sm text-block">{msg}</p>;
}

function safe<T>(fn: () => T): { v?: T; err?: string } {
  try {
    return { v: fn() };
  } catch (e) {
    if (e instanceof CommissionCapError || e instanceof RangeError) return { err: e.message };
    throw e;
  }
}

function SaleTab() {
  const [bedel, setBedel] = useState(10_000_000);
  const [aliciOran, setAliciOran] = useState(2);
  const [saticiOran, setSaticiOran] = useState(2);
  const [dask, setDask] = useState(0);
  const [kredi, setKredi] = useState(0);
  const [danismanPayi, setDanismanPayi] = useState(50);

  const r = useMemo(
    () =>
      safe(() => {
        const input = { satisBedeli: bedel, aliciKomisyonOrani: aliciOran, saticiKomisyonOrani: saticiOran, daskPrimi: dask, kalanKrediBorcu: kredi };
        const kom = saleCommission(bedel, { alici: aliciOran, satici: saticiOran });
        return {
          kom,
          alici: buyerTotalCost(input),
          satici: sellerNet(input),
          pay: splitCommission(kom.toplamMatrah, [
            { alici: "Ofis", oran: 100 - danismanPayi },
            { alici: "Danışman", oran: danismanPayi },
          ]),
        };
      }),
    [bedel, aliciOran, saticiOran, dask, kredi, danismanPayi],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <NumberField label="Satış bedeli" value={bedel} onChange={setBedel} step={50_000} suffix="₺" />
        <NumberField label="Alıcı hizmet bedeli" value={aliciOran} onChange={setAliciOran} step={0.1} suffix="%" />
        <NumberField label="Satıcı hizmet bedeli" value={saticiOran} onChange={setSaticiOran} step={0.1} suffix="%" />
        <NumberField label="DASK primi (alıcı)" value={dask} onChange={setDask} step={100} suffix="₺" />
        <NumberField label="Satıcının kalan kredi borcu" value={kredi} onChange={setKredi} step={10_000} suffix="₺" />
        <label className="block text-sm">
          <span className="text-muted">Danışman payı: %{danismanPayi}</span>
          <input type="range" min={0} max={100} value={danismanPayi} onChange={(e) => setDanismanPayi(+e.target.value)} className="mt-3 w-full accent-brand" />
        </label>
      </div>
      {r.err && <ErrorBox msg={r.err} />}
      {r.v && (
        <div className="grid gap-4 md:grid-cols-2">
          <Breakdown title="Alıcının toplam maliyeti" b={r.v.alici} />
          <Breakdown title="Satıcının eline geçen" b={r.v.satici} />
          <div className="rounded-xl border border-border bg-surface p-4 md:col-span-2">
            <h3 className="mb-2 font-semibold">Hizmet bedeli</h3>
            <p className="text-sm">
              Matrah {formatTL(r.v.kom.toplamMatrah)} + KDV {formatTL(r.v.kom.toplamKdv)} = <b>{formatTL(r.v.kom.genelToplam)}</b>
            </p>
            <p className="mt-2 text-sm text-muted">
              Paylaşım (KDV hariç): {r.v.pay.map((p) => `${p.alici} ${formatTL(p.tutar)}`).join(" · ")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function RentTab() {
  const [kira, setKira] = useState(35_000);
  const [kiraciAy, setKiraciAy] = useState(1);
  const [verenAy, setVerenAy] = useState(0);
  const [depozito, setDepozito] = useState(70_000);
  const r = useMemo(() => safe(() => rentCommission(kira, { kiraci: kiraciAy, kiraya_veren: verenAy })), [kira, kiraciAy, verenAy]);
  const dep = kira > 0 ? checkDeposit(kira, depozito) : null;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label="Aylık kira" value={kira} onChange={setKira} step={500} suffix="₺" />
        <NumberField label="Depozito" value={depozito} onChange={setDepozito} step={1000} suffix="₺" />
        <NumberField label="Kiracıdan (ay)" value={kiraciAy} onChange={setKiraciAy} step={0.25} suffix="ay" />
        <NumberField label="Kiraya verenden (ay)" value={verenAy} onChange={setVerenAy} step={0.25} suffix="ay" />
      </div>
      {r.err && <ErrorBox msg={r.err} />}
      {r.v && (
        <div className="rounded-xl border border-border bg-surface p-4 text-sm">
          {r.v.satirlar.map((s) => (
            <p key={s.taraf}>
              {s.taraf === "kiraci" ? "Kiracı" : "Kiraya veren"}: {formatTL(s.matrah)} + KDV {formatTL(s.kdv)} = <b>{formatTL(s.toplam)}</b>
            </p>
          ))}
          <p className="mt-2 font-semibold">Toplam: {formatTL(r.v.genelToplam)}</p>
        </div>
      )}
      {dep && !dep.gecerli && <ErrorBox msg={`Depozito en fazla ${dep.tavanAy} aylık kira (${formatTL(dep.tavan)}) olabilir.`} />}
    </div>
  );
}

function IncreaseTab() {
  const [kira, setKira] = useState(30_000);
  const [tufe, setTufe] = useState(35);
  const r = kira > 0 ? maxRenewedRent(kira, tufe) : null;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField label="Mevcut aylık kira" value={kira} onChange={setKira} step={500} suffix="₺" />
        <NumberField label="TÜFE 12 aylık ortalama değişim" value={tufe} onChange={setTufe} step={0.01} suffix="%" />
      </div>
      <p className="text-xs text-muted">Güncel oranı TÜİK &quot;12 aylık ortalamalara göre değişim&quot; verisinden alın; sözleşmenin yenilendiği aydan bir önceki ayın verisi esas alınır.</p>
      {r && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-muted">Yasal azami yeni kira</p>
          <p className="text-2xl font-semibold">{formatTL(r.yeniKira)}</p>
          <p className="text-sm text-muted">Artış: {formatTL(r.artisTutari)} (%{r.azamiArtisOrani})</p>
        </div>
      )}
    </div>
  );
}

export function Calculators() {
  const [tab, setTab] = useState<Tab>("satis");
  const p = paramsFor();
  const tabs: { id: Tab; label: string }[] = [
    { id: "satis", label: "Satış" },
    { id: "kira", label: "Kiralama" },
    { id: "artis", label: "Kira artışı" },
  ];
  return (
    <div className="space-y-4">
      <div role="tablist" className="inline-flex rounded-lg border border-border bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`min-h-10 rounded-md px-4 text-sm ${tab === t.id ? "bg-brand text-white" : "text-muted"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "satis" && <SaleTab />}
      {tab === "kira" && <RentTab />}
      {tab === "artis" && <IncreaseTab />}
      <details className="rounded-xl border border-border bg-surface p-4 text-sm">
        <summary className="cursor-pointer font-semibold">Parametreler (sürüm {p.surum})</summary>
        <ul className="mt-2 space-y-1 text-muted">
          <li>Satış hizmet bedeli tavanı: taraf başı %{p.satisHizmetBedeliTavanOrani.deger} + KDV</li>
          <li>Kiralama hizmet bedeli tavanı: {p.kiraHizmetBedeliTavanAy.deger} aylık kira + KDV</li>
          <li>KDV: %{p.hizmetKdvOrani.deger}</li>
          <li>Tapu harcı: alıcı ‰{p.tapuHarciBindeAlici.deger}, satıcı ‰{p.tapuHarciBindeSatici.deger}</li>
          <li>
            Döner sermaye: {formatTL(p.donerSermayeUcreti.deger)}
            {p.donerSermayeUcreti.teyitGerekli && <span className="text-warn"> — güncel tutar teyit edilmeli</span>}
          </li>
        </ul>
        <p className="mt-2 text-xs text-muted">Oranlar bilgilendirme amaçlıdır; işlem öncesi güncel mevzuattan teyit edilmelidir.</p>
      </details>
    </div>
  );
}
