"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button, ButtonLink, Card, Checkbox, cx, EmptyState, ErrorNote, Field, Input, PageHeader, Select, Spinner, Textarea, toast } from "@/components/ui";
import { useReadySession, useRow, useTable } from "@/data/session";
import type { Person, Portfolio, PortfolioOwner } from "@/data/types";
import { ISINMA_TURLERI, PAYLASIM_LABEL, portfolioName, TAPU_TURLERI } from "@/domain/portfoy";
import { EMPTY_FORM, formFromPortfolio, parsePortfolioForm, priceChange, validHisse, type PortfolioFormValues } from "@/domain/portfoy-form";
import { normalizePhone } from "@/domain/import";
import { EMLAK_TIPLERI, ILAN_TIPLERI, norm, OZELLIKLER } from "@/lib/format";
import { refreshHealth } from "./health";

interface OwnerDraft {
  key: string;
  person_id?: string;
  yeni?: { ad_soyad: string; telefon: string; eposta: string };
  hisse: string;
  vekil: boolean;
}

let draftSeq = 0;
const nextKey = () => `d${++draftSeq}`;

export function PortfolioForm({ id }: { id?: string }) {
  const { store, officeId, userId } = useReadySession();
  const router = useRouter();
  const existing = useRow("portfolio", id);
  const ownerRows = useTable("portfolio_owner", { eq: { portfolio_id: id ?? "__yok__" } }, Boolean(id));
  const persons = useTable("person", { eq: { office_id: officeId }, order: { column: "ad_soyad", ascending: true } });
  const allPortfolios = useTable("portfolio", { eq: { office_id: officeId } });

  const [v, setV] = useState<PortfolioFormValues>(EMPTY_FORM);
  const [owners, setOwners] = useState<OwnerDraft[]>([]);
  const [loaded, setLoaded] = useState(!id);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Düzenlemede mevcut değerleri bir kez yükle
  useEffect(() => {
    if (!id || loaded || existing.loading || ownerRows.loading) return;
    if (existing.data) {
      setV(formFromPortfolio(existing.data));
      setOwners(ownerRows.data.map((o) => ({ key: nextKey(), person_id: o.person_id, hisse: o.hisse ?? "", vekil: o.vekil })));
    }
    setLoaded(true);
  }, [id, loaded, existing.loading, existing.data, ownerRows.loading, ownerRows.data]);

  const set = <K extends keyof PortfolioFormValues>(k: K, val: PortfolioFormValues[K]) => {
    setV((s) => ({ ...s, [k]: val }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  const ilceler = useMemo(() => [...new Set(allPortfolios.data.map((p) => p.ilce).filter(Boolean))] as string[], [allPortfolios.data]);
  const mahalleler = useMemo(
    () => [...new Set(allPortfolios.data.filter((p) => !v.ilce || p.ilce === v.ilce).map((p) => p.mahalle).filter(Boolean))] as string[],
    [allPortfolios.data, v.ilce],
  );

  if (id && (existing.loading || !loaded)) return <Spinner />;
  if (id && !existing.data) {
    return <EmptyState title="Portföy bulunamadı" action={<ButtonLink href="/portfoyler">Portföylere dön</ButtonLink>} />;
  }

  const ownerErrors = (): string | null => {
    for (const o of owners) {
      if (!o.person_id && !o.yeni) return "Malik satırlarından birinde kişi seçilmedi";
      if (o.yeni) {
        if (o.yeni.ad_soyad.trim().length < 3) return "Yeni malik için ad soyad girin";
        const tel = normalizePhone(o.yeni.telefon);
        if (tel && !tel.ok) return `Yeni malik telefonu: ${tel.error}`;
        if (o.yeni.eposta && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(o.yeni.eposta.trim())) return "Yeni malik e-postası geçersiz";
      }
      if (!validHisse(o.hisse)) return `Hisse biçimi geçersiz: “${o.hisse}” (ör. 1/2 veya %50)`;
    }
    const ids = owners.map((o) => o.person_id).filter(Boolean);
    if (new Set(ids).size !== ids.length) return "Aynı kişi birden fazla kez malik olarak eklenmiş";
    return null;
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    const r = parsePortfolioForm(v);
    const oe = ownerErrors();
    if (!r.ok || oe) {
      setErrors(r.ok ? {} : r.errors);
      setSaveError(oe ?? `Formda ${Object.keys(r.ok ? {} : r.errors).length} hata var; işaretli alanları düzeltin.`);
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    setSaving(true);
    try {
      let p: Portfolio;
      if (id && existing.data) {
        p = await store.update("portfolio", id, r.data);
        const yeniFiyat = priceChange(existing.data.fiyat, r.data.fiyat);
        if (yeniFiyat !== null) await store.insert("portfolio_price_history", { portfolio_id: id, fiyat: yeniFiyat });
      } else {
        p = await store.insert("portfolio", {
          ...r.data,
          office_id: officeId,
          owner_id: userId,
          asama: "aday",
          para_birimi: "TRY",
          eids_durum: "yok",
        });
        if (r.data.fiyat) await store.insert("portfolio_price_history", { portfolio_id: p.id, fiyat: r.data.fiyat });
      }
      await saveOwners(p.id);
      await refreshHealth(store, p);
      toast(id ? "Portföy güncellendi" : "Portföy oluşturuldu");
      router.push(`/portfoyler/${p.id}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Kaydedilemedi");
      setSaving(false);
    }
  }

  async function saveOwners(portfolioId: string) {
    const before = new Map<string, PortfolioOwner>(ownerRows.data.map((o) => [o.person_id, o]));
    const keep = new Set<string>();
    for (const o of owners) {
      let personId = o.person_id;
      if (!personId && o.yeni) {
        const tel = normalizePhone(o.yeni.telefon);
        const person = await store.insert("person", {
          office_id: officeId,
          owner_id: userId,
          ad_soyad: o.yeni.ad_soyad.trim(),
          telefon: tel && tel.ok ? tel.value : null,
          eposta: o.yeni.eposta.trim() || null,
          tipler: ["satici"],
          kaynak: "Portföy kaydı",
        });
        personId = person.id;
      } else if (personId) {
        // Mevcut kişiye "satıcı" tipi ekle (yetki yoksa atla)
        const person = persons.data.find((x) => x.id === personId);
        if (person && !person.tipler.includes("satici")) {
          await store.update("person", person.id, { tipler: [...person.tipler, "satici"] }).catch(() => undefined);
        }
      }
      if (!personId) continue;
      keep.add(personId);
      const prev = before.get(personId);
      const row = { hisse: o.hisse.trim() || null, vekil: o.vekil };
      if (!prev) await store.insert("portfolio_owner", { portfolio_id: portfolioId, person_id: personId, ...row });
      else if (prev.hisse !== row.hisse || prev.vekil !== row.vekil) await store.update("portfolio_owner", `${portfolioId}|${personId}`, row);
    }
    for (const pid of before.keys()) if (!keep.has(pid)) await store.remove("portfolio_owner", `${portfolioId}|${pid}`);
  }

  const err = (k: keyof PortfolioFormValues) => errors[k] || undefined;
  const title = id && existing.data ? `Düzenle: ${portfolioName(existing.data)}` : "Yeni portföy";

  return (
    <form onSubmit={save} noValidate>
      <PageHeader title={title} subtitle={id ? "Tüm alanlar portföy kartına işlenir" : "Yeni portföy “Aday” aşamasında başlar"} back={id ? `/portfoyler/${id}` : "/portfoyler"} />
      <div className="space-y-4">
        <Card title="Genel">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <F label="İlan tipi" required error={err("ilan_tipi")}>
              <Select value={v.ilan_tipi} onChange={(e) => set("ilan_tipi", e.target.value as PortfolioFormValues["ilan_tipi"])}>
                {Object.entries(ILAN_TIPLERI).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </F>
            <F label="Emlak tipi" required error={err("emlak_tipi")}>
              <Select value={v.emlak_tipi} onChange={(e) => set("emlak_tipi", e.target.value)}>
                {Object.entries(EMLAK_TIPLERI).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </F>
            <F label={v.ilan_tipi === "kiralik" ? "Aylık kira (TL)" : "Fiyat (TL)"} error={err("fiyat")}>
              <Num value={v.fiyat} onChange={(x) => set("fiyat", x)} invalid={!!err("fiyat")} placeholder="12.500.000" />
            </F>
            <F label="Paylaşım" error={err("paylasim_seviyesi")}>
              <Select value={v.paylasim_seviyesi} onChange={(e) => set("paylasim_seviyesi", e.target.value as PortfolioFormValues["paylasim_seviyesi"])}>
                {Object.entries(PAYLASIM_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </F>
            <div className="sm:col-span-2 lg:col-span-4">
              <F label="Başlık" required error={err("baslik")} hint={`${v.baslik.length}/120`}>
                <Input value={v.baslik} maxLength={120} onChange={(e) => set("baslik", e.target.value)} aria-invalid={!!err("baslik")} placeholder="Moda 3+1, deniz manzaralı" />
              </F>
            </div>
            <F label="Oda" error={err("oda")}>
              <Num value={v.oda} onChange={(x) => set("oda", x)} invalid={!!err("oda")} placeholder="3" />
            </F>
            <F label="Salon" error={err("salon")}>
              <Num value={v.salon} onChange={(x) => set("salon", x)} invalid={!!err("salon")} placeholder="1" />
            </F>
            <F label="Brüt m²" error={err("brut_m2")}>
              <Num value={v.brut_m2} onChange={(x) => set("brut_m2", x)} invalid={!!err("brut_m2")} />
            </F>
            <F label="Net m²" error={err("net_m2")}>
              <Num value={v.net_m2} onChange={(x) => set("net_m2", x)} invalid={!!err("net_m2")} />
            </F>
            <F label="Bulunduğu kat" error={err("kat")} hint="Bahçe/zemin 0, bodrum −1">
              <Num value={v.kat} onChange={(x) => set("kat", x)} invalid={!!err("kat")} />
            </F>
            <F label="Toplam kat" error={err("toplam_kat")}>
              <Num value={v.toplam_kat} onChange={(x) => set("toplam_kat", x)} invalid={!!err("toplam_kat")} />
            </F>
            <F label="Bina yaşı" error={err("bina_yasi")}>
              <Num value={v.bina_yasi} onChange={(x) => set("bina_yasi", x)} invalid={!!err("bina_yasi")} />
            </F>
            <F label="Aidat (TL/ay)" error={err("aidat")}>
              <Num value={v.aidat} onChange={(x) => set("aidat", x)} invalid={!!err("aidat")} />
            </F>
            <F label="Isınma" error={err("isinma")}>
              <Select value={v.isinma} onChange={(e) => set("isinma", e.target.value)}>
                <option value="">Seçin</option>
                {[...new Set([...ISINMA_TURLERI, ...(v.isinma ? [v.isinma] : [])])].map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </Select>
            </F>
            <div className="sm:col-span-2 lg:col-span-4">
              <F label="Açıklama" error={err("aciklama")} hint={`${v.aciklama.length} karakter · 400+ önerilir (konum, ulaşım, öne çıkanlar)`}>
                <Textarea rows={5} value={v.aciklama} onChange={(e) => set("aciklama", e.target.value)} aria-invalid={!!err("aciklama")} />
              </F>
            </div>
          </div>
        </Card>

        <Card title="Konum">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <F label="İl" error={err("il")}>
              <Input value={v.il} onChange={(e) => set("il", e.target.value)} />
            </F>
            <F label="İlçe" required error={err("ilce")}>
              <Input value={v.ilce} list="pf-ilceler" onChange={(e) => set("ilce", e.target.value)} aria-invalid={!!err("ilce")} />
              <datalist id="pf-ilceler">
                {ilceler.map((x) => (
                  <option key={x} value={x} />
                ))}
              </datalist>
            </F>
            <F label="Mahalle" error={err("mahalle")}>
              <Input value={v.mahalle} list="pf-mahalleler" onChange={(e) => set("mahalle", e.target.value)} />
              <datalist id="pf-mahalleler">
                {mahalleler.map((x) => (
                  <option key={x} value={x} />
                ))}
              </datalist>
            </F>
            <div className="sm:col-span-3">
              <F label="Açık adres" error={err("adres")} hint="Paylaşımlı portföylerde ilanda gösterilmez">
                <Input value={v.adres} onChange={(e) => set("adres", e.target.value)} />
              </F>
            </div>
            <F label="Enlem" error={err("lat")}>
              <Num value={v.lat} onChange={(x) => set("lat", x)} invalid={!!err("lat")} placeholder="40,9847" />
            </F>
            <F label="Boylam" error={err("lng")}>
              <Num value={v.lng} onChange={(x) => set("lng", x)} invalid={!!err("lng")} placeholder="29,0275" />
            </F>
            <div className="flex items-end">
              <Button
                size="sm"
                onClick={() =>
                  navigator.geolocation?.getCurrentPosition(
                    (pos) => {
                      set("lat", pos.coords.latitude.toFixed(6));
                      set("lng", pos.coords.longitude.toFixed(6));
                    },
                    () => toast("Konum alınamadı"),
                  )
                }
              >
                ⌖ Bulunduğum konumu kullan
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Tapu & Hukuk">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <F label="Ada" error={err("ada")}>
              <Input value={v.ada} onChange={(e) => set("ada", e.target.value)} />
            </F>
            <F label="Parsel" error={err("parsel")}>
              <Input value={v.parsel} onChange={(e) => set("parsel", e.target.value)} />
            </F>
            <F label="Bağımsız bölüm" error={err("bagimsiz_bolum")}>
              <Input value={v.bagimsiz_bolum} onChange={(e) => set("bagimsiz_bolum", e.target.value)} />
            </F>
            <F label="Tapu türü" error={err("tapu_turu")}>
              <Select value={v.tapu_turu} onChange={(e) => set("tapu_turu", e.target.value)}>
                <option value="">Seçin</option>
                {Object.entries(TAPU_TURLERI).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </F>
            <F label="İskân" error={err("iskan_var")}>
              <TriSelect value={v.iskan_var} onChange={(x) => set("iskan_var", x)} />
            </F>
            <F label="Krediye uygun" error={err("krediye_uygun")}>
              <TriSelect value={v.krediye_uygun} onChange={(x) => set("krediye_uygun", x)} />
            </F>
            <F label="Takyidat sorgu tarihi" error={err("sorgu_tarihi")}>
              <Input type="date" value={v.sorgu_tarihi} onChange={(e) => set("sorgu_tarihi", e.target.value)} aria-invalid={!!err("sorgu_tarihi")} />
            </F>
            <div className="flex flex-wrap items-end gap-x-4">
              <Checkbox label="İpotek var" checked={v.ipotek} onChange={(e) => set("ipotek", e.target.checked)} />
              <Checkbox label="Haciz var" checked={v.haciz} onChange={(e) => set("haciz", e.target.checked)} />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <F label="Şerh / beyan notları" error={err("serh")}>
                <Input value={v.serh} onChange={(e) => set("serh", e.target.value)} placeholder="Ör. kira şerhi, intifa hakkı…" />
              </F>
            </div>
            <div className="sm:col-span-2">
              <F label="İmar durumu" error={err("imar_durum")}>
                <Input value={v.imar_durum} onChange={(e) => set("imar_durum", e.target.value)} placeholder="Konut alanı" />
              </F>
            </div>
            <F label="TAKS" error={err("taks")}>
              <Num value={v.taks} onChange={(x) => set("taks", x)} invalid={!!err("taks")} placeholder="0,35" />
            </F>
            <F label="KAKS (emsal)" error={err("kaks")}>
              <Num value={v.kaks} onChange={(x) => set("kaks", x)} invalid={!!err("kaks")} placeholder="1,5" />
            </F>
          </div>
        </Card>

        <Card title="Özellikler">
          <div className="flex flex-wrap gap-2">
            {Object.entries(OZELLIKLER).map(([k, l]) => {
              const on = v.ozellikler.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set("ozellikler", on ? v.ozellikler.filter((x) => x !== k) : [...v.ozellikler, k])}
                  className={cx("min-h-9 rounded-full border px-3 text-sm", on ? "border-brand bg-brand/10 font-medium text-brand" : "border-border hover:bg-bg")}
                >
                  {on ? "✓ " : ""}
                  {l}
                </button>
              );
            })}
          </div>
        </Card>

        <OwnersEditor owners={owners} setOwners={setOwners} persons={persons.data} />

        <ErrorNote error={saveError} />
        <div className="sticky bottom-20 z-10 flex justify-end gap-2 rounded-xl border border-border bg-surface/95 p-3 backdrop-blur md:bottom-4">
          <ButtonLink href={id ? `/portfoyler/${id}` : "/portfoyler"}>Vazgeç</ButtonLink>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Kaydediliyor…" : id ? "Değişiklikleri kaydet" : "Portföyü oluştur"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function F({ label, error, hint, required, children }: { label: string; error?: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Field label={label} hint={error ? undefined : hint} required={required}>
        {children}
      </Field>
      {error && (
        <p className="mt-1 text-xs text-block" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function Num({ value, onChange, invalid, placeholder }: { value: string; onChange: (v: string) => void; invalid?: boolean; placeholder?: string }) {
  return <Input type="text" inputMode="decimal" autoComplete="off" value={value} placeholder={placeholder} aria-invalid={invalid} onChange={(e) => onChange(e.target.value)} />;
}

function TriSelect({ value, onChange }: { value: "" | "evet" | "hayir"; onChange: (v: "" | "evet" | "hayir") => void }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value as "" | "evet" | "hayir")}>
      <option value="">Bilinmiyor</option>
      <option value="evet">Evet</option>
      <option value="hayir">Hayır</option>
    </Select>
  );
}

function OwnersEditor({ owners, setOwners, persons }: { owners: OwnerDraft[]; setOwners: (f: (o: OwnerDraft[]) => OwnerDraft[]) => void; persons: Person[] }) {
  const [q, setQ] = useState("");
  const update = (key: string, patch: Partial<OwnerDraft>) => setOwners((os) => os.map((o) => (o.key === key ? { ...o, ...patch } : o)));
  const candidates = useMemo(() => {
    const chosen = new Set(owners.map((o) => o.person_id).filter(Boolean));
    const nq = norm(q.trim());
    return persons
      .filter((p) => !chosen.has(p.id))
      .filter((p) => !nq || norm(`${p.ad_soyad} ${p.telefon ?? ""}`).includes(nq))
      .sort((a, b) => Number(b.tipler.includes("satici")) - Number(a.tipler.includes("satici")))
      .slice(0, 30);
  }, [persons, q, owners]);
  const [pick, setPick] = useState("");

  return (
    <Card title="Malikler" actions={<span className="text-xs text-muted">{owners.length} malik</span>}>
      <div className="space-y-3">
        {owners.length === 0 && <p className="text-sm text-muted">Malik eklenmedi. EİDS yönlendirmesi ve mal sahibi raporu için en az bir malik ekleyin.</p>}
        {owners.map((o) => {
          const p = o.person_id ? persons.find((x) => x.id === o.person_id) : null;
          return (
            <div key={o.key} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  {p ? (
                    <>
                      <p className="font-medium">{p.ad_soyad}</p>
                      <p className="text-xs text-muted">{p.telefon ?? p.eposta ?? "İletişim yok"}</p>
                    </>
                  ) : o.yeni ? (
                    <p className="text-sm font-medium">Yeni kişi (Satıcı olarak kaydedilir)</p>
                  ) : (
                    <p className="text-sm text-muted">Kişi bulunamadı (erişim yok)</p>
                  )}
                </div>
                <Button size="sm" variant="ghost" onClick={() => setOwners((os) => os.filter((x) => x.key !== o.key))} aria-label="Maliki kaldır">
                  ✕ Kaldır
                </Button>
              </div>
              {o.yeni && (
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Field label="Ad soyad" required>
                    <Input value={o.yeni.ad_soyad} onChange={(e) => update(o.key, { yeni: { ...o.yeni!, ad_soyad: e.target.value } })} />
                  </Field>
                  <Field label="Telefon">
                    <Input type="tel" inputMode="tel" value={o.yeni.telefon} onChange={(e) => update(o.key, { yeni: { ...o.yeni!, telefon: e.target.value } })} placeholder="0532 000 00 00" />
                  </Field>
                  <Field label="E-posta">
                    <Input type="email" value={o.yeni.eposta} onChange={(e) => update(o.key, { yeni: { ...o.yeni!, eposta: e.target.value } })} />
                  </Field>
                </div>
              )}
              <div className="mt-2 grid grid-cols-2 gap-2 sm:max-w-md">
                <Field label="Hisse" hint="1/2 veya %50">
                  <Input value={o.hisse} onChange={(e) => update(o.key, { hisse: e.target.value })} placeholder="1/1" />
                </Field>
                <div className="flex items-end">
                  <Checkbox label="Vekil aracılığıyla" checked={o.vekil} onChange={(e) => update(o.key, { vekil: e.target.checked })} />
                </div>
              </div>
            </div>
          );
        })}

        <div className="grid grid-cols-1 gap-2 rounded-lg bg-bg p-3 sm:grid-cols-[1fr_1fr_auto]">
          <Input type="search" placeholder="Kişi ara (ad, telefon)" aria-label="Malik ara" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select aria-label="Kayıtlı kişi seç" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">{candidates.length ? "Kayıtlı kişi seçin…" : "Eşleşen kişi yok"}</option>
            {candidates.map((p) => (
              <option key={p.id} value={p.id}>
                {p.ad_soyad}
                {p.telefon ? ` · ${p.telefon}` : ""}
              </option>
            ))}
          </Select>
          <Button
            disabled={!pick}
            onClick={() => {
              setOwners((os) => [...os, { key: nextKey(), person_id: pick, hisse: os.length ? "" : "1/1", vekil: false }]);
              setPick("");
              setQ("");
            }}
          >
            + Ekle
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button size="sm" onClick={() => setOwners((os) => [...os, { key: nextKey(), yeni: { ad_soyad: q.trim(), telefon: "", eposta: "" }, hisse: os.length ? "" : "1/1", vekil: false }])}>
            + Yeni kişi olarak ekle
          </Button>
          <p className="text-xs text-muted">Malik iletişim bilgileri KVKK aydınlatması ile işlenir; rıza kaydını Müşteriler modülünden alın.</p>
        </div>
      </div>
    </Card>
  );
}
