"use client";

import { useState } from "react";
import { Button, Checkbox, Dialog, Field, Input, Select, toast } from "@/components/ui";
import { useReadySession } from "@/data/session";
import type { OfficeMember, Person, Portfolio } from "@/data/types";
import { nextSlot, toLocalInput } from "@/domain/calendar";
import { createYgbForShowing, ygbValues } from "./ygb";

export function NewShowingDialog({
  day,
  portfolios,
  persons,
  members,
  onClose,
}: {
  day: Date;
  portfolios: Portfolio[];
  persons: Person[];
  members: OfficeMember[];
  onClose: () => void;
}) {
  const s = useReadySession();
  const aktif = portfolios.filter((p) => !["arsiv", "tamamlandi", "aday"].includes(p.asama));
  const [portfolioId, setPortfolioId] = useState(aktif[0]?.id ?? "");
  const [personId, setPersonId] = useState("");
  const [zaman, setZaman] = useState(() => toLocalInput(nextSlot(new Date(), day)));
  const [agentId, setAgentId] = useState(s.userId);
  const [ygb, setYgb] = useState(true);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!portfolioId || !personId || !zaman) return toast("Portföy, kişi ve zaman seçin");
    const when = new Date(zaman);
    if (Number.isNaN(when.getTime())) return toast("Geçerli bir tarih/saat girin");
    setBusy(true);
    try {
      const showing = await s.store.insert("showing", {
        office_id: s.officeId,
        portfolio_id: portfolioId,
        person_id: personId,
        agent_id: agentId,
        planlanan: when.toISOString(),
        durum: "planli",
      });
      if (ygb) {
        const alanlar = ygbValues({
          showing,
          office: s.office,
          agent: members.find((m) => m.user_id === agentId) ?? s.member,
          portfolio: portfolios.find((p) => p.id === portfolioId) ?? null,
          person: persons.find((p) => p.id === personId) ?? null,
        });
        await createYgbForShowing(s.store, { officeId: s.officeId, userId: s.userId }, showing, alanlar);
      }
      toast(ygb ? "Randevu ve yer gösterme belgesi taslağı oluşturuldu" : "Randevu oluşturuldu");
      onClose();
    } catch (e) {
      toast(`Kaydedilemedi: ${(e as Error).message}`);
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Yeni gösterim randevusu"
      footer={
        <>
          <Button onClick={onClose}>Vazgeç</Button>
          <Button variant="primary" onClick={() => void save()} disabled={busy}>
            Oluştur
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Portföy" required>
          <Select value={portfolioId} onChange={(e) => setPortfolioId(e.target.value)}>
            {aktif.length === 0 && <option value="">Gösterilebilir portföy yok</option>}
            {aktif.map((p) => (
              <option key={p.id} value={p.id}>
                {p.baslik ?? p.id}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Kişi" required>
          <Select value={personId} onChange={(e) => setPersonId(e.target.value)}>
            <option value="">— Kişi seçin —</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.ad_soyad}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tarih ve saat" required>
            <Input type="datetime-local" value={zaman} onChange={(e) => setZaman(e.target.value)} />
          </Field>
          <Field label="Danışman" required>
            <Select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
              {members
                .filter((m) => m.aktif)
                .map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.ad_soyad}
                  </option>
                ))}
            </Select>
          </Field>
        </div>
        <Checkbox checked={ygb} onChange={(e) => setYgb(e.target.checked)} label="Yer gösterme belgesi taslağını şimdi hazırla" />
        <p className="text-xs text-muted">Yer gösterme belgesi imzalanmadan gösterim “tamamlandı” olarak kapatılamaz.</p>
      </div>
    </Dialog>
  );
}
