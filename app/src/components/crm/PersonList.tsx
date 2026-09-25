"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useReadySession, useTable } from "@/data/session";
import type { Person, PersonType } from "@/data/types";
import { Badge, ButtonLink, EmptyState, ErrorNote, Input, PageHeader, Spinner, Table, cx } from "@/components/ui";
import { coolingStatus, missingConsents, personHeatFromRows, personMatchesQuery } from "@/domain/crm";
import { PERSON_TYPES, fmtDateTime, relDay } from "@/lib/format";
import { Avatar, HeatBar, profileSummary, seesAll } from "./common";

type TipFiltre = "tumu" | PersonType;

export function PersonList() {
  const { officeId, userId, member } = useReadySession();
  const router = useRouter();
  const tumunuGorur = seesAll(member.rol);
  const [kapsam, setKapsam] = useState<"benim" | "ofis">(tumunuGorur ? "ofis" : "benim");
  const [tip, setTip] = useState<TipFiltre>("tumu");
  const [q, setQ] = useState("");

  const persons = useTable("person", { eq: { office_id: officeId }, order: { column: "ad_soyad" } });
  const profiles = useTable("search_profile");
  const showings = useTable("showing", { eq: { office_id: officeId } });
  const consents = useTable("consent");
  const members = useTable("office_member", { eq: { office_id: officeId } });

  const now = useMemo(() => new Date(), []);
  const memberName = useMemo(() => new Map(members.data.map((m) => [m.user_id, m.ad_soyad])), [members.data]);

  const rows = useMemo(() => {
    const kapsamli = persons.data.filter((p) => (kapsam === "benim" || !tumunuGorur ? p.owner_id === userId : true));
    return kapsamli.map((p) => {
      const heat = personHeatFromRows(p, profiles.data, showings.data, now);
      const arayis = profiles.data.find((sp) => sp.person_id === p.id && sp.aktif) ?? null;
      const cooling = coolingStatus(p, now);
      const rizaEksik = missingConsents(consents.data.filter((c) => c.person_id === p.id));
      return { p, heat: heat.puan, arayis, cooling, rizaEksik };
    });
  }, [persons.data, profiles.data, showings.data, consents.data, kapsam, tumunuGorur, userId, now]);

  const sayac = useMemo(() => {
    const m: Record<string, number> = { tumu: rows.length };
    rows.forEach((r) => r.p.tipler.forEach((t) => (m[t] = (m[t] ?? 0) + 1)));
    return m;
  }, [rows]);

  const filtered = rows
    .filter((r) => tip === "tumu" || r.p.tipler.includes(tip))
    .filter((r) => personMatchesQuery(r.p, q))
    .sort((a, b) => Number(b.cooling.soguyor) - Number(a.cooling.soguyor) || b.heat - a.heat);

  const soguyan = rows.filter((r) => r.cooling.soguyor).length;
  const tipler: { id: TipFiltre; label: string }[] = [
    { id: "tumu", label: "Tümü" },
    ...(Object.keys(PERSON_TYPES) as PersonType[]).filter((t) => sayac[t]).map((t) => ({ id: t, label: PERSON_TYPES[t]! })),
  ];

  return (
    <div>
      <PageHeader
        title="Müşteriler"
        subtitle={`${rows.length} kişi · ${soguyan} kişi soğuyor`}
        actions={
          <ButtonLink href="/musteriler/yeni" variant="primary">
            + Yeni müşteri
          </ButtonLink>
        }
      />

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="search"
            placeholder="İsim, telefon veya e-posta ara"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Müşteri ara"
            className="min-w-0 flex-1 basis-60"
          />
          {tumunuGorur && (
            <div role="group" aria-label="Kapsam" className="inline-flex rounded-lg border border-border bg-surface p-0.5">
              {(
                [
                  ["benim", "Benim"],
                  ["ofis", "Tüm ofis"],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kapsam === k}
                  onClick={() => setKapsam(k)}
                  className={cx("min-h-9 rounded-md px-3 text-sm", kapsam === k ? "bg-brand text-white" : "text-muted hover:text-text")}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Kişi tipi">
          {tipler.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tip === t.id}
              onClick={() => setTip(t.id)}
              className={cx(
                "min-h-8 flex-none rounded-full border px-3 text-xs font-medium",
                tip === t.id ? "border-brand bg-brand text-white" : "border-border bg-surface hover:bg-bg",
              )}
            >
              {t.label} <span className="opacity-70">{sayac[t.id] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <ErrorNote error={persons.error} />
      {persons.loading ? (
        <Spinner />
      ) : !filtered.length ? (
        <EmptyState
          title={rows.length ? "Sonuç yok" : "Henüz müşteri yok"}
          action={
            !rows.length && (
              <ButtonLink href="/musteriler/yeni" variant="primary">
                İlk müşteriyi ekle
              </ButtonLink>
            )
          }
        >
          {rows.length ? "Arama veya filtreyi değiştirin." : "Alıcı, satıcı ve kiracılarınızı ekleyin; hiçbiri soğumasın."}
        </EmptyState>
      ) : (
        <>
          {/* Mobil: kart listesi */}
          <ul className="space-y-2 md:hidden">
            {filtered.map((r) => (
              <li key={r.p.id}>
                <Link href={`/musteriler/${r.p.id}`} className="flex gap-3 rounded-xl border border-border bg-surface p-3">
                  <Avatar name={r.p.ad_soyad} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-medium">{r.p.ad_soyad}</p>
                      <HeatBar value={r.heat} />
                    </div>
                    <p className="truncate text-xs text-muted">
                      {r.p.tipler.map((t) => PERSON_TYPES[t]).join(", ")}
                      {r.p.telefon ? ` · ${r.p.telefon}` : ""}
                    </p>
                    {r.arayis && <p className="mt-1 truncate text-xs">{profileSummary(r.arayis)}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                      <LastContact r={r} />
                      {r.p.sonraki_adim && <span className="truncate text-muted">→ {r.p.sonraki_adim}</span>}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Masaüstü: tablo */}
          <div className="hidden md:block">
            <Table>
              <thead>
                <tr>
                  <th>Kişi</th>
                  <th>Isı</th>
                  <th>Arayış</th>
                  <th>Son temas</th>
                  <th>Sonraki adım</th>
                  {kapsam === "ofis" && tumunuGorur && <th>Danışman</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.p.id}
                    className="cursor-pointer hover:bg-bg"
                    onClick={() => router.push(`/musteriler/${r.p.id}`)}
                  >
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.p.ad_soyad} />
                        <div className="min-w-0">
                          <Link href={`/musteriler/${r.p.id}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                            {r.p.ad_soyad}
                          </Link>
                          <div className="flex flex-wrap items-center gap-1 text-xs text-muted">
                            {r.p.tipler.map((t) => PERSON_TYPES[t]).join(", ")}
                            {r.p.telefon && <span>· {r.p.telefon}</span>}
                            {r.rizaEksik.length > 0 && <Badge tone="warn">KVKK rıza eksik</Badge>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <HeatBar value={r.heat} />
                    </td>
                    <td className="max-w-64 text-xs">{r.arayis ? profileSummary(r.arayis) : <span className="text-muted">—</span>}</td>
                    <td className="whitespace-nowrap text-xs">
                      <LastContact r={r} />
                    </td>
                    <td className="max-w-56 text-xs">
                      {r.p.sonraki_adim ? (
                        <>
                          <div className="truncate">{r.p.sonraki_adim}</div>
                          <div className="text-muted">{fmtDateTime(r.p.sonraki_adim_tarihi)}</div>
                        </>
                      ) : (
                        <span className="text-block">Planlanmamış</span>
                      )}
                    </td>
                    {kapsam === "ofis" && tumunuGorur && <td className="text-xs text-muted">{memberName.get(r.p.owner_id) ?? "—"}</td>}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

function LastContact({ r }: { r: { p: Person; cooling: { soguyor: boolean; nedenler: string[] } } }) {
  const label = r.p.son_temas ? relDay(r.p.son_temas) : "Temas yok";
  if (r.cooling.soguyor) {
    return (
      <span title={r.cooling.nedenler.join(" · ")}>
        <Badge tone="block">{label} · soğuyor</Badge>
      </span>
    );
  }
  return relDay(r.p.son_temas) === "Bugün" ? <Badge tone="ok">Bugün</Badge> : <span className="text-muted">{label}</span>;
}
