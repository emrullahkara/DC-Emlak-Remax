/**
 * Yer Gösterme Belgesi: gösterimden otomatik doldurulmuş belge üretimi.
 */
import type { DataStore } from "@/data/store";
import type { DocumentRow, Office, OfficeMember, Person, Portfolio, Showing } from "@/data/types";
import { autoValues, getTemplate, pickFor, type Template } from "@/domain/templates";
import { createDocument, type Ctx } from "@/components/sozlesme/actions";

export const YGB_KOD = "yer-gosterme-belgesi";

export function ygbTemplate(): Template {
  const t = getTemplate(YGB_KOD);
  if (!t) throw new Error("Yer gösterme belgesi şablonu bulunamadı");
  return t;
}

export function ygbValues(input: { showing: Showing; office: Office; agent: OfficeMember | null; portfolio: Portfolio | null; person: Person | null; now?: Date }): Record<string, string> {
  const t = ygbTemplate();
  const v = pickFor(
    t,
    autoValues({
      kod: YGB_KOD,
      office: input.office,
      member: input.agent,
      portfolio: input.portfolio,
      person: input.person,
      when: new Date(input.showing.planlanan),
      now: input.now,
    }),
  );
  return { ...v, _kisi_id: input.showing.person_id, _gosterim_id: input.showing.id };
}

/** Belgeyi oluşturur ve gösterime bağlar (`yer_gosterme_belgesi_id`). */
export async function createYgbForShowing(store: DataStore, ctx: Ctx, showing: Showing, alanlar: Record<string, string>): Promise<DocumentRow> {
  const doc = await createDocument(store, ctx, ygbTemplate(), alanlar, showing.portfolio_id);
  await store.update("showing", showing.id, { yer_gosterme_belgesi_id: doc.id });
  return doc;
}
