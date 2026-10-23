import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PanelSkeleton } from "@/components/skeletons";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ComplaintForm } from "./form";

export const metadata: Metadata = { title: "Nouvelle réclamation" };

export default function NewComplaintPage({ searchParams }: PageProps<"/compte/reclamations/nouvelle">) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/compte/reclamations" className="text-sm font-semibold">
        ← Réclamations
      </Link>
      <h1 className="m-0 font-serif text-[clamp(32px,3.6vw,44px)] font-semibold">Nouvelle réclamation</h1>
      <Suspense fallback={<PanelSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/compte/reclamations/nouvelle">["searchParams"] }) {
  const sp = await searchParams;
  const s = await requireUser("/compte/reclamations/nouvelle");
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("id, number, created_at").eq("user_id", s.userId).order("created_at", { ascending: false }).limit(30);
  return <ComplaintForm orders={(data ?? []).map((o) => ({ id: o.id, number: o.number }))} defaultOrder={typeof sp.commande === "string" ? sp.commande : ""} />;
}
