import Link from "next/link";
import { Suspense } from "react";
import { ACard, ACardHead, AChips, APill, ASkeleton } from "@/components/admin-ui";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dateTime, fcfa, orderNo } from "@/lib/format";
import { SHIPMENT_STATUS, SHOP_STATUS } from "@/lib/labels";
import { assignCarrier } from "@/lib/actions/admin";
import type { ShipmentStatus } from "@/lib/types";
import { ActSelect } from "../act-button";

export const metadata = { title: "Livraisons" };

const FILTERS: Record<string, [string, (s: ShipmentStatus) => boolean]> = {
  toutes: ["Toutes", () => true],
  attribuer: ["À attribuer", (s) => s === "pending"],
  cours: ["En cours", (s) => ["assigned", "accepted", "preparing", "collected", "shipped", "at_hub"].includes(s)],
  incident: ["Incidents", (s) => s === "incident"],
  livrees: ["Livrées", (s) => s === "delivered"],
};

export default function DeliveriesPage({ searchParams }: PageProps<"/admin/livraisons">) {
  return (
    <Suspense fallback={<ASkeleton rows={6} />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/livraisons">["searchParams"] }) {
  await requireStaff();
  const sp = await searchParams;
  const f = (sp.filtre as string) in FILTERS ? (sp.filtre as string) : "toutes";
  const db = createAdminClient();
  const [{ data: ships }, { data: carriers }] = await Promise.all([
    db.from("shipments").select("*, order:orders(number,customer_name,delivery_mode), seller:shops!shipments_shop_id_fkey(name), carrier:shops!shipments_carrier_id_fkey(id,name), shipment_events(label,note,created_at)").order("created_at", { ascending: false }).limit(300),
    db.from("shops").select("id,name,status,city,zones,insurance,tariffs").eq("type", "livreur").order("name"),
  ]);
  const all = ships ?? [];
  const rows = all.filter((s) => FILTERS[f][1](s.status as ShipmentStatus));
  const verifiedCarriers = (carriers ?? []).filter((c) => c.status === "verified");

  return (
    <>
      <AChips items={Object.entries(FILTERS).map(([id, [label, fn]]) => ({ href: `/admin/livraisons?filtre=${id}`, label: `${label} · ${all.filter((s) => fn(s.status as ShipmentStatus)).length}`, on: f === id }))} />
      <ACard pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="bg-a-soft text-left text-xs text-a-muted">
                <th className="py-3 pl-5 pr-3 font-medium">Commande</th>
                <th className="px-3 py-3 font-medium">Trajet</th>
                <th className="px-3 py-3 font-medium">Vendeur</th>
                <th className="px-3 py-3 font-medium">Transporteur</th>
                <th className="px-3 py-3 font-medium">Dernier événement</th>
                <th className="px-3 py-3 text-right font-medium">Valeur</th>
                <th className="py-3 pl-3 pr-5 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const ev = [...((s.shipment_events ?? []) as { label: string; note: string; created_at: string }[])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
                const order = s.order as { number: string; customer_name: string; delivery_mode: string } | null;
                const carrier = s.carrier as { id: string; name: string } | null;
                const [label, tone] = SHIPMENT_STATUS[s.status as ShipmentStatus];
                return (
                  <tr key={s.id} className="border-t border-a-line2 align-top">
                    <td className="whitespace-nowrap py-3.5 pl-5 pr-3">
                      <Link href={`/admin/commandes?commande=${s.order_id}`} className="font-medium text-a-text hover:text-a-gold tnum">
                        {order ? orderNo(order.number) : "—"}
                      </Link>
                      <div className="text-xs text-a-muted">{order?.customer_name}</div>
                    </td>
                    <td className="px-3 py-3.5">
                      {s.from_city} → {s.to_city}
                      <div className="text-xs text-a-muted">
                        {s.option_name} · {s.delay}
                        {s.seal_number ? ` · scellé ${s.seal_number}` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-a-muted">{(s.seller as { name: string } | null)?.name}</td>
                    <td className="px-3 py-3.5">
                      {order?.delivery_mode === "retrait" && !carrier ? (
                        <span className="text-xs text-a-muted">Retrait agence</span>
                      ) : s.status === "delivered" ? (
                        carrier?.name
                      ) : (
                        <ActSelect action={assignCarrier.bind(null, s.id)} value={carrier?.id ?? ""} options={[["", "À attribuer…"], ...verifiedCarriers.map((c) => [c.id, c.name] as [string, string])]} />
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-xs text-a-muted">{ev ? `${ev.label} · ${ev.note ?? ""} · ${dateTime(ev.created_at)}` : "—"}</td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-right font-semibold tnum">{fcfa(s.insured_value)}</td>
                    <td className="py-3.5 pl-3 pr-5">
                      <APill tone={tone} dot>
                        {label}
                      </APill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && <div className="p-10 text-center text-sm text-a-muted">Aucune expédition dans ce filtre.</div>}
      </ACard>

      <ACard pad={false}>
        <ACardHead title="Prestataires logistiques" right={<Link href="/admin/kyc" className="text-[13px] font-semibold text-a-gold">Dossiers en attente →</Link>} />
        {(carriers ?? []).map((c) => {
          const missions = all.filter((s) => (s.carrier as { id: string } | null)?.id === c.id);
          const inc = missions.filter((s) => s.status === "incident").length;
          return (
            <div key={c.id} className="flex flex-wrap items-center gap-4 border-b border-a-line2 px-[22px] py-4 text-sm">
              <div className="min-w-[220px] flex-1">
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-a-muted">
                  {c.city} · {(c.zones as string[]).join(", ")}
                </div>
                <div className="text-xs text-a-muted">{c.insurance}</div>
              </div>
              <div className="text-xs text-a-muted">
                {missions.length} missions · {missions.filter((s) => s.status === "delivered").length} livrées · {inc} incident{inc > 1 ? "s" : ""}
              </div>
              <APill tone={SHOP_STATUS[c.status as keyof typeof SHOP_STATUS][1]}>{SHOP_STATUS[c.status as keyof typeof SHOP_STATUS][0]}</APill>
            </div>
          );
        })}
      </ACard>
    </>
  );
}
