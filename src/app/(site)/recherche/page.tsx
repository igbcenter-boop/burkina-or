import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, PageHero } from "@/components/ui";
import { JewelCard, LingotCard } from "@/components/products";
import { OfferCard } from "@/components/offer-card";
import { ShopCard } from "@/components/shop-profile";
import { PageSkeleton } from "@/components/skeletons";
import { searchProducts, searchShops } from "@/lib/data";
import type { ProductKind } from "@/lib/types";

export const metadata: Metadata = { title: "Recherche", robots: { index: false } };

export default function SearchPage({ searchParams }: PageProps<"/recherche">) {
  return (
    <>
      <PageHero crumbs={[{ href: "/", label: "Accueil" }, { label: "Recherche" }]} title="Recherche" />
      <Suspense fallback={<PageSkeleton title={false} />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const shopHref = (type: string, slug: string) => ({ bijoutier: "/bijoutiers/", comptoir: "/grossistes/", fondeur: "/fondeurs/", livreur: "/livraison#", officielle: "/boutique-officielle#" })[type] + slug;

async function Results({ searchParams }: { searchParams: PageProps<"/recherche">["searchParams"] }) {
  const sp = await searchParams;
  const q = String(sp.q ?? "").trim();
  const t = String(sp.t ?? "tout");
  const kind: ProductKind | undefined = ["lingot", "bijou", "gros", "service"].includes(t) ? (t as ProductKind) : undefined;
  const [products, shops] = await Promise.all([t === "bijoutiers" ? Promise.resolve([]) : searchProducts(q, kind), t === "tout" || t === "bijoutiers" ? searchShops(q) : Promise.resolve([])]);
  const lingots = products.filter((p) => p.kind === "lingot");
  const bijoux = products.filter((p) => p.kind === "bijou");
  const offers = products.filter((p) => p.kind === "gros" || p.kind === "service");
  const total = products.length + shops.length;

  return (
    <main className="wrap flex flex-col gap-12 pb-24 pt-8">
      <p className="m-0 text-[15px] text-muted">
        {total} résultat{total > 1 ? "s" : ""} {q && <>pour « <b className="text-text">{q}</b> »</>}
      </p>
      {total === 0 && (
        <EmptyState title="Aucun résultat" text="Essayez un autre terme (ex. « 5 g », « alliance », « 18 ct », « Bobo ») ou laissez un conseiller vous orienter.">
          <Link href="/boutique-officielle" className="btn-outline">
            Voir les lingotins
          </Link>
          <Link href="/conseil" className="btn-gold">
            Parler à un conseiller
          </Link>
        </EmptyState>
      )}
      {lingots.length > 0 && (
        <section>
          <h2 className="mb-5 font-serif text-[30px] font-semibold">Lingotins · {lingots.length}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,160px),1fr))] gap-5 lg:grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))]">
            {lingots.map((p) => (
              <LingotCard key={p.id} p={p} showForm />
            ))}
          </div>
        </section>
      )}
      {bijoux.length > 0 && (
        <section>
          <h2 className="mb-5 font-serif text-[30px] font-semibold">Bijoux · {bijoux.length}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,160px),1fr))] gap-5 lg:grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))]">
            {bijoux.map((p) => (
              <JewelCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}
      {offers.length > 0 && (
        <section>
          <h2 className="mb-5 font-serif text-[30px] font-semibold">Offres professionnelles · {offers.length}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-5">
            {offers.map((p) => (
              <OfferCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}
      {shops.length > 0 && (
        <section>
          <h2 className="mb-5 font-serif text-[30px] font-semibold">Professionnels · {shops.length}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,290px),1fr))] gap-5">
            {shops.map((s) => (
              <ShopCard key={s.id} shop={s} href={shopHref(s.type, s.slug)} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
