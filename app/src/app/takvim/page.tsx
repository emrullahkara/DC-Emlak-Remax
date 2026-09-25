import type { Metadata } from "next";
import { CalendarPage } from "@/components/takvim/CalendarPage";

export const metadata: Metadata = { title: "Takvim & Gösterim · DC Emlak" };

export default function TakvimPage() {
  return <CalendarPage />;
}
