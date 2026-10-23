import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ASkeleton } from "@/components/admin-ui";
import { ProductForm } from "@/components/product-form";
import { requireAdmin } from "@/lib/auth";
import { getCategories } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Product } from "@/lib/types";

export const metadata = { title: "Modifier un produit officiel" };

export default function EditOfficialProductPage({ params }: PageProps<"/admin/catalogue/[id]">) {
  return (
    <>
      <Link href="/admin/catalogue" className="text-sm font-semibold text-a-gold">
        ← Catalogue
      </Link>
      <Suspense fallback={<ASkeleton rows={6} />}>
        <Content params={params} />
      </Suspense>
    </>
  );
}

async function Content({ params }: { params: PageProps<"/admin/catalogue/[id]">["params"] }) {
  const { id } = await params;
  await requireAdmin();
  const { data } = await createAdminClient().from("products").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const categories = await getCategories("lingot");
  return (
    <div className="flex flex-col gap-4 [&_.field]:border-a-line [&_.field]:bg-a-input [&_.field]:text-a-text [&_section]:border-a-line [&_section]:bg-a-card">
      <h2 className="m-0 font-serif text-[30px] font-semibold">{(data as Product).name}</h2>
      <ProductForm shopId={(data as Product).shop_id} shopType="officielle" categories={categories} product={data as Product} />
    </div>
  );
}
