"use client";

/**
 * Ortak arayüz bileşenleri. Tüm modüller bunları kullanır; renkler
 * globals.css'teki tema belirteçlerinden gelir (açık/koyu tema).
 */
import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import type { Evaluation, Karar } from "@/domain/compliance";

type Tone = "neutral" | "ok" | "warn" | "block" | "info" | "brand";

const TONE: Record<Tone, string> = {
  neutral: "bg-bg text-muted border-border",
  ok: "bg-ok/10 text-ok border-ok/30",
  warn: "bg-warn/10 text-warn border-warn/30",
  block: "bg-block/10 text-block border-block/30",
  info: "bg-info/10 text-info border-info/30",
  brand: "bg-brand/10 text-brand border-brand/30",
};

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium", TONE[tone], className)}>
      {children}
    </span>
  );
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "ok";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-brand text-white border-brand hover:opacity-90",
  secondary: "bg-surface text-text border-border hover:bg-bg",
  ghost: "bg-transparent text-text border-transparent hover:bg-bg",
  danger: "bg-block text-white border-block hover:opacity-90",
  ok: "bg-ok text-white border-ok hover:opacity-90",
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" };

export function Button({ variant = "secondary", size = "md", className, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "min-h-8 px-2.5 text-xs" : "min-h-10 px-4 text-sm",
        BTN[variant],
        className,
      )}
    />
  );
}

export function ButtonLink({ href, variant = "secondary", size = "md", className, children }: { href: string; variant?: BtnVariant; size?: "sm" | "md"; className?: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border font-medium transition",
        size === "sm" ? "min-h-8 px-2.5 text-xs" : "min-h-10 px-4 text-sm",
        BTN[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function Card({ children, className, title, actions }: { children: React.ReactNode; className?: string; title?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className={cx("min-w-0 rounded-xl border border-border bg-surface", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions, back }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; back?: string }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {back && (
          <Link href={back} aria-label="Geri" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-surface">
            ←
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ label = "Yükleniyor…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 p-6 text-sm text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-brand" />
      {label}
    </div>
  );
}

export function ErrorNote({ error }: { error: Error | string | null | undefined }) {
  if (!error) return null;
  return <p className="rounded-lg border border-block/40 bg-block/10 p-3 text-sm text-block">{typeof error === "string" ? error : error.message}</p>;
}

// ---- Form alanları -----------------------------------------------------------

const INPUT = "min-h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:ring-2 focus:ring-brand";

export function Field({ label, hint, children, required }: { label: string; hint?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm">
      <span className="text-muted">
        {label}
        {required && <span className="text-block"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Input(props: React.ComponentProps<"input">) {
  return <input {...props} className={cx(INPUT, props.className)} />;
}

export function Textarea(props: React.ComponentProps<"textarea">) {
  return <textarea {...props} className={cx(INPUT, "py-2", props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(INPUT, props.className)} />;
}

export function Checkbox({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className="inline-flex min-h-10 items-center gap-2 text-sm">
      <input type="checkbox" {...props} className="h-4 w-4 accent-brand" />
      {label}
    </label>
  );
}

// ---- Sekmeler ------------------------------------------------------------------

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: React.ReactNode }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cx(
            "-mb-px min-h-10 whitespace-nowrap border-b-2 px-3 text-sm",
            value === t.id ? "border-brand font-semibold text-brand" : "border-transparent text-muted hover:text-text",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ---- Diyalog -------------------------------------------------------------------

export function Dialog({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cx(
        "m-auto w-[calc(100%-2rem)] rounded-2xl border border-border bg-surface p-0 text-text backdrop:bg-black/40",
        wide ? "max-w-2xl" : "max-w-lg",
      )}
    >
      {open && (
        <div className="flex max-h-[85dvh] flex-col">
          <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 id={titleId} className="font-semibold">
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label="Kapat" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-bg">
              ✕
            </button>
          </header>
          <div className="overflow-y-auto p-4">{children}</div>
          {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-border px-4 py-3">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}

// ---- Uyum motoru sonuçları ---------------------------------------------------------

const KARAR_TONE: Record<Karar, Tone> = { ENGELLE: "block", UYAR: "warn", GEC: "ok" };
const KARAR_LABEL: Record<Karar, string> = { ENGELLE: "Engellendi", UYAR: "Uyarı", GEC: "Uygun" };

export function KararBadge({ karar }: { karar: Karar }) {
  return <Badge tone={KARAR_TONE[karar]}>{KARAR_LABEL[karar]}</Badge>;
}

export function EvaluationList({ ev }: { ev: Evaluation }) {
  if (!ev.sonuclar.length) return <p className="text-sm text-ok">Tüm uyum kontrolleri tamam.</p>;
  return (
    <ul className="space-y-2">
      {ev.sonuclar.map((r, i) => (
        <li key={i} className={cx("rounded-lg border p-3 text-sm", TONE[KARAR_TONE[r.karar]])}>
          <span className="font-semibold">{KARAR_LABEL[r.karar]}:</span> <span className="text-text">{r.mesaj}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Uyum motoru ENGELLE/UYAR döndürdüğünde gösterilir. UYAR'da kullanıcı
 * gerekçe yazarak devam edebilir; ENGELLE'de yalnızca kapatılır.
 */
export function ComplianceDialog({
  ev,
  open,
  onClose,
  onProceed,
  title = "Uyum Motoru",
}: {
  ev: Evaluation | null;
  open: boolean;
  onClose: () => void;
  onProceed?: (gerekce: string) => void;
  title?: string;
}) {
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  if (!ev) return null;
  const canProceed = ev.karar === "UYAR" && onProceed;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          {title} <KararBadge karar={ev.karar} />
        </span>
      }
      footer={
        <>
          <Button onClick={onClose}>{canProceed ? "Vazgeç" : "Kapat"}</Button>
          {canProceed && (
            <Button variant="primary" onClick={() => onProceed(reasonRef.current?.value.trim() || "Gerekçe belirtilmedi")}>
              Gerekçe ile devam et
            </Button>
          )}
        </>
      }
    >
      <EvaluationList ev={ev} />
      {canProceed && (
        <div className="mt-3">
          <Field label="Gerekçe (denetim kaydına yazılır)">
            <Textarea ref={reasonRef} rows={2} />
          </Field>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">Kural seti {ev.paramSurum}. Karar denetim kaydına işlenir.</p>
    </Dialog>
  );
}

// ---- Tablo ----------------------------------------------------------------------

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-sm [&_td]:border-t [&_td]:border-border [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted">
        {children}
      </table>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

// ---- Bildirim (toast) ---------------------------------------------------------

type ToastFn = (msg: string) => void;
let toastImpl: ToastFn = () => {};
export const toast: ToastFn = (m) => toastImpl(m);

export function ToastHost() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    toastImpl = (msg) => {
      const host = ref.current;
      if (!host) return;
      const el = document.createElement("div");
      el.className = "pointer-events-auto rounded-lg bg-text px-4 py-2.5 text-sm text-bg shadow-lg";
      el.textContent = msg;
      host.appendChild(el);
      setTimeout(() => el.remove(), 3500);
    };
    return () => {
      toastImpl = () => {};
    };
  }, []);
  return <div ref={ref} aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6" />;
}
