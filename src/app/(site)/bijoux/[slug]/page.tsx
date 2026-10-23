import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Icon, StarIcon } from "@/components/icons";
import { Breadcrumb, Mono } from "@/components/ui";
import { JewelCard } from "@/components/products";
import { ProductSkeleton } from "@/components/skeletons";
import { getProductBySlug, getProducts, getReviews, getShopBySlug } from "@/lib/data";
import { dateShort } from "@/lib/format";
import { specRows } from "@/lib/specs";
import { JewelDetail } from "./detail";

export async function generateStaticParams() {
  const list = await getProducts({ kind: "bijou" });
  return list.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/bijoux/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  return p ? { title: `${p.name} · ${p.shop.name}`, description: p.description ?? undefined } : { title: "Bijou introuvable" };
}

export default function JewelPage({ params }: PageProps<"/bijoux/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/bijoux/[slug]">["params"] }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p || p.kind !== "bijou") notFound();
  const [shop, reviews, sameShop] = await Promise.all([getShopBySlug(p.shop.slug), getReviews({ productId: p.id }), getProducts({ kind: "bijou", shopId: p.shop_id })]);
  const similar = sameShop.filter((x) => x.id !== p.id).slice(0, 4);

  return (
    <main className="wrap pt-[clamp(16px,2.5vw,28px)]">
      <Breadcrumb
        items={[
          { href: "/", label: "Accueil" },
          { href: "/bijoux", label: "Bijoux" },
          ...(p.category ? [{ href: `/bijoux?categorie=${p.category.slug}`, label: p.category.name }] : []),
          { label: p.name },
        ]}
      />
      <JewelDetail p={p} specs={specRows(p)} />

      {shop && (
        <section className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <Link href={`/bijoutiers/${shop.slug}`} className="flex flex-col gap-4 rounded-xl border border-line bg-white p-6 text-text hover:text-text hover:shadow-[0_10px_28px_-12px_rgba(26,24,20,.18)]">
            <div className="flex items-center gap-4">
              <Mono text={shop.mono} className="h-16 w-16 flex-none rounded-xl bg-ivory text-[22px]" />
              <div>
                <div className="flex items-center gap-1.5 text-lg font-semibold">
                  {shop.name}
                  <Icon name="shield-check" size={16} stroke={1.75} className="text-ok" />
                </div>
                <div className="text-[13px] text-muted">
                  {shop.city} · {shop.specialty}
                </div>
              </div>
            </div>
            <p className="m-0 text-sm leading-relaxed text-body">{shop.description}</p>
            <div className="flex items-center gap-4 text-[13px]">
              <span className="flex items-center gap-1.5">
                <StarIcon />
                <b>{String(shop.rating).replace(".", ",")}</b>
                <span className="text-muted">· {shop.reviews_count} avis</span>
              </span>
              <span className="text-muted">Vendeur vérifié depuis {dateShort(shop.verified_at)}</span>
            </div>
            <span className="text-sm font-semibold text-gold-dark">Voir la boutique →</span>
          </Link>
          <div className="rounded-xl border border-line bg-white p-6">
            <h2 className="m-0 text-base font-semibold">Avis clients {reviews.length > 0 && <span className="text-muted">· {reviews.length}</span>}</h2>
            {reviews.length ? (
              <div className="mt-3 flex flex-col">
                {reviews.map((r) => (
                  <figure key={r.id} className="m-0 border-t border-sand py-4">
                    <div className="flex gap-0.5">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <StarIcon key={i} size={13} />
                      ))}
                    </div>
                    <blockquote className="m-0 mt-2 text-[15px] leading-relaxed">« {r.body} »</blockquote>
                    <figcaption className="mt-2 text-xs text-muted">
                      {r.author_name} · {r.author_meta} · {dateShort(r.created_at)}
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">Pas encore d&apos;avis sur ce bijou. Les avis sont publiés par des acheteurs ayant reçu leur commande.</p>
            )}
          </div>
        </section>
      )}

      {similar.length > 0 && (
        <section className="pt-[clamp(56px,7vw,88px)]">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <h2 className="m-0 font-serif text-[clamp(30px,3.2vw,42px)] font-semibold">Du même bijoutier</h2>
            <Link href={`/bijoutiers/${p.shop.slug}`} className="text-sm font-semibold">
              Toute la boutique →
            </Link>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,160px),1fr))] gap-[clamp(12px,1.6vw,20px)] lg:grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))]">
            {similar.map((s) => (
              <JewelCard key={s.id} p={s} />
            ))}
          </div>
        </section>
      )}
      <div className="h-24" />
    </main>
  );
}
