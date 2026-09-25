"use client";

import { useState } from "react";
import { Badge, Button, Card, cx, ErrorNote, EvaluationList, Field, Input, KararBadge, Select, toast } from "@/components/ui";
import { useReadySession } from "@/data/session";
import type { Deal, Person, Portfolio } from "@/data/types";
import { evaluateClosing } from "@/domain/compliance";
import { buildClosingContext, checklistProgress, daysUntil, defaultChecklist, toggleChecklist } from "@/domain/deal";
import { paramsFor } from "@/domain/params";
import { fmtDate, tl } from "@/lib/format";
import type { RequestMove } from "./useStageMover";

const parseAmount = (s: string) => Number(s.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "")) || 0;

export function DealTab({
  portfolio,
  deal,
  persons,
  requestMove,
  now,
}: {
  portfolio: Portfolio;
  deal: Deal | null;
  persons: Person[];
  requestMove: RequestMove;
  now: Date;
}) {
  const kira = portfolio.ilan_tipi === "kiralik";
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <DealForm key={deal?.id ?? "yeni"} portfolio={portfolio} deal={deal} persons={persons} now={now} kira={kira} />
      {deal ? (
        <Checklist portfolio={portfolio} deal={deal} requestMove={requestMove} now={now} kira={kira} />
      ) : (
        <Card title="Kapanış kontrol listesi">
          <p className="text-sm text-muted">İşlem kaydı oluşturulduğunda {kira ? "kiralama" : "satış"} kontrol listesi otomatik hazırlanır.</p>
          <ul className="mt-3 space-y-1 text-sm">
            {defaultChecklist(portfolio.ilan_tipi).map((i) => (
              <li key={i.kod} className="text-muted">
                ○ {i.baslik}
                {i.zorunlu && <span className="text-block"> *</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function DealForm({ portfolio, deal, persons, now, kira }: { portfolio: Portfolio; deal: Deal | null; persons: Person[]; now: Date; kira: boolean }) {
  const { store, officeId } = useReadySession();
  const [alici, setAlici] = useState(deal?.alici_id ?? "");
  const [bedel, setBedel] = useState(String(deal?.bedel ?? portfolio.fiyat ?? ""));
  const [kapora, setKapora] = useState(deal?.kapora ? String(deal.kapora) : "");
  const [tarih, setTarih] = useState(deal?.tapu_tarihi ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const b = parseAmount(bedel);
    if (b <= 0) return setErr(kira ? "Aylık kira bedelini girin." : "İşlem bedelini girin.");
    setErr(null);
    setBusy(true);
    try {
      const patch = { alici_id: alici || null, bedel: b, kapora: kapora ? parseAmount(kapora) : null, tapu_tarihi: tarih || null };
      if (deal) {
        await store.update("deal", deal.id, patch);
        toast("İşlem güncellendi");
      } else {
        await store.insert("deal", {
          ...patch,
          office_id: officeId,
          portfolio_id: portfolio.id,
          kontrol_listesi: defaultChecklist(portfolio.ilan_tipi),
          kural_surum: paramsFor(now).surum,
        });
        toast("İşlem oluşturuldu · kontrol listesi hazırlandı");
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title={deal ? "İşlem bilgileri" : "İşlem oluştur"}>
      <div className="space-y-3">
        <Field label={kira ? "Kiracı" : "Alıcı"}>
          <Select value={alici} onChange={(e) => setAlici(e.target.value)}>
            <option value="">Seçilmedi</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.ad_soyad}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={kira ? "Aylık kira (₺)" : "İşlem bedeli (₺)"} required hint={parseAmount(bedel) ? tl(parseAmount(bedel)) : undefined}>
            <Input inputMode="numeric" value={bedel} onChange={(e) => setBedel(e.target.value)} />
          </Field>
          <Field label={kira ? "Depozito (₺)" : "Kapora (₺)"} hint={parseAmount(kapora) ? tl(parseAmount(kapora)) : undefined}>
            <Input inputMode="numeric" value={kapora} onChange={(e) => setKapora(e.target.value)} />
          </Field>
          <Field label={kira ? "Sözleşme / teslim tarihi" : "Tapu tarihi"}>
            <Input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
          </Field>
        </div>
        <ErrorNote error={err} />
        <Button variant="primary" disabled={busy} onClick={() => void save()}>
          {deal ? "Kaydet" : "İşlem oluştur"}
        </Button>
        {deal && <p className="text-xs text-muted">Kural seti {deal.kural_surum} · oluşturma {fmtDate(deal.created_at)}</p>}
      </div>
    </Card>
  );
}

function Checklist({ portfolio, deal, requestMove, now, kira }: { portfolio: Portfolio; deal: Deal; requestMove: RequestMove; now: Date; kira: boolean }) {
  const { store } = useReadySession();
  const list = deal.kontrol_listesi ?? [];
  const prog = checklistProgress(list);
  const kalan = daysUntil(deal.tapu_tarihi, now);
  const ev = evaluateClosing(buildClosingContext(deal, now));

  const toggle = async (kod: string) => {
    try {
      await store.update("deal", deal.id, { kontrol_listesi: toggleChecklist(list, kod) });
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const hedef = kira ? "teslime" : "tapuya";
  return (
    <Card
      title="Kapanış kontrol listesi"
      actions={
        kalan === null ? (
          <Badge>Tarih yok</Badge>
        ) : kalan < 0 ? (
          <Badge tone="block">{-kalan} gün gecikti</Badge>
        ) : (
          <Badge tone={kalan <= 3 ? "warn" : "info"}>{kalan === 0 ? `${hedef === "tapuya" ? "Tapu" : "Teslim"} bugün` : `${hedef} ${kalan} gün`}</Badge>
        )
      }
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg" aria-hidden>
          <div className="h-full bg-ok" style={{ width: `${prog.toplam ? (prog.tamam / prog.toplam) * 100 : 0}%` }} />
        </div>
        <span className="text-xs tabular-nums text-muted">
          {prog.tamam}/{prog.toplam}
        </span>
      </div>
      {!list.length && (
        <Button size="sm" onClick={() => void store.update("deal", deal.id, { kontrol_listesi: defaultChecklist(portfolio.ilan_tipi) })}>
          Varsayılan listeyi yükle
        </Button>
      )}
      <ul className="divide-y divide-border">
        {list.map((i) => {
          const gecikti = !i.tamam && i.zorunlu && kalan !== null && kalan < 0;
          return (
            <li key={i.kod}>
              <label className="flex min-h-10 cursor-pointer items-center gap-3 py-1.5 text-sm">
                <input type="checkbox" className="h-4 w-4 shrink-0 accent-brand" checked={i.tamam} onChange={() => void toggle(i.kod)} />
                <span className={cx("min-w-0 flex-1", i.tamam && "text-muted line-through", gecikti && "text-block")}>{i.baslik}</span>
                {i.zorunlu ? <Badge tone={i.tamam ? "ok" : "warn"}>Zorunlu</Badge> : <Badge>İsteğe bağlı</Badge>}
              </label>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 space-y-2 rounded-lg border border-border p-3">
        <p className="flex items-center gap-2 text-sm font-medium">
          Kapanış uyum ön kontrolü <KararBadge karar={ev.karar} />
        </p>
        <EvaluationList ev={ev} />
        {prog.eksikZorunlu.length > 0 && (
          <p className="text-xs text-warn">Tamamlanmamış zorunlu adımlar: {prog.eksikZorunlu.map((i) => i.baslik).join(", ")}.</p>
        )}
      </div>
      {portfolio.asama !== "tamamlandi" && (
        <Button variant="ok" className="mt-4 w-full" onClick={() => void requestMove(portfolio, "tamamlandi")}>
          ✓ {kira ? "Kiralandı" : "Satıldı"} olarak tamamla
        </Button>
      )}
    </Card>
  );
}
