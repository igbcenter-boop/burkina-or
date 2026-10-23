import type { Metadata } from "next";
import { Icon } from "@/components/icons";
import { PageHero } from "@/components/ui";
import { getProducts } from "@/lib/data";
import { ShopCatalog } from "./catalog";

export const metadata: Metadata = {
  title: "Boutique officielle · Lingotins certifiés",
  description: "Lingotins d'or frappés, numérotés et analysés par Burkina Or, dès 1 gramme. Prix indexé sur le cours en direct.",
};

export default async function OfficialShopPage() {
  const lingots = await getProducts({ kind: "lingot", shopSlug: "burkina-or", order: "weight" });
  return (
    <>
      <PageHero
        crumbs={[{ href: "/", label: "Accueil" }, { label: "Boutique officielle" }]}
        title="Lingotins certifiés"
        text="Frappés, numérotés et analysés par Burkina Or. Prix indexé sur le cours en direct, garanti 15 minutes à l'ajout au panier."
      >
        <span className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full bg-ok/20 px-3.5 text-[13px] font-semibold text-ok-light">
          <Icon name="shield-check" size={15} stroke={1.75} />
          100 % pureté vérifiée
        </span>
        <span className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border border-gold-light/40 px-3.5 text-[13px] font-semibold text-gold-light">Certificat inclus</span>
      </PageHero>
      <ShopCatalog products={lingots} />
    </>
  );
}
