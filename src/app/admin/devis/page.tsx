import { Suspense } from "react";
import { ACard, AChips, APill, ASkeleton } from "@/components/admin-ui";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fcfa, since } from "@/lib/format";
import { QUOTE_STATUS } from "@/lib/labels";

export const metadata = { title: "Devis professionnels" };

export default function QuotesAdminPage({ searchParams }: PageProps<"/admin/devis">) {
  return (
    <Suspense fallback={<ASkeleton rows={5} />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/devis">["searchParams"] }) {
  await requireStaff();
  const sp = await searchParams;
  const f = (sp.statut as string) ?? "tous";
  const db = createAdminClient();
  const { data } = await db.from("quote_requests").select("*, shop:shops(name,type), product:products(name), quote_messages(price_offer,created_at,sender_side)").order("updated_at", { ascending: false });
  const all = data ?? [];
  const rows = all.filter((q) => f === "tous" || q.status === f);
  return (
    <>
      <AChips items={[["tous", "Toutes"], ...Object.entries(QUOTE_STATUS).map(([k, [l]]) => [k, l])].map(([id, label]) => ({ href: `/admin/devis?statut=${id}`, label: `${label} · ${all.filter((q) => id === "tous" || q.status === id).length}`, on: f === id }))} />
      <ACard pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="bg-a-soft text-left text-xs text-a-muted">
                <th className="py-3 pl-5 pr-3 font-medium">Demande</th>
                <th className="px-3 py-3 font-medium">Acheteur</th>
                <th className="px-3 py-3 font-medium">Vendeur</th>
                <th className="px-3 py-3 font-medium">Objet</th>
                <th className="px-3 py-3 text-right font-medium">Dernière offre</th>
                <th className="px-3 py-3 font-medium">Activité</th>
                <th className="py-3 pl-3 pr-5 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => {
                const offers = ((q.quote_messages ?? []) as { price_offer: number | null; created_at: string }[]).filter((m) => m.price_offer).sort((a, b) => b.created_at.localeCompare(a.created_at));
                return (
                  <tr key={q.id} className="border-t border-a-line2">
                    <td className="py-3.5 pl-5 pr-3 font-medium">{q.number}</td>
                    <td className="px-3 py-3.5">
                      {q.buyer_company ?? q.buyer_name}
                      <div className="text-xs text-a-muted">{q.delivery_city}</div>
                    </td>
                    <td className="px-3 py-3.5 text-a-muted">{(q.shop as { name: string })?.name}</td>
                    <td className="px-3 py-3.5">
                      {(q.product as { name: string } | null)?.name ?? q.product_type}
                      <div className="text-xs text-a-muted">
                        {q.quantity}
                        {q.purity ? ` · ${q.purity}` : ""}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-right font-semibold tnum">{offers[0] ? fcfa(offers[0].price_offer) : "—"}</td>
                    <td className="px-3 py-3.5 text-xs text-a-muted">{since(q.updated_at)}</td>
                    <td className="py-3.5 pl-3 pr-5">
                      <APill tone={QUOTE_STATUS[q.status][1]}>{QUOTE_STATUS[q.status][0]}</APill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && <div className="p-10 text-center text-sm text-a-muted">Aucune demande.</div>}
      </ACard>
    </>
  );
}
