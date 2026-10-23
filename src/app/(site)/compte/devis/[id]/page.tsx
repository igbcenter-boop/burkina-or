import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Pill } from "@/components/ui";
import { Composer, Thread } from "@/components/thread";
import { PanelSkeleton } from "@/components/skeletons";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dateShort, fcfa } from "@/lib/format";
import { QUOTE_STATUS } from "@/lib/labels";
import { buyerQuoteAction } from "@/lib/actions/account";
import { QuoteDecision } from "./decision";

export const metadata: Metadata = { title: "Demande de devis" };

export default function QuotePage({ params }: PageProps<"/compte/devis/[id]">) {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/compte/devis/[id]">["params"] }) {
  const { id } = await params;
  const s = await requireUser(`/compte/devis/${id}`);
  const supabase = await createClient();
  const { data: q } = await supabase.from("quote_requests").select("*, shop:shops(name,city), product:products(name)").eq("id", id).maybeSingle();
  if (!q || q.buyer_id !== s.userId) notFound();
  const { data: msgs } = await supabase.from("quote_messages").select("*").eq("quote_id", id).order("created_at");
  const shop = q.shop as { name: string; city: string };
  const hasOffer = (msgs ?? []).some((m) => m.sender_side === "seller" && m.price_offer);
  const open = !["accepted", "refused", "closed"].includes(q.status);
  const intro = { id: "intro", body: `Quantité : ${q.quantity}${q.purity ? ` · pureté ${q.purity}` : ""}${q.delivery_city ? ` · livraison ${q.delivery_city}` : ""}${q.budget ? ` · budget ${q.budget}` : ""}${q.message ? `\n\n${q.message}` : ""}`, side: "buyer", created_at: q.created_at, author: "Vous" };

  return (
    <div className="flex flex-col gap-4">
      <Link href="/compte/devis" className="text-sm font-semibold">
        ← Demandes de devis
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[13px] text-muted">
            {q.number} · {dateShort(q.created_at)}
          </div>
          <h1 className="m-0 mt-1 font-serif text-[clamp(30px,3.4vw,42px)] font-semibold">{(q.product as { name: string } | null)?.name ?? q.product_type ?? "Demande de devis"}</h1>
          <div className="text-sm text-muted">
            {shop.name} · {shop.city}
          </div>
        </div>
        <Pill tone={QUOTE_STATUS[q.status][1]} className="h-8 px-3.5 text-[13px]">
          {QUOTE_STATUS[q.status][0]}
        </Pill>
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <Thread
          mine="buyer"
          messages={[
            intro,
            ...(msgs ?? []).map((m) => ({
              id: m.id,
              body: m.body,
              side: m.sender_side,
              created_at: m.created_at,
              author: m.sender_side === "buyer" ? "Vous" : shop.name,
              extra: m.price_offer ? (
                <div className="mt-2 rounded-lg bg-white/80 px-3 py-2 text-text">
                  <div className="text-xs text-muted">Offre de prix</div>
                  <div className="text-base font-semibold tnum">{fcfa(m.price_offer)}</div>
                  {m.conditions && <div className="text-xs text-muted">{m.conditions}</div>}
                </div>
              ) : null,
            })),
          ]}
        />
        {open && hasOffer && <QuoteDecision id={id} />}
        {open && <Composer action={buyerQuoteAction} hidden={{ quote_id: id, action: "message" }} placeholder="Négocier, poser une question…" />}
      </div>
    </div>
  );
}
