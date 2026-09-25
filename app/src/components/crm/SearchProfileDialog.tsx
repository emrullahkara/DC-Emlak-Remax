"use client";

import { useState } from "react";
import { useReadySession } from "@/data/session";
import type { ListingType, SearchProfile } from "@/data/types";
import { Button, Checkbox, Dialog, ErrorNote, Field, Input, Select, toast } from "@/components/ui";
import { ILAN_TIPLERI, OZELLIKLER } from "@/lib/format";
import { ChipGroup, TagInput } from "./common";

interface Props {
  open: boolean;
  onClose: () => void;
  personId: string;
  profile: SearchProfile | null;
  /** Portföylerde geçen ilçe ve mahalleler (öneri) */
  ilceler: string[];
  mahalleler: string[];
}

const numOrNull = (v: string) => {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return v.trim() === "" || !Number.isFinite(n) ? null : n;
};

export function SearchProfileDialog(props: Props) {
  // Dialog her açılışta taze form durumu ile çizilir
  return props.open ? <Inner key={props.profile?.id ?? "yeni"} {...props} /> : null;
}

function Inner({ open, onClose, personId, profile, ilceler, mahalleler }: Props) {
  const { store } = useReadySession();
  const [f, setF] = useState(() => ({
    ilan_tipi: (profile?.ilan_tipi ?? "satilik") as ListingType,
    butce_min: profile?.butce_min != null ? String(profile.butce_min) : "",
    butce_max: profile?.butce_max != null ? String(profile.butce_max) : "",
    butce_tolerans: String(profile?.butce_tolerans ?? 5),
    ilceler: profile?.ilceler ?? [],
    mahalleler: profile?.mahalleler ?? [],
    oda_min: profile?.oda_min != null ? String(profile.oda_min) : "",
    m2_min: profile?.m2_min != null ? String(profile.m2_min) : "",
    kredi_kullanacak: profile?.kredi_kullanacak ?? false,
    kredi_on_onay: profile?.kredi_on_onay ?? false,
    zorunlu: profile?.zorunlu ?? [],
    tercih: profile?.tercih ?? [],
    aktif: profile?.aktif ?? true,
  }));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const ozellikler = Object.entries(OZELLIKLER).map(([id, label]) => ({ id, label }));

  async function save() {
    setError(null);
    const max = numOrNull(f.butce_max);
    const min = numOrNull(f.butce_min);
    if (!max || max <= 0) return setError("Bütçe üst sınırı zorunlu.");
    if (min !== null && min > max) return setError("Bütçe alt sınırı üst sınırdan büyük olamaz.");
    if (!f.ilceler.length) return setError("En az bir ilçe girin.");
    const cakisan = f.zorunlu.filter((z) => f.tercih.includes(z));
    const body: Partial<SearchProfile> = {
      ilan_tipi: f.ilan_tipi,
      butce_min: min,
      butce_max: max,
      butce_tolerans: numOrNull(f.butce_tolerans) ?? 0,
      ilceler: f.ilceler,
      mahalleler: f.mahalleler,
      oda_min: numOrNull(f.oda_min),
      m2_min: numOrNull(f.m2_min),
      kredi_kullanacak: f.kredi_kullanacak,
      kredi_on_onay: f.kredi_kullanacak && f.kredi_on_onay,
      zorunlu: f.zorunlu,
      tercih: f.tercih.filter((t) => !cakisan.includes(t)),
      aktif: f.aktif,
    };
    setSaving(true);
    try {
      if (profile) await store.update("search_profile", profile.id, body);
      else await store.insert("search_profile", { ...body, person_id: personId });
      toast(profile ? "Arayış güncellendi" : "Arayış eklendi");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      wide
      title={profile ? "Arayışı düzenle" : "Yeni arayış profili"}
      footer={
        <>
          <Button onClick={onClose}>Vazgeç</Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="İlan tipi" required>
          <Select value={f.ilan_tipi} onChange={(e) => set("ilan_tipi", e.target.value as ListingType)}>
            {Object.entries(ILAN_TIPLERI).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Bütçe toleransı (%)" hint="Üst sınırı bu oranda aşan portföyler de gösterilir">
          <Input inputMode="decimal" value={f.butce_tolerans} onChange={(e) => set("butce_tolerans", e.target.value)} />
        </Field>
        <Field label={f.ilan_tipi === "kiralik" ? "Kira alt sınırı (₺/ay)" : "Bütçe alt sınırı (₺)"}>
          <Input inputMode="numeric" value={f.butce_min} onChange={(e) => set("butce_min", e.target.value)} placeholder="ör. 8000000" />
        </Field>
        <Field label={f.ilan_tipi === "kiralik" ? "Kira üst sınırı (₺/ay)" : "Bütçe üst sınırı (₺)"} required>
          <Input inputMode="numeric" value={f.butce_max} onChange={(e) => set("butce_max", e.target.value)} placeholder="ör. 12000000" />
        </Field>
        <div className="sm:col-span-2">
          <label htmlFor="sp-ilceler" className="text-sm text-muted">
            İlçeler <span className="text-block">*</span>
          </label>
          <div className="mt-1">
            <TagInput id="sp-ilceler" value={f.ilceler} onChange={(v) => set("ilceler", v)} suggestions={ilceler} placeholder="İlçe yazıp Enter'a basın" />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="sp-mahalleler" className="text-sm text-muted">
            Mahalleler <span className="text-xs">(boş = ilçenin tamamı)</span>
          </label>
          <div className="mt-1">
            <TagInput id="sp-mahalleler" value={f.mahalleler} onChange={(v) => set("mahalleler", v)} suggestions={mahalleler} placeholder="Mahalle yazıp Enter'a basın" />
          </div>
        </div>
        <Field label="En az oda">
          <Input inputMode="numeric" value={f.oda_min} onChange={(e) => set("oda_min", e.target.value)} placeholder="ör. 3" />
        </Field>
        <Field label="En az net m²">
          <Input inputMode="numeric" value={f.m2_min} onChange={(e) => set("m2_min", e.target.value)} placeholder="ör. 110" />
        </Field>
        <div className="flex flex-col sm:col-span-2">
          <Checkbox label="Kredi kullanacak (yalnızca krediye uygun portföyler)" checked={f.kredi_kullanacak} onChange={(e) => set("kredi_kullanacak", e.target.checked)} />
          <Checkbox label="Kredi ön onayı var" checked={f.kredi_on_onay} disabled={!f.kredi_kullanacak} onChange={(e) => set("kredi_on_onay", e.target.checked)} />
        </div>
        <div className="sm:col-span-2">
          <p className="text-sm text-muted">Olmazsa olmaz (sert filtre)</p>
          <div className="mt-1">
            <ChipGroup label="Olmazsa olmaz" options={ozellikler} value={f.zorunlu} onChange={(v) => set("zorunlu", v)} />
          </div>
        </div>
        <div className="sm:col-span-2">
          <p className="text-sm text-muted">Olsa iyi olur (puanı artırır)</p>
          <div className="mt-1">
            <ChipGroup label="Olsa iyi olur" options={ozellikler.filter((o) => !f.zorunlu.includes(o.id))} value={f.tercih} onChange={(v) => set("tercih", v)} />
          </div>
        </div>
        <div className="sm:col-span-2">
          <Checkbox label="Aktif arayış (eşleştirmede kullanılır)" checked={f.aktif} onChange={(e) => set("aktif", e.target.checked)} />
        </div>
      </div>
      <div className="mt-3">
        <ErrorNote error={error} />
      </div>
    </Dialog>
  );
}
