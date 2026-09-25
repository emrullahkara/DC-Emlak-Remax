"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Checkbox, EmptyState, ErrorNote, PageHeader, Select, Spinner, Stat } from "@/components/ui";
import { useReadySession, useTable } from "@/data/session";
import type { FsboListingRow, FsboStatus } from "@/data/types";
import { callQueue, dayDiff, DURUM_ETIKET, funnel, isNew24h, parseDay, scorePatch, scoreRow, type FsboRow } from "@/domain/fsbo";
import { shortTL } from "@/lib/format";
import { AddFsboDialog } from "./AddFsboDialog";
import { CallDialog } from "./CallDialog";
import { DurumBadge, ScoreBadge, SignalBadges } from "./shared";

type DurumFiltre = "aktif" | "tum" | FsboStatus;

export function FsboRadar() {
  const { store, officeId, userId } = useReadySession();
  const [now] = useState(() => new Date());
  const q = useTable("fsbo_listing", { eq: { office_id: officeId } });
  const members = useTable("office_member", { eq: { office_id: officeId } });
  const rows = q.data as FsboRow[];

  const [ilce, setIlce] = useState("");
  const [minSkor, setMinSkor] = useState(0);
  const [durum, setDurum] = useState<DurumFiltre>("aktif");
  const [bana, setBana] = useState(false);
  const [adding, setAdding] = useState(false);
  const [callId, setCallId] = useState<string | null>(null);

  // Skorları hesapla (her açılışta ilan yaşı değiştiği için) ve farklıysa kaydet
  const scored = useMemo(() => rows.map((r) => ({ row: r, ...scoreRow(r, now) })), [rows, now]);
  const written = useRef(new Set<string>());
  useEffect(() => {
    for (const r of rows) {
      const patch = scorePatch(r, now);
      if (!patch) continue;
      const key = `${r.id}:${patch.skor}:${patch.sinyaller.join("|")}`;
      if (written.current.has(key)) continue;
      written.current.add(key);
      store.update("fsbo_listing", r.id, patch as Partial<FsboListingRow>).catch(() => written.current.delete(key));
    }
  }, [rows, now, store]);

  const memberName = useMemo(() => new Map(members.data.map((m) => [m.user_id, m.ad_soyad])), [members.data]);
  const ilceler = useMemo(() => [...new Set(rows.map((r) => r.ilce).filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, "tr")), [rows]);

  const withScore = useMemo(() => scored.map((s) => ({ ...s.row, skor: s.puan, sinyaller: s.sinyaller })), [scored]);
  const queue = callQueue(withScore, now);
  const yeni = withScore.filter((r) => isNew24h(r, now));
  const huni = funnel(rows);

  const list = scored
    .filter(({ row, puan }) => {
      if (ilce && row.ilce !== ilce) return false;
      if (puan < minSkor) return false;
      if (bana && row.atanan_id !== userId) return false;
      if (durum === "aktif") return !["vazgecildi", "yetki_alindi"].includes(row.durum);
      if (durum !== "tum") return row.durum === durum;
      return true;
    })
    .sort((a, b) => b.puan - a.puan);

  const sel = callId ? scored.find((s) => s.row.id === callId) : null;

  if (q.loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="FSBO Radar"
        subtitle={`Sahibinden ilanlar · ${rows.length} ilan izleniyor · skor sırasına göre`}
        actions={
          <Button variant="primary" onClick={() => setAdding(true)}>
            + İlan ekle
          </Button>
        }
      />
      <ErrorNote error={q.error} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Bugünkü arama sırası" value={queue.length} hint="Yeni + kadans adımı gelenler" />
        <Stat label="Yeni (24 saat)" value={yeni.length} hint={`${yeni.filter((r) => (r.skor ?? 0) >= 70).length} tanesi skor ≥ 70`} />
        <div className="col-span-2 rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-muted">Dönüşüm hunisi</p>
          <ol className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {huni.map((h, i) => (
              <li key={h.kod} className="flex items-center gap-2">
                {i > 0 && <span className="text-muted" aria-hidden>›</span>}
                <span>
                  <b className="tabular-nums">{h.sayi}</b> <span className="text-muted">{h.etiket}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-3">
        <label className="w-[calc(50%-0.375rem)] text-sm sm:w-44">
          <span className="text-muted">İlçe</span>
          <Select className="mt-1" value={ilce} onChange={(e) => setIlce(e.target.value)}>
            <option value="">Tümü</option>
            {ilceler.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        </label>
        <label className="w-[calc(50%-0.375rem)] text-sm sm:w-44">
          <span className="text-muted">Durum</span>
          <Select className="mt-1" value={durum} onChange={(e) => setDurum(e.target.value as DurumFiltre)}>
            <option value="aktif">Aktif</option>
            <option value="tum">Tümü</option>
            {(Object.keys(DURUM_ETIKET) as FsboStatus[]).map((d) => (
              <option key={d} value={d}>
                {DURUM_ETIKET[d]}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex min-w-48 flex-1 flex-col text-sm sm:max-w-72">
          <span className="text-muted">
            Skor ≥ <b className="tabular-nums text-text">{minSkor}</b>
          </span>
          <input
            type="range"
            min={0}
            max={90}
            step={5}
            value={minSkor}
            onChange={(e) => setMinSkor(Number(e.target.value))}
            className="mt-1 h-10 w-full accent-brand"
            aria-label="Minimum skor"
          />
        </label>
        <Checkbox label="Bana atananlar" checked={bana} onChange={(e) => setBana(e.target.checked)} />
      </div>

      {!rows.length ? (
        <EmptyState title="Henüz izlenen ilan yok" action={<Button variant="primary" onClick={() => setAdding(true)}>İlk ilanı ekle</Button>}>
          Kayıtlı arama bağlantılarınızdaki sahibinden ilanları ekleyin; skor ve arama sırası otomatik hesaplanır.
        </EmptyState>
      ) : !list.length ? (
        <EmptyState title="Filtreye uyan ilan yok" />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface" aria-label="FSBO ilanları">
          {list.map(({ row, puan, sinyaller }) => {
            const yas = Math.max(0, dayDiff(parseDay(row.ilk_gorulme), now));
            const cakisma = row.atanan_id && row.atanan_id !== userId ? memberName.get(row.atanan_id) ?? "Başka danışman" : null;
            return (
              <li key={row.id} className="flex gap-3 p-3 md:items-center md:p-4" data-testid="fsbo-row">
                <ScoreBadge skor={puan} />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {row.kaynak_url ? (
                      <a href={row.kaynak_url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                        {row.baslik ?? "Başlıksız ilan"}
                      </a>
                    ) : (
                      <span className="font-medium">{row.baslik ?? "Başlıksız ilan"}</span>
                    )}
                    <DurumBadge durum={row.durum} />
                    {row.atanan_id === userId && <Badge tone="brand">Bende</Badge>}
                    {cakisma && <Badge tone="warn">Ekip çakışması: {cakisma}</Badge>}
                  </div>
                  <p className="text-xs text-muted">
                    {[row.ilce, row.mahalle].filter(Boolean).join(" / ") || "—"}
                    {row.malik_ad ? ` · ${row.malik_ad}` : ""}
                  </p>
                  <p className="text-sm">
                    <b className="tabular-nums">{shortTL(row.fiyat)}</b>
                    <span className="text-muted">
                      {" "}
                      · {yas} gün · {row.fiyat_dusum_sayisi ? `${row.fiyat_dusum_sayisi}× düşüş` : "düşüş yok"}
                    </span>
                  </p>
                  <SignalBadges sinyaller={sinyaller} />
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Button variant="ok" size="sm" onClick={() => setCallId(row.id)} aria-label={`${row.baslik ?? "İlan"} — ara`}>
                    ☎ ARA
                  </Button>
                  {row.portfolio_id && (
                    <Link href={`/portfoyler/${row.portfolio_id}`} className="text-xs text-brand underline">
                      Portföy
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-muted">
        İlanlar, platformların kullanım koşullarına uygun olarak danışmanın kendi kayıtlı arama bağlantılarından ya da elle eklenir; otomatik veri
        çekme yapılmaz. Skor; ilan yaşı, fiyat düşüşü, piyasaya göre fiyat, açıklamadaki sinyaller ve fotoğraf sayısından hesaplanır.
      </p>

      <AddFsboDialog open={adding} onClose={() => setAdding(false)} defaultIlce={ilce || undefined} />
      {sel && <CallDialog row={sel.row} skor={sel.puan} sinyaller={sel.sinyaller} members={members.data} onClose={() => setCallId(null)} />}
    </div>
  );
}
