"use client";

/** CRM modülü ortak küçük bileşenler ve etiketler */
import { useState } from "react";
import type { Activity, ConsentPurpose, MemberRole, SearchProfile } from "@/data/types";
import { cx } from "@/components/ui";
import { ILAN_TIPLERI, shortTL, tl } from "@/lib/format";

export const AKTIVITE_TURLERI: Record<Activity["tur"], { label: string; icon: string }> = {
  arama: { label: "Arama", icon: "☎" },
  mesaj: { label: "Mesaj", icon: "✉" },
  not: { label: "Not", icon: "✎" },
  sesli_not: { label: "Sesli not", icon: "🎙" },
  gosterim: { label: "Gösterim", icon: "⌂" },
  eposta: { label: "E-posta", icon: "@" },
  gorev: { label: "Görev", icon: "☐" },
};

export const RIZA_ETIKET: Record<ConsentPurpose, { label: string; aciklama: string }> = {
  aydinlatma: { label: "Aydınlatma metni", aciklama: "KVKK md. 10 bilgilendirme yapıldı" },
  ticari_ileti: { label: "Ticari ileti (İYS)", aciklama: "Pazarlama mesajı, katalog gönderimi" },
  arama_kaydi: { label: "Arama kaydı", aciklama: "Görüşmelerin kaydedilmesi" },
  yurt_disi_aktarim: { label: "Yurt dışı aktarım", aciklama: "Bulut / yurt dışı sunucuda saklama" },
  gorsel: { label: "Görsel kullanımı", aciklama: "Fotoğraf / video kullanımı" },
};

export const RIZA_KAYNAKLARI: Record<string, string> = {
  sozlu: "Sözlü",
  form: "Form",
  otp: "OTP (SMS kodu)",
  islak_imza: "Islak imza",
};

export const KISI_KAYNAKLARI = [
  "Referans",
  "sahibinden.com",
  "Hepsiemlak",
  "Emlakjet",
  "Instagram",
  "Web formu",
  "Tabela QR",
  "FSBO Radar",
  "Sfer",
  "Ağ/MLS",
  "Ofise geldi",
];

/** Broker, takım lideri ve asistan ofisin tüm müşterilerini görür */
export function seesAll(rol: MemberRole) {
  return rol === "broker" || rol === "takim_lideri" || rol === "asistan";
}

export function budgetLabel(sp: Pick<SearchProfile, "butce_min" | "butce_max" | "ilan_tipi">) {
  const f = sp.ilan_tipi === "kiralik" ? tl : shortTL;
  const r = sp.butce_min ? `${f(sp.butce_min)} – ${f(sp.butce_max)}` : `≤ ${f(sp.butce_max)}`;
  return sp.ilan_tipi === "kiralik" ? `${r}/ay` : r;
}

export function profileSummary(sp: SearchProfile) {
  const yer = sp.mahalleler.length ? sp.mahalleler.join(", ") : sp.ilceler.join(", ");
  return [ILAN_TIPLERI[sp.ilan_tipi], budgetLabel(sp), sp.oda_min ? `${sp.oda_min}+ oda` : null, yer || null]
    .filter(Boolean)
    .join(" · ");
}

export function HeatBar({ value, className }: { value: number | null | undefined; className?: string }) {
  const v = Math.max(0, Math.min(100, value ?? 0));
  const tone = v >= 70 ? "bg-ok" : v >= 40 ? "bg-warn" : "bg-block";
  return (
    <span className={cx("inline-flex items-center gap-2", className)} title={`Isı skoru ${v}/100`}>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-border" aria-hidden>
        <span className={cx("block h-full rounded-full", tone)} style={{ width: `${v}%` }} />
      </span>
      <span className="text-xs font-semibold tabular-nums">{value === null || value === undefined ? "—" : v}</span>
    </span>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const ini = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toLocaleUpperCase("tr"))
    .join("");
  return (
    <span
      aria-hidden
      className={cx(
        "grid flex-none place-items-center rounded-full bg-brand/10 font-semibold text-brand",
        size === "lg" ? "h-12 w-12 text-base" : "h-9 w-9 text-xs",
      )}
    >
      {ini || "?"}
    </span>
  );
}

/** Seçilebilir çipler (tek veya çoklu seçim) */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: React.ReactNode }[];
  value: T[];
  onChange: (v: T[]) => void;
  label?: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== o.id) : [...value, o.id])}
            className={cx(
              "min-h-8 rounded-full border px-3 text-xs font-medium transition",
              on ? "border-brand bg-brand text-white" : "border-border bg-surface text-text hover:bg-bg",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Serbest etiket girişi (ilçe, mahalle); Enter veya virgül ile ekler */
export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder,
  id,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  id: string;
}) {
  const [text, setText] = useState("");
  const add = (raw: string) => {
    const parts = raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .filter((x) => !value.some((v) => v.toLocaleLowerCase("tr") === x.toLocaleLowerCase("tr")));
    if (parts.length) onChange([...value, ...parts]);
    setText("");
  };
  const listId = `${id}-oneriler`;
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1.5 focus-within:ring-2 focus-within:ring-brand">
      {value.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand">
          {v}
          <button type="button" aria-label={`${v} kaldır`} onClick={() => onChange(value.filter((x) => x !== v))} className="px-0.5">
            ✕
          </button>
        </span>
      ))}
      <input
        id={id}
        list={listId}
        value={text}
        placeholder={value.length ? "" : placeholder}
        onChange={(e) => {
          const v = e.target.value;
          if (v.endsWith(",")) add(v);
          else setText(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(text);
          } else if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => text.trim() && add(text)}
        className="min-w-24 flex-1 bg-transparent text-sm outline-none"
      />
      <datalist id={listId}>
        {suggestions
          .filter((s) => !value.includes(s))
          .map((s) => (
            <option key={s} value={s} />
          ))}
      </datalist>
    </div>
  );
}

/** datetime-local değeri ↔ ISO */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Varsayılan sonraki adım zamanı: yarın 10:00 */
export function defaultNextStepLocal(now = new Date()) {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return toLocalInput(d.toISOString());
}
