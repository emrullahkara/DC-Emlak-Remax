"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, ButtonLink, Card, ErrorNote, Field, Input, Spinner } from "@/components/ui";
import { useSession } from "@/data/session";
import { isValidEmail, normalizeOtp, safeNext } from "./next-path";

const BEKLEME_SN = 60;

function trError(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/rate limit|security purposes|only request this after/i.test(m)) return "Çok sık denediniz. Lütfen bir dakika bekleyip tekrar deneyin.";
  if (/expired|invalid/i.test(m)) return "Kod geçersiz veya süresi dolmuş. Yeni kod isteyin.";
  if (/signups not allowed|not allowed/i.test(m)) return "Bu e-posta ile kayıt kapalı. Ofis yöneticinizden davet isteyin.";
  if (/fetch|network/i.test(m)) return "Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.";
  return "Giriş yapılamadı. Lütfen tekrar deneyin.";
}

export function GirisForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const router = useRouter();
  const { status, mode, supabase, refresh } = useSession();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kalan, setKalan] = useState(0);

  // Oturum açıksa hedefe yönlendir
  useEffect(() => {
    if (mode !== "supabase") return;
    if (status === "ready") router.replace(next);
    if (status === "no_office") router.replace("/kurulum");
  }, [mode, status, next, router]);

  useEffect(() => {
    if (kalan <= 0) return;
    const t = setTimeout(() => setKalan((k) => k - 1), 1000);
    return () => clearTimeout(t);
  }, [kalan]);

  if (mode === "demo") {
    return (
      <Card title="Demo modu">
        <p className="text-sm">
          Bu kurulumda Supabase bağlı değil; uygulama örnek bir ofisle <b>demo modunda</b> çalışıyor. Giriş gerekmez ve yaptığınız değişiklikler yalnızca bu
          tarayıcıda saklanır.
        </p>
        <p className="mt-2 text-sm text-muted">
          Gerçek kullanım için Supabase projesi oluşturup <code className="rounded bg-bg px-1">NEXT_PUBLIC_SUPABASE_URL</code> ve{" "}
          <code className="rounded bg-bg px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> ortam değişkenlerini tanımlayın (docs/KURULUM.md).
        </p>
        <div className="mt-4">
          <ButtonLink href={next} variant="primary" className="w-full">
            Demo ofise gir
          </ButtonLink>
        </div>
      </Card>
    );
  }

  if (status === "loading" || status === "ready" || status === "no_office") return <Spinner label="Oturum kontrol ediliyor…" />;

  const sendCode = async () => {
    setError(null);
    if (!isValidEmail(email)) {
      setError("Geçerli bir e-posta adresi girin.");
      return;
    }
    if (!supabase) return;
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin + next, shouldCreateUser: true },
      });
      if (err) throw err;
      setStep("code");
      setKalan(BEKLEME_SN);
    } catch (e) {
      setError(trError(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setError(null);
    const token = normalizeOtp(code);
    if (!token) {
      setError("E-postadaki 6 haneli kodu girin.");
      return;
    }
    if (!supabase) return;
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: "email" });
      if (err) throw err;
      await refresh();
      // Yönlendirme yukarıdaki effect ile (ready → next, no_office → /kurulum)
    } catch (e) {
      setError(trError(e));
      setBusy(false);
    }
  };

  return (
    <Card title={step === "email" ? "Giriş yap" : "Kodu girin"}>
      {step === "email" ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void sendCode();
          }}
        >
          <p className="text-sm text-muted">Şifre yok: e-postanıza bir giriş bağlantısı ve 6 haneli kod göndereceğiz. İlk girişte hesabınız otomatik oluşturulur.</p>
          <Field label="E-posta" required>
            <Input type="email" autoComplete="email" inputMode="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ad@ofisiniz.com" />
          </Field>
          <ErrorNote error={error} />
          <Button type="submit" variant="primary" className="w-full" disabled={busy}>
            {busy ? "Gönderiliyor…" : "Giriş bağlantısı gönder"}
          </Button>
        </form>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
        >
          <p className="text-sm">
            <b className="break-all">{email}</b> adresine bir bağlantı ve kod gönderdik. Bağlantıya bu cihazda tıklayabilir ya da kodu aşağıya yazabilirsiniz.
          </p>
          <Field label="6 haneli kod" required>
            <Input
              autoComplete="one-time-code"
              inputMode="numeric"
              autoFocus
              maxLength={12}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="text-center text-lg tracking-[0.4em]"
            />
          </Field>
          <ErrorNote error={error} />
          <Button type="submit" variant="primary" className="w-full" disabled={busy}>
            {busy ? "Doğrulanıyor…" : "Doğrula ve gir"}
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button
              type="button"
              className="text-brand disabled:text-muted"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
            >
              ← E-postayı değiştir
            </button>
            <button type="button" className="text-brand disabled:text-muted" disabled={kalan > 0 || busy} onClick={() => void sendCode()}>
              {kalan > 0 ? `Yeniden gönder (${kalan} sn)` : "Kodu yeniden gönder"}
            </button>
          </div>
          <p className="text-xs text-muted">E-posta gelmediyse gereksiz (spam) klasörünü kontrol edin.</p>
        </form>
      )}
    </Card>
  );
}
