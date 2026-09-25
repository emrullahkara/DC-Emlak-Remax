"use client";

import { useEffect, useState } from "react";
import { Button, Card, Select, cx } from "@/components/ui";
import type { OfficeMember } from "@/data/types";
import { checkinRemaining, formatCountdown } from "@/domain/calendar";

const KEY = "dc-emlak-guvendeyim";

type State = { start: number; dk: number } | null;

function readState(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as State;
    return s && Number.isFinite(s.start) && Number.isFinite(s.dk) ? s : null;
  } catch {
    return null;
  }
}

function writeState(s: State) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    // depolama kapalı: sayaç yalnızca bu oturumda çalışır
  }
}

/** Tek başına gösterimde "Güvendeyim" sayacı (yalnızca bu cihazda). */
export function Checkin({ members }: { members: OfficeMember[] }) {
  const [state, setState] = useState<State>(null);
  const [dk, setDk] = useState(45);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setState(readState());
  }, []);

  useEffect(() => {
    if (!state) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [state]);

  const update = (s: State) => {
    setState(s);
    writeState(s);
    setNow(Date.now());
  };

  const lider = members.find((m) => m.aktif && (m.rol === "takim_lideri" || m.rol === "broker") && m.telefon);
  const kalan = state ? checkinRemaining(state.start, state.dk, now) : 0;
  const asildi = state !== null && kalan < 0;

  return (
    <Card title="Güvendeyim check-in">
      {!state ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">Tek başına gösterime giderken sayaç başlatın; süre dolmadan “Güvendeyim” deyin. Süre aşılırsa takım liderinize haber verin.</p>
          <div className="flex gap-2">
            <Select value={dk} onChange={(e) => setDk(Number(e.target.value))} aria-label="Süre" className="w-28">
              {[30, 45, 60, 90].map((n) => (
                <option key={n} value={n}>
                  {n} dk
                </option>
              ))}
            </Select>
            <Button className="flex-1" onClick={() => update({ start: Date.now(), dk })}>
              Sayacı başlat
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className={cx("text-center text-3xl font-semibold tabular-nums", asildi ? "text-block" : "text-text")} aria-live="polite">
            {formatCountdown(kalan)}
          </p>
          {asildi && (
            <p className="rounded-lg border border-block/40 bg-block/10 p-2 text-sm text-block">
              Süre aşıldı. Güvendeyseniz sayacı yenileyin; değilse takım liderinize haber verin.
              {lider?.telefon && (
                <>
                  {" "}
                  <a className="font-semibold underline" href={`tel:${lider.telefon.replace(/\s/g, "")}`}>
                    {lider.ad_soyad}’ı ara
                  </a>
                </>
              )}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="ok" className="flex-1" onClick={() => update({ start: Date.now(), dk: state.dk })}>
              Güvendeyim
            </Button>
            <Button onClick={() => update(null)}>Bitir</Button>
          </div>
          <p className="text-xs text-muted">Sayaç yalnızca bu cihazda çalışır; otomatik alarm için SMS modülü gerekir.</p>
        </div>
      )}
    </Card>
  );
}
