import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icons";
import { EmptyState, Pill, Visual } from "@/components/ui";
import { PanelSkeleton } from "@/components/skeletons";
import { requirePro } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fcfa } from "@/lib/format";
import type { Product } from "@/lib/types";
import { RowActions } from "./row-actions";

export const metadata: Metadata = { title: "Mes produits" };

const STATUS = { published: ["En ligne", "ok"], draft: ["Brouillon", "mute"], pending: ["En attente", "warn"], suspended: ["Suspendu (modération)", "err"], removed: ["Retiré (modération)", "err"] } as const;

export default function ProductsPage() {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <List />
    </Suspense>
  );
}

async function List() {
  const { shop } = await requirePro();
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*").eq("shop_id", shop.id).order("updated_at", { ascending: false });
  const list = (data ?? []) as Product[];
  const noun = shop.type === "comptoir" ? "offre" : shop.type === "fondeur" ? "prestation" : "produit";
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 font-serif text-[clamp(32px,3.6vw,44px)] font-semibold">{shop.type === "comptoir" ? "Offres de gros" : shop.type === "fondeur" ? "Prestations" : "Produits"}</h1>
        <Link href="/pro/produits/nouveau" className="btn-gold h-11">
          <Icon name="plus" size={16} />
          Ajouter un{noun === "offre" || noun === "prestation" ? "e" : ""} {noun}
        </Link>
      </div>
      {shop.status !== "verified" && (
        <div className="rounded-xl bg-warn-bg px-5 py-3 text-sm text-warn">Vos annonces restent en brouillon jusqu&apos;à la validation de votre dossier.</div>
      )}
      {!list.length ? (
        <EmptyState icon="gem" title={`Aucun${noun === "produit" ? "" : "e"} ${noun}`} text="Ajoutez des photos de qualité, le poids et le titre de l'or : les acheteurs comparent avant d'acheter.">
          <Link href="/pro/produits/nouveau" className="btn-gold">
            Commencer
          </Link>
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          {list.map((p) => {
            const [label, tone] = STATUS[p.status];
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-4 border-t border-sand px-5 py-4 first:border-0">
                <Visual src={p.images[0]} label={null} tone={p.kind === "bijou" ? "sand" : "ink"} className="h-16 w-16 flex-none rounded-lg" sizes="64px" />
                <div className="min-w-[180px] flex-1">
                  <Link href={`/pro/produits/${p.id}`} className="font-semibold text-text">
                    {p.name}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <Pill tone={tone}>{label}</Pill>
                    {p.purity && <span>{p.purity}</span>}
                    {p.weight_g && <span>{String(p.weight_g).replace(".", ",")} g</span>}
                    <span>{p.stock_status === "out" ? "Rupture" : p.stock_qty != null ? `${p.stock_qty} en stock` : "Sur commande"}</span>
                    <span>{p.views_count} vues</span>
                    {(p.weight_verified || p.purity_verified) && <span className="font-semibold text-ok">Caractéristiques vérifiées</span>}
                  </div>
                </div>
                <div className="w-36 text-right font-semibold tnum">{p.pricing_mode === "fixed" ? fcfa(p.fixed_price) : p.pricing_mode === "indexed" ? "Indexé" : p.price_terms ?? "Sur devis"}</div>
                <RowActions id={p.id} status={p.status} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
