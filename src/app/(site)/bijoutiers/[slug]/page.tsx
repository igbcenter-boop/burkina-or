import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { JewelCard } from "@/components/products";
import { ContactSeller } from "@/components/contact-seller";
import { ReviewList, ShopFacts, ShopHeader } from "@/components/shop-profile";
import { PageSkeleton } from "@/components/skeletons";
import { getProducts, getReviews, getShopBySlug, getShops } from "@/lib/data";

export async function generateStaticParams() {
  const shops = await getShops("bijoutier");
  return shops.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/bijoutiers/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = await getShopBySlug(slug);
  return s ? { title: `${s.name} · ${s.specialty ?? "Bijoutier"} à ${s.city}`, description: s.description ?? undefined } : { title: "Boutique introuvable" };
}

export default function JewelerPage({ params }: PageProps<"/bijoutiers/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/bijoutiers/[slug]">["params"] }) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop || shop.type !== "bijoutier") notFound();
  const [products, reviews] = await Promise.all([getProducts({ kind: "bijou", shopId: shop.id }), getReviews({ shopId: shop.id })]);
  const collections = [...new Set(products.map((p) => p.collection).filter(Boolean))] as string[];
  const custom = products.filter((p) => p.customizable);

  return (
    <>
      <ShopHeader
        shop={shop}
        crumbs={[{ href: "/", label: "Accueil" }, { href: "/bijoutiers", label: "Bijoutiers" }, { label: shop.name }]}
        actions={<ContactSeller shopId={shop.id} shopName={shop.name} back={`/bijoutiers/${shop.slug}`} label="Contacter l'atelier" />}
      />
      <main className="wrap grid items-start gap-[clamp(20px,3vw,40px)] pb-24 pt-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-10">
          <section className="grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-line bg-white p-6">
              <div className="eyebrow">Présentation</div>
              <p className="mb-0 mt-3 text-[15px] leading-relaxed text-body">{shop.description}</p>
            </div>
            <div className="rounded-xl bg-sand p-6">
              <div className="eyebrow">Savoir-faire &amp; spécialités</div>
              <p className="mb-0 mt-3 text-[15px] leading-relaxed text-body">{shop.savoir_faire ?? shop.specialty}</p>
              {shop.commercial_terms && <p className="mb-0 mt-3 text-[13px] text-muted">{shop.commercial_terms}</p>}
            </div>
          </section>

          {collections.map((c) => (
            <section key={c}>
              <div className="eyebrow">Collection</div>
              <h2 className="h-section mb-6">{c}</h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,160px),1fr))] gap-[clamp(12px,1.6vw,20px)] lg:grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))]">
                {products
                  .filter((p) => p.collection === c)
                  .map((p) => (
                    <JewelCard key={p.id} p={p} />
                  ))}
              </div>
            </section>
          ))}

          <section>
            <div className="eyebrow">Catalogue</div>
            <h2 className="h-section mb-6">Tous les bijoux · {products.length}</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,160px),1fr))] gap-[clamp(12px,1.6vw,20px)] lg:grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))]">
              {products.map((p) => (
                <JewelCard key={p.id} p={p} />
              ))}
            </div>
          </section>

          {custom.length > 0 && (
            <section className="rounded-xl bg-ink p-[clamp(24px,4vw,40px)] text-ivory">
              <div className="text-xs uppercase tracking-[.14em] text-gold-light">Créations personnalisées</div>
              <h2 className="m-0 mt-2 font-serif text-[clamp(28px,3vw,40px)] font-semibold">Gravure, taille, modèle unique</h2>
              <p className="mb-0 mt-2 max-w-[560px] text-[15px] leading-relaxed text-stone">
                {custom.length} pièce{custom.length > 1 ? "s" : ""} personnalisable{custom.length > 1 ? "s" : ""} dans cette boutique. Décrivez votre projet à l&apos;atelier pour obtenir un devis.
              </p>
              <div className="mt-5">
                <ContactSeller shopId={shop.id} shopName={shop.name} back={`/bijoutiers/${shop.slug}`} label="Décrire mon projet" subject="Création sur mesure" variant="gold" />
              </div>
            </section>
          )}

          <section>
            <div className="eyebrow">Avis clients</div>
            <h2 className="h-section mb-6">Ils ont acheté chez {shop.name}</h2>
            <ReviewList reviews={reviews} />
          </section>
        </div>
        <aside className="flex flex-col gap-5 lg:sticky lg:top-6">
          <ShopFacts shop={shop} />
        </aside>
      </main>
    </>
  );
}
