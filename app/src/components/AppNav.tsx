"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Kokpit", icon: "◉", hazir: true },
  { href: "/portfoyler", label: "Portföyler", icon: "⌂", hazir: false },
  { href: "/musteriler", label: "Müşteriler", icon: "☺", hazir: false },
  { href: "/fsbo", label: "FSBO Radar", icon: "◎", hazir: false },
  { href: "/islemler", label: "İşlemler", icon: "▤", hazir: false },
  { href: "/takvim", label: "Takvim", icon: "▦", hazir: false },
  { href: "/sozlesmeler", label: "Sözleşmeler", icon: "✎", hazir: false },
  { href: "/hesaplayicilar", label: "Hesaplayıcılar", icon: "₺", hazir: true },
];

export function AppNav() {
  const path = usePathname();
  return (
    <>
      <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-border md:bg-surface md:p-4">
        <div className="mb-6 flex items-center gap-2 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="h-8 w-8" />
          <span className="text-lg font-semibold">DC Emlak</span>
        </div>
        <nav className="flex flex-col gap-1">
          {ITEMS.map((i) =>
            i.hazir ? (
              <Link
                key={i.href}
                href={i.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                  path === i.href ? "bg-brand/10 font-semibold text-brand" : "hover:bg-bg"
                }`}
              >
                <span aria-hidden>{i.icon}</span>
                {i.label}
              </Link>
            ) : (
              <span
                key={i.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted"
                title="Geliştiriliyor"
              >
                <span aria-hidden>{i.icon}</span>
                {i.label}
                <span className="ml-auto text-[10px] uppercase">yakında</span>
              </span>
            ),
          )}
        </nav>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-surface md:hidden">
        {ITEMS.filter((i) => i.hazir).map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`flex min-h-14 flex-1 flex-col items-center justify-center text-xs ${
              path === i.href ? "font-semibold text-brand" : "text-muted"
            }`}
          >
            <span aria-hidden className="text-lg">
              {i.icon}
            </span>
            {i.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
