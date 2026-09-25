"use client";

/**
 * Uzaktan imza sayfası (/imza/<token>) — giriş gerektirmez, menü göstermez.
 *
 * Demo modunda belge bu tarayıcıdaki yerel depodan okunur (bağlantı yalnızca
 * aynı tarayıcıda çalışır). Supabase modunda anonim kullanıcı tabloları
 * okuyamaz; `get_document_for_signing` ve `sign_document` RPC'leri kullanılır
 * (supabase/migrations/0003_signing.sql).
 */
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Checkbox, ErrorNote, Field, Input, Spinner } from "@/components/ui";
import { useSession } from "@/data/session";
import { buildEvidence, isValidToken, sha256Hex, validSignerName } from "@/domain/signing";
import { getTemplate, templateBlocks } from "@/domain/templates";
import { renderPlainText } from "@/domain/templates-markdown";
import { syncAuthorizationContract } from "./actions";
import { DocumentView, PrintStyles, publicValues, renderValues } from "./DocumentView";
import { recipientFromValues } from "./SignFlow";

interface Loaded {
  id: string;
  sablon: string;
  alanlar: Record<string, string>;
  unvan: string;
}

type Konum = { lat: number; lng: number; dogruluk?: number };

function getPosition(timeoutMs = 10_000): Promise<Konum | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, dogruluk: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

