"use client";

import { useParams } from "next/navigation";
import { DocumentDetail } from "@/components/sozlesme/DocumentDetail";

export default function BelgePage() {
  const { id } = useParams<{ id: string }>();
  return <DocumentDetail key={id} id={id} />;
}
