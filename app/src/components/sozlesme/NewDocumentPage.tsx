"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Card, Field, PageHeader, Select, toast } from "@/components/ui";
import { useReadySession, useTable } from "@/data/session";
import { autoValues, getTemplate, listTemplates, pickFor, requiredMissing } from "@/domain/templates";
import { createDocument } from "./actions";
import { DocumentEditor, MissingSummary } from "./DocumentEditor";

/** Şablonda malik alanı varsa imzalayan malik, yoksa seçilen kişidir. */
function signerId(kod: string, personId: string, ownerId: string | null) {
  const t = getTemplate(kod);
  const malikli = t?.alanlar.some((a) => a.startsWith("malik_") || a.startsWith("kiraya_veren_"));
  if (kod === "yetki-sozlesmesi" && ownerId) return ownerId;
  return personId || (malikli ? ownerId : null) || "";
}

export function NewDocumentPage() {
  const s = useReadySession();
  const router = useRouter();
  const params = useSearchParams();
  const templates = listTemplates();
  const [kod, setKod] = useState(() => (params.get("sablon") && getTemplate(params.get("sablon")!) ? params.get("sablon")! : templates[0]!.kod));
  const [portfolioId, setPortfolioId] = useState(params.get("portfoy") ?? "");
  const [personId, setPersonId] = useState(params.get("kisi") ?? "");
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const autoRef = useRef<Record<string, string>>({});

  const portfolios = useTable("portfolio", { order: { column: "created_at", ascending: false } });
  const persons = useTable("person", { order: { column: "ad_soyad", ascending: true } });
  const owners = useTable("portfolio_owner", { eq: { portfolio_id: portfolioId || "__yok__" } });

  const t = getTemplate(kod)!;
  const portfolio = portfolios.data.find((p) => p.id === portfolioId) ?? null;
  const person = persons.data.find((p) => p.id === personId) ?? null;
  const ownerLink = owners.data[0] ?? null;
  const owner = ownerLink ? (persons.data.find((p) => p.id === ownerLink.person_id) ?? null) : null;

  const auto = useMemo(
    () => pickFor(t, autoValues({ kod, office: s.office, member: s.member, portfolio, person, owner, ownerHisse: ownerLink?.hisse })),
    // Belge numarası her render'da değişmesin diye yalnızca seçimler değişince yeniden hesaplanır
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kod, portfolio?.id, person?.id, owner?.id, s.office.id, s.member.user_id, ownerLink?.hisse],
  );

  // Otomatik değerleri uygula: kullanıcının elle değiştirdiği alanlara dokunma
  useEffect(() => {
    const prev = autoRef.current;
    setValues((cur) => {
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(cur)) {
        const wasAuto = prev[k] !== undefined && prev[k] === v;
        if (!wasAuto && v !== "") next[k] = v;
      }
      for (const [k, v] of Object.entries(auto)) if (next[k] === undefined) next[k] = v;
      return next;
    });
    autoRef.current = auto;
  }, [auto]);

  const missing = requiredMissing(t, values);

  const save = async () => {
    setBusy(true);
    try {
      const alanlar: Record<string, string> = {};
      for (const [k, v] of Object.entries(values)) if (v.trim()) alanlar[k] = v.trim();
      const signer = signerId(kod, personId, owner?.id ?? null);
      if (signer) alanlar._kisi_id = signer;
      const doc = await createDocument(s.store, { officeId: s.officeId, userId: s.userId }, t, alanlar, portfolioId || null);
      toast("Belge taslak olarak kaydedildi");
      router.push(`/sozlesmeler/${doc.id}`);
    } catch (e) {
      toast(`Kaydedilemedi: ${(e as Error).message}`);
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Yeni belge" subtitle="Şablonu seçin, kartlardan otomatik doldurun, eksikleri tamamlayın" back="/sozlesmeler" />
      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Şablon" required>
            <Select value={kod} onChange={(e) => setKod(e.target.value)}>
              {templates.map((x) => (
                <option key={x.kod} value={x.kod}>
                  {x.baslik}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Portföy (isteğe bağlı)" hint="Adres, ada/parsel, fiyat ve malik bilgisi dolar">
            <Select value={portfolioId} onChange={(e) => setPortfolioId(e.target.value)}>
              <option value="">— Seçilmedi —</option>
              {portfolios.data
                .filter((p) => p.asama !== "arsiv")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.baslik ?? p.id}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Kişi (isteğe bağlı)" hint="Karşı tarafın ad soyad ve iletişim bilgisi dolar">
            <Select value={personId} onChange={(e) => setPersonId(e.target.value)}>
              <option value="">— Seçilmedi —</option>
              {persons.data.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.ad_soyad}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <Badge tone={t.taslak ? "warn" : "ok"}>{t.durum}</Badge>
          <Badge>Sürüm {t.surum}</Badge>
          <MissingSummary template={t} values={values} />
          {owner && <span className="text-muted">Malik: {owner.ad_soyad}</span>}
        </div>
      </Card>

      <DocumentEditor key={kod} template={t} values={values} onChange={(k, v) => setValues((cur) => ({ ...cur, [k]: v }))} />

      <div className="sticky bottom-16 z-10 mt-4 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-border bg-surface/95 p-3 backdrop-blur md:bottom-2">
        <p className="mr-auto text-xs text-muted">{missing.length ? `İmzaya göndermeden önce ${missing.length} zorunlu alan tamamlanmalı.` : "Tüm zorunlu alanlar dolu."}</p>
        <Button onClick={() => router.push("/sozlesmeler")}>Vazgeç</Button>
        <Button variant="primary" onClick={save} disabled={busy}>
          Taslak olarak kaydet
        </Button>
      </div>
    </div>
  );
}
