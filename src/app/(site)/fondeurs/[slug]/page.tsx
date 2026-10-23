import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OfferCard } from "@/components/offer-card";
import { ContactSeller } from "@/components/contact-seller";
import { QuoteForm } from "@/components/quote-form";
import { ShopFacts, ShopHeader } from "@/components/shop-profile";
import { PageSkeleton } from "@/components/skeletons";
import { getProducts, getShopBySlug, getShops } from "@/lib/data";
import { dateShort } from "@/lib/format";

export async function generateStaticParams() {
  const shops = await getShops("fondeur");
  return shops.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/fondeurs/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = await getShopBySlug(slug);
  return s ? { title: `${s.name} · ${s.specialty ?? "fondeur"}`, description: s.description ?? undefined } : { title: "Prestataire introuvable" };
}

export default function FounderPage({ params }: PageProps<"/fondeurs/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/fondeurs/[slug]">["params"] }) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop || shop.type !== "fondeur") notFound();
  const services = await getProducts({ kind: "service", shopId: shop.id });
  return (
    <>
      <ShopHeader
        shop={shop}
        crumbs={[{ href: "/", label: "Accueil" }, { href: "/fondeurs", label: "Fondeurs & services" }, { label: shop.name }]}
        actions={<ContactSeller shopId={shop.id} shopName={shop.name} back={`/fondeurs/${shop.slug}`} />}
      />
      <main className="wrap grid items-start gap-[clamp(20px,3vw,40px)] pb-24 pt-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-10">
          <section className="grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-line bg-white p-6">
              <div className="eyebrow">Présentation</div>
              <p className="mb-0 mt-3 text-[15px] leading-relaxed text-body">{shop.description}</p>
            </div>
            <div className="rounded-xl bg-sand p-6">
              <div className="eyebrow">Capacités & conditions</div>
              <p className="mb-0 mt-3 text-[15px] leading-relaxed text-body">{shop.capacities ?? "Sur demande"}</p>
              {shop.commercial_terms && <p className="mb-0 mt-2 text-[13px] text-muted">{shop.commercial_terms}</p>}
            </div>
          </section>
          <section>
            <div className="eyebrow">Prestations</div>
            <h2 className="h-section mb-6">Services proposés</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-[clamp(12px,1.6vw,20px)]">
              {services.map((p) => (
                <OfferCard key={p.id} p={p} />
              ))}
            </div>
          </section>
        </div>
        <aside className="flex flex-col gap-5 lg:sticky lg:top-6">
          <QuoteForm shopId={shop.id} back={`/fondeurs/${shop.slug}`} service />
          <ShopFacts
            shop={shop}
            extra={[
              ["Agrément", shop.authorization_number],
              ["Valable jusqu'au", shop.authorization_expires ? dateShort(shop.authorization_expires) : null],
            ]}
          />
        </aside>
      </main>
    </>
  );
}
