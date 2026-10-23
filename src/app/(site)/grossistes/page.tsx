import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { PageHero } from "@/components/ui";
import { OfferCard } from "@/components/offer-card";
import { ShopCard } from "@/components/shop-profile";
import { getProducts, getShops } from "@/lib/data";

export const metadata: Metadata = {
  title: "Grossistes & comptoirs d'or · Offres de gros",
  description: "Offres de gros des comptoirs d'or agréés : barres, grenaille, lingots. Demandes de devis et négociation en ligne entre professionnels.",
};

export default async function WholesalePage() {
  const [offers, shops] = await Promise.all([getProducts({ kind: "gros" }), getShops("comptoir")]);
  return (
    <>
      <PageHero
        crumbs={[{ href: "/", label: "Accueil" }, { label: "Grossistes & comptoirs" }]}
        title="Grossistes & comptoirs"
        text="L'espace professionnel des achats d'or en quantité : offres de comptoirs agréés, rapports d'analyse, demandes de devis et négociation suivie jusqu'à la transaction."
      >
        <span className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full bg-ok/20 px-3.5 text-[13px] font-semibold text-ok-light">
          <Icon name="shield-check" size={15} stroke={1.75} />
          Autorisations vérifiées
        </span>
        <Link href="/vendre?activite=grossiste" className="inline-flex h-9 items-center whitespace-nowrap rounded-full border border-gold-light/40 px-3.5 text-[13px] font-semibold text-gold-light hover:text-gold-light">
          Publier mes offres →
        </Link>
      </PageHero>
      <main className="wrap pb-24">
        <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,230px),1fr))] gap-5 border-b border-line py-8">
          {[
            ["search", "1 · Comparez les offres", "Type de produit, pureté déclarée ou vérifiée, minimum de commande et conditions."],
            ["quote", "2 · Demandez un devis", "Précisez quantité, titre, délai et ville : le comptoir vous répond sous 24 h."],
            ["chat", "3 · Négociez en ligne", "Offre de prix, conditions, documents : tout l'historique reste tracé."],
            ["truck", "4 · Enlèvement sécurisé", "Retrait en agence ou transporteur de valeurs partenaire, assurance incluse."],
          ].map(([i, t, d]) => (
            <div key={t} className="flex items-start gap-3.5">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-sand text-gold-dark">
                <Icon name={i as "search"} size={20} />
              </span>
              <div>
                <div className="text-sm font-semibold">{t}</div>
                <div className="mt-0.5 text-[13px] leading-normal text-muted">{d}</div>
              </div>
            </div>
          ))}
        </section>

        <section className="pt-[clamp(40px,5vw,64px)]">
          <div className="eyebrow">Offres de gros</div>
          <h2 className="h-section mb-7">Offres disponibles · {offers.length}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-[clamp(12px,1.6vw,20px)]">
            {offers.map((p) => (
              <OfferCard key={p.id} p={p} />
            ))}
          </div>
        </section>

        <section className="pt-[clamp(40px,5vw,64px)]">
          <div className="eyebrow">Professionnels agréés</div>
          <h2 className="h-section mb-7">Comptoirs & grossistes</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,290px),1fr))] gap-[clamp(12px,1.6vw,20px)]">
            {shops.map((s) => (
              <ShopCard key={s.id} shop={s} href={`/grossistes/${s.slug}`} />
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-xl bg-ink p-[clamp(24px,4vw,44px)] text-ivory">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="m-0 font-serif text-[clamp(28px,3vw,40px)] font-semibold">Conformité et traçabilité</h2>
              <p className="mb-0 mt-2 max-w-[680px] text-[15px] leading-relaxed text-stone">
                Chaque comptoir est vérifié avant publication : registre de commerce, identifiant fiscal, autorisation de commercialisation de l&apos;or et rapports d&apos;analyse. Les écarts de pureté hors tolérance entraînent la suspension de l&apos;offre.
              </p>
            </div>
            <Link href="/conseil?besoin=pro" className="btn-gold">
              Être accompagné
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
