import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, Pill } from "@/components/ui";
import { PanelSkeleton } from "@/components/skeletons";
import { requirePro } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { since } from "@/lib/format";
import { QUOTE_STATUS } from "@/lib/labels";

export const metadata: Metadata = { title: "Demandes de devis" };

export default function SellerQuotesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="m-0 font-serif text-[clamp(32px,3.6vw,44px)] font-semibold">Demandes de devis</h1>
      <Suspense fallback={<PanelSkeleton />}>
        <List />
      </Suspense>
    </div>
  );
}

async function List() {
  const { shop } = await requirePro();
  const supabase = await createClient();
  const { data } = await supabase.from("quote_requests").select("*, product:products(name)").eq("shop_id", shop.id).order("updated_at", { ascending: false });
  if (!data?.length) return <EmptyState icon="quote" title="Aucune demande" text="Les acheteurs professionnels vous contactent depuis vos offres et votre page." />;
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      {data.map((q) => (
        <Link key={q.id} href={`/pro/devis/${q.id}`} className="flex flex-wrap items-center gap-4 border-t border-sand px-5 py-4 text-text first:border-0 hover:bg-ivory hover:text-text">
          <div className="min-w-[220px] flex-1">
            <div className="flex items-center gap-2.5">
              <span className="font-semibold">{q.number}</span>
              <Pill tone={QUOTE_STATUS[q.status][1]}>{QUOTE_STATUS[q.status][0]}</Pill>
            </div>
            <div className="mt-1 text-[13px] text-muted">
              {q.buyer_company ?? q.buyer_name} · {(q.product as { name: string } | null)?.name ?? q.product_type} · {q.quantity}
              {q.delivery_city ? ` · ${q.delivery_city}` : ""}
            </div>
          </div>
          <span className="text-xs text-muted">{since(q.updated_at)}</span>
        </Link>
      ))}
    </div>
  );
}
