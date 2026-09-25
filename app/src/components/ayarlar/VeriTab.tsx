"use client";

import { useState } from "react";
import { Button, Card, Dialog, ErrorNote, toast } from "@/components/ui";
import { useReadySession } from "@/data/session";
import { buildExport, exportFileName } from "./export";

export function VeriTab() {
  const { member, store, officeId, mode, resetDemo } = useReadySession();
  const broker = member.rol === "broker";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      const now = new Date();
      const data = await buildExport(store, officeId, now);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportFileName(now);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      const adet = Object.values(data.tablolar).reduce((t, r) => t + (r?.length ?? 0), 0);
      toast(`${adet} kayıt dışa aktarıldı`);
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card title="Veriyi dışa aktar (JSON)">
        <p className="text-sm">
          Ofisinize ait tüm kayıtları (portföyler, kişiler, rızalar, belgeler, işlemler, denetim kayıtları) tek bir JSON dosyası olarak indirir. Yedek almak veya
          KVKK kapsamında veri taşınabilirliği talebini karşılamak için kullanın.
        </p>
        {broker ? (
          <Button variant="primary" className="mt-3" disabled={busy} onClick={() => void download()}>
            {busy ? "Hazırlanıyor…" : "Tüm ofis verisini indir"}
          </Button>
        ) : (
          <p className="mt-3 text-sm text-muted">Toplu dışa aktarma yalnızca broker&apos;a açıktır (ofis politikası: danışman ayrılırken müşteri listesini topluca indiremez).</p>
        )}
        <p className="mt-2 text-xs text-muted">Dosya kişisel veri içerir; şifreli bir ortamda saklayın ve gereksiz kopyalarını silin.</p>
        <ErrorNote error={error} />
      </Card>

      {mode === "demo" && resetDemo && (
        <Card title="Demo verisi">
          <p className="text-sm">Demo modunda tüm değişiklikler yalnızca bu tarayıcıda tutulur. Örnek veriyi ilk hâline döndürebilirsiniz.</p>
          <Button variant="danger" className="mt-3" onClick={() => setConfirmReset(true)}>
            Demo verisini sıfırla
          </Button>
          <Dialog
            open={confirmReset}
            onClose={() => setConfirmReset(false)}
            title="Demo verisi sıfırlansın mı?"
            footer={
              <>
                <Button onClick={() => setConfirmReset(false)}>Vazgeç</Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    resetDemo();
                    setConfirmReset(false);
                    toast("Demo verisi sıfırlandı");
                  }}
                >
                  Sıfırla
                </Button>
              </>
            }
          >
            <p className="text-sm">Bu tarayıcıda yaptığınız tüm değişiklikler silinir ve örnek ofis verisi yeniden yüklenir.</p>
          </Dialog>
        </Card>
      )}

      <Card title="KVKK hatırlatmaları">
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>
            <b>VERBİS:</b> Veri sorumlusu olarak Veri Sorumluları Sicil Bilgi Sistemi&apos;ne (verbis.kvkk.gov.tr) kayıt yükümlülüğünüzü kontrol edin; çalışan sayısı
            ve yıllık bilanço eşiklerine göre muafiyet olabilir, ancak ana faaliyeti özel nitelikli kişisel veri işleme olmayan küçük ofisler için de durumu yıllık
            gözden geçirin.
          </li>
          <li>
            <b>Aydınlatma ve açık rıza:</b> Müşteri kartında aydınlatma metni onayı ve ticari ileti (İYS) izni kaydedilmeden pazarlama mesajı gönderilmez (Uyum
            Motoru).
          </li>
          <li>
            <b>Yurt dışına aktarım:</b> Ücretsiz katman barındırma (Supabase, Vercel) veriyi yurt dışında tutar. KVKK md. 9 kapsamında standart sözleşme bildirimi
            ya da açık rıza gerekir; aydınlatma metninize ekleyin.
          </li>
          <li>
            <b>Saklama ve imha:</b> Sözleşme ve belgeler yasal saklama süresi dolmadan silinmez; süresi dolan kişisel veriler için periyodik imha politikası
            uygulayın.
          </li>
          <li>
            <b>Yedekleme:</b> Supabase ücretsiz katmanda otomatik yedek sınırlıdır; bu sayfadan düzenli (ör. haftalık) dışa aktarım alın.
          </li>
        </ul>
        <p className="mt-3 text-xs text-muted">Bu metinler bilgilendirme amaçlıdır, hukuki danışmanlık yerine geçmez.</p>
      </Card>
    </div>
  );
}
