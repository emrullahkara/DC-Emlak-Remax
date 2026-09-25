"use client";

import { useState } from "react";
import { validateOffice, yetkiBelgesiDurumu, type FormErrors } from "@/app/kurulum/validation";
import { Badge, Button, Card, ErrorNote, Field, Input, toast } from "@/components/ui";
import { useReadySession } from "@/data/session";
import type { Office } from "@/data/types";

type Form = {
  unvan: string;
  vergi_no: string;
  mersis_no: string;
  yetki_belgesi_no: string;
  yetki_belgesi_gecerlilik: string;
  varsayilan_ofis_payi: string;
};

const fromOffice = (o: Office): Form => ({
  unvan: o.unvan ?? "",
  vergi_no: o.vergi_no ?? "",
  mersis_no: o.mersis_no ?? "",
  yetki_belgesi_no: o.yetki_belgesi_no ?? "",
  yetki_belgesi_gecerlilik: o.yetki_belgesi_gecerlilik ?? "",
  varsayilan_ofis_payi: String(o.varsayilan_ofis_payi ?? 50),
});

function Err({ msg }: { msg?: string }) {
  return msg ? <span className="mt-1 block text-xs text-block">{msg}</span> : null;
}

export function OfisTab() {
  const { office, member, store, refresh } = useReadySession();
  const broker = member.rol === "broker";
  const [f, setF] = useState<Form>(() => fromOffice(office));
  const [errors, setErrors] = useState<FormErrors<Form>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const durum = yetkiBelgesiDurumu(office.yetki_belgesi_gecerlilik);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  const save = async () => {
    const v: FormErrors<Form> = validateOffice(f);
    const pay = Number(f.varsayilan_ofis_payi.replace(",", "."));
    if (!Number.isFinite(pay) || pay < 0 || pay > 100) v.varsayilan_ofis_payi = "0 ile 100 arasında bir oran girin.";
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    setError(null);
    try {
      await store.update("office", office.id, {
        unvan: f.unvan.trim(),
        vergi_no: f.vergi_no.replace(/\D/g, "") || null,
        mersis_no: f.mersis_no.replace(/\D/g, "") || null,
        yetki_belgesi_no: f.yetki_belgesi_no.trim() || null,
        yetki_belgesi_gecerlilik: f.yetki_belgesi_gecerlilik || null,
        varsayilan_ofis_payi: pay,
      });
      await refresh();
      toast("Ofis bilgileri kaydedildi");
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      {!broker && <p className="rounded-lg border border-info/30 bg-info/10 p-3 text-sm text-info">Ofis bilgilerini yalnızca broker değiştirebilir.</p>}
      <Card title="Ofis & vergi bilgileri">
        <fieldset disabled={!broker || busy} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Ofis unvanı" required>
              <Input value={f.unvan} onChange={set("unvan")} />
            </Field>
            <Err msg={errors.unvan} />
          </div>
          <div>
            <Field label="Vergi kimlik no / TCKN">
              <Input value={f.vergi_no} onChange={set("vergi_no")} inputMode="numeric" maxLength={11} />
            </Field>
            <Err msg={errors.vergi_no} />
          </div>
          <div>
            <Field label="MERSİS no">
              <Input value={f.mersis_no} onChange={set("mersis_no")} inputMode="numeric" maxLength={16} />
            </Field>
            <Err msg={errors.mersis_no} />
          </div>
        </fieldset>
      </Card>

      <Card title="Taşınmaz ticareti yetki belgesi" actions={<Badge tone={durum.ton}>{durum.metin}</Badge>}>
        <fieldset disabled={!broker || busy} className="grid gap-4 sm:grid-cols-2">
          <div>
            <Field label="Belge no">
              <Input value={f.yetki_belgesi_no} onChange={set("yetki_belgesi_no")} />
            </Field>
            <Err msg={errors.yetki_belgesi_no} />
          </div>
          <div>
            <Field label="Geçerlilik tarihi">
              <Input type="date" value={f.yetki_belgesi_gecerlilik} onChange={set("yetki_belgesi_gecerlilik")} />
            </Field>
            <Err msg={errors.yetki_belgesi_gecerlilik} />
          </div>
        </fieldset>
        <p className="mt-3 text-xs text-muted">Uyum Motoru, geçerli yetki belgesi olmadan ilan yayınını engeller; bitişe 30 gün kala Kokpit&apos;te uyarı verir.</p>
      </Card>

      <Card title="Komisyon paylaşımı">
        <fieldset disabled={!broker || busy} className="max-w-xs">
          <Field label="Varsayılan ofis payı (%)" hint="Hizmet bedelinin (KDV hariç) ofise kalan kısmı; kalanı danışmana. İşlem bazında değiştirilebilir.">
            <Input type="number" inputMode="decimal" min={0} max={100} step={1} value={f.varsayilan_ofis_payi} onChange={set("varsayilan_ofis_payi")} />
          </Field>
          <Err msg={errors.varsayilan_ofis_payi} />
        </fieldset>
      </Card>

      <ErrorNote error={error} />
      {broker && (
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Kaydediliyor…" : "Kaydet"}
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              setF(fromOffice(office));
              setErrors({});
            }}
          >
            Vazgeç
          </Button>
        </div>
      )}
    </form>
  );
}
