import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { PageHero } from "@/components/ui";
import { ShopCard } from "@/components/shop-profile";
import { getShops } from "@/lib/data";

export const metadata: Metadata = {
  title: "Bijoutiers vérifiés · Annuaire des artisans",
  description: "Les artisans bijoutiers vérifiés du Burkina Faso : alliances, parures, créoles, bijoux de mariage et créations sur mesure.",
};

export default async function JewelersPage() {
  const shops = await getShops("bijoutier");
  const cities = [...new Set(shops.map((s) => s.city).filter(Boolean))] as string[];
  return (
    <>
      <PageHero
        crumbs={[{ href: "/", label: "Accueil" }, { label: "Bijoutiers" }]}
        title="Bijoutiers vérifiés"
        text="Chaque atelier présent sur Burkina Or a fourni son registre de commerce, son identifiant fiscal et sa carte d'artisan. Découvrez leur savoir-faire et leurs collections."
      >
        <Link href="/vendre?activite=bijoutier" className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border border-gold-light/40 px-3.5 text-[13px] font-semibold text-gold-light hover:text-gold-light">
          Vous êtes bijoutier ? Ouvrez votre boutique →
        </Link>
      </PageHero>
      <main className="wrap pb-24 pt-[clamp(24px,3vw,40px)]">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted">
          <b className="text-text">{shops.length}</b> ateliers · {cities.join(" · ")}
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,290px),1fr))] gap-[clamp(12px,1.6vw,20px)]">
          {shops.map((s) => (
            <ShopCard key={s.id} shop={s} href={`/bijoutiers/${s.slug}`} />
          ))}
        </div>
        <section className="mt-14 grid gap-5 rounded-xl bg-sand p-[clamp(24px,4vw,44px)] lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="m-0 font-serif text-[clamp(28px,3vw,38px)] font-semibold leading-tight">Valoriser le savoir-faire des artisans</h2>
            <p className="mb-0 mt-2 max-w-[640px] text-[15px] leading-relaxed text-body">
              Boutique personnalisée, mise en avant des nouvelles collections et des bijoux de mariage, paiement sécurisé et livraison assurée : Burkina Or accompagne les bijoutiers vers une clientèle nationale et régionale.
            </p>
          </div>
          <Link href="/vendre?activite=bijoutier" className="btn-dark">
            <Icon name="store" size={18} />
            Vendre sur Burkina Or
          </Link>
        </section>
      </main>
    </>
  );
}
