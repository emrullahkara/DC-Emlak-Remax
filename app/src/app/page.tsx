export const dynamic = "force-dynamic";

import { evaluateListingPublish, type RuleResult } from "@/domain/compliance";
import { formatTL, round2 } from "@/domain/money";
import { ASAMA_ETIKET, ASAMALAR } from "@/domain/pipeline";
import { fsboScore, portfolioHealth } from "@/domain/scoring";
import { DEMO_FSBO, DEMO_HEDEF, DEMO_PORTFOLIOS } from "@/lib/demo";

interface Aksiyon {
  oncelik: number;
  tip: "ENGELLE" | "UYAR" | "BILGI";
  metin: string;
  detay?: string;
}

function buildActions(bugun: Date): Aksiyon[] {
  const a: Aksiyon[] = [];
  for (const p of DEMO_PORTFOLIOS) {
    const ev = evaluateListingPublish({ ...p.ilan, bugun });
    const yayinaGidecek = p.asama === "yetki" || p.asama === "yayinda";
    ev.sonuclar
      .filter((r: RuleResult) => yayinaGidecek || r.karar === "UYAR")
      .forEach((r) =>
        a.push({ oncelik: r.karar === "ENGELLE" ? 100 : 70, tip: r.karar === "ENGELLE" ? "ENGELLE" : "UYAR", metin: p.baslik, detay: r.mesaj }),
      );
    const h = portfolioHealth(p.saglik);
    if (p.asama === "yayinda" && h.puan < 60) {
      a.push({ oncelik: 60, tip: "UYAR", metin: `${p.baslik} — sağlık ${h.puan}/100`, detay: h.sinyaller[0] });
    }
  }
  for (const f of DEMO_FSBO) {
    const s = fsboScore(f);
    if (s.puan >= 60) {
      a.push({ oncelik: 50 + s.puan / 10, tip: "BILGI", metin: `FSBO ara: ${f.baslik} (skor ${s.puan})`, detay: s.sinyaller.join(" · ") });
    }
  }
  return a.sort((x, y) => y.oncelik - x.oncelik);
}

const TIP_STIL: Record<Aksiyon["tip"], string> = {
  ENGELLE: "border-l-block",
  UYAR: "border-l-warn",
  BILGI: "border-l-info",
};

export default function Kokpit() {
  const bugun = new Date();
  const aksiyonlar = buildActions(bugun);
  const beklenen = round2(
    DEMO_PORTFOLIOS.reduce((t, p) => {
      const brut = p.beklenenKomisyonOrani ? (p.fiyat * p.beklenenKomisyonOrani) / 100 : p.fiyat; // kira: 1 aylık
      return t + brut * p.olasilik;
    }, 0),
  );
  const oran = Math.min(100, Math.round((DEMO_HEDEF.gerceklesen / DEMO_HEDEF.aylikCiroHedefi) * 100));
  const asamaSayilari = ASAMALAR.map((a) => ({ a, n: DEMO_PORTFOLIOS.filter((p) => p.asama === a).length }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-sm text-muted">{bugun.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="text-2xl font-semibold">Kokpit</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-muted">Aylık hedef</p>
          <p className="mt-1 text-xl font-semibold">
            {formatTL(DEMO_HEDEF.gerceklesen)} <span className="text-sm font-normal text-muted">/ {formatTL(DEMO_HEDEF.aylikCiroHedefi)}</span>
          </p>
          <div className="mt-3 h-2 rounded-full bg-bg" role="progressbar" aria-valuenow={oran} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-2 rounded-full bg-brand" style={{ width: `${oran}%` }} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-muted">Beklenen komisyon (olasılık ağırlıklı, KDV hariç)</p>
          <p className="mt-1 text-xl font-semibold">{formatTL(beklenen)}</p>
          <p className="mt-2 text-xs text-muted">Hattaki portföylerin aşama olasılıklarına göre</p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Bugün ({aksiyonlar.length})</h2>
        <ul className="space-y-2">
          {aksiyonlar.map((x, i) => (
            <li key={i} className={`rounded-lg border border-border border-l-4 bg-surface p-3 ${TIP_STIL[x.tip]}`}>
              <p className="font-medium">{x.metin}</p>
              {x.detay && <p className="text-sm text-muted">{x.detay}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Satış hattı</h2>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {asamaSayilari.map(({ a, n }) => (
            <div key={a} className="rounded-lg border border-border bg-surface p-2 text-center">
              <p className="text-xl font-semibold">{n}</p>
              <p className="text-[11px] leading-tight text-muted">{ASAMA_ETIKET[a]}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-muted">Örnek verilerle gösterilmektedir. Supabase bağlandığında ofis verileriniz görünür.</p>
    </div>
  );
}
