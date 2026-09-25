"use client";

import { useState } from "react";
import { Button, PageHeader, Tabs } from "@/components/ui";
import { useReadySession } from "@/data/session";
import { PLANS } from "@/lib/plans";
import { EkipTab } from "./EkipTab";
import { EntegrasyonTab } from "./EntegrasyonTab";
import { OfisTab } from "./OfisTab";
import { PaketTab } from "./PaketTab";
import { ParametreTab } from "./ParametreTab";
import { ROLE_LABEL } from "./labels";
import { VeriTab } from "./VeriTab";

type TabId = "ofis" | "ekip" | "paket" | "entegrasyon" | "veri" | "parametre";

const TABS: { id: TabId; label: string }[] = [
  { id: "ofis", label: "Ofis" },
  { id: "ekip", label: "Ekip" },
  { id: "paket", label: "Paket" },
  { id: "entegrasyon", label: "Entegrasyonlar" },
  { id: "veri", label: "Veri & KVKK" },
  { id: "parametre", label: "Parametreler" },
];

export function Ayarlar() {
  const { office, member, user, mode, supabase } = useReadySession();
  const [tab, setTab] = useState<TabId>("ofis");

  return (
    <div>
      <PageHeader
        title="Ayarlar & Paket"
        subtitle={`${office.unvan} · ${PLANS[office.plan].ad} paket · ${member.ad_soyad} (${ROLE_LABEL[member.rol]})`}
        actions={
          mode === "supabase" && supabase ? (
            <Button
              onClick={() => {
                void supabase.auth.signOut();
              }}
              title={user.email ?? undefined}
            >
              Çıkış yap
            </Button>
          ) : undefined
        }
      />
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      <div className="pt-4">
        {tab === "ofis" && <OfisTab />}
        {tab === "ekip" && <EkipTab />}
        {tab === "paket" && <PaketTab />}
        {tab === "entegrasyon" && <EntegrasyonTab />}
        {tab === "veri" && <VeriTab />}
        {tab === "parametre" && <ParametreTab />}
      </div>
    </div>
  );
}
