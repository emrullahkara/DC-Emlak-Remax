/**
 * Veri deposu soyutlaması.
 *
 * Modüller yalnızca `DataStore` arayüzünü kullanır. İki uygulama vardır:
 *  - LocalStore: Supabase yapılandırılmamışsa (demo / pilot) veriyi tarayıcıda
 *    (localStorage) tutar, ilk açılışta örnek veriyle doldurur.
 *  - SupabaseStore: gerçek veritabanı; erişim RLS ile sınırlıdır.
 *
 * Her yazma işleminden sonra `subscribe` ile dinleyen bileşenler yenilenir.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TableName, Tables } from "./types";

export type Row<T extends TableName> = Tables[T];

export interface ListOptions<T extends TableName> {
  /** Eşitlik filtreleri */
  eq?: Partial<Record<keyof Row<T>, unknown>>;
  /** `in` filtresi: alan → değer listesi */
  in?: Partial<Record<keyof Row<T>, unknown[]>>;
  order?: { column: keyof Row<T>; ascending?: boolean };
  limit?: number;
}

export interface DataStore {
  readonly mode: "demo" | "supabase";
  list<T extends TableName>(table: T, opts?: ListOptions<T>): Promise<Row<T>[]>;
  get<T extends TableName>(table: T, id: string): Promise<Row<T> | null>;
  insert<T extends TableName>(table: T, row: Partial<Row<T>>): Promise<Row<T>>;
  update<T extends TableName>(table: T, id: string, patch: Partial<Row<T>>): Promise<Row<T>>;
  remove<T extends TableName>(table: T, id: string): Promise<void>;
  subscribe(fn: (table: TableName) => void): () => void;
}

/** Birincil anahtarı `id` olmayan tablolar */
const COMPOSITE_KEYS: Partial<Record<TableName, string[]>> = {
  office_member: ["office_id", "user_id"],
  portfolio_owner: ["portfolio_id", "person_id"],
};

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function matches<T extends TableName>(row: Row<T>, opts?: ListOptions<T>): boolean {
  if (!opts) return true;
  const r = row as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(opts.eq ?? {})) if (r[k] !== v) return false;
  for (const [k, vs] of Object.entries(opts.in ?? {})) if (!(vs as unknown[]).includes(r[k])) return false;
  return true;
}

function sortRows<T extends TableName>(rows: Row<T>[], opts?: ListOptions<T>) {
  if (!opts?.order) return rows;
  const { column, ascending = true } = opts.order;
  const col = column as string;
  return [...rows].sort((a, b) => {
    const x = (a as unknown as Record<string, unknown>)[col] as string | number | null;
    const y = (b as unknown as Record<string, unknown>)[col] as string | number | null;
    if (x === y) return 0;
    if (x === null || x === undefined) return 1;
    if (y === null || y === undefined) return -1;
    return (x < y ? -1 : 1) * (ascending ? 1 : -1);
  });
}

// ---------------------------------------------------------------------------
// LocalStore
// ---------------------------------------------------------------------------

type DB = { [K in TableName]?: Row<K>[] };

export class LocalStore implements DataStore {
  readonly mode = "demo" as const;
  private db: DB;
  private listeners = new Set<(t: TableName) => void>();

  constructor(
    private readonly key: string,
    seed: () => DB,
    private readonly storage: Pick<Storage, "getItem" | "setItem"> | null = safeLocalStorage(),
  ) {
    let loaded: DB | null = null;
    try {
      const raw = this.storage?.getItem(key);
      if (raw) loaded = JSON.parse(raw) as DB;
    } catch {
      loaded = null;
    }
    this.db = loaded ?? seed();
    if (!loaded) this.persist();
  }

  private persist() {
    try {
      this.storage?.setItem(this.key, JSON.stringify(this.db));
    } catch {
      // Depolama dolu ya da engelli: bellekte çalışmaya devam et
    }
  }

  private emit(t: TableName) {
    this.listeners.forEach((fn) => fn(t));
  }

  private rows<T extends TableName>(t: T): Row<T>[] {
    return (this.db[t] ??= [] as never) as Row<T>[];
  }

  private keyOf<T extends TableName>(t: T, row: Row<T>): string {
    const r = row as unknown as Record<string, unknown>;
    const ck = COMPOSITE_KEYS[t];
    return ck ? ck.map((k) => r[k]).join("|") : String(r.id);
  }

