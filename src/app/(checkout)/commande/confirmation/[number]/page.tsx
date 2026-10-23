import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/icons";
import { CheckoutHeader } from "@/components/checkout/header";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dateLong, fcfa, orderNo } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/labels";
import { etaOf } from "@/lib/orders";
import type { Order, OrderItem, Shipment } from "@/lib/types";

export const metadata: Metadata = { title: "Commande confirmée", robots: { index: false } };

export default function ConfirmationPage({ params }: PageProps<"/commande/confirmation/[number]">) {
  return (
    <div className="min-h-screen bg-ivory">
      <CheckoutHeader step={3} />
      <Suspense fallback={<div className="mx-auto mt-12 h-96 max-w-[820px] animate-pulse rounded-[20px] bg-ink" />}>
        <Confirmation params={params} />
      </Suspense>
    </div>
  );
}

async function Confirmation({ params }: { params: PageProps<"/commande/confirmation/[number]">["params"] }) {
  const { number } = await params;
  const session = await requireUser(`/commande/confirmation/${number}`);
  const supabase = await createClient();
  const { data: order } = await supabase.from("orders").select("*, agency:agencies(name,address)").eq("number", number).eq("user_id", session.userId).maybeSingle();
  if (!order) notFound();
  const o = order as Order & { agency: { name: string; address: string } | null };
  const [{ data: items }, { data: shipments }] = await Promise.all([
    supabase.from("order_items").select("*, shop:shops(name)").eq("order_id", o.id),
    supabase.from("shipments").select("*").eq("order_id", o.id),
  ]);
  const its = (items ?? []) as (OrderItem & { shop: { name: string } | null })[];
  const sh = (shipments ?? []) as Shipment[];
  const first = (o.customer_name ?? "").split(" ")[0];
  const status =
    o.payment_status === "paid"
      ? "paiement reçu"
      : o.payment_method === "vir"
        ? "en attente de votre virement"
        : o.payment_method === "agence"
          ? "à régler en agence sous 48 h"
          : "paiement en attente";
  const P = PAYMENT_METHODS[o.payment_method];

  return (
    <section className="mx-auto flex w-full max-w-[820px] flex-col gap-5 px-[clamp(16px,3vw,40px)] pb-24 pt-[clamp(24px,4vw,48px)]">
      <div className="relative flex flex-col items-center gap-3.5 overflow-hidden rounded-[20px] bg-ink p-[clamp(28px,5vw,56px)] text-center text-ivory">
        <div className="gold-bg flex h-[72px] w-[72px] items-center justify-center rounded-full">
          <Icon name="check" size={34} stroke={2.25} className="text-ink" />
        </div>
        <h1 className="mt-1.5 font-serif text-[clamp(34px,4.6vw,54px)] font-semibold leading-[1.05] [text-wrap:balance]">Merci {first}, votre commande est confirmée.</h1>
        <p className="m-0 max-w-[520px] text-[15px] leading-relaxed text-stone">
          Commande <b className="text-ivory tnum">{orderNo(o.number)}</b> · {status}. Votre récapitulatif et votre facture sont disponibles dans votre espace client
          {o.customer_email ? ` et ont été envoyés à ${o.customer_email}` : ""}.
        </p>
        <div className="my-2 h-px w-full max-w-[480px] bg-gold/35" />
        <div className="text-xs uppercase tracking-[.14em] text-gold-light">Votre code de remise sécurisé</div>
        <div className="flex gap-2.5">
          {o.otp_code.split("").map((d, i) => (
            <span key={i} className="flex h-16 w-14 items-center justify-center rounded-lg border border-gold-light/45 text-[30px] font-semibold tnum">
              {d}
            </span>
          ))}
        </div>
        <p className="m-0 max-w-[440px] text-[13px] leading-relaxed text-stone">Ne le communiquez qu&apos;au livreur, en main propre, après avoir vérifié que le scellé est intact.</p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-5">
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-6">
          <h2 className="m-0 text-base font-semibold">Articles</h2>
          {its.map((c) => (
            <div key={c.id} className="flex justify-between gap-3 border-t border-sand py-2 text-sm">
              <span>
                <span className="block font-medium">
                  {c.name} × {c.qty}
                </span>
                <span className="mt-0.5 block text-xs text-muted">{c.shop?.name}</span>
              </span>
              <span className="whitespace-nowrap font-semibold tnum">{fcfa(c.line_total)}</span>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-t border-sand py-2 text-sm">
            <span>
              <span className="block font-medium">Livraison sécurisée &amp; assurance</span>
              <span className="mt-0.5 block text-xs text-muted">{sh.length} expédition(s)</span>
            </span>
            <span className="whitespace-nowrap font-semibold tnum">{o.delivery_total ? fcfa(o.delivery_total) : "Offerte"}</span>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold tnum">
            <span>{o.payment_status === "paid" ? "Total payé" : "Total à régler"}</span>
            <span>{fcfa(o.total)}</span>
          </div>
        </div>
        <div className="flex flex-col gap-3.5 rounded-xl border border-line bg-white p-6">
          <h2 className="m-0 text-base font-semibold">Livraison</h2>
          <div className="text-sm leading-relaxed">
            <b>{o.delivery_mode === "domicile" ? `${o.recipient_name} · ${o.recipient_phone ?? ""}` : o.agency?.name}</b>
            <br />
            <span className="text-muted">{o.delivery_mode === "domicile" ? [o.district, o.city].filter(Boolean).join(" · ") : o.agency?.address}</span>
          </div>
          <div className="text-sm leading-relaxed">
            <span className="text-muted">Livraison estimée</span>
            <br />
            <b className="first-letter:uppercase">{dateLong(etaOf(o.created_at, sh))}</b>
          </div>
          <div className="text-sm leading-relaxed">
            <span className="text-muted">Paiement</span>
            <br />
            <b>{P[0]}</b>
          </div>
        </div>
      </div>
      {o.payment_method === "vir" && o.payment_status !== "paid" && (
        <div className="rounded-xl border border-line bg-white p-5 text-sm leading-relaxed">
          Effectuez votre virement en indiquant la référence <b className="font-mono">{o.number}</b>. Votre commande est réservée 48 h ; le prix reste celui du jour de la commande.
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <Link href={`/compte/commandes/${o.number}`} className="flex h-[54px] flex-[1_1_220px] items-center justify-center rounded-lg bg-gold text-[15px] font-semibold text-ink hover:bg-gold-light hover:text-ink">
          Suivre ma livraison
        </Link>
        <Link href={`/facture/${o.number}`} target="_blank" className="flex h-[54px] flex-[1_1_200px] items-center justify-center rounded-lg border border-gold-dark text-[15px] font-semibold text-gold-dark">
          Télécharger la facture et le certificat
        </Link>
        <Link href="/" className="flex h-[54px] flex-[0_1_auto] items-center justify-center px-[18px] text-[15px] font-semibold">
          Retour à l&apos;accueil
        </Link>
      </div>
    </section>
  );
}
