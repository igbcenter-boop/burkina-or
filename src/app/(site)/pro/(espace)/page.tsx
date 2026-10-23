import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icons";
import { Pill } from "@/components/ui";
import { PanelSkeleton } from "@/components/skeletons";
import { requirePro } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dateShort, fcfa, orderNo } from "@/lib/format";
import { ORDER_STATUS, SHIPMENT_STATUS } from "@/lib/labels";

export const metadata: Metadata = { title: "Espace professionnel" };

export default function ProDashboard() {
  return (
    <Suspense fallback={<PanelSkeleton rows={6} />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const { shop, profile } = await requirePro();
  const supabase = await createClient();
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString();

  const banner =
    shop.status === "pending"
      ? { tone: "warn", text: "Votre dossier est en cours de vérification par l'équipe conformité (48 h en moyenne). Vos produits restent en brouillon jusqu'à la validation.", cta: ["/pro/documents", "Compléter mes documents"] }
      : shop.status === "more_info"
        ? { tone: "warn", text: "Des compléments vous ont été demandés. Consultez vos messages et remplacez les pièces signalées.", cta: ["/pro/documents", "Voir les pièces à fournir"] }
        : shop.status === "refused"
          ? { tone: "err", text: `Votre dossier a été refusé${shop.refusal_reason ? ` : ${shop.refusal_reason}` : ""}. Vous pourrez soumettre un nouveau dossier dans 30 jours.`, cta: ["/contact", "Contacter le support"] }
          : shop.status === "suspended"
            ? { tone: "err", text: "Votre compte est suspendu : aucune publication ni transaction n'est possible. Contactez le support.", cta: ["/contact", "Contacter le support"] }
            : null;

  if (shop.type === "livreur") {
    const { data: ships } = await supabase.from("shipments").select("id,status,to_city,from_city,option_name,created_at,order:orders(number)").eq("carrier_id", shop.id).order("created_at", { ascending: false });
    const all = ships ?? [];
    const active = all.filter((s) => !["delivered", "pending"].includes(s.status));
    const todo = all.filter((s) => ["pending", "assigned", "preparing"].includes(s.status));
    return (
      <div className="flex flex-col gap-6">
        <Header name={profile.full_name} shop={shop.name} />
        {banner && <Banner {...banner} />}
        <Kpis items={[["Missions à prendre en charge", todo.length], ["En cours", active.length], ["Livrées", all.filter((s) => s.status === "delivered").length], ["Incidents", all.filter((s) => s.status === "incident").length]]} />
        <section className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="m-0 text-base font-semibold">Dernières missions</h2>
            <Link href="/pro/livraisons" className="text-[13px] font-semibold">
              Toutes les missions →
            </Link>
          </div>
          {all.slice(0, 6).map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-4 border-t border-sand px-5 py-3.5 text-sm">
              <span className="min-w-[110px] font-semibold tnum">{(s.order as unknown as { number: string })?.number}</span>
              <span className="flex-1 text-muted">
                {s.from_city} → {s.to_city} · {s.option_name}
              </span>
              <Pill tone={SHIPMENT_STATUS[s.status as keyof typeof SHIPMENT_STATUS][1]}>{SHIPMENT_STATUS[s.status as keyof typeof SHIPMENT_STATUS][0]}</Pill>
            </div>
          ))}
          {!all.length && <div className="border-t border-sand px-5 py-10 text-center text-sm text-muted">Aucune mission pour le moment.</div>}
        </section>
      </div>
    );
  }

  const [{ data: items }, { count: products }, { data: quotes }, { data: views }] = await Promise.all([
    supabase.from("order_items").select("id,name,qty,line_total,commission_amount,seller_status,created_at,order:orders!inner(number,status,payment_status,customer_name,city,created_at)").eq("shop_id", shop.id).order("created_at", { ascending: false }),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("shop_id", shop.id).eq("status", "published"),
    supabase.from("quote_requests").select("id,status").eq("shop_id", shop.id),
    supabase.from("products").select("views_count").eq("shop_id", shop.id),
  ]);
  type It = { id: string; name: string; qty: number; line_total: number; commission_amount: number; seller_status: string; created_at: string; order: { number: string; status: keyof typeof ORDER_STATUS; payment_status: string; customer_name: string; city: string; created_at: string } };
  const its = (items ?? []) as unknown as It[];
  const paid = its.filter((i) => i.order.payment_status === "paid" && !["cancelled", "refunded"].includes(i.order.status));
  const recent = paid.filter((i) => i.created_at >= since30);
  const sales = recent.reduce((s, i) => s + Number(i.line_total), 0);
  const com = recent.reduce((s, i) => s + Number(i.commission_amount), 0);
  const todo = paid.filter((i) => i.seller_status === "pending").length;
  const openQuotes = (quotes ?? []).filter((q) => ["new", "negotiating"].includes(q.status)).length;
  const totalViews = (views ?? []).reduce((s, v) => s + (v.views_count ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <Header name={profile.full_name} shop={shop.name} />
      {banner && <Banner {...banner} />}
      <Kpis
        items={[
          ["Ventes · 30 jours", fcfa(sales)],
          ["Commissions · 30 jours", fcfa(com)],
          ["Net vendeur · 30 jours", fcfa(sales - com)],
          [shop.type === "comptoir" || shop.type === "fondeur" ? "Devis à traiter" : "Articles à confirmer", shop.type === "comptoir" || shop.type === "fondeur" ? openQuotes : todo],
          ["Annonces en ligne", products ?? 0],
          ["Vues des annonces", totalViews],
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["/pro/produits/nouveau", "plus", shop.type === "comptoir" ? "Publier une offre" : shop.type === "fondeur" ? "Ajouter une prestation" : "Ajouter un produit"],
          ["/pro/boutique", "edit", "Personnaliser ma page"],
          [shop.type === "comptoir" || shop.type === "fondeur" ? "/pro/devis" : "/pro/commandes", "receipt", shop.type === "comptoir" || shop.type === "fondeur" ? "Répondre aux devis" : "Traiter les commandes"],
        ].map(([h, i, l]) => (
          <Link key={h} href={h} className="flex items-center gap-3 rounded-xl border border-line bg-white p-4 text-sm font-semibold text-text hover:border-gold hover:text-text">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sand text-gold-dark">
              <Icon name={i as "plus"} size={18} />
            </span>
            {l}
          </Link>
        ))}
      </div>
      <section className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="m-0 text-base font-semibold">Dernières ventes</h2>
          <Link href="/pro/commandes" className="text-[13px] font-semibold">
            Toutes les commandes →
          </Link>
        </div>
        {its.slice(0, 6).map((i) => (
          <div key={i.id} className="flex flex-wrap items-center gap-4 border-t border-sand px-5 py-3.5 text-sm">
            <span className="min-w-[110px] font-semibold tnum">{orderNo(i.order.number)}</span>
            <span className="min-w-[160px] flex-1">
              {i.name} × {i.qty}
              <span className="block text-xs text-muted">
                {i.order.customer_name} · {i.order.city} · {dateShort(i.order.created_at)}
              </span>
            </span>
            <Pill tone={ORDER_STATUS[i.order.status][1]}>{ORDER_STATUS[i.order.status][0]}</Pill>
            <span className="w-28 text-right font-semibold tnum">{fcfa(i.line_total)}</span>
          </div>
        ))}
        {!its.length && <div className="border-t border-sand px-5 py-10 text-center text-sm text-muted">Aucune vente pour le moment.</div>}
      </section>
    </div>
  );
}

function Header({ name, shop }: { name: string | null; shop: string }) {
  return (
    <div>
      <div className="text-[13px] text-muted">{shop}</div>
      <h1 className="m-0 mt-1 font-serif text-[clamp(32px,3.6vw,44px)] font-semibold">Bonjour {name?.split(" ")[0]}</h1>
    </div>
  );
}

function Banner({ tone, text, cta }: { tone: string; text: string; cta: string[] }) {
  return (
    <div className={`flex flex-wrap items-center gap-4 rounded-xl px-5 py-4 text-sm ${tone === "err" ? "bg-err-bg text-err" : "bg-warn-bg text-warn"}`}>
      <Icon name="alert" size={20} className="flex-none" />
      <span className="min-w-[220px] flex-1 leading-relaxed">{text}</span>
      <Link href={cta[0]} className="font-semibold underline">
        {cta[1]}
      </Link>
    </div>
  );
}

function Kpis({ items }: { items: [string, string | number][] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] gap-4">
      {items.map(([l, v]) => (
        <div key={l} className="rounded-xl border border-line bg-white p-5">
          <div className="text-[13px] text-muted">{l}</div>
          <div className="mt-1 whitespace-nowrap text-2xl font-semibold tnum">{v}</div>
        </div>
      ))}
    </div>
  );
}
