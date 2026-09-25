"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PlanCards } from "@/components/ayarlar/PlanCards";
import { Button, ButtonLink, Card, ErrorNote, Field, Input, Spinner, Tabs } from "@/components/ui";
import { useSession } from "@/data/session";
import { normalizeInviteCode, rpcErrorMessage, validateOffice, type FormErrors, type OfficeForm } from "./validation";

const EMPTY: OfficeForm = {
  unvan: "",
  vergi_no: "",
  mersis_no: "",
  yetki_belgesi_no: "",
  yetki_belgesi_gecerlilik: "",
  ad_soyad: "",
  telefon: "",
  plan: "profesyonel",
};

function Err({ msg }: { msg?: string }) {
  return msg ? <span className="mt-1 block text-xs text-block">{msg}</span> : null;
}

export function Kurulum() {
  const router = useRouter();
  const params = useSearchParams();
  const davet = params.get("davet") ?? "";
  const { status, mode, supabase, refresh, user } = useSession();
  const [tab, setTab] = useState<"yeni" | "davet">(davet ? "davet" : "yeni");

  useEffect(() => {
    if (mode !== "supabase") return;
    if (status === "anon") router.replace(`/giris?next=${encodeURIComponent(`/kurulum${davet ? `?davet=${encodeURIComponent(davet)}` : ""}`)}`);
    if (status === "ready") router.replace("/");
  }, [mode, status, davet, router]);

  if (mode === "demo") {
    return (
      <Card title="Demo modu">
        <p className="text-sm">
          Ofis kurulumu, uygulama Supabase&apos;e bağlandığında yapılır. Şu an örnek &quot;DC Emlak Kadıköy&quot; ofisiyle demo modundasınız.
        </p>
        <div className="mt-4">
          <ButtonLink href="/" variant="primary">
            Demo ofise git
          </ButtonLink>
        </div>
      </Card>
    );
  }
  if (status !== "no_office") return <Spinner />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        <b className="break-all text-text">{user?.email}</b> olarak giriş yaptınız. Yeni bir ofis kurun ya da ofis yöneticinizden aldığınız davet koduyla katılın.
      </p>
      <Tabs
        tabs={[
          { id: "yeni", label: "Yeni ofis kur" },
          { id: "davet", label: "Davet koduyla katıl" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "yeni" ? (
        <NewOffice
          onDone={async () => {
            await refresh();
            router.replace("/");
          }}
          rpc={supabase ? (fn, args) => supabase.rpc(fn, args) : null}
        />
      ) : (
        <JoinOffice
          initialCode={davet}
          onDone={async () => {
            await refresh();
            router.replace("/");
          }}
          rpc={supabase ? (fn, args) => supabase.rpc(fn, args) : null}
        />
      )}
      <div className="text-center">
        <button type="button" className="text-sm text-muted underline" onClick={() => void supabase?.auth.signOut()}>
          Farklı bir e-postayla giriş yap
        </button>
      </div>
    </div>
  );
}

type Rpc = ((fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>) | null;

function NewOffice({ rpc, onDone }: { rpc: Rpc; onDone: () => Promise<void> }) {
  const [f, setF] = useState<OfficeForm>(EMPTY);
  const [errors, setErrors] = useState<FormErrors<OfficeForm>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof OfficeForm) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async () => {
    const v = validateOffice(f, { requireOwner: true });
    setErrors(v);
    if (Object.keys(v).length || !rpc) return;
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await rpc("create_office", {
        p_unvan: f.unvan.trim(),
        p_vergi_no: f.vergi_no.replace(/\D/g, "") || null,
        p_mersis_no: f.mersis_no.replace(/\D/g, "") || null,
        p_yetki_belgesi_no: f.yetki_belgesi_no.trim() || null,
        p_yetki_gecerlilik: f.yetki_belgesi_gecerlilik || null,
        p_plan: f.plan,
        p_ad_soyad: f.ad_soyad.trim(),
        p_telefon: f.telefon.trim() || null,
      });
      if (err) throw err;
      await onDone();
    } catch (e) {
      setError(rpcErrorMessage(e));
      setBusy(false);
    }
  };

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Card title="Ofis bilgileri">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Ofis unvanı" required>
              <Input value={f.unvan} onChange={set("unvan")} placeholder="ör. DC Emlak Kadıköy" autoComplete="organization" />
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
          <div>
            <Field label="Taşınmaz ticareti yetki belgesi no" hint="Ticaret İl Müdürlüğü'nden alınan belge">
              <Input value={f.yetki_belgesi_no} onChange={set("yetki_belgesi_no")} />
            </Field>
            <Err msg={errors.yetki_belgesi_no} />
          </div>
          <div>
            <Field label="Yetki belgesi geçerlilik tarihi">
              <Input type="date" value={f.yetki_belgesi_gecerlilik} onChange={set("yetki_belgesi_gecerlilik")} />
            </Field>
            <Err msg={errors.yetki_belgesi_gecerlilik} />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">Yetki belgesi girilmeden ilan yayınlanamaz (Uyum Motoru). Bu bilgileri daha sonra Ayarlar&apos;dan tamamlayabilirsiniz.</p>
      </Card>

      <Card title="Sizin bilgileriniz (broker)">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Field label="Ad soyad" required>
              <Input value={f.ad_soyad} onChange={set("ad_soyad")} autoComplete="name" />
            </Field>
            <Err msg={errors.ad_soyad} />
          </div>
          <div>
            <Field label="Cep telefonu">
              <Input type="tel" value={f.telefon} onChange={set("telefon")} autoComplete="tel" placeholder="05xx xxx xx xx" />
            </Field>
            <Err msg={errors.telefon} />
          </div>
        </div>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Paket seçimi · 14 gün ücretsiz deneme</h2>
        <PlanCards value={f.plan} onSelect={(plan) => setF((x) => ({ ...x, plan }))} compact disabled={busy} />
        <p className="mt-2 text-xs text-muted">Deneme süresince kart bilgisi istenmez. Paketi istediğiniz zaman Ayarlar → Paket&apos;ten değiştirebilirsiniz.</p>
      </section>

      <ErrorNote error={error} />
      {Object.keys(errors).length > 0 && <p className="text-sm text-block">Lütfen işaretli alanları düzeltin.</p>}
      <Button type="submit" variant="primary" className="w-full sm:w-auto" disabled={busy || !rpc}>
        {busy ? "Ofis oluşturuluyor…" : "Ofisi oluştur ve başla"}
      </Button>
    </form>
  );
}

