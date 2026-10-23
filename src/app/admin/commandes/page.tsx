import Link from "next/link";
import { Suspense } from "react";
import { ACard, AChips, APill, ASkeleton } from "@/components/admin-ui";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dateCompact, fcfa, orderNo } from "@/lib/format";
import { ORDER_STATUS, PAYMENT_METHODS } from "@/lib/labels";
import type { OrderStatus } from "@/lib/types";
import { ExportButton } from "../export-button";
import { OrderDrawer, type DrawerOrder } from "./drawer";

export const metadata = { title: "Commandes & transactions" };

const FILTERS: Record<string, [string, (s: OrderStatus) => boolean]> = {
  toutes: ["Toutes", () => true],
  surveiller: ["À surveiller", (s) => ["incident", "pending_payment", "refunded"].includes(s)],
  cours: ["En cours", (s) => ["paid", "confirmed", "preparing", "collected", "shipped", "at_hub"].includes(s)],
  livrees: ["Livrées", (s) => s === "delivered"],
};
const SPACE: Record<string, string> = { lingot: "Lingotins", bijou: "Bijoux", gros: "Gros", service: "Services" };

export default function AdminOrdersPage({ searchParams }: PageProps<"/admin/commandes">) {
  return (
    <Suspense fallback={<ASkeleton rows={6} />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/commandes">["searchParams"] }) {
  const session = await requireStaff();
  const sp = await searchParams;
  const f = (sp.filtre as string) in FILTERS ? (sp.filtre as string) : "toutes";
  const q = String(sp.q ?? "").trim().toLowerCase();
  const sel = sp.commande as string | undefined;
  const db = createAdminClient();
  const { data } = await db
    .from("orders")
    .select("id,number,created_at,customer_name,customer_email,status,payment_method,payment_status,payment_ref,total,delivery_total,subtotal,recipient_phone,order_items(kind,line_total,commission_amount,commission_rate,name,qty,shop:shops(name,phone,email))")
    .order("created_at", { ascending: false })
    .limit(300);
  type Row = { id: string; number: string; created_at: string; customer_name: string | null; customer_email: string | null; status: string; payment_method: string; payment_status: string; payment_ref: string | null; total: number; delivery_total: number; subtotal: number; recipient_phone: string | null; order_items: { kind: string; line_total: number; commission_amount: number; commission_rate: number; name: string; qty: number; shop: { name: string; phone: string | null; email: string | null } | null }[] };
  const all = (data ?? []) as unknown as Row[];
  const searched = all.filter((o) => !q || `${o.number} ${o.customer_name} ${o.customer_email} ${o.order_items.map((i) => i.shop?.name).join(" ")}`.toLowerCase().includes(q));
  const rows = searched.filter((o) => FILTERS[f][1](o.status as OrderStatus));
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ filtre: f, q: q || undefined, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/admin/commandes?${p}`;
  };

  let drawer: DrawerOrder | null = null;
  const so = sel ? all.find((o) => o.id === sel) : null;
  if (so) {
    const { data: ships } = await db.from("shipments").select("id,status,option_name,carrier:shops!shipments_carrier_id_fkey(name)").eq("order_id", so.id);
    const shops = [...new Map(so.order_items.filter((i) => i.shop).map((i) => [i.shop!.name, i.shop!])).values()];
    const com = so.order_items.reduce((s, i) => s + Number(i.commission_amount), 0);
    const rate = so.order_items[0]?.commission_rate ?? 0;
    const blocked = ["incident", "refunded", "pending_payment", "cancelled"].includes(so.status);
    drawer = {
      id: so.id,
      number: so.number,
      date: dateCompact(so.created_at),
      space: [...new Set(so.order_items.map((i) => SPACE[i.kind]))].join(", "),
      client: so.customer_name ?? "—",
      clientContact: [so.customer_email, so.recipient_phone].filter(Boolean).join(" · "),
      shop: shops.map((s) => s.name).join(", "),
      shopContact: shops.map((s) => [s.phone, s.email].filter(Boolean).join(" · ")).join(" / "),
      pay: PAYMENT_METHODS[so.payment_method as keyof typeof PAYMENT_METHODS][0],
      ref: so.payment_ref ?? "—",
      status: so.status as OrderStatus,
      items: so.order_items.map((i) => `${i.name} × ${i.qty}`),
      lines: [
        ["Montant payé par le client", fcfa(so.total), true],
        ["dont livraison sécurisée & assurance", "− " + fcfa(so.delivery_total), false],
        [`Commission Burkina Or (${String(rate).replace(".", ",")} %)`, fcfa(com), false],
        ["Net à reverser au vendeur", fcfa(Number(so.subtotal) - com), true],
      ],
      payout: blocked ? "Reversement bloqué jusqu'à résolution du dossier." : so.status === "delivered" ? "Reversement programmé 48 h après la livraison confirmée." : "Reversement programmé 48 h après la livraison confirmée.",
      blocked,
      shipments: (ships ?? []).map((s) => `${s.option_name} · ${(s.carrier as unknown as { name: string } | null)?.name ?? "transporteur à attribuer"} · ${s.status}`),
      canRefund: ["finance", "admin", "super_admin"].includes(session.profile.role) && so.payment_status === "paid" && so.status !== "refunded",
    };
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <AChips items={Object.entries(FILTERS).map(([id, [label, fn]]) => ({ href: qs({ filtre: id, commande: undefined }), label: `${label} · ${searched.filter((o) => fn(o.status as OrderStatus)).length}`, on: f === id }))} />
        <div className="ml-auto">
          <ExportButton what="Commandes · CSV" href="/admin/export/commandes" />
        </div>
      </div>
      {q && (
        <div className="text-sm text-a-muted">
          Recherche « {q} » · <Link href={qs({ q: undefined })}>effacer</Link>
        </div>
      )}
      <ACard pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead>
              <tr className="bg-a-soft text-left text-xs text-a-muted">
                {["Commande", "Date", "Client", "Vendeur", "Espace", "Paiement", "Montant", "Statut"].map((h, i) => (
                  <th key={h} className={`py-3 font-medium ${i === 0 ? "pl-5 pr-3" : i === 7 ? "pl-3 pr-5" : "px-3"} ${h === "Montant" ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const [label, tone] = ORDER_STATUS[o.status as OrderStatus];
                return (
                  <tr key={o.id} className="border-t border-a-line2" style={{ background: sel === o.id ? "var(--a-sel)" : "transparent" }}>
                    <td className="whitespace-nowrap py-3.5 pl-5 pr-3 font-medium tnum">
                      <Link href={qs({ commande: o.id })} scroll={false} className="text-a-text hover:text-a-gold">
                        {orderNo(o.number)}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-a-muted tnum">{dateCompact(o.created_at)}</td>
                    <td className="px-3 py-3.5">{o.customer_name}</td>
                    <td className="px-3 py-3.5">{[...new Set(o.order_items.map((i) => i.shop?.name))].join(", ")}</td>
                    <td className="px-3 py-3.5 text-a-muted">{[...new Set(o.order_items.map((i) => SPACE[i.kind]))].join(", ")}</td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-a-muted">{PAYMENT_METHODS[o.payment_method as keyof typeof PAYMENT_METHODS][0]}</td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-right font-semibold tnum">{fcfa(o.total)}</td>
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
        {!rows.length && <div className="p-10 text-center text-sm text-a-muted">Aucune commande dans ce filtre.</div>}
      </ACard>
      {drawer && <OrderDrawer o={drawer} closeHref={qs({ commande: undefined })} />}
    </>
  );
}
