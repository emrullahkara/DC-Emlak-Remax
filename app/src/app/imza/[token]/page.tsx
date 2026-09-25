"use client";

import { useParams } from "next/navigation";
import { PublicSignPage } from "@/components/sozlesme/PublicSignPage";

export default function ImzaPage() {
  const { token } = useParams<{ token: string }>();
  return <PublicSignPage key={token} token={decodeURIComponent(token)} />;
}
