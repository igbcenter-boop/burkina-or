import Link from "next/link";
import { Suspense } from "react";
import { ASkeleton } from "@/components/admin-ui";
import { ProductForm } from "@/components/product-form";
import { requireAdmin } from "@/lib/auth";
import { getCategories } from "@/lib/data";

export const metadata = { title: "Nouveau produit officiel" };

export default function NewOfficialProductPage() {
  return (
    <>
      <Link href="/admin/catalogue" className="text-sm font-semibold text-a-gold">
        ← Catalogue
      </Link>
      <Suspense fallback={<ASkeleton rows={6} />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  await requireAdmin();
  const categories = await getCategories("lingot");
  return (
    <div className="[&_.field]:border-a-line [&_.field]:bg-a-input [&_.field]:text-a-text [&_section]:border-a-line [&_section]:bg-a-card">
      <ProductForm shopId="a0000000-0000-4000-8000-000000000001" shopType="officielle" categories={categories} />
    </div>
  );
}
