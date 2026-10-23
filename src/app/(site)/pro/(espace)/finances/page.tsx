import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyState, Pill } from "@/components/ui";
import { PanelSkeleton } from "@/components/skeletons";
import { requirePro } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { dateShort, dec, fcfa, orderNo } from "@/lib/format";

export const metadata: Metadata = { title: "Paiements & commissions" };

export default function FinancesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="m-0 font-serif text-[clamp(32px,3.6vw,44px)] font-semibold">Paiements & commissions</h1>
      <Suspense fallback={<PanelSkeleton />}>
        <Content />
      </Suspense>
    </div>
  );
}

type Row = { id: string; name: string; qty: number; line_total: number; commission_rate: number; commission_amount: number; order: { number: string; status: string; payment_status: string; delivered_at: string | null; created_at: string } };

async function Content() {
  const { shop } = await requirePro();
  const supabase = await createClient();
  const [{ data }, settings] = await Promise.all([
    supabase.from("order_items").select("id,name,qty,line_total,commission_rate,commission_amount,order:orders!inner(number,status,payment_status,delivered_at,created_at)").eq("shop_id", shop.id).order("created_at", { ascending: false }),
    getSettings(),
  ]);
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => r.order.payment_status === "paid" || r.order.status === "refunded");
  const now = Date.now();
  const payout = (r: Row): [string, "ok" | "warn" | "info" | "mute"] => {
    if (["refunded", "cancelled"].includes(r.order.status)) return ["Annulé · non reversé", "mute"];
    if (r.order.status === "incident") return ["Bloqué · incident", "warn"];
    if (r.order.delivered_at) return now - new Date(r.order.delivered_at).getTime() > 48 * 3600000 ? ["Reversé", "ok"] : ["Programmé (48 h après livraison)", "info"];
    return ["En attente de livraison", "info"];
  };
  const active = rows.filter((r) => !["refunded", "cancelled"].includes(r.order.status));
  const gross = active.reduce((s, r) => s + Number(r.line_total), 0);
  const com = active.reduce((s, r) => s + Number(r.commission_amount), 0);
  const paidOut = active.filter((r) => payout(r)[0] === "Reversé").reduce((s, r) => s + Number(r.line_total) - Number(r.commission_amount), 0);
  const c = settings.commissions;

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] gap-4">
        {[
          ["Ventes encaissées", fcfa(gross)],
          ["Commissions Burkina Or", fcfa(com)],
          ["Net vendeur", fcfa(gross - com)],
          ["Déjà reversé", fcfa(paidOut)],
          ["À reverser", fcfa(gross - com - paidOut)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-line bg-white p-5">
            <div className="text-[13px] text-muted">{l}</div>
            <div className="mt-1 whitespace-nowrap text-2xl font-semibold tnum">{v}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-sand px-5 py-4 text-sm leading-relaxed text-body">
        Commissions prélevées sur le prix vendeur, jamais ajoutées au prix client : bijoux {dec(c.bijou, 0)} % · sur-mesure {dec(c.sur_mesure, 0)} % · gros {dec(c.gros, 0)} % · services {dec(c.service, 0)} %. Reversement 48 h après la livraison confirmée, sur le compte bancaire ou Mobile Money déclaré dans votre dossier.
      </div>
      {!rows.length ? (
        <EmptyState icon="coins" title="Aucune vente encaissée" text="Vos ventes payées et leurs reversements apparaîtront ici." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="bg-sand-2 text-left text-xs text-muted">
                <th className="px-5 py-3 font-medium">Commande</th>
                <th className="px-3 py-3 font-medium">Article</th>
                <th className="px-3 py-3 text-right font-medium">Montant</th>
                <th className="px-3 py-3 text-right font-medium">Commission</th>
                <th className="px-3 py-3 text-right font-medium">Net</th>
                <th className="px-5 py-3 font-medium">Reversement</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const [label, tone] = payout(r);
                return (
                  <tr key={r.id} className="border-t border-sand">
                    <td className="px-5 py-3">
                      <div className="font-semibold tnum">{orderNo(r.order.number)}</div>
                      <div className="text-xs text-muted">{dateShort(r.order.created_at)}</div>
                    </td>
                    <td className="px-3 py-3">
                      {r.name} × {r.qty}
                    </td>
                    <td className="px-3 py-3 text-right tnum">{fcfa(r.line_total)}</td>
                    <td className="px-3 py-3 text-right text-muted tnum">
                      − {fcfa(r.commission_amount)} ({dec(Number(r.commission_rate), Number(r.commission_rate) % 1 ? 1 : 0)} %)
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tnum">{fcfa(Number(r.line_total) - Number(r.commission_amount))}</td>
                    <td className="px-5 py-3">
                      <Pill tone={tone}>{label}</Pill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