  async list<T extends TableName>(t: T, opts?: ListOptions<T>) {
    const out = sortRows(this.rows(t).filter((r) => matches(r, opts)), opts);
    return structuredClone(opts?.limit ? out.slice(0, opts.limit) : out);
  }

  async get<T extends TableName>(t: T, id: string) {
    const r = this.rows(t).find((x) => this.keyOf(t, x) === id);
    return r ? structuredClone(r) : null;
  }

  async insert<T extends TableName>(t: T, row: Partial<Row<T>>) {
    const now = new Date().toISOString();
    const full = { ...row } as Record<string, unknown>;
    if (!COMPOSITE_KEYS[t] && full.id === undefined) full.id = newId();
    if (full.created_at === undefined) full.created_at = now;
    if (t === "portfolio" && full.updated_at === undefined) full.updated_at = now;
    this.rows(t).push(full as unknown as Row<T>);
    this.persist();
    this.emit(t);
    return structuredClone(full) as unknown as Row<T>;
  }

  async update<T extends TableName>(t: T, id: string, patch: Partial<Row<T>>) {
    const rows = this.rows(t);
    const i = rows.findIndex((x) => this.keyOf(t, x) === id);
    if (i < 0) throw new Error(`${t}/${id} bulunamadı`);
    const next = { ...rows[i], ...patch } as Record<string, unknown>;
    if (t === "portfolio") next.updated_at = new Date().toISOString();
    rows[i] = next as unknown as Row<T>;
    this.persist();
    this.emit(t);
    return structuredClone(rows[i]);
  }

  async remove<T extends TableName>(t: T, id: string) {
    this.db[t] = this.rows(t).filter((x) => this.keyOf(t, x) !== id) as never;
    this.persist();
    this.emit(t);
  }

  subscribe(fn: (t: TableName) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  /** Demo verisini sıfırla */
  reset(seed: () => DB) {
    this.db = seed();
    this.persist();
    (Object.keys(this.db) as TableName[]).forEach((t) => this.emit(t));
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// SupabaseStore
// ---------------------------------------------------------------------------

export class SupabaseStore implements DataStore {
  readonly mode = "supabase" as const;
  private listeners = new Set<(t: TableName) => void>();

  constructor(private readonly sb: SupabaseClient) {}

  private emit(t: TableName) {
    this.listeners.forEach((fn) => fn(t));
  }

  private byKey<T extends TableName>(t: T, id: string) {
    const ck = COMPOSITE_KEYS[t];
    if (!ck) return { filters: [["id", id]] as [string, string][] };
    const parts = id.split("|");
    return { filters: ck.map((k, i) => [k, parts[i]] as [string, string]) };
  }

  async list<T extends TableName>(t: T, opts?: ListOptions<T>) {
    let q = this.sb.from(t).select("*");
    for (const [k, v] of Object.entries(opts?.eq ?? {})) q = q.eq(k, v as never);
    for (const [k, vs] of Object.entries(opts?.in ?? {})) q = q.in(k, vs as never[]);
    if (opts?.order) q = q.order(opts.order.column as string, { ascending: opts.order.ascending ?? true });
    if (opts?.limit) q = q.limit(opts.limit);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Row<T>[];
  }

  async get<T extends TableName>(t: T, id: string) {
    const { filters } = this.byKey(t, id);
    let q = this.sb.from(t).select("*");
    for (const [k, v] of filters) q = q.eq(k, v);
    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    return (data ?? null) as Row<T> | null;
  }

  async insert<T extends TableName>(t: T, row: Partial<Row<T>>) {
    const { data, error } = await this.sb.from(t).insert(row as never).select("*").single();
    if (error) throw error;
    this.emit(t);
    return data as Row<T>;
  }

  async update<T extends TableName>(t: T, id: string, patch: Partial<Row<T>>) {
    const { filters } = this.byKey(t, id);
    const body = t === "portfolio" ? { ...patch, updated_at: new Date().toISOString() } : patch;
    let q = this.sb.from(t).update(body as never);
    for (const [k, v] of filters) q = q.eq(k, v);
    const { data, error } = await q.select("*").single();
    if (error) throw error;
    this.emit(t);
    return data as Row<T>;
  }

  async remove<T extends TableName>(t: T, id: string) {
    const { filters } = this.byKey(t, id);
    let q = this.sb.from(t).delete();
    for (const [k, v] of filters) q = q.eq(k, v);
    const { error } = await q;
    if (error) throw error;
    this.emit(t);
  }

  subscribe(fn: (t: TableName) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
}
