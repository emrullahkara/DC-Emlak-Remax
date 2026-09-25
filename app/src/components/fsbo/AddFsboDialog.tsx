"use client";

import { useState } from "react";
import { Button, Dialog, ErrorNote, Field, Input, Textarea, toast } from "@/components/ui";
import { useReadySession } from "@/data/session";
import type { FsboListingRow } from "@/data/types";
import { scoreRow } from "@/domain/fsbo";
import { todayISO } from "@/lib/format";

const EMPTY = {
  baslik: "",
  url: "",
  fiyat: "",
  ilce: "",
  mahalle: "",
  malikAd: "",
  malikTel: "",
  aciklama: "",
  foto: "",
  dusus: "0",
  fark: "",
  ilkGorulme: "",
};

const toNum = (s: string) => {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export function AddFsboDialog({ open, onClose, defaultIlce }: { open: boolean; onClose: () => void; defaultIlce?: string }) {
  const { store, officeId } = useReadySession();
  const [f, setF] = useState({ ...EMPTY, ilce: defaultIlce ?? "", ilkGorulme: todayISO() });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    if (!f.baslik.trim()) return setErr("İlan başlığını girin.");
    if (f.url.trim() && !/^https?:\/\//i.test(f.url.trim())) return setErr("İlan bağlantısı http:// veya https:// ile başlamalı.");
    const fiyat = toNum(f.fiyat);
    if (f.fiyat.trim() && (fiyat === null || fiyat <= 0)) return setErr("Fiyat geçerli bir sayı olmalı.");
    setErr(null);
    setBusy(true);
    try {
      const row: Partial<FsboListingRow> = {
        office_id: officeId,
        kaynak: f.url.trim() ? "danisman_linki" : "manuel",
        kaynak_url: f.url.trim() || null,
        baslik: f.baslik.trim(),
        fiyat,
        ilce: f.ilce.trim() || null,
        mahalle: f.mahalle.trim() || null,
        ilk_gorulme: f.ilkGorulme || todayISO(),
        fiyat_dusum_sayisi: Math.max(0, Math.round(toNum(f.dusus) ?? 0)),
        aciklama: f.aciklama.trim() || null,
        foto_sayisi: toNum(f.foto),
        piyasaya_gore_fark: toNum(f.fark),
        malik_ad: f.malikAd.trim() || null,
        malik_telefon: f.malikTel.trim() || null,
        durum: "yeni",
        atanan_id: null,
      };
      const s = scoreRow(row as FsboListingRow, new Date());
      await store.insert("fsbo_listing", { ...row, skor: s.puan, sinyaller: s.sinyaller });
      toast(`İlan eklendi · skor ${s.puan}`);
      setF({ ...EMPTY, ilce: f.ilce, ilkGorulme: todayISO() });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      wide
      title="Sahibinden ilan ekle"
      footer={
        <>
          <Button onClick={onClose}>Vazgeç</Button>
          <Button variant="primary" disabled={busy} onClick={() => void save()}>
            Ekle ve skorla
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="rounded-lg border border-info/30 bg-info/10 p-3 text-xs text-info">
          İlanlar platformların kullanım koşullarına uygun şekilde, danışmanın kendi kayıtlı arama bağlantılarından elle eklenir. Otomatik veri
          çekme (scraping) yapılmaz; malik iletişim bilgisi yalnızca ilanda kamuya açık paylaşılmışsa girilmelidir.
        </p>
        <Field label="İlan başlığı" required>
          <Input value={f.baslik} onChange={set("baslik")} placeholder="ör. Fenerbahçe 3+1 acil satılık" />
        </Field>
        <Field label="İlan bağlantısı">
          <Input type="url" value={f.url} onChange={set("url")} placeholder="https://www.sahibinden.com/ilan/…" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Fiyat (₺)">
            <Input inputMode="numeric" value={f.fiyat} onChange={set("fiyat")} placeholder="9800000" />
          </Field>
          <Field label="İlçe">
            <Input value={f.ilce} onChange={set("ilce")} />
          </Field>
          <Field label="Mahalle">
            <Input value={f.mahalle} onChange={set("mahalle")} />
          </Field>
          <Field label="Malik adı">
            <Input value={f.malikAd} onChange={set("malikAd")} />
          </Field>
          <Field label="Malik telefonu">
            <Input type="tel" value={f.malikTel} onChange={set("malikTel")} />
          </Field>
          <Field label="İlk yayın / görülme">
            <Input type="date" value={f.ilkGorulme} onChange={set("ilkGorulme")} />
          </Field>
          <Field label="Fotoğraf sayısı">
            <Input type="number" min={0} value={f.foto} onChange={set("foto")} />
          </Field>
          <Field label="Fiyat düşüş sayısı">
            <Input type="number" min={0} value={f.dusus} onChange={set("dusus")} />
          </Field>
          <Field label="Piyasaya göre fark (%)" hint="+12 = bölge medyanının %12 üstü">
            <Input type="number" step="0.5" value={f.fark} onChange={set("fark")} />
          </Field>
        </div>
        <Field label="İlan açıklaması" hint="“acil”, “tayin”, “yurt dışı” gibi ifadeler skoru etkiler">
          <Textarea rows={3} value={f.aciklama} onChange={set("aciklama")} />
        </Field>
        <ErrorNote error={err} />
      </div>
    </Dialog>
  );
}
