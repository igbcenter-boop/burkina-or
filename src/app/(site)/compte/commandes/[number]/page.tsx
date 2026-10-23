import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/icons";
import { Pill } from "@/components/ui";
import { PanelSkeleton } from "@/components/skeletons";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dateLong, dateShort, dateTime, fcfa, orderNo } from "@/lib/format";
import { ORDER_STATUS, PAYMENT_METHODS, SHIPMENT_STATUS } from "@/lib/labels";
import { buildTimeline, etaOf } from "@/lib/orders";
import type { Order, OrderEvent, OrderItem, Shipment, ShipmentEvent } from "@/lib/types";
import { OrderActions } from "./actions";

export const metadata: Metadata = { title: "Suivi de commande" };

export default function OrderPage({ params }: PageProps<"/compte/commandes/[number]">) {
  return (
    <Suspense fallback={<PanelSkeleton rows={7} />}>
      <Tracking params={params} />
    </Suspense>
  );
}

type Ship = Shipment & { carrier: { name: string; phone: string | null; mono: string | null } | null; seller: { name: string; id: string } | null; shipment_events: ShipmentEvent[] };

async function Tracking({ params }: { params: PageProps<"/compte/commandes/[number]">["params"] }) {
  const { number } = await params;
  const s = await requireUser(`/compte/commandes/${number}`);
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("*, agency:agencies(name,address)").eq("number", decodeURIComponent(number)).eq("user_id", s.userId).maybeSingle();
  if (!data) notFound();
  const o = data as Order & { agency: { name: string; address: string } | null };
  const [{ data: items }, { data: ships }, { data: events }, { data: review }] = await Promise.all([
    supabase.from("order_items").select("*, shop:shops(id,name,slug)").eq("order_id", o.id),
    supabase.from("shipments").select("*, carrier:shops!shipments_carrier_id_fkey(name,phone,mono), seller:shops!shipments_shop_id_fkey(id,name), shipment_events(*)").eq("order_id", o.id),
    supabase.from("order_events").select("*").eq("order_id", o.id).order("created_at"),
    supabase.from("reviews").select("id").eq("order_id", o.id).maybeSingle(),
  ]);
  const its = (items ?? []) as (OrderItem & { shop: { id: string; name: string; slug: string } | null })[];
  const sh = (ships ?? []) as Ship[];
  const ev = (events ?? []) as OrderEvent[];
  const timeline = buildTimeline(o.status, ev, o.delivery_mode);
  const delivered = o.status === "delivered";
  const unpaid = o.status === "pending_payment";
  const title = delivered ? "Votre or est arrivé" : unpaid ? "En attente de paiement" : o.status === "incident" ? "Un incident est en cours de traitement" : ["shipped", "at_hub", "collected"].includes(o.status) ? "Votre colis est en route" : ["cancelled", "refunded"].includes(o.status) ? "Commande annulée" : "Votre commande est en préparation";
  const pillTone = delivered ? "ok" : o.status === "incident" ? "err" : unpaid ? "warn" : ["cancelled", "refunded"].includes(o.status) ? "mute" : "info";
  const carrier = sh.find((x) => x.carrier)?.carrier ?? null;
  const incidents = sh.flatMap((x) => x.shipment_events.filter((e) => e.status === "incident"));

  return (
    <div className="flex flex-col gap-5">
      <Link href="/compte/commandes" className="text-sm font-semibold">
        ← Mes commandes
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[13px] text-muted">
            Commande {orderNo(o.number)} · passée le {dateShort(o.created_at)}
          </div>
          <h1 className="mt-1.5 font-serif text-[clamp(34px,4vw,48px)] font-semibold leading-[1.05]">{title}</h1>
        </div>
        <Pill tone={pillTone} dot className="h-8 px-3.5 text-[13px]">
          {ORDER_STATUS[o.status][0]}
        </Pill>
      </div>

      {incidents.length > 0 && o.status === "incident" && (
        <div className="rounded-xl bg-err-bg px-5 py-4 text-sm text-err">
          <b>Incident signalé :</b> {incidents.at(-1)?.note}. Notre équipe vous tient informé ; vous pouvez compléter le dossier depuis « Signaler un problème ».
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-start gap-5">
        <section className="rounded-xl border border-line bg-white p-[clamp(20px,2.5vw,28px)]">
          {timeline.map((t, i) => {
            const last = i === timeline.length - 1;
            const idxDone = t.done;
            return (
              <div key={t.label} className="grid grid-cols-[24px_minmax(0,1fr)_auto] gap-4">
                <div className="flex flex-col items-center">
                  <span
                    className="flex h-5 w-5 flex-none items-center justify-center rounded-full"
                    style={{ background: idxDone ? "#1E6B4A" : "#FFFFFF", border: idxDone ? "0" : t.current ? "5px solid #B8923A" : "1.5px solid #E6DFCF" }}
                  >
                    {idxDone && <Icon name="check" size={11} stroke={3} className="text-white" />}
                  </span>
                  <span className="min-h-[30px] w-0.5 flex-1" style={{ background: last ? "transparent" : idxDone ? "#1E6B4A" : "#E6DFCF" }} />
                </div>
                <div className="min-w-0 pb-[22px]">
                  <div className="text-[15px]" style={{ fontWeight: t.current ? 600 : 500, color: !idxDone && !t.current ? "#8A857C" : "#1A1814" }}>
                    {t.label}
                  </div>
                  <div className="mt-[3px] text-[13px] leading-normal text-muted">{t.note}</div>
                </div>
                <div className="whitespace-nowrap text-xs tnum" style={{ color: t.current ? "#8C6A1F" : "#6E6A63", fontWeight: t.current ? 600 : 400 }}>
                  {t.current ? "En cours" : t.time ? dateTime(t.time) : ""}
                </div>
              </div>
            );
          })}
          <div className="mt-1 rounded-[10px] bg-ivory px-4 py-3 text-[13px] text-muted">
            Livraison estimée : <b className="text-text">{dateLong(etaOf(o.created_at, sh))}</b>
          </div>
        </section>

        <div className="flex flex-col gap-5">
          <div className="stripes-sand flex h-[200px] items-end rounded-xl border border-line p-3.5">
            <span className="font-mono text-[11px] text-muted">
              carte · trajet {o.delivery_mode === "domicile" ? `${sh[0]?.from_city ?? ""} → ${o.city}` : `vers ${o.agency?.name ?? "votre agence"}`}
            </span>
          </div>
          <div className="flex flex-col gap-4 rounded-xl bg-ink p-6 text-ivory">
            {!delivered ? (
              <div>
                <div className="text-xs uppercase tracking-[.14em] text-gold-light">Code de remise</div>
                <div className="mt-3 flex gap-2">
                  {o.otp_code.split("").map((d, i) => (
                    <span key={i} className="flex h-14 flex-1 items-center justify-center rounded-lg border border-gold-light/45 text-[26px] font-semibold tnum">
                      {d}
                    </span>
                  ))}
                </div>
                <p className="mb-0 mt-3 text-xs leading-relaxed text-stone">À ne communiquer qu&apos;au livreur, après avoir vérifié que le scellé est intact.</p>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-ok">
                  <Icon name="check" size={18} stroke={2.5} className="text-white" />
                </span>
                <div>
                  <div className="text-[15px] font-semibold">Remis en main propre</div>
                  <div className="text-xs text-stone">Code validé · {dateTime(o.delivered_at)}</div>
                </div>
              </div>
            )}
            <div className="h-px bg-gold/35" />
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-ink-2 text-sm font-semibold text-gold-light">{carrier?.mono ?? "BO"}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{carrier?.name ?? (o.delivery_mode === "retrait" ? o.agency?.name ?? "Retrait en agence" : "Transporteur en cours d'attribution")}</div>
                <div className="text-xs text-stone">{sh.map((x) => x.option_name).filter(Boolean).join(" · ")} · assuré 100 %</div>
              </div>
              {carrier?.phone && (
                <a href={`tel:${carrier.phone.replace(/\s/g, "")}`} aria-label="Appeler le livreur" className="flex h-11 w-11 items-center justify-center rounded-lg border border-gold-light/40 text-gold-light hover:text-gold-light">
                  <Icon name="phone" size={18} />
                </a>
              )}
            </div>
          </div>
          <OrderActions
            order={{ id: o.id, number: o.number, status: o.status, payment_status: o.payment_status, payment_method: o.payment_method, total: o.total, mm_phone: o.mm_phone }}
            delivered={delivered}
            reviewed={!!review}
            sellers={[...new Map(its.filter((i) => i.shop).map((i) => [i.shop!.id, i.shop!])).values()]}
          />
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="px-5 py-4 text-base font-semibold">Détail de la commande</div>
        {its.map((i) => (
          <div key={i.id} className="flex flex-wrap items-center gap-4 border-t border-sand px-5 py-4">
            <div className={`h-14 w-14 flex-none rounded-lg ${i.kind === "lingot" ? "stripes-ink" : "stripes-sand"}`} />
            <div className="min-w-[180px] flex-1">
              <div className="font-semibold">
                {i.name} × {i.qty}
              </div>
              <div className="text-[13px] text-muted">
                {i.shop?.name} · {i.verified_badge}
              </div>
              {i.options?.engraving && <div className="text-[13px] text-muted">Gravure « {i.options.engraving} »</div>}
            </div>
            <div className="font-semibold tnum">{fcfa(i.line_total)}</div>
          </div>
        ))}
        {sh.map((x) => (
          <div key={x.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-sand bg-ivory px-5 py-3 text-[13px]">
            <span className="text-muted">
              Expédition {x.seller?.name} · {x.option_name} · {x.delay}
              {x.seal_number ? ` · scellé n° ${x.seal_number}` : ""}
            </span>
            <span className="flex items-center gap-3">
              <Pill tone={SHIPMENT_STATUS[x.status][1]}>{SHIPMENT_STATUS[x.status][0]}</Pill>
              <b className="tnum">{x.price ? fcfa(x.price) : "Offert"}</b>
            </span>
          </div>
        ))}
        <div className="flex flex-wrap justify-between gap-3 border-t border-line px-5 py-4 text-base font-semibold tnum">
          <span>
            Total · {PAYMENT_METHODS[o.payment_method][0]} {o.payment_ref ? <span className="text-xs font-normal text-muted">· réf. {o.payment_ref}</span> : null}
          </span>
          <span>{fcfa(o.total)}</span>
        </div>
      </section>
    </div>
  );
}