function JoinOffice({ rpc, onDone, initialCode }: { rpc: Rpc; onDone: () => Promise<void>; initialCode: string }) {
  const [code, setCode] = useState(initialCode);
  const [ad, setAd] = useState("");
  const [tel, setTel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const c = normalizeInviteCode(code);
    if (c.length < 6) return setError("Davet kodunu eksiksiz girin.");
    const v = validateOffice({ unvan: "---", ad_soyad: ad, telefon: tel }, { requireOwner: true });
    if (v.ad_soyad || v.telefon) return setError(v.ad_soyad ?? v.telefon ?? null);
    if (!rpc) return;
    setBusy(true);
    try {
      const { error: err } = await rpc("accept_invite", { p_code: c, p_ad_soyad: ad.trim(), p_telefon: tel.trim() || null });
      if (err) throw err;
      await onDone();
    } catch (e) {
      setError(rpcErrorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Card title="Davet koduyla katıl">
      <form
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field label="Davet kodu" required hint="Ofis yöneticiniz Ayarlar → Ekip'ten oluşturup size gönderir (7 gün geçerli, tek kullanımlık).">
          <Input value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" className="font-mono tracking-widest" placeholder="ABCDE23456" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ad soyad" required>
            <Input value={ad} onChange={(e) => setAd(e.target.value)} autoComplete="name" />
          </Field>
          <Field label="Cep telefonu">
            <Input type="tel" value={tel} onChange={(e) => setTel(e.target.value)} autoComplete="tel" placeholder="05xx xxx xx xx" />
          </Field>
        </div>
        <ErrorNote error={error} />
        <Button type="submit" variant="primary" className="w-full sm:w-auto" disabled={busy || !rpc}>
          {busy ? "Katılınıyor…" : "Ofise katıl"}
        </Button>
      </form>
    </Card>
  );
}