export function PublicSignPage({ token }: { token: string }) {
  const { mode, store, supabase } = useSession();
  const [state, setState] = useState<"loading" | "invalid" | "ready" | "done">("loading");
  const [doc, setDoc] = useState<Loaded | null>(null);
  const [ad, setAd] = useState("");
  const [okudum, setOkudum] = useState(false);
  const [kvkk, setKvkk] = useState(false);
  const [konumIzni, setKonumIzni] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ zaman: string; sha256: string } | null>(null);

  const load = useCallback(async () => {
    if (!isValidToken(token)) return setState("invalid");
    try {
      if (mode === "supabase" && supabase) {
        const { data, error: e } = await supabase.rpc("get_document_for_signing", { p_token: token });
        if (e) throw e;
        const row = (Array.isArray(data) ? data[0] : data) as { id: string; sablon: string; alanlar: Record<string, string>; durum: string; unvan: string } | undefined;
        if (!row || row.durum !== "imzada") return setState("invalid");
        setDoc({ id: row.id, sablon: row.sablon, alanlar: row.alanlar ?? {}, unvan: row.unvan });
      } else {
        const rows = await store.list("document", { eq: { imza_token: token } });
        const d = rows[0];
        if (!d || d.durum !== "imzada") return setState("invalid");
        const o = await store.get("office", d.office_id);
        setDoc({ id: d.id, sablon: d.sablon, alanlar: d.alanlar ?? {}, unvan: o?.unvan ?? "" });
      }
      setState("ready");
    } catch {
      setState("invalid");
    }
  }, [mode, store, supabase, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const t = doc ? getTemplate(doc.sablon) : undefined;

  useEffect(() => {
    if (doc && !ad) setAd(recipientFromValues(doc.alanlar).ad ?? "");
    // Yalnızca belge yüklendiğinde önerilen adı doldur
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  if (state === "loading") return <Spinner label="Belge yükleniyor…" />;
  if (state === "invalid" || !doc || !t) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-lg font-semibold">Bağlantı geçersiz veya kullanılmış</p>
        <p className="mt-2 text-sm text-muted">Belge zaten imzalanmış, imza isteği geri çekilmiş ya da bağlantı hatalı olabilir. Lütfen danışmanınızla iletişime geçin.</p>
        {mode === "demo" && <p className="mt-3 text-xs text-warn">Demo modu: imza bağlantıları yalnızca belgenin oluşturulduğu tarayıcıda açılır.</p>}
      </div>
    );
  }

  const sign = async () => {
    setError(null);
    if (!validSignerName(ad)) return setError("Lütfen adınızı ve soyadınızı eksiksiz yazın.");
    if (!okudum || !kvkk) return setError("Devam etmek için iki onay kutusunu da işaretleyin.");
    setBusy(true);
    try {
      const metin = renderPlainText(templateBlocks(t), renderValues(t, doc.alanlar));
      const sha = await sha256Hex(metin);
      const konum = konumIzni ? await getPosition() : null;
      const zaman = new Date();
      const ev = buildEvidence({ adSoyad: ad, userAgent: navigator.userAgent, zaman, sha256: sha, konum, kvkkOnay: kvkk, okudumOnay: okudum });
      const konumJson = konum ? { lat: konum.lat, lng: konum.lng } : null;

      if (mode === "supabase" && supabase) {
        const { data, error: e } = await supabase.rpc("sign_document", {
          p_token: token,
          p_ad_soyad: ad.trim(),
          p_kanit: { ...ev.kanit, alanlar: ev.alanlar },
          p_konum: konumJson,
        });
        if (e) throw e;
        const r = data as { ok?: boolean; hata?: string } | null;
        if (!r?.ok) throw new Error(r?.hata === "bulunamadi" ? "Bu bağlantı artık geçerli değil." : "İmza kaydedilemedi.");
      } else {
        const current = (await store.get("document", doc.id))!;
        if (current.durum !== "imzada" || current.imza_token !== token) throw new Error("Bu bağlantı artık geçerli değil.");
        const kisi = doc.alanlar._kisi_id || null;
        await store.insert("signature", { document_id: doc.id, person_id: kisi, yontem: "link", imzalandi_at: zaman.toISOString(), konum: konumJson, kanit: ev.kanit });
        const updated = await store.update("document", doc.id, { durum: "imzalandi", imza_token: null, alanlar: { ...current.alanlar, ...ev.alanlar } });
        await syncAuthorizationContract(store, updated);
      }
      setDoc({ ...doc, alanlar: { ...doc.alanlar, ...ev.alanlar } });
      setResult({ zaman: ev.alanlar.zaman_damgasi!, sha256: sha });
      setState("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError((e as Error).message || "İmza kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PrintStyles />
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="h-8 w-8" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{doc.unvan || "DC Emlak"}</p>
            <p className="text-xs text-muted">Uzaktan belge onayı</p>
          </div>
        </div>
        {state === "done" ? <Badge tone="ok">İmzalandı</Badge> : <Badge tone="warn">İmzanızı bekliyor</Badge>}
      </header>

      {state === "done" && result && (
        <section className="rounded-xl border border-ok/40 bg-ok/10 p-4 text-sm">
          <p className="text-base font-semibold text-ok">Teşekkürler, belge imzalandı.</p>
          <p className="mt-1">Zaman damgası: {result.zaman}</p>
          <p className="mt-1 break-all font-mono text-xs">Belge özet değeri (SHA-256): {result.sha256}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => window.print()}>Bir kopyasını yazdır / PDF</Button>
          </div>
          <p className="mt-2 text-xs text-muted">Bu sayfayı kapatabilirsiniz. İmzalı nüsha danışmanınıza iletildi.</p>
        </section>
      )}

      <h1 className="text-xl font-semibold">{t.baslik}</h1>
      <div className="belge-yazdir">
        <DocumentView template={t} values={publicValues(doc.alanlar)} />
      </div>

      {state === "ready" && (
        <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <h2 className="font-semibold">Onay ve imza</h2>
          <Field label="Adınız soyadınız" required>
            <Input value={ad} onChange={(e) => setAd(e.target.value)} autoComplete="name" />
          </Field>
          <div className="flex flex-col">
            <Checkbox checked={okudum} onChange={(e) => setOkudum(e.target.checked)} label="Belgeyi okudum, içeriğini onaylıyorum." />
            <Checkbox
              checked={kvkk}
              onChange={(e) => setKvkk(e.target.checked)}
              label={<span>KVKK aydınlatma metnini okudum; kişisel verilerimin aşağıda açıklanan amaçla işlendiği konusunda bilgilendirildim.</span>}
            />
            <Checkbox checked={konumIzni} onChange={(e) => setKonumIzni(e.target.checked)} label="Konumumu imza kanıtına ekle (isteğe bağlı)" />
          </div>
          <details className="rounded-lg border border-border p-3 text-xs text-muted">
            <summary className="cursor-pointer font-medium text-text">KVKK aydınlatma (özet)</summary>
            <p className="mt-2">
              Veri sorumlusu {doc.unvan || "ilgili emlak işletmesi"}dir. Adınız soyadınız, imza zamanı, cihaz/tarayıcı bilgisi, belgenin özet değeri ve —
              izin verirseniz — konumunuz; bu belgenin sizin tarafınızdan onaylandığının ispatı ve yasal saklama yükümlülüklerinin yerine getirilmesi amacıyla,
              6698 sayılı KVKK md. 5/2 (c) ve (ç) kapsamında işlenir ve mevzuatta öngörülen süre boyunca saklanır. KVKK md. 11 kapsamındaki haklarınız için
              işletmeye başvurabilirsiniz. Tam aydınlatma metnini danışmanınızdan isteyebilirsiniz.
            </p>
          </details>
          <p className="text-xs text-muted">
            Bu onay elektronik ortamda alınır; 5070 sayılı Kanun anlamında güvenli elektronik imza değildir. İmza anında belgenin özet değeri, zaman damgası ve cihaz bilgisi kaydedilir.
          </p>
          {error && <ErrorNote error={error} />}
          <Button variant="primary" className="w-full sm:w-auto" onClick={() => void sign()} disabled={busy}>
            {busy ? "İmzalanıyor…" : "Onaylıyorum ve imzalıyorum"}
          </Button>
        </section>
      )}
    </div>
  );
}
