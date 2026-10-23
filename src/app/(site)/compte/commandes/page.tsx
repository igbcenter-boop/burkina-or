import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, Pill } from "@/components/ui";
import { PanelSkeleton } from "@/components/skeletons";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dateShort, fcfa, orderNo } from "@/lib/format";
import { ORDER_STATUS, PAYMENT_METHODS } from "@/lib/labels";
import type { Order } from "@/lib/types";

export const metadata: Metadata = { title: "Mes commandes" };

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="m-0 font-serif text-[clamp(32px,3.6vw,44px)] font-semibold">Mes commandes</h1>
      <Suspense fallback={<PanelSkeleton />}>
        <List />
      </Suspense>
    </div>
  );
}

async function List() {
  const s = await requireUser("/compte/commandes");
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("*, order_items(name,qty)").eq("user_id", s.userId).order("created_at", { ascending: false });
  const orders = (data ?? []) as (Order & { order_items: { name: string; qty: number }[] })[];
  if (!orders.length)
    return (
      <EmptyState icon="receipt" title="Aucune commande" text="Vos achats apparaîtront ici avec leur suivi de livraison, leurs factures et certificats.">
        <Link href="/boutique-officielle" className="btn-gold">
          Voir les lingotins
        </Link>
      </EmptyState>
    );
  return (
    <div className="flex flex-col gap-3">
      {orders.map((o) => (
        <Link key={o.id} href={`/compte/commandes/${o.number}`} className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-white p-5 text-text hover:text-text hover:shadow-[0_10px_28px_-16px_rgba(26,24,20,.2)]">
          <div className="min-w-[200px] flex-1">
            <div className="flex items-center gap-2.5">
              <span className="font-semibold tnum">{orderNo(o.number)}</span>
              <Pill tone={ORDER_STATUS[o.status][1]} dot>
                {ORDER_STATUS[o.status][0]}
              </Pill>
            </div>
            <div className="mt-1 text-[13px] text-muted">
              {dateShort(o.created_at)} · {PAYMENT_METHODS[o.payment_method][0]} · {o.order_items.map((i) => `${i.name}${i.qty > 1 ? ` × ${i.qty}` : ""}`).join(", ")}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold tnum">{fcfa(o.total)}</div>
            <div className="text-[13px] font-semibold text-gold-dark">Suivre →</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
