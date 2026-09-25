"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useReadySession, useRow, useTable } from "@/data/session";
import type { ConsentPurpose, Person, PersonType } from "@/data/types";
import { Button, Card, Checkbox, EmptyState, ErrorNote, Field, Input, PageHeader, Select, Spinner, toast } from "@/components/ui";
import { findDuplicatesByPhone } from "@/domain/crm";
import { PERSON_TYPES } from "@/lib/format";
import { ChipGroup, KISI_KAYNAKLARI, RIZA_ETIKET, RIZA_KAYNAKLARI, defaultNextStepLocal, fromLocalInput, toLocalInput } from "./common";

interface FormState {
  ad_soyad: string;
  telefon: string;
  eposta: string;
  tipler: PersonType[];
  kaynak: string;
  sonraki_adim: string;
  sonraki_adim_tarihi: string; // datetime-local
}

const OPSIYONEL_RIZALAR: ConsentPurpose[] = ["ticari_ileti", "arama_kaydi", "yurt_disi_aktarim"];

export function PersonForm({ id }: { id?: string }) {
  const editing = Boolean(id);
  const existing = useRow("person", id);
  if (editing && existing.loading) return <Spinner />;
  if (editing && !existing.data) {
    return (
      <EmptyState title="Müşteri bulunamadı" action={<Link href="/musteriler" className="text-brand underline">Müşterilere dön</Link>}>
        Kayıt silinmiş veya görme yetkiniz yok.
      </EmptyState>
    );
  }
  return <PersonFormInner person={existing.data ?? null} />;
}

