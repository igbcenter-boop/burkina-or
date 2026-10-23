import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyState, Pill } from "@/components/ui";
import { PanelSkeleton } from "@/components/skeletons";
import { requirePro } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dateTime, fcfa, orderNo } from "@/lib/format";
import { SHIPMENT_STATUS } from "@/lib/labels";
import type { Shipment, ShipmentEvent } from "@/lib/types";
import { MissionActions } from "./mission";

export const metadata: Metadata = { title: "Missions de livraison" };

export default function MissionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="m-0 font-serif text-[clamp(32px,3.6vw,44px)] font-semibold">Missions de livraison</h1>
        <p className="mt-2 max-w-[680px] text-[15px] leading-relaxed text-body">
          Acceptez les missions, collectez les colis scellés, enregistrez chaque étape et confirmez la remise en saisissant le code à 4 chiffres communiqué par le destinataire.
        </p>
      </div>
      <Suspense fallback={<PanelSkeleton />}>
        <List />
      </Suspense>
    </div>
  );
}

type Mission = Shipment & {
  order: { number: string; recipient_name: string | null; recipient_phone: string | null; city: string | null; district: string | null; instructions: string | null; delivery_mode: string; agency: { name: string; address: string } | null } | null;
  seller: { name: string; address: string | null; phone: string | null } | null;
  shipment_events: ShipmentEvent[];
};

async function List() {
  const { shop } = await requirePro();
  const supabase = await createClient();
  const { data } = await supabase
    .from("shipments")
    .select("*, order:orders(number,recipient_name,recipient_phone,city,district,instructions,delivery_mode,agency:agencies(name,address)), seller:shops!shipments_shop_id_fkey(name,address,phone), shipment_events(*)")
    .eq("carrier_id", shop.id)
    .order("created_at", { ascending: false });
  const missions = (data ?? []) as unknown as Mission[];
  if (!missions.length) return <EmptyState icon="truck" title="Aucune mission" text="Les expéditions qui vous sont attribuées apparaîtront ici." />;
  const order = (s: string) => ["incident", "pending", "assigned", "preparing", "accepted", "collected", "shipped", "at_hub", "delivered"].indexOf(s);
  return (
    <div className="flex flex-col gap-4">
      {[...missions].sort((a, b) => order(a.status) - order(b.status)).map((m) => {
        const events = [...m.shipment_events].sort((a, b) => b.created_at.localeCompare(a.created_at));
        return (
          <section key={m.id} className="overflow-hidden rounded-xl border border-line bg-white">
            <div className="flex flex-wrap items-center gap-3 border-b border-sand px-5 py-4">
              <div className="min-w-[200px] flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold tnum">{m.order ? orderNo(m.order.number) : "—"}</span>
                  <Pill tone={SHIPMENT_STATUS[m.status][1]} dot>
                    {SHIPMENT_STATUS[m.status][0]}
                  </Pill>
                </div>
                <div className="mt-1 text-[13px] text-muted">
                  {m.option_name} · {m.from_city} → {m.to_city} · {m.delay} · valeur assurée {fcfa(m.insured_value)}
                </div>
              </div>
              <div className="text-right text-[13px]">
                <div className="font-semibold tnum">{fcfa(m.price)}</div>
                <div className="text-muted">{m.seal_number ? `Scellé n° ${m.seal_number}` : "Scellé à venir"}</div>
              </div>
            </div>
            <div className="grid gap-4 px-5 py-4 text-sm md:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-[.12em] text-muted">Collecte</div>
                <div className="mt-1 font-semibold">{m.seller?.name}</div>
                <div className="text-muted">
                  {m.seller?.address} · {m.seller?.phone}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[.12em] text-muted">Remise</div>
                {m.order?.delivery_mode === "retrait" ? (
                  <>
                    <div className="mt-1 font-semibold">{m.order.agency?.name}</div>
                    <div className="text-muted">{m.order.agency?.address}</div>
                  </>
                ) : (
                  <>
                    <div className="mt-1 font-semibold">
                      {m.order?.recipient_name} · {m.order?.recipient_phone}
                    </div>
                    <div className="text-muted">{[m.order?.district, m.order?.city].filter(Boolean).join(", ")}</div>
                    {m.order?.instructions && <div className="text-xs text-muted">« {m.order.instructions} »</div>}
                  </>
                )}
              </div>
            </div>
            {events.length > 0 && (
              <div className="border-t border-sand px-5 py-3 text-xs text-muted">
                {events.slice(0, 3).map((e) => (
                  <div key={e.id}>
                    <b className="text-text">{e.label}</b> · {e.note} · {dateTime(e.created_at)}
                  </div>
                ))}
              </div>
            )}
            {m.status !== "delivered" && <MissionActions shipmentId={m.id} status={m.status} sealed={!!m.seal_number} />}
          </section>
        );
      })}
    </div>
  );
}
