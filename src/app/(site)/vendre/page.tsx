import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { PageHero } from "@/components/ui";
import { getSettings } from "@/lib/data";
import { dec } from "@/lib/format";
import { kycRequirements, SHOP_TYPES } from "@/lib/labels";

export const metadata: Metadata = { title: "Vendre sur Burkina Or · Espace professionnel", description: "Bijoutiers, grossistes, comptoirs, fondeurs et transporteurs : rejoignez la place de marché de l'or." };

const OFFERS = [
  { id: "bijoutier", type: "bijoutier" as const, icon: "gem", title: "Bijoutiers", text: "Votre boutique personnalisée, vos collections, vos créations sur mesure, des commandes payées et livrées en toute sécurité.", key: "bijou" as const },
  { id: "grossiste", type: "comptoir" as const, icon: "coins", title: "Grossistes & comptoirs", text: "Publiez vos offres de gros, recevez des demandes de devis qualifiées et négociez en ligne avec des acheteurs professionnels.", key: "gros" as const },
  { id: "fondeur", type: "fondeur" as const, icon: "flame", title: "Fondeurs & laboratoires", text: "Présentez vos prestations de fonte, d'affinage et d'analyse, vos capacités et vos délais, et recevez des demandes.", key: "service" as const },
  { id: "livreur", type: "livreur" as const, icon: "truck", title: "Transporteurs", text: "Recevez des missions de livraison de colis de valeur, enregistrez chaque étape, confirmez la remise par code.", key: "livraison" as const },
];

export default async function SellPage() {
  const { commissions } = await getSettings();
  return (
    <>
      <PageHero
        crumbs={[{ href: "/", label: "Accueil" }, { label: "Vendre sur Burkina Or" }]}
        title="Développez votre activité"
        text="Rejoignez la place de marché spécialisée dans l'or et la joaillerie : visibilité nationale et régionale, paiements sécurisés, livraison assurée et badge « Vendeur vérifié »."
      >
        <Link href="/inscription?activite=bijoutier" className="btn-gold">
          Créer mon compte professionnel
        </Link>
      </PageHero>
      <main className="wrap pb-24">
        <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,290px),1fr))] gap-5 py-10">
          {OFFERS.map((o) => (
            <article key={o.id} className="flex flex-col gap-4 rounded-xl border border-line bg-white p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sand text-gold-dark">
                <Icon name={o.icon as "gem"} size={22} />
              </span>
              <h2 className="m-0 font-serif text-[26px] font-semibold">{o.title}</h2>
              <p className="m-0 text-sm leading-relaxed text-body">{o.text}</p>
              <div className="rounded-[10px] bg-ivory p-3.5 text-[13px]">
                <div className="mb-1.5 font-semibold">Pièces demandées</div>
                <ul className="m-0 flex flex-col gap-1 pl-4 text-muted">
                  {kycRequirements(o.type).map(([l]) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-auto flex items-center justify-between gap-3">
                <span className="text-[13px] text-muted">
                  Commission <b className="text-text">{dec(commissions[o.key], commissions[o.key] % 1 ? 1 : 0)} %</b>
                </span>
                <Link href={`/inscription?activite=${o.id}`} className="text-sm font-semibold">
                  Commencer →
                </Link>
              </div>
            </article>
          ))}
        </section>
        <section className="grid gap-6 rounded-xl bg-ink p-[clamp(24px,4vw,48px)] text-ivory lg:grid-cols-[1fr_1.2fr]">
          <div>
            <div className="text-xs uppercase tracking-[.14em] text-gold-light">En 3 étapes</div>
            <h2 className="m-0 mt-2 font-serif text-[clamp(30px,3.4vw,44px)] font-semibold leading-tight">Votre boutique validée sous 48 h</h2>
          </div>
          <ol className="m-0 flex list-none flex-col gap-5 p-0">
            {[
              ["Créez votre compte", "Choisissez votre activité : " + Object.values(SHOP_TYPES).filter((t) => t !== "Boutique officielle").join(", ").toLowerCase() + "."],
              ["Déposez vos pièces", "RCCM, IFU, pièce d'identité, autorisations : téléversement sécurisé, visible uniquement par l'équipe conformité."],
              ["Publiez et vendez", "Après validation, vos offres sont en ligne avec le badge « Vendeur vérifié ». Reversement 48 h après la livraison confirmée."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="gold-bg flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-bold text-ink">{i + 1}</span>
                <div>
                  <div className="font-semibold">{t}</div>
                  <div className="mt-1 text-sm leading-relaxed text-stone">{d}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <p className="mt-6 text-sm text-muted">
          Déjà inscrit ? <Link href="/pro" className="font-semibold">Accéder à mon espace professionnel</Link>
        </p>
      </main>
    </>
  );
}
