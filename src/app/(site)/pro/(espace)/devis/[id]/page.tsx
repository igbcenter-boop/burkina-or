import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Pill } from "@/components/ui";
import { Composer, Thread } from "@/components/thread";
import { PanelSkeleton } from "@/components/skeletons";
import { requirePro } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dateShort, fcfa } from "@/lib/format";
import { QUOTE_STATUS } from "@/lib/labels";
import { respondQuote } from "@/lib/actions/pro";

export const metadata: Metadata = { title: "Devis" };

export default function SellerQuotePage({ params }: PageProps<"/pro/devis/[id]">) {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/pro/devis/[id]">["params"] }) {
  const { id } = await params;
  const { shop } = await requirePro();
  const supabase = await createClient();
  const { data: q } = await supabase.from("quote_requests").select("*, product:products(name)").eq("id", id).eq("shop_id", shop.id).maybeSingle();
  if (!q) notFound();
  const { data: msgs } = await supabase.from("quote_messages").select("*").eq("quote_id", id).order("created_at");
  const open = !["accepted", "refused", "closed"].includes(q.status);
  const buyer = q.buyer_company ?? q.buyer_name ?? "Acheteur";
  return (
    <div className="flex flex-col gap-4">
      <Link href="/pro/devis" className="text-sm font-semibold">
        ← Demandes de devis
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[13px] text-muted">
            {q.number} · reçue le {dateShort(q.created_at)}
          </div>
          <h1 className="m-0 mt-1 font-serif text-[clamp(30px,3.4vw,42px)] font-semibold">{(q.product as { name: string } | null)?.name ?? q.product_type}</h1>
        </div>
        <Pill tone={QUOTE_STATUS[q.status][1]} className="h-8 px-3.5 text-[13px]">
          {QUOTE_STATUS[q.status][0]}
        </Pill>
      </div>
      <div className="grid gap-4 rounded-xl border border-line bg-white p-5 text-sm sm:grid-cols-4">
        {[
          ["Acheteur", buyer],
          ["Contact", [q.buyer_phone, q.buyer_email].filter(Boolean).join(" · ") || "—"],
          ["Quantité", q.quantity],
          ["Pureté / ville", [q.purity, q.delivery_city].filter(Boolean).join(" · ") || "—"],
        ].map(([k, v]) => (
          <div key={k}>
            <div className="text-xs text-muted">{k}</div>
            <div className="mt-0.5 font-semibold [overflow-wrap:anywhere]">{v}</div>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <Thread
          mine="seller"
          messages={[
            { id: "intro", body: q.message ?? `Demande : ${q.quantity}`, side: "buyer", created_at: q.created_at, author: buyer },
            ...(msgs ?? []).map((m) => ({
              id: m.id,
              body: m.body,
              side: m.sender_side,
              created_at: m.created_at,
              author: m.sender_side === "seller" ? "Vous" : buyer,
              extra: m.price_offer ? (
                <div className="mt-2 rounded-lg bg-white/10 px-3 py-2">
                  <div className="text-xs opacity-70">Offre de prix</div>
                  <div className="text-base font-semibold tnum">{fcfa(m.price_offer)}</div>
                  {m.conditions && <div className="text-xs opacity-70">{m.conditions}</div>}
                </div>
              ) : null,
            })),
          ]}
        />
        {open && (
          <Composer action={respondQuote} hidden={{ quote_id: id }} placeholder="Votre réponse, vos conditions…">
            <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
              <input name="price_offer" inputMode="numeric" placeholder="Offre de prix (FCFA, facultatif)" className="field h-11 tnum" />
              <input name="conditions" placeholder="Conditions (règlement, délai, enlèvement)" className="field h-11" />
              <select name="status" className="field h-11">
                <option value="">Statut automatique</option>
                <option value="refused">Décliner la demande</option>
                <option value="closed">Clôturer</option>
              </select>
            </div>
          </Composer>
        )}
      </div>
    </div>
  );
}
