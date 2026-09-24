"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/data/session";
import { cx } from "./ui";

export const NAV_GROUPS = [
  {
    grup: "Günlük",
    items: [
      { href: "/", label: "Kokpit", icon: "◉" },
      { href: "/takvim", label: "Takvim & Gösterim", icon: "▦" },
    ],
  },
  {
    grup: "Satış",
    items: [
      { href: "/portfoyler", label: "Portföyler", icon: "⌂" },
      { href: "/musteriler", label: "Müşteriler", icon: "☺" },
      { href: "/fsbo", label: "FSBO Radar", icon: "◎" },
      { href: "/eslestirme", label: "Eşleştirme", icon: "⇄" },
      { href: "/islemler", label: "İşlemler", icon: "▤" },
    ],
  },
  {
    grup: "Ofis",
    items: [
      { href: "/sozlesmeler", label: "Sözleşmeler", icon: "✎" },
      { href: "/hesaplayicilar", label: "Hesaplayıcılar", icon: "₺" },
      { href: "/raporlar", label: "Raporlar", icon: "▥" },
      { href: "/iceri-aktar", label: "İçe aktar", icon: "⇪" },
      { href: "/ayarlar", label: "Ayarlar & Paket", icon: "⚙" },
    ],
  },
];

const MOBILE = [
  { href: "/", label: "Kokpit", icon: "◉" },
  { href: "/portfoyler", label: "Portföy", icon: "⌂" },
  { href: "/musteriler", label: "Müşteri", icon: "☺" },
  { href: "/takvim", label: "Takvim", icon: "▦" },
];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}

export function AppNav() {
  const path = usePathname();
  const { office, member, mode } = useSession();
  const [menu, setMenu] = useState(false);

  return (
    <>
      <aside className="hidden md:sticky md:top-0 md:flex md:h-dvh md:w-60 md:shrink-0 md:flex-col md:overflow-y-auto md:border-r md:border-border md:bg-surface md:p-4">
        <Link href="/" className="mb-4 flex items-center gap-2 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="h-8 w-8" />
          <span className="leading-tight">
            <span className="block text-lg font-semibold">DC Emlak</span>
            <span className="block text-xs text-muted">{office?.unvan}</span>
          </span>
        </Link>
        <nav className="flex flex-col gap-0.5">
          {NAV_GROUPS.map((g) => (
            <div key={g.grup}>
              <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">{g.grup}</p>
              {g.items.map((i) => (
                <Link
                  key={i.href}
                  href={i.href}
                  className={cx(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                    isActive(path, i.href) ? "bg-brand/10 font-semibold text-brand" : "hover:bg-bg",
                  )}
                >
                  <span aria-hidden className="w-4 text-center">
                    {i.icon}
                  </span>
                  {i.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="mt-auto border-t border-border pt-3 text-xs text-muted">
          <p className="font-medium text-text">{member?.ad_soyad}</p>
          <p>{mode === "demo" ? "Demo modu · veriler bu tarayıcıda" : office?.plan}</p>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {MOBILE.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={cx("flex min-h-14 flex-1 flex-col items-center justify-center text-xs", isActive(path, i.href) ? "font-semibold text-brand" : "text-muted")}
          >
            <span aria-hidden className="text-lg">
              {i.icon}
            </span>
            {i.label}
          </Link>
        ))}
        <button type="button" onClick={() => setMenu(true)} className="flex min-h-14 flex-1 flex-col items-center justify-center text-xs text-muted">
          <span aria-hidden className="text-lg">
            ☰
          </span>
          Menü
        </button>
      </nav>

      {menu && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMenu(false)}>
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-surface p-4" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-3 gap-2">
              {NAV_GROUPS.flatMap((g) => g.items).map((i) => (
                <Link
                  key={i.href}
                  href={i.href}
                  onClick={() => setMenu(false)}
                  className={cx("flex flex-col items-center gap-1 rounded-xl bg-bg p-3 text-center text-xs", isActive(path, i.href) && "text-brand")}
                >
                  <span aria-hidden className="text-xl">
                    {i.icon}
                  </span>
                  {i.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
