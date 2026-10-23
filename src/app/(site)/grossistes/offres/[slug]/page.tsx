import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OfferDetail } from "@/components/offer-detail";
import { ProductSkeleton } from "@/components/skeletons";
import { getProductBySlug, getProducts, getShopBySlug } from "@/lib/data";

export async function generateStaticParams() {
  const list = await getProducts({ kind: "gros" });
  return list.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/grossistes/offres/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  return p ? { title: `${p.name} · offre de gros`, description: p.description ?? undefined } : { title: "Offre introuvable" };
}

export default function OfferPage({ params }: PageProps<"/grossistes/offres/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/grossistes/offres/[slug]">["params"] }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p || p.kind !== "gros") notFound();
  const shop = await getShopBySlug(p.shop.slug);
  if (!shop) notFound();
  return <OfferDetail p={p} shop={shop} base={{ href: "/grossistes", label: "Grossistes & comptoirs", shopHref: `/grossistes/${shop.slug}` }} />;
}
