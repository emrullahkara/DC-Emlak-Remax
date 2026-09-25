"use client";

import { Badge, Card } from "@/components/ui";
import { paramsFor, type ParamValue, type RuleParams } from "@/domain/params";
import { fmtDate, num } from "@/lib/format";

const LABEL: Partial<Record<keyof RuleParams, { ad: string; birim: string }>> = {
  satisHizmetBedeliTavanOrani: { ad: "Satış hizmet bedeli tavanı (taraf başına)", birim: "%" },
  kiraHizmetBedeliTavanAy: { ad: "Kiralama hizmet bedeli tavanı", birim: "aylık kira" },
  hizmetKdvOrani: { ad: "Hizmet bedeli KDV oranı", birim: "%" },
  tapuHarciBindeAlici: { ad: "Tapu harcı — alıcı", birim: "‰" },
  tapuHarciBindeSatici: { ad: "Tapu harcı — satıcı", birim: "‰" },
  donerSermayeUcreti: { ad: "Tapu döner sermaye ücreti", birim: "₺" },
  guvenceBedeliTavanAy: { ad: "Kira güvence bedeli üst sınırı", birim: "aylık kira" },
  yetkiBitisUyariGun: { ad: "Yetki sözleşmesi bitiş uyarıları", birim: "gün kala" },
  masakKimlikTespitEsigi: { ad: "MASAK kimlik tespiti eşiği", birim: "₺" },
};

function isParam(v: unknown): v is ParamValue<number | number[]> {
  return typeof v === "object" && v !== null && "deger" in v && "dayanak" in v;
}

export function ParametreTab() {
  const p = paramsFor(new Date());
  const entries = (Object.entries(p) as [keyof RuleParams, unknown][]).filter((e): e is [keyof RuleParams, ParamValue<number | number[]>] => isParam(e[1]));
  const teyit = entries.filter(([, v]) => v.teyitGerekli).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Mevzuat oranları kodun içine gömülmez; tarih aralıklı ve sürümlü parametre setlerinden okunur. Her işlem, o tarihte geçerli set sürümünü denetim kaydına
        yazar. Değişiklik için ürün güncellemesi gerekir (salt okunur).
      </p>
      {teyit > 0 && (
        <p className="rounded-lg border border-warn/30 bg-warn/10 p-3 text-sm text-warn">
          {teyit} değer canlı kullanımdan önce güncel Resmî Gazete / kurum duyurusundan teyit edilmelidir. Teyit edilmemiş değerler 0 ise ilgili hesap ve kontroller
          uyarı verir.
        </p>
      )}
      <Card
        title={`Parametre seti ${p.surum}`}
        actions={
          <span className="text-xs text-muted">
            {fmtDate(p.gecerlilikBaslangic)} – {p.gecerlilikBitis ? fmtDate(p.gecerlilikBitis) : "devam ediyor"}
          </span>
        }
      >
        <ul className="divide-y divide-border">
          {entries.map(([k, v]) => {
            const l = LABEL[k] ?? { ad: k, birim: "" };
            const deger = Array.isArray(v.deger) ? v.deger.join(" / ") : num(v.deger);
            return (
              <li key={k} className="flex flex-wrap items-start justify-between gap-2 py-3">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="font-medium">{l.ad}</p>
                  <p className="text-xs text-muted">{v.aciklama}</p>
                  <p className="text-xs text-muted">Dayanak: {v.dayanak}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-semibold tabular-nums">
                    {deger} <span className="text-xs font-normal text-muted">{l.birim}</span>
                  </span>
                  {v.teyitGerekli && <Badge tone="warn">Teyit gerekli</Badge>}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
