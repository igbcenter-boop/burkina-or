import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OfferCard } from "@/components/offer-card";
import { ContactSeller } from "@/components/contact-seller";
import { QuoteForm } from "@/components/quote-form";
import { ReviewList, ShopFacts, ShopHeader } from "@/components/shop-profile";
import { PageSkeleton } from "@/components/skeletons";
import { getProducts, getReviews, getShopBySlug, getShops } from "@/lib/data";
import { dateShort } from "@/lib/format";

export async function generateStaticParams() {
  const shops = await getShops("comptoir");
  return shops.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/grossistes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = await getShopBySlug(slug);
  return s ? { title: `${s.name} · comptoir d'or`, description: s.description ?? undefined } : { title: "Comptoir introuvable" };
}

export default function WholesalerPage({ params }: PageProps<"/grossistes/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/grossistes/[slug]">["params"] }) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop || shop.type !== "comptoir") notFound();
  const [offers, reviews] = await Promise.all([getProducts({ kind: "gros", shopId: shop.id }), getReviews({ shopId: shop.id })]);
  return (
    <>
      <ShopHeader
        shop={shop}
        crumbs={[{ href: "/", label: "Accueil" }, { href: "/grossistes", label: "Grossistes & comptoirs" }, { label: shop.name }]}
        actions={<ContactSeller shopId={shop.id} shopName={shop.name} back={`/grossistes/${shop.slug}`} />}
      />
      <main className="wrap grid items-start gap-[clamp(20px,3vw,40px)] pb-24 pt-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-10">
          <section className="grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-line bg-white p-6">
              <div className="eyebrow">Activités</div>
              <p className="mb-0 mt-3 text-[15px] leading-relaxed text-body">{shop.description}</p>
            </div>
            <div className="rounded-xl bg-sand p-6">
              <div className="eyebrow">Conditions commerciales</div>
              <p className="mb-0 mt-3 text-[15px] leading-relaxed text-body">{shop.commercial_terms ?? "Sur demande."}</p>
              <div className="mt-3 text-[13px] text-muted">
                {shop.capacities && <>Capacité : {shop.capacities}<br /></>}
                {shop.min_order && <>Commande minimale : {shop.min_order}</>}
              </div>
            </div>
          </section>
          <section>
            <div className="eyebrow">Offres</div>
            <h2 className="h-section mb-6">Offres de gros · {offers.length}</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-[clamp(12px,1.6vw,20px)]">
              {offers.map((p) => (
                <OfferCard key={p.id} p={p} />
              ))}
            </div>
          </section>
          {reviews.length > 0 && (
            <section>
              <div className="eyebrow">Avis</div>
              <h2 className="h-section mb-6">Retours d&apos;acheteurs professionnels</h2>
              <ReviewList reviews={reviews} />
            </section>
          )}
        </div>
        <aside className="flex flex-col gap-5 lg:sticky lg:top-6">
          <QuoteForm shopId={shop.id} back={`/grossistes/${shop.slug}`} />
          <ShopFacts
            shop={shop}
            extra={[
              ["Autorisation", shop.authorization_number],
              ["Valable jusqu'au", shop.authorization_expires ? dateShort(shop.authorization_expires) : null],
            ]}
          />
        </aside>
      </main>
    </>
  );
}
