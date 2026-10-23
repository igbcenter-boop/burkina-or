import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, Pill } from "@/components/ui";
import { PanelSkeleton } from "@/components/skeletons";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dateShort } from "@/lib/format";
import { QUOTE_STATUS } from "@/lib/labels";

export const metadata: Metadata = { title: "Mes demandes de devis" };

export default function QuotesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 font-serif text-[clamp(32px,3.6vw,44px)] font-semibold">Demandes de devis</h1>
        <Link href="/grossistes" className="btn-outline h-10 text-[13px]">
          Nouvelle demande
        </Link>
      </div>
      <Suspense fallback={<PanelSkeleton />}>
        <List />
      </Suspense>
    </div>
  );
}

async function List() {
  const s = await requireUser("/compte/devis");
  const supabase = await createClient();
  const { data } = await supabase.from("quote_requests").select("*, shop:shops(name), product:products(name)").eq("buyer_id", s.userId).order("updated_at", { ascending: false });
  if (!data?.length) return <EmptyState icon="quote" title="Aucune demande" text="Demandez un devis à un comptoir, un grossiste ou un fondeur depuis leur page." />;
  return (
    <div className="flex flex-col gap-3">
      {data.map((q) => (
        <Link key={q.id} href={`/compte/devis/${q.id}`} className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-white p-5 text-text hover:text-text">
          <div className="min-w-[200px] flex-1">
            <div className="flex items-center gap-2.5">
              <span className="font-semibold">{q.number}</span>
              <Pill tone={QUOTE_STATUS[q.status][1]}>{QUOTE_STATUS[q.status][0]}</Pill>
            </div>
            <div className="mt-1 text-[13px] text-muted">
              {(q.shop as { name: string })?.name} · {(q.product as { name: string } | null)?.name ?? q.product_type} · {q.quantity} · {dateShort(q.created_at)}
            </div>
          </div>
          <span className="text-[13px] font-semibold text-gold-dark">Ouvrir →</span>
        </Link>
      ))}
    </div>
  );
}
