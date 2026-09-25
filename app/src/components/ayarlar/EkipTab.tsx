"use client";

import { useCallback, useEffect, useState } from "react";
import { rpcErrorMessage } from "@/app/kurulum/validation";
import { Badge, Button, Card, Checkbox, ErrorNote, Field, Select, Spinner, toast } from "@/components/ui";
import { useReadySession, useTable } from "@/data/session";
import type { MemberRole, OfficeMember } from "@/data/types";
import { fmtDate } from "@/lib/format";
import { ROLE_LABEL } from "./labels";

const ROLES: MemberRole[] = ["broker", "takim_lideri", "danisman", "asistan"];

interface Invite {
  code: string;
  rol: MemberRole;
  expires_at: string;
  used_by?: string | null;
}

/** Davet bağlantısı ve WhatsApp paylaşım metni */
export function inviteShare(origin: string, unvan: string, code: string) {
  const link = `${origin}/kurulum?davet=${encodeURIComponent(code)}`;
  const text = `${unvan} ekibine DC Emlak üzerinden davet edildiniz.\n\n1) ${link} adresini açın ve e-postanızla giriş yapın.\n2) "Davet koduyla katıl" bölümüne şu kodu girin: ${code}\n\nKod 7 gün geçerlidir ve tek kullanımlıktır.`;
  return { link, text, whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}` };
}

function demoCode() {
  const a = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const buf = new Uint8Array(10);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => a[b % a.length]).join("");
}

export function EkipTab() {
  const { office, member, userId, store, mode, supabase, officeId } = useReadySession();
  const broker = member.rol === "broker";
  const members = useTable("office_member", { eq: { office_id: officeId } });
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [rol, setRol] = useState<MemberRole>("danisman");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [newInvite, setNewInvite] = useState<Invite | null>(null);

  const loadInvites = useCallback(async () => {
    if (mode !== "supabase" || !supabase || !broker) return;
    const { data, error: err } = await supabase
      .from("office_invite")
      .select("code, rol, expires_at, used_by")
      .eq("office_id", officeId)
      .is("used_by", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (err) setError(rpcErrorMessage(err));
    else setInvites((data ?? []) as Invite[]);
  }, [mode, supabase, broker, officeId]);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

  const updateMember = async (m: OfficeMember, patch: Partial<OfficeMember>) => {
    const key = `${m.office_id}|${m.user_id}`;
    setBusyKey(key);
    setError(null);
    try {
      await store.update("office_member", key, patch);
      toast(`${m.ad_soyad} güncellendi`);
    } catch (e) {
      setError(rpcErrorMessage(e));
    } finally {
      setBusyKey(null);
    }
  };

  const createInvite = async () => {
    setError(null);
    setBusyKey("invite");
    try {
      let code: string;
      if (mode === "supabase" && supabase) {
        const { data, error: err } = await supabase.rpc("create_invite", { p_office: officeId, p_rol: rol });
        if (err) throw err;
        code = String(data);
      } else {
        code = demoCode();
      }
      const inv = { code, rol, expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString() };
      setNewInvite(inv);
      await loadInvites();
    } catch (e) {
      setError(rpcErrorMessage(e));
    } finally {
      setBusyKey(null);
    }
  };

  const cancelInvite = async (code: string) => {
    if (!supabase) return;
    const { error: err } = await supabase.from("office_invite").delete().eq("code", code);
    if (err) setError(rpcErrorMessage(err));
    else {
      if (newInvite?.code === code) setNewInvite(null);
      await loadInvites();
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const sorted = [...members.data].sort((a, b) => Number(b.aktif) - Number(a.aktif) || ROLES.indexOf(a.rol) - ROLES.indexOf(b.rol) || a.ad_soyad.localeCompare(b.ad_soyad, "tr"));

  return (
    <div className="space-y-4">
      <Card title={`Ekip (${members.data.filter((m) => m.aktif).length} aktif)`}>
        {members.loading ? (
          <Spinner />
        ) : (
          <ul className="divide-y divide-border">
            {sorted.map((m) => {
              const key = `${m.office_id}|${m.user_id}`;
              const self = m.user_id === userId;
              return (
                <li key={key} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="truncate font-medium">
                      {m.ad_soyad} {self && <span className="text-xs font-normal text-muted">(siz)</span>}
                    </p>
                    <p className="truncate text-xs text-muted">{[m.telefon, m.yetki_belgesi_no && `Belge ${m.yetki_belgesi_no}`].filter(Boolean).join(" · ") || "—"}</p>
                  </div>
                  {broker && !self ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        aria-label={`${m.ad_soyad} rolü`}
                        value={m.rol}
                        disabled={busyKey === key}
                        onChange={(e) => void updateMember(m, { rol: e.target.value as MemberRole })}
                        className="w-auto min-w-40"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </Select>
                      <Checkbox label="Aktif" checked={m.aktif} disabled={busyKey === key} onChange={(e) => void updateMember(m, { aktif: e.target.checked })} />
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Badge tone={m.rol === "broker" ? "brand" : "neutral"}>{ROLE_LABEL[m.rol]}</Badge>
                      {!m.aktif && <Badge tone="warn">Pasif</Badge>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted">Pasif üye giriş yapabilir ama ofis verisine erişemez. Ayrılan danışmanın kayıtlarını devretmeyi unutmayın.</p>
      </Card>

      <ErrorNote error={error} />

      {broker ? (
        <Card title="Ekibe davet et">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-56">
              <Field label="Rol">
                <Select value={rol} onChange={(e) => setRol(e.target.value as MemberRole)}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button variant="primary" onClick={() => void createInvite()} disabled={busyKey === "invite"}>
              {busyKey === "invite" ? "Oluşturuluyor…" : "Davet kodu oluştur"}
            </Button>
          </div>

          {newInvite && (
            <div className="mt-4 rounded-lg border border-ok/30 bg-ok/10 p-3">
              <p className="text-sm">
                Davet kodu ({ROLE_LABEL[newInvite.rol]}): <b className="select-all font-mono text-lg tracking-widest">{newInvite.code}</b>
              </p>
              <p className="mt-1 text-xs text-muted">7 gün geçerli, tek kullanımlık.{mode === "demo" && " Demo modunda kod gerçek değildir; Supabase bağlandığında çalışır."}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={inviteShare(origin, office.unvan, newInvite.code).whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-8 items-center justify-center rounded-lg border border-ok bg-ok px-2.5 text-xs font-medium text-white hover:opacity-90"
                >
                  WhatsApp ile gönder
                </a>
                <Button
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard?.writeText(inviteShare(origin, office.unvan, newInvite.code).text).then(
                      () => toast("Davet metni kopyalandı"),
                      () => toast("Kopyalanamadı; kodu elle paylaşın"),
                    );
                  }}
                >
                  Metni kopyala
                </Button>
              </div>
            </div>
          )}

          {invites.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Bekleyen davetler</p>
              <ul className="divide-y divide-border text-sm">
                {invites.map((i) => (
                  <li key={i.code} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="font-mono tracking-widest">{i.code}</span>
                    <span className="text-xs text-muted">
                      {ROLE_LABEL[i.rol]} · {fmtDate(i.expires_at)} tarihine kadar
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => void cancelInvite(i.code)}>
                      İptal et
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      ) : (
        <p className="text-sm text-muted">Ekibe yeni üye davet etmek için broker&apos;ınızla iletişime geçin.</p>
      )}
    </div>
  );
}
