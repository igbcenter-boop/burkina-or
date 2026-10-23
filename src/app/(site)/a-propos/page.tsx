import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { PageHero } from "@/components/ui";
import { getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "À propos de Burkina Or", description: "La vision de Burkina Or : rendre l'or accessible, valoriser les artisans et renforcer la confiance dans le commerce de l'or." };

export default async function AboutPage() {
  const { homeStats, company } = await getSettings();
  return (
    <>
      <PageHero
        crumbs={[{ href: "/", label: "Accueil" }, { label: "À propos" }]}
        title={
          <>
            Plus qu&apos;une boutique, <span className="gold-text italic">une place de marché de l&apos;or.</span>
          </>
        }
        text="Burkina Or réunit au sein d'un même espace la vente directe d'or en petites quantités, les créations des artisans bijoutiers, les offres des comptoirs et les services de fonderie, de conseil et de livraison sécurisée."
      />
      <main className="wrap pb-24">
        <section className="grid gap-[clamp(24px,4vw,56px)] py-[clamp(40px,6vw,80px)] lg:grid-cols-2">
          <div>
            <div className="eyebrow">Notre vision</div>
            <h2 className="h-section">Devenir la référence du commerce de l&apos;or en Afrique de l&apos;Ouest</h2>
          </div>
          <div className="flex flex-col gap-4 text-[16px] leading-relaxed text-body">
            <p className="m-0">
              L&apos;or occupe une place essentielle dans nos économies et nos cultures : dot, mariage, baptême, épargne familiale. Pourtant, acheter quelques grammes d&apos;or certifié reste difficile, et les artisans peinent à toucher une clientèle au-delà de leur ville.
            </p>
            <p className="m-0">
              Burkina Or facilite l&apos;accès à l&apos;or dès 1 gramme, valorise le savoir-faire des bijoutiers, rapproche les professionnels de la filière et renforce la confiance grâce à la vérification des vendeurs, à la transparence des prix et à la traçabilité des produits.
            </p>
          </div>
        </section>
        <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-5">
          {[
            ["store", "Boutique officielle", "Lingotins de 1 g à 100 g, frappés, numérotés et certifiés.", "/boutique-officielle"],
            ["gem", "Espace bijoutiers", "Des boutiques d'artisans vérifiés, collections et créations sur mesure.", "/bijoutiers"],
            ["coins", "Grossistes & comptoirs", "Offres de gros, rapports d'analyse, devis et négociation.", "/grossistes"],
            ["flame", "Fondeurs & services", "Fonte, affinage et analyses par des professionnels agréés.", "/fondeurs"],
            ["truck", "Livraison sécurisée", "Colis scellés, assurés, remis contre code.", "/livraison"],
            ["chat", "Conseil", "Un accompagnement gratuit pour acheter en confiance.", "/conseil"],
          ].map(([i, t, d, h]) => (
            <Link key={t} href={h} className="flex flex-col gap-3 rounded-xl border border-line bg-white p-6 text-text hover:text-text hover:shadow-[0_10px_28px_-12px_rgba(26,24,20,.18)]">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sand text-gold-dark">
                <Icon name={i as "gem"} size={20} />
              </span>
              <div className="font-serif text-2xl font-semibold">{t}</div>
              <p className="m-0 text-sm leading-relaxed text-body">{d}</p>
            </Link>
          ))}
        </section>
        <section className="mt-14 grid grid-cols-2 gap-6 rounded-xl bg-ink p-[clamp(28px,4vw,48px)] text-ivory md:grid-cols-4">
          {homeStats.map(([v, l]) => (
            <div key={l} className="border-t border-gold pt-4">
              <div className="font-serif text-[clamp(36px,4vw,52px)] font-semibold leading-none tnum">{v}</div>
              <div className="mt-2 text-[13px] leading-normal text-stone">{l}</div>
            </div>
          ))}
        </section>
        <section className="mt-14 grid gap-6 lg:grid-cols-3">
          {[
            ["Confiance", "Vendeurs vérifiés, caractéristiques distinguées entre « vérifié » et « déclaré », journal d'audit infalsifiable."],
            ["Transparence", "Prix calculé au cours du jour, détaillé ligne par ligne, commissions jamais ajoutées au prix client."],
            ["Conformité", `${company.agrement}. Traçabilité de la provenance, lutte contre le blanchiment, transport assuré des métaux précieux.`],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl bg-sand p-6">
              <div className="eyebrow">{t}</div>
              <p className="mb-0 mt-3 text-[15px] leading-relaxed text-body">{d}</p>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
