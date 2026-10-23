import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductForm } from "@/components/product-form";
import { PanelSkeleton } from "@/components/skeletons";
import { requirePro } from "@/lib/auth";
import { getCategories } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

export const metadata: Metadata = { title: "Modifier l'annonce" };

const KIND = { bijoutier: "bijou", comptoir: "gros", fondeur: "service", officielle: "lingot", livreur: "service" } as const;

export default function EditProductPage({ params }: PageProps<"/pro/produits/[id]">) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/pro/produits" className="text-sm font-semibold">
        ← Retour
      </Link>
      <Suspense fallback={<PanelSkeleton rows={8} />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}

async function Content({ params }: { params: PageProps<"/pro/produits/[id]">["params"] }) {
  const { id } = await params;
  const { shop } = await requirePro();
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*").eq("id", id).eq("shop_id", shop.id).maybeSingle();
  if (!data) notFound();
  const p = data as Product;
  const categories = await getCategories(KIND[shop.type]);
  return (
    <>
      <h1 className="m-0 font-serif text-[clamp(30px,3.4vw,42px)] font-semibold">{p.name}</h1>
      {(p.status === "suspended" || p.status === "removed") && (
        <div className="rounded-xl bg-err-bg px-5 py-3 text-sm text-err">Cette annonce a été {p.status === "removed" ? "retirée" : "suspendue"} par la modération. Corrigez-la puis contactez l&apos;équipe pour une nouvelle vérification.</div>
      )}
      <ProductForm shopId={shop.id} shopType={shop.type} categories={categories} product={p} />
    </>
  );
}
