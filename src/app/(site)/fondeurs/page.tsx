import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { PageHero } from "@/components/ui";
import { OfferCard } from "@/components/offer-card";
import { ShopCard } from "@/components/shop-profile";
import { getProducts, getShops } from "@/lib/data";

export const metadata: Metadata = {
  title: "Fondeurs & services · Fonte, affinage, analyse",
  description: "Fonderies et laboratoires agréés : fonte et mise en lingot, affinage jusqu'à 999,9 ‰, essais au feu certifiés.",
};

export default async function FoundersPage() {
  const [services, shops] = await Promise.all([getProducts({ kind: "service" }), getShops("fondeur")]);
  return (
    <>
      <PageHero
        crumbs={[{ href: "/", label: "Accueil" }, { label: "Fondeurs & services" }]}
        title="Fondeurs & services"
        text="Fonte, affinage, analyse et essais : des professionnels agréés pour transformer, contrôler et certifier votre or, dans le respect des autorisations en vigueur."
      >
        <Link href="/vendre?activite=fondeur" className="inline-flex h-9 items-center whitespace-nowrap rounded-full border border-gold-light/40 px-3.5 text-[13px] font-semibold text-gold-light hover:text-gold-light">
          Proposer mes services →
        </Link>
      </PageHero>
      <main className="wrap pb-24">
        <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-5 border-b border-line py-8">
          {[
            ["flame", "Fonte & mise en lingot", "Transformation de bijoux, débris ou grenaille en lingots numérotés, en présence du client."],
            ["layers", "Affinage", "Purification de l'or jusqu'à 999,9 ‰ avec rapport d'affinage."],
            ["file-check", "Analyse & essais", "Essai au feu, contrôle du titre et du poids : rapports officiels sous 24 h."],
          ].map(([i, t, d]) => (
            <div key={t} className="flex items-start gap-3.5">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-sand text-gold-dark">
                <Icon name={i as "flame"} size={20} />
              </span>
              <div>
                <div className="text-sm font-semibold">{t}</div>
                <div className="mt-0.5 text-[13px] leading-normal text-muted">{d}</div>
              </div>
            </div>
          ))}
        </section>
        <section className="pt-[clamp(40px,5vw,64px)]">
          <div className="eyebrow">Prestations</div>
          <h2 className="h-section mb-7">Services disponibles · {services.length}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-[clamp(12px,1.6vw,20px)]">
            {services.map((p) => (
              <OfferCard key={p.id} p={p} />
            ))}
          </div>
        </section>
        <section className="pt-[clamp(40px,5vw,64px)]">
          <div className="eyebrow">Professionnels agréés</div>
          <h2 className="h-section mb-7">Fonderies & laboratoires</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,290px),1fr))] gap-[clamp(12px,1.6vw,20px)]">
            {shops.map((s) => (
              <ShopCard key={s.id} shop={s} href={`/fondeurs/${s.slug}`} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
