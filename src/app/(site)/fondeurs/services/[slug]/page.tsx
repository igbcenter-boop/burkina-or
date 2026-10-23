import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OfferDetail } from "@/components/offer-detail";
import { ProductSkeleton } from "@/components/skeletons";
import { getProductBySlug, getProducts, getShopBySlug } from "@/lib/data";

export async function generateStaticParams() {
  const list = await getProducts({ kind: "service" });
  return list.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/fondeurs/services/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  return p ? { title: p.name, description: p.description ?? undefined } : { title: "Prestation introuvable" };
}

export default function ServicePage({ params }: PageProps<"/fondeurs/services/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/fondeurs/services/[slug]">["params"] }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p || p.kind !== "service") notFound();
  const shop = await getShopBySlug(p.shop.slug);
  if (!shop) notFound();
  return <OfferDetail p={p} shop={shop} base={{ href: "/fondeurs", label: "Fondeurs & services", shopHref: `/fondeurs/${shop.slug}` }} />;
}
