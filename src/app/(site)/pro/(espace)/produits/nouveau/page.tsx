import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProductForm } from "@/components/product-form";
import { PanelSkeleton } from "@/components/skeletons";
import { requirePro } from "@/lib/auth";
import { getCategories } from "@/lib/data";

export const metadata: Metadata = { title: "Nouveau produit" };

const KIND = { bijoutier: "bijou", comptoir: "gros", fondeur: "service", officielle: "lingot", livreur: "service" } as const;

export default function NewProductPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/pro/produits" className="text-sm font-semibold">
        ← Retour
      </Link>
      <h1 className="m-0 font-serif text-[clamp(32px,3.6vw,44px)] font-semibold">Nouvelle annonce</h1>
      <Suspense fallback={<PanelSkeleton rows={8} />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const { shop } = await requirePro();
  const categories = await getCategories(KIND[shop.type]);
  return <ProductForm shopId={shop.id} shopType={shop.type} categories={categories} />;
}
