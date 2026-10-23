import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icons";
import { EmptyState, PageHero } from "@/components/ui";
import { JewelCard } from "@/components/products";
import { PageSkeleton } from "@/components/skeletons";
import { getCategories, getGoldQuote, getProducts } from "@/lib/data";
import { priceOf } from "@/lib/pricing";
import { JewelFilters } from "./filters";

export const metadata: Metadata = {
  title: "Bijoux en or · Catalogue des bijoutiers vérifiés",
  description: "Bagues, alliances, colliers, bracelets et parures en or 18, 22 et 24 carats par les meilleurs artisans du Burkina Faso.",
};

export default function BijouxPage({ searchParams }: PageProps<"/bijoux">) {
  return (
    <>
      <PageHero
        crumbs={[{ href: "/", label: "Accueil" }, { label: "Bijoux" }]}
        title="Bijoux en or"
        text="Les créations des bijoutiers vérifiés de la plateforme. Le titre et le poids de l'or sont clairement indiqués : vérifiés par Burkina Or, ou déclarés par le vendeur."
      >
        <span className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full bg-ok/20 px-3.5 text-[13px] font-semibold text-ok-light">
          <Icon name="shield-check" size={15} stroke={1.75} />
          Bijoutiers vérifiés
        </span>
        <Link href="/bijoux?categorie=sur-mesure" className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border border-gold-light/40 px-3.5 text-[13px] font-semibold text-gold-light hover:text-gold-light">
          Créations sur mesure →
        </Link>
      </PageHero>
      <Suspense fallback={<PageSkeleton title={false} />}>
        <Catalog searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Catalog({ searchParams }: { searchParams: PageProps<"/bijoux">["searchParams"] }) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined)) ?? "";
  const [all, cats, quote] = await Promise.all([getProducts({ kind: "bijou" }), getCategories("bijou"), getGoldQuote()]);
  const categorie = one("categorie"), occasion = one("occasion"), titre = one("titre"), collection = one("collection"), tri = one("tri") || "pop";
  const max = Number(one("max")) || 0;
  const q = one("q").toLowerCase();
  let list = all.filter(
    (p) =>
      (!categorie || p.category?.slug === categorie) &&
      (!occasion || p.occasions.includes(occasion)) &&
      (!titre || (p.karat ?? "").startsWith(titre)) &&
      (!collection || p.collection === collection) &&
      (!max || priceOf(p, quote.p24).total <= max) &&
      (!q || `${p.name} ${p.description ?? ""} ${p.shop.name}`.toLowerCase().includes(q)),
  );
  const price = (p: (typeof list)[number]) => priceOf(p, quote.p24).total;
  list = [...list].sort((a, b) =>
    tri === "pa" ? price(a) - price(b) : tri === "pd" ? price(b) - price(a) : tri === "recent" ? b.created_at.localeCompare(a.created_at) : b.sales_count - a.sales_count,
  );
  const shops = new Set(list.map((p) => p.shop_id)).size;

  return (
    <main className="wrap grid items-start gap-[clamp(20px,3vw,40px)] pb-24 pt-[clamp(20px,3vw,36px)] lg:grid-cols-[280px_minmax(0,1fr)]">
      <JewelFilters
        cats={cats.map((c) => ({ slug: c.slug, name: c.name, count: c.count }))}
        current={{ categorie, occasion, titre, collection, tri, max: max ? String(max) : "", q }}
        count={list.length}
      />
      <div className="min-w-0">
        <div className="mb-5 text-sm text-muted">
          <b className="text-text tnum">{list.length}</b> bijou{list.length > 1 ? "x" : ""} · {shops} bijoutier{shops > 1 ? "s" : ""}
          {collection && <> · collection « {collection} »</>}
        </div>
        {list.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,160px),1fr))] gap-[clamp(12px,1.6vw,20px)] lg:grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))]">
            {list.map((p) => (
              <JewelCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <EmptyState icon="gem" title="Aucun bijou ne correspond" text="Retirez un filtre ou demandez à un conseiller de vous orienter vers un bijoutier pour une création sur mesure.">
            <Link href="/bijoux" className="btn-outline">
              Réinitialiser les filtres
            </Link>
            <Link href="/conseil?besoin=bijou" className="btn-gold">
              Parler à un conseiller
            </Link>
          </EmptyState>
        )}
      </div>
    </main>
  );
}
