"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { DataProvider, useSession } from "@/data/session";
import { AppNav } from "./AppNav";
import { Spinner, ToastHost } from "./ui";

/** Oturum gerektirmeyen sayfalar (giriş, kurulum, uzaktan imza) */
const PUBLIC = ["/giris", "/kurulum", "/imza"];
const isPublic = (p: string) => PUBLIC.some((x) => p === x || p.startsWith(x + "/"));

function Gate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { status, mode } = useSession();
  const pub = isPublic(path);

  useEffect(() => {
    if (pub) return;
    if (status === "anon") router.replace(`/giris?next=${encodeURIComponent(path)}`);
    if (status === "no_office") router.replace("/kurulum");
  }, [status, pub, path, router]);

  if (pub) return <main className="min-h-dvh px-4 py-8">{children}</main>;
  if (status !== "ready") return <Spinner />;

  return (
    <div className="flex min-h-dvh">
      <AppNav />
      <main className="min-w-0 flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-8">
        {mode === "demo" && (
          <p className="mx-auto mb-4 max-w-6xl rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
            Demo modu: örnek verilerle çalışıyor, değişiklikler yalnızca bu tarayıcıda saklanır. Gerçek kullanım için Supabase bağlayın (Ayarlar).
          </p>
        )}
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <DataProvider>
      <Gate>{children}</Gate>
      <ToastHost />
    </DataProvider>
  );
}
