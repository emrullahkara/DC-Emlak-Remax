"use client";

/**
 * Oturum ve veri sağlayıcısı.
 *
 * Supabase yapılandırılmışsa kullanıcı girişi ve ofis üyeliği aranır;
 * yapılandırılmamışsa uygulama "demo" modunda örnek ofisle açılır.
 */
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { buildSeed, DEMO_OFFICE_ID, DEMO_USER_ID } from "./seed";
import { LocalStore, SupabaseStore, type DataStore, type ListOptions, type Row } from "./store";
import type { Office, OfficeMember, TableName } from "./types";

export type SessionStatus = "loading" | "anon" | "no_office" | "ready";

export interface Session {
  status: SessionStatus;
  mode: "demo" | "supabase";
  store: DataStore;
  supabase: SupabaseClient | null;
  user: Pick<User, "id" | "email"> | null;
  office: Office | null;
  member: OfficeMember | null;
  /** Ofis veya üyelik değiştiğinde yeniden yükle */
  refresh: () => Promise<void>;
  /** Yalnızca demo modda: örnek veriyi sıfırla */
  resetDemo?: () => void;
}

const Ctx = createContext<Session | null>(null);

const DEMO_KEY = "dc-emlak-demo-v1";

export function DataProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabase(), []);
  const store = useMemo<DataStore>(
    () => (supabase ? new SupabaseStore(supabase) : new LocalStore(DEMO_KEY, () => buildSeed())),
    [supabase],
  );

  const [status, setStatus] = useState<SessionStatus>("loading");
  const [user, setUser] = useState<Session["user"]>(null);
  const [office, setOffice] = useState<Office | null>(null);
  const [member, setMember] = useState<OfficeMember | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      const [o, m] = await Promise.all([
        store.get("office", DEMO_OFFICE_ID),
        store.get("office_member", `${DEMO_OFFICE_ID}|${DEMO_USER_ID}`),
      ]);
      setUser({ id: DEMO_USER_ID, email: "demo@dcemlak.local" });
      setOffice(o);
      setMember(m);
      setStatus("ready");
      return;
    }
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setUser(null);
      setOffice(null);
      setMember(null);
      setStatus("anon");
      return;
    }
    setUser({ id: data.user.id, email: data.user.email });
    const members = await store.list("office_member", { eq: { user_id: data.user.id, aktif: true } });
    const m = members[0] ?? null;
    if (!m) {
      setOffice(null);
      setMember(null);
      setStatus("no_office");
      return;
    }
    setMember(m);
    setOffice(await store.get("office", m.office_id));
    setStatus("ready");
  }, [store, supabase]);

  useEffect(() => {
    // İlk yükleme; durum güncellemeleri asenkron gelir
    void load();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(() => void load());
    return () => data.subscription.unsubscribe();
  }, [load, supabase]);

  const value = useMemo<Session>(
    () => ({
      status,
      mode: store.mode,
      store,
      supabase,
      user,
      office,
      member,
      refresh: load,
      resetDemo:
        store instanceof LocalStore
          ? () => {
              store.reset(() => buildSeed());
              void load();
            }
          : undefined,
    }),
    [status, store, supabase, user, office, member, load],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSession, DataProvider içinde kullanılmalı");
  return s;
}

/** Hazır oturum: ofis ve üye kesin mevcut (AppShell yalnızca "ready" iken sayfaları çizer) */
export function useReadySession() {
  const s = useSession();
  if (s.status !== "ready" || !s.office || !s.member || !s.user) {
    throw new Error("Oturum hazır değil");
  }
  return { ...s, office: s.office, member: s.member, user: s.user, officeId: s.office.id, userId: s.user.id };
}

export interface QueryState<T> {
  data: T;
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

/**
 * Bir tabloyu okur; tabloya yazıldığında (aynı istemciden) otomatik yenilenir.
 * `opts` her render'da yeni nesne olabilir; karşılaştırma JSON ile yapılır.
 */
export function useTable<T extends TableName>(table: T, opts?: ListOptions<T>, enabled = true): QueryState<Row<T>[]> {
  const { store } = useSession();
  const key = JSON.stringify(opts ?? {});
  const [state, setState] = useState<{ data: Row<T>[]; loading: boolean; error: Error | null }>({
    data: [],
    loading: true,
    error: null,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    store
      .list(table, JSON.parse(key) as ListOptions<T>)
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error: Error) => alive && setState((s) => ({ ...s, loading: false, error })));
    return () => {
      alive = false;
    };
  }, [store, table, key, tick, enabled]);

  useEffect(() => store.subscribe((t) => t === table && setTick((n) => n + 1)), [store, table]);

  return { ...state, reload: () => setTick((n) => n + 1) };
}

/** Tek satır okur (id ile); yazmalarda yenilenir. */
export function useRow<T extends TableName>(table: T, id: string | null | undefined): QueryState<Row<T> | null> {
  const { store } = useSession();
  const [state, setState] = useState<{ data: Row<T> | null; loading: boolean; error: Error | null }>({
    data: null,
    loading: true,
    error: null,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    store
      .get(table, id)
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error: Error) => alive && setState((s) => ({ ...s, loading: false, error })));
    return () => {
      alive = false;
    };
  }, [store, table, id, tick]);

  useEffect(() => store.subscribe((t) => t === table && setTick((n) => n + 1)), [store, table]);

  return { ...state, loading: id ? state.loading : false, reload: () => setTick((n) => n + 1) };
}
