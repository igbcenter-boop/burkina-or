import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyState, Pill } from "@/components/ui";
import { PanelSkeleton } from "@/components/skeletons";
import { requirePro } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dateCompact, fcfa, orderNo } from "@/lib/format";
import { ORDER_STATUS, PAYMENT_METHODS, SHIPMENT_STATUS } from "@/lib/labels";
import type { Order, OrderItem, Shipment } from "@/lib/types";
import { ItemActions, SealForm } from "./actions";

export const metadata: Metadata = { title: "Commandes" };

export default function SellerOrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="m-0 font-serif text-[clamp(32px,3.6vw,44px)] font-semibold">Commandes</h1>
      <Suspense fallback={<PanelSkeleton />}>
        <List />
      </Suspense>
    </div>
  );
}

const SELLER: Record<string, [string, "ok" | "warn" | "err" | "info"]> = {
  pending: ["À confirmer", "warn"],
  confirmed: ["Disponibilité confirmée", "ok"],
  unavailable: ["Indisponible", "err"],
  preparing: ["En préparation", "info"],
  ready: ["Scellé · prêt pour collecte", "ok"],
};

async function List() {
  const { shop } = await requirePro();
  const supabase = await createClient();
  const { data: items } = await supabase.from("order_items").select("*, order:orders!inner(*)").eq("shop_id", shop.id).order("created_at", { ascending: false }).limit(200);
  const its = (items ?? []) as (OrderItem & { order: Order })[];
  const orderIds = [...new Set(its.map((i) => i.order_id))];
  const { data: ships } = orderIds.length ? await supabase.from("shipments").select("*").in("order_id", orderIds).eq("shop_id", shop.id) : { data: [] };
  const shipBy = new Map(((ships ?? []) as Shipment[]).map((s) => [s.order_id, s]));
  const groups = orderIds.map((id) => ({ order: its.find((i) => i.order_id === id)!.order, items: its.filter((i) => i.order_id === id), ship: shipBy.get(id) }));
  if (!groups.length) return <EmptyState icon="receipt" title="Aucune commande" text="Les commandes de vos produits apparaîtront ici dès leur paiement." />;

  return (
    <div className="flex flex-col gap-4">
      {groups.map(({ order: o, items: list, ship }) => {
        const paid = o.payment_status === "paid";
        const active = paid && !["cancelled", "refunded", "delivered"].includes(o.status);
        const sub = list.reduce((s, i) => s + Number(i.line_total), 0);
        const com = list.reduce((s, i) => s + Number(i.commission_amount), 0);
        return (
          <section key={o.id} className="overflow-hidden rounded-xl border border-line bg-white">
            <div className="flex flex-wrap items-center gap-3 border-b border-sand px-5 py-4">
              <div className="min-w-[200px] flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold tnum">{orderNo(o.number)}</span>
                  <Pill tone={ORDER_STATUS[o.status][1]} dot>
                    {ORDER_STATUS[o.status][0]}
                  </Pill>
                </div>
                <div className="mt-1 text-[13px] text-muted">
                  {dateCompact(o.created_at)} · {o.customer_name} · {o.delivery_mode === "domicile" ? `livraison ${o.city}` : "retrait en agence"} · {PAYMENT_METHODS[o.payment_method][0]} {paid ? "✓" : "(en attente)"}
                </div>
              </div>
              <div className="text-right text-[13px]">
                <div className="font-semibold tnum">{fcfa(sub)}</div>
                <div className="text-muted tnum">net {fcfa(sub - com)}</div>
              </div>
            </div>
            {list.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center gap-4 border-b border-sand px-5 py-3.5">
                <div className="min-w-[200px] flex-1">
                  <div className="font-medium">
                    {i.name} × {i.qty}
                  </div>
                  <div className="text-xs text-muted">
                    {i.meta}
                    {i.options?.engraving ? ` · gravure « ${i.options.engraving} »` : ""}
                  </div>
                </div>
                <Pill tone={SELLER[i.seller_status][1]}>{SELLER[i.seller_status][0]}</Pill>
                {active && <ItemActions id={i.id} status={i.seller_status} />}
              </div>
            ))}
            {ship && (
              <div className="flex flex-wrap items-center gap-3 bg-ivory px-5 py-3.5 text-[13px]">
                <span className="flex-1 text-muted">
                  Expédition · {ship.option_name} · {ship.from_city} → {ship.to_city}
                  {ship.seal_number ? ` · scellé n° ${ship.seal_number}` : ""}
                </span>
                <Pill tone={SHIPMENT_STATUS[ship.status][1]}>{SHIPMENT_STATUS[ship.status][0]}</Pill>
                {active && !ship.seal_number && list.every((i) => ["confirmed", "preparing", "ready"].includes(i.seller_status)) && <SealForm shipmentId={ship.id} />}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
