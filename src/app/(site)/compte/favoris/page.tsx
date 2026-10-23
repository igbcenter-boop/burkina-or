import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/ui";
import { JewelCard, LingotCard } from "@/components/products";
import { PanelSkeleton } from "@/components/skeletons";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PRODUCT_SELECT } from "@/lib/data";
import type { ProductWithShop } from "@/lib/types";

export const metadata: Metadata = { title: "Mes favoris" };

export default function FavoritesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="m-0 font-serif text-[clamp(32px,3.6vw,44px)] font-semibold">Mes favoris</h1>
      <Suspense fallback={<PanelSkeleton />}>
        <Favs />
      </Suspense>
    </div>
  );
}

async function Favs() {
  const s = await requireUser("/compte/favoris");
  const supabase = await createClient();
  const { data: favs } = await supabase.from("favorites").select("product_id").eq("user_id", s.userId).order("created_at", { ascending: false });
  const ids = (favs ?? []).map((f) => f.product_id);
  const { data } = ids.length ? await supabase.from("products").select(PRODUCT_SELECT).in("id", ids).eq("status", "published") : { data: [] };
  const list = (data ?? []) as unknown as ProductWithShop[];
  if (!list.length)
    return (
      <EmptyState icon="heart" title="Aucun favori" text="Touchez le cœur sur un bijou pour le retrouver ici.">
        <Link href="/bijoux" className="btn-gold">
          Parcourir les bijoux
        </Link>
      </EmptyState>
    );
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,160px),1fr))] gap-5 lg:grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))]">
      {list.map((p) => (p.kind === "lingot" ? <LingotCard key={p.id} p={p} /> : <JewelCard key={p.id} p={p} />))}
    </div>
  );
}
