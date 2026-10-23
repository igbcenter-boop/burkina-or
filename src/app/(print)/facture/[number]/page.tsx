import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";
import { dateLong, fcfa, n0, orderNo } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/labels";
import type { Order, OrderItem, Shipment } from "@/lib/types";
import { PrintButton } from "../../print-button";

export const metadata: Metadata = { title: "Facture", robots: { index: false } };

export default function InvoicePage({ params }: PageProps<"/facture/[number]">) {
  return (
    <Suspense fallback={<div className="mx-auto h-[900px] max-w-[820px] animate-pulse rounded-xl bg-white" />}>
      <Invoice params={params} />
    </Suspense>
  );
}

async function Invoice({ params }: { params: PageProps<"/facture/[number]">["params"] }) {
  const { number } = await params;
  await requireUser(`/facture/${number}`);
  const supabase = await createClient();
  const [{ data }, settings] = await Promise.all([supabase.from("orders").select("*, agency:agencies(name,address)").eq("number", number).maybeSingle(), getSettings()]);
  if (!data) notFound();
  const o = data as Order & { agency: { name: string; address: string } | null };
  const [{ data: items }, { data: ships }] = await Promise.all([
    supabase.from("order_items").select("*, shop:shops(name,rccm,ifu,city)").eq("order_id", o.id),
    supabase.from("shipments").select("*").eq("order_id", o.id),
  ]);
  const its = (items ?? []) as (OrderItem & { shop: { name: string; rccm: string | null; ifu: string | null; city: string | null } | null })[];
  const sh = (ships ?? []) as Shipment[];
  const c = settings.company;
  const paid = o.payment_status === "paid";

  return (
    <div className="mx-auto max-w-[820px] px-4 print:max-w-none print:px-0">
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/compte/commandes/${o.number}`} className="text-sm font-semibold">
          ← Retour au suivi
        </Link>
        <PrintButton />
      </div>
      <article className="relative overflow-hidden rounded-xl border border-line bg-white p-[clamp(24px,5vw,56px)] print:rounded-none print:border-0">
        <div className="gold-bg absolute inset-x-0 top-0 h-1" />
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
          <div>
            <Logo href={null} light={false} size={34} />
            <div className="mt-3 text-[13px] leading-relaxed text-muted">
              {c.name}
              <br />
              {c.address}
              <br />
              RCCM {c.rccm} · IFU {c.ifu}
              <br />
              {c.phone} · {c.email}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-[.16em] text-gold-dark">Facture</div>
            <div className="mt-1 font-mono text-lg font-semibold">FA-{o.number.replace("BO-", "")}</div>
            <div className="text-sm text-muted">Commande {orderNo(o.number)}</div>
            <div className="text-sm text-muted">Émise le {dateLong(o.paid_at ?? o.created_at)}</div>
            <div className={`mt-2 inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold ${paid ? "bg-ok-bg text-ok" : "bg-warn-bg text-warn"}`}>{paid ? "Acquittée" : "En attente de règlement"}</div>
          </div>
        </header>
        <section className="grid gap-6 border-b border-line py-6 text-sm sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs uppercase tracking-[.12em] text-muted">Client</div>
            <div className="font-semibold">{o.customer_name}</div>
            <div className="text-muted">{o.customer_email}</div>
          </div>
          <div>
            <div className="mb-1 text-xs uppercase tracking-[.12em] text-muted">Livraison</div>
            <div className="font-semibold">{o.delivery_mode === "domicile" ? o.recipient_name : o.agency?.name}</div>
            <div className="text-muted">{o.delivery_mode === "domicile" ? [o.district, o.city].filter(Boolean).join(", ") : o.agency?.address}</div>
          </div>
        </section>
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="py-2 pr-3 font-medium">Désignation</th>
              <th className="py-2 pr-3 font-medium">Vendeur</th>
              <th className="py-2 pr-3 text-right font-medium">Qté</th>
              <th className="py-2 pr-3 text-right font-medium">P.U.</th>
              <th className="py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {its.map((i) => (
              <tr key={i.id} className="border-b border-sand align-top">
                <td className="py-3 pr-3">
                  <div className="font-semibold">{i.name}</div>
                  <div className="text-xs text-muted">{i.meta}</div>
                  <div className="text-xs text-muted">{i.verified_badge}</div>
                  {i.kind === "lingot" && (
                    <div className="text-xs text-muted tnum">
                      dont or {n0(i.unit_gold_value)} · façon {n0(i.unit_fabrication)} (cours {n0(o.gold_price_applied)} FCFA/g)
                    </div>
                  )}
                </td>
                <td className="py-3 pr-3 text-xs text-muted">
                  {i.shop?.name}
                  {i.shop?.rccm ? <><br />RCCM {i.shop.rccm}</> : null}
                </td>
                <td className="py-3 pr-3 text-right tnum">{i.qty}</td>
                <td className="py-3 pr-3 text-right tnum">{n0(i.unit_price)}</td>
                <td className="py-3 text-right font-semibold tnum">{n0(i.line_total)}</td>
              </tr>
            ))}
            {sh.map((s) => (
              <tr key={s.id} className="border-b border-sand">
                <td className="py-3 pr-3" colSpan={4}>
                  Livraison sécurisée & assurance · {s.option_name} ({s.from_city} → {s.to_city})
                </td>
                <td className="py-3 text-right font-semibold tnum">{s.price ? n0(s.price) : "Offerte"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ml-auto mt-6 flex max-w-[320px] flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Sous-total articles</span>
            <span className="tnum">{fcfa(o.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Livraison & assurance</span>
            <span className="tnum">{fcfa(o.delivery_total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Frais de service</span>
            <span className="tnum">0 FCFA</span>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-lg font-semibold">
            <span>Total TTC</span>
            <span className="tnum">{fcfa(o.total)}</span>
          </div>
          <div className="text-xs text-muted">
            Règlement : {PAYMENT_METHODS[o.payment_method][0]}
            {o.payment_ref ? ` · réf. ${o.payment_ref}` : ""}
          </div>
        </div>
        <footer className="mt-10 border-t border-line pt-5 text-xs leading-relaxed text-muted">
          Les certificats d&apos;analyse des lingotins sont consultables depuis chaque fiche produit. Montants TTC exprimés en francs CFA (XOF). {c.agrement}.
        </footer>
      </article>
    </div>
  );
}
