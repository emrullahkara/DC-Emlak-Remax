"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createDocument, openForSigning } from "@/components/sozlesme/actions";
import { signingUrl } from "@/domain/signing";
import { autoValues, getTemplate, requiredMissing } from "@/domain/templates";
import { useReadySession } from "@/data/session";
import type { Consent, ConsentPurpose, Person } from "@/data/types";
import { Badge, Button, Card, Select, toast } from "@/components/ui";
import { RIZA_AMACLARI, activeConsent } from "@/domain/crm";
import { buildKvkkMessage } from "@/domain/crm-messages";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { RIZA_ETIKET, RIZA_KAYNAKLARI } from "./common";
import { sendWhatsApp } from "./whatsapp";

export function KvkkPanel({ person, consents }: { person: Person; consents: Consent[] }) {
  const { store, officeId, userId, office, member } = useReadySession();
  const [kaynak, setKaynak] = useState("sozlu");
  const [busy, setBusy] = useState<string | null>(null);
  const [gecmis, setGecmis] = useState(false);
  const router = useRouter();

  async function grant(amac: ConsentPurpose) {
    setBusy(amac);
    try {
      await store.insert("consent", {
        person_id: person.id,
        amac,
        kanal: amac === "ticari_ileti" ? "whatsapp" : null,
        verildi: true,
        kaynak,
      });
      toast(`${RIZA_ETIKET[amac].label}: rıza kaydedildi`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setBusy(null);
    }
  }

  async function revoke(c: Consent) {
    setBusy(c.amac);
    try {
      await store.update("consent", c.id, { geri_alindi_at: new Date().toISOString() });
      toast(`${RIZA_ETIKET[c.amac].label}: rıza geri alındı`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Güncellenemedi");
    } finally {
      setBusy(null);
    }
  }

  /**
   * Açık rıza formunu kişiye özel doldurur, tek kullanımlık imza bağlantısı
   * üretir ve WhatsApp ile gönderir. Müşteri giriş yapmadan /imza/<token>
   * sayfasında okuyup onaylar. Zorunlu alan eksikse belge düzenleyicisi açılır.
   */
  async function sendLink() {
    if (!person.telefon) return toast("Kişinin telefonu yok");
    const t = getTemplate("acik-riza-formu");
    if (!t) return toast("Açık rıza formu şablonu bulunamadı");
    setBusy("link");
    try {
      const alanlar: Record<string, string> = {
        ...autoValues({ office, member, person }),
        aydinlatma_metni_surumu: t.surum,
        imza_yontemi: "Uzaktan bağlantı ile elektronik onay",
        _kisi_id: person.id,
      };
      if (requiredMissing(t, alanlar).length) {
        router.push(`/sozlesmeler/yeni?sablon=acik-riza-formu&kisi=${encodeURIComponent(person.id)}`);
        return;
      }
      const doc = await openForSigning(store, await createDocument(store, { officeId, userId }, t, alanlar, null));
      const link = signingUrl(window.location.origin, doc.imza_token!);
      const text = buildKvkkMessage({ kisiAdi: person.ad_soyad, ofisUnvani: office.unvan, link, danismanAdi: member.ad_soyad });
      const url = await sendWhatsApp(person.telefon, text);
      if (!url) return toast("WhatsApp bağlantısı oluşturulamadı");
      await store.insert("activity", {
        office_id: officeId,
        user_id: userId,
        person_id: person.id,
        tur: "mesaj",
        icerik: "KVKK aydınlatma metni ve açık rıza formu imza bağlantısı WhatsApp ile gönderildi",
      });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Bağlantı oluşturulamadı");
    } finally {
      setBusy(null);
    }
  }

  const sorted = [...consents].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return (
    <Card
      title="KVKK ve rızalar"
      actions={
        <Button size="sm" onClick={sendLink} disabled={!person.telefon || busy === "link"}>
          Rıza linki gönder
        </Button>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor="riza-kaynak" className="text-muted">
          Yeni rıza kaynağı
        </label>
        <Select id="riza-kaynak" value={kaynak} onChange={(e) => setKaynak(e.target.value)} className="w-auto min-w-36">
          {Object.entries(RIZA_KAYNAKLARI).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </Select>
      </div>
      <ul className="divide-y divide-border">
        {RIZA_AMACLARI.map((amac) => {
          const c = activeConsent(consents, amac);
          return (
            <li key={amac} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">{RIZA_ETIKET[amac].label}</p>
                <p className="text-xs text-muted">
                  {c ? `${fmtDate(c.created_at)} · ${RIZA_KAYNAKLARI[c.kaynak] ?? c.kaynak}` : RIZA_ETIKET[amac].aciklama}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {c ? <Badge tone="ok">Verildi</Badge> : <Badge tone={amac === "aydinlatma" || amac === "ticari_ileti" ? "warn" : "neutral"}>Yok</Badge>}
                {c ? (
                  <Button size="sm" variant="ghost" onClick={() => revoke(c)} disabled={busy === amac}>
                    Geri al
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => grant(amac)} disabled={busy === amac}>
                    Kaydet
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {sorted.length > 0 && (
        <div className="mt-2">
          <button type="button" className="text-xs text-brand underline" onClick={() => setGecmis((g) => !g)} aria-expanded={gecmis}>
            {gecmis ? "Geçmişi gizle" : `Rıza geçmişi (${sorted.length})`}
          </button>
          {gecmis && (
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {sorted.map((c) => (
                <li key={c.id}>
                  {fmtDateTime(c.created_at)} · {RIZA_ETIKET[c.amac]?.label ?? c.amac} · {c.verildi ? "verildi" : "reddedildi"} ({RIZA_KAYNAKLARI[c.kaynak] ?? c.kaynak})
                  {c.geri_alindi_at && <> · geri alındı {fmtDateTime(c.geri_alindi_at)}</>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p className="mt-3 text-xs text-muted">Rıza yoksa katalog/pazarlama mesajı Uyum Motoru tarafından engellenir. Geri alma kaydı silinmez, denetim için saklanır.</p>
    </Card>
  );
}