function PersonFormInner({ person }: { person: Person | null }) {
  const { store, officeId, userId } = useReadySession();
  const router = useRouter();
  const persons = useTable("person", { eq: { office_id: officeId } });

  const [f, setF] = useState<FormState>(() => ({
    ad_soyad: person?.ad_soyad ?? "",
    telefon: person?.telefon ?? "",
    eposta: person?.eposta ?? "",
    tipler: person?.tipler ?? ["alici"],
    kaynak: person?.kaynak ?? "",
    sonraki_adim: person?.sonraki_adim ?? "",
    sonraki_adim_tarihi: toLocalInput(person?.sonraki_adim_tarihi) || defaultNextStepLocal(),
  }));
  const [aydinlatma, setAydinlatma] = useState(true);
  const [rizaKaynak, setRizaKaynak] = useState("sozlu");
  const [rizalar, setRizalar] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | "aydinlatma", string>>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dupAck, setDupAck] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    if (k === "telefon") setDupAck(false);
    setF((s) => ({ ...s, [k]: v }));
  };

  const duplicates = useMemo(() => findDuplicatesByPhone(persons.data, f.telefon, person?.id), [persons.data, f.telefon, person?.id]);

  function validate() {
    const e: typeof errors = {};
    if (!f.ad_soyad.trim()) e.ad_soyad = "Ad soyad zorunlu.";
    if (!f.tipler.length) e.tipler = "En az bir kişi tipi seçin.";
    if (f.telefon && f.telefon.replace(/\D/g, "").length < 10) e.telefon = "Telefon numarası eksik görünüyor.";
    if (f.eposta && !/^\S+@\S+\.\S+$/.test(f.eposta)) e.eposta = "Geçerli bir e-posta girin.";
    if (!f.telefon.trim() && !f.eposta.trim()) e.telefon = "Telefon veya e-postadan en az biri gerekli.";
    if (!f.sonraki_adim.trim()) e.sonraki_adim = "Hiçbir müşteri soğumaz: sonraki adımı yazın.";
    if (!fromLocalInput(f.sonraki_adim_tarihi)) e.sonraki_adim_tarihi = "Sonraki adım için tarih seçin.";
    if (!person && !aydinlatma) e.aydinlatma = "Kişisel veri kaydı için aydınlatma yapılmalı (KVKK md. 10).";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setSaveError(null);
    if (!validate()) return;
    if (duplicates.length && !dupAck) {
      setDupAck(true);
      toast("Bu telefonla kayıtlı kişi var. Yine de kaydetmek için tekrar basın.");
      return;
    }
    setSaving(true);
    const body: Partial<Person> = {
      ad_soyad: f.ad_soyad.trim(),
      telefon: f.telefon.trim() || null,
      eposta: f.eposta.trim() || null,
      tipler: f.tipler,
      kaynak: f.kaynak.trim() || null,
      sonraki_adim: f.sonraki_adim.trim(),
      sonraki_adim_tarihi: fromLocalInput(f.sonraki_adim_tarihi),
    };
    try {
      if (person) {
        await store.update("person", person.id, body);
        toast("Müşteri güncellendi");
        router.push(`/musteriler/${person.id}`);
      } else {
        const created = await store.insert("person", { ...body, office_id: officeId, owner_id: userId });
        const amaclar: ConsentPurpose[] = ["aydinlatma", ...OPSIYONEL_RIZALAR.filter((a) => rizalar[a])];
        for (const amac of amaclar) {
          await store.insert("consent", {
            person_id: created.id,
            amac,
            kanal: amac === "ticari_ileti" ? "whatsapp" : null,
            verildi: true,
            kaynak: rizaKaynak,
          });
        }
        toast("Müşteri eklendi");
        router.push(`/musteriler/${created.id}`);
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Kaydedilemedi");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={person ? "Müşteriyi düzenle" : "Yeni müşteri"}
        subtitle={person ? person.ad_soyad : "Kişi bilgileri, sonraki adım ve KVKK rızaları"}
        back={person ? `/musteriler/${person.id}` : "/musteriler"}
      />
      <form onSubmit={submit} noValidate className="space-y-4">
        <Card title="Kişi">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Ad soyad" required>
                <Input value={f.ad_soyad} onChange={(e) => set("ad_soyad", e.target.value)} autoComplete="name" aria-invalid={!!errors.ad_soyad} />
              </Field>
              <FieldError msg={errors.ad_soyad} />
            </div>
            <div>
              <Field label="Telefon">
                <Input type="tel" inputMode="tel" value={f.telefon} onChange={(e) => set("telefon", e.target.value)} placeholder="0532 000 00 00" autoComplete="tel" aria-invalid={!!errors.telefon} />
              </Field>
              <FieldError msg={errors.telefon} />
            </div>
            <div>
              <Field label="E-posta">
                <Input type="email" value={f.eposta} onChange={(e) => set("eposta", e.target.value)} autoComplete="email" aria-invalid={!!errors.eposta} />
              </Field>
              <FieldError msg={errors.eposta} />
            </div>
            {duplicates.length > 0 && (
              <div className="rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm sm:col-span-2" role="alert">
                <p className="font-medium text-warn">Bu telefon numarasıyla kayıtlı kişi var — mükerrer kayıt olabilir:</p>
                <ul className="mt-1 space-y-1">
                  {duplicates.map((d) => (
                    <li key={d.id}>
                      <Link href={`/musteriler/${d.id}`} className="text-brand underline">
                        {d.ad_soyad}
                      </Link>{" "}
                      <span className="text-muted">
                        · {d.telefon} · {d.tipler.map((t) => PERSON_TYPES[t]).join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-muted">Mevcut kaydı açıp yeni tipi ona ekleyebilirsiniz.</p>
              </div>
            )}
            <div className="sm:col-span-2">
              <span className="text-sm text-muted">
                Kişi tipi <span className="text-block">*</span>
              </span>
              <div className="mt-1">
                <ChipGroup
                  label="Kişi tipi"
                  options={(Object.keys(PERSON_TYPES) as PersonType[]).map((t) => ({ id: t, label: PERSON_TYPES[t] }))}
                  value={f.tipler}
                  onChange={(v) => set("tipler", v)}
                />
              </div>
              <FieldError msg={errors.tipler} />
            </div>
            <div className="sm:col-span-2">
              <Field label="Kaynak" hint="Müşteri size nereden ulaştı?">
                <Input list="kisi-kaynaklari" value={f.kaynak} onChange={(e) => set("kaynak", e.target.value)} />
              </Field>
              <datalist id="kisi-kaynaklari">
                {KISI_KAYNAKLARI.map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>
            </div>
          </div>
        </Card>

        <Card title="Sonraki adım">
          <p className="mb-3 text-xs text-muted">Hiçbir müşteri soğumaz: her kişinin tarihli bir sonraki adımı olmalı.</p>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div>
              <Field label="Ne yapılacak" required>
                <Input value={f.sonraki_adim} onChange={(e) => set("sonraki_adim", e.target.value)} placeholder="ör. Moda 3+1 gösterimi, tekrar ara" aria-invalid={!!errors.sonraki_adim} />
              </Field>
              <FieldError msg={errors.sonraki_adim} />
            </div>
            <div>
              <Field label="Ne zaman" required>
                <Input type="datetime-local" value={f.sonraki_adim_tarihi} onChange={(e) => set("sonraki_adim_tarihi", e.target.value)} aria-invalid={!!errors.sonraki_adim_tarihi} />
              </Field>
              <FieldError msg={errors.sonraki_adim_tarihi} />
            </div>
          </div>
        </Card>

        {!person && (
          <Card title="KVKK ve İYS">
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-bg p-3">
                <Checkbox
                  label={
                    <span>
                      <b>Aydınlatma metni</b> kişiye iletildi <span className="text-block">*</span>
                    </span>
                  }
                  checked={aydinlatma}
                  onChange={(e) => setAydinlatma(e.target.checked)}
                />
                <FieldError msg={errors.aydinlatma} />
                <div className="mt-2 max-w-xs">
                  <Field label="Rıza/aydınlatma kaynağı">
                    <Select value={rizaKaynak} onChange={(e) => setRizaKaynak(e.target.value)}>
                      {Object.entries(RIZA_KAYNAKLARI)
                        .filter(([k]) => k !== "islak_imza")
                        .map(([k, l]) => (
                          <option key={k} value={k}>
                            {l}
                          </option>
                        ))}
                    </Select>
                  </Field>
                </div>
              </div>
              <p className="text-xs text-muted">Açık rızalar isteğe bağlıdır; verilmezse ilgili işlem (ör. katalog gönderimi) Uyum Motoru tarafından engellenir.</p>
              <div className="flex flex-col">
                {OPSIYONEL_RIZALAR.map((a) => (
                  <Checkbox
                    key={a}
                    label={
                      <span>
                        {RIZA_ETIKET[a].label} <span className="text-xs text-muted">— {RIZA_ETIKET[a].aciklama}</span>
                      </span>
                    }
                    checked={!!rizalar[a]}
                    onChange={(e) => setRizalar((r) => ({ ...r, [a]: e.target.checked }))}
                  />
                ))}
              </div>
            </div>
          </Card>
        )}

        <ErrorNote error={saveError} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={() => router.back()}>Vazgeç</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Kaydediliyor…" : duplicates.length && dupAck ? "Yine de kaydet" : person ? "Kaydet" : "Müşteriyi ekle"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-xs text-block">{msg}</p> : null;
}
