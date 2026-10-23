import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, Pill } from "@/components/ui";
import { PanelSkeleton } from "@/components/skeletons";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dateShort } from "@/lib/format";
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUS } from "@/lib/labels";

export const metadata: Metadata = { title: "Mes réclamations" };

export default function ComplaintsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 font-serif text-[clamp(32px,3.6vw,44px)] font-semibold">Réclamations</h1>
        <Link href="/compte/reclamations/nouvelle" className="btn-gold h-10 text-[13px]">
          Nouvelle réclamation
        </Link>
      </div>
      <Suspense fallback={<PanelSkeleton />}>
        <List />
      </Suspense>
    </div>
  );
}

async function List() {
  const s = await requireUser("/compte/reclamations");
  const supabase = await createClient();
  const { data } = await supabase.from("complaints").select("*, order:orders(number)").eq("user_id", s.userId).order("created_at", { ascending: false });
  if (!data?.length) return <EmptyState icon="flag" title="Aucune réclamation" text="Un souci avec une commande, une livraison ou un vendeur ? Ouvrez un dossier, il sera suivi jusqu'à sa résolution." />;
  return (
    <div className="flex flex-col gap-3">
      {data.map((c) => (
        <Link key={c.id} href={`/compte/reclamations/${c.id}`} className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-white p-5 text-text hover:text-text">
          <div className="min-w-[200px] flex-1">
            <div className="flex items-center gap-2.5">
              <span className="font-semibold">{c.subject}</span>
              <Pill tone={COMPLAINT_STATUS[c.status][1]}>{COMPLAINT_STATUS[c.status][0]}</Pill>
            </div>
            <div className="mt-1 text-[13px] text-muted">
              {c.number} · {COMPLAINT_CATEGORIES[c.category] ?? c.category}
              {(c.order as { number: string } | null)?.number ? ` · ${(c.order as { number: string }).number}` : ""} · {dateShort(c.created_at)}
            </div>
          </div>
          <span className="text-[13px] font-semibold text-gold-dark">Ouvrir →</span>
        </Link>
      ))}
    </div>
  );
}
