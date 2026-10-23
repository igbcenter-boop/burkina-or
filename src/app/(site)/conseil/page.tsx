import type { Metadata } from "next";
import { Suspense } from "react";
import { Icon, WhatsAppIcon } from "@/components/icons";
import { PageHero } from "@/components/ui";
import { FaqList } from "@/components/home/widgets";
import { getFaqs, getGoldQuote, getSettings } from "@/lib/data";
import { n0 } from "@/lib/format";
import { AdviceForm } from "./advice-form";

export const metadata: Metadata = {
  title: "Conseil & accompagnement à l'achat d'or",
  description: "Un conseiller Burkina Or vous aide gratuitement à comprendre le poids, la pureté et les prix, à choisir le bon produit et à acheter en toute sécurité.",
};

export default async function AdvicePage() {
  const [settings, faqs, quote] = await Promise.all([getSettings(), getFaqs(), getGoldQuote()]);
  const wa = settings.company.whatsapp;
  const guide = faqs.filter((f) => ["Comprendre l'or", "Confiance", "Prix"].includes(f.category));
  return (
    <>
      <PageHero
        crumbs={[{ href: "/", label: "Accueil" }, { label: "Conseil" }]}
        title="Conseil & accompagnement"
        text="Premier achat, épargne en or, mariage, revente ou achat professionnel : un conseiller vous explique, vous oriente vers les bons produits et les vendeurs vérifiés, et vous accompagne à chaque étape."
      >
        <span className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full bg-ok/20 px-3.5 text-[13px] font-semibold text-ok-light">
          <span className="h-2 w-2 rounded-full bg-ok-light" />
          Conseillers disponibles
        </span>
        <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border border-gold-light/40 px-3.5 text-[13px] font-semibold text-gold-light hover:text-gold-light">
          <WhatsAppIcon size={16} />
          WhatsApp
        </a>
      </PageHero>
      <main className="wrap pb-24">
        <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-4 py-10">
          {[
            ["coins", "Comprendre l'or", "Formes commercialisées, poids, pureté et titre : 24, 22 ou 18 carats, que choisir ?"],
            ["gem", "Choisir le bon produit", "Lingotin pour épargner, alliance pour un mariage, parure pour une dot : nous vous orientons."],
            ["receipt", "Comprendre les prix", "Cours du jour, façon, livraison : chaque frais expliqué avant l'achat."],
            ["shield-check", "Vendeurs vérifiés", "Orientation vers des bijoutiers et comptoirs contrôlés par notre équipe."],
            ["file-check", "Documents à demander", "Certificat, facture détaillée, rapport d'analyse : ce qu'il faut exiger."],
            ["calendar", "Rendez-vous conseiller", "Au téléphone, sur WhatsApp, en visio ou dans l'une de nos agences."],
          ].map(([i, t, d]) => (
            <div key={t} className="flex items-start gap-3.5 rounded-xl border border-line bg-white p-5">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-sand text-gold-dark">
                <Icon name={i as "gem"} size={20} />
              </span>
              <div>
                <div className="text-[15px] font-semibold">{t}</div>
                <div className="mt-1 text-[13px] leading-normal text-muted">{d}</div>
              </div>
            </div>
          ))}
        </section>

        <section id="rendez-vous" className="grid items-start gap-[clamp(20px,3vw,40px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="flex flex-col gap-5">
            <div className="rounded-xl bg-sand p-[clamp(24px,3vw,36px)]">
              <div className="eyebrow">Comment ça marche</div>
              <h2 className="h-section mb-5">Gratuit, sans engagement</h2>
              <ol className="m-0 flex list-none flex-col gap-4 p-0">
                {[
                  ["Décrivez votre besoin", "Quantité souhaitée, budget indicatif, type de produit recherché."],
                  ["Un conseiller vous rappelle", "Au créneau choisi, par le canal de votre choix."],
                  ["Vous décidez en confiance", "Orientation vers les offres adaptées, accompagnement jusqu'à la livraison."],
                ].map(([t, d], i) => (
                  <li key={t} className="flex gap-3.5">
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-text text-sm font-semibold text-ivory">{i + 1}</span>
                    <div>
                      <div className="text-[15px] font-semibold">{t}</div>
                      <div className="mt-0.5 text-sm text-body">{d}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-xl bg-ink p-6 text-ivory">
              <div className="text-xs uppercase tracking-[.14em] text-gold-light">Repère du jour</div>
              <div className="mt-3 grid grid-cols-3 gap-3 tnum">
                {[
                  ["24 ct", quote.p24],
                  ["22 ct", quote.p22],
                  ["18 ct", quote.p18],
                ].map(([k, v]) => (
                  <div key={k as string}>
                    <div className="text-xs text-stone">{k}</div>
                    <div className="text-lg font-semibold">{n0(v as number)}</div>
                    <div className="text-[11px] text-muted-2">FCFA/g</div>
                  </div>
                ))}
              </div>
              <p className="mb-0 mt-4 text-xs leading-relaxed text-stone">
                Le prix d&apos;un bijou ajoute au poids d&apos;or la façon (travail de l&apos;artisan), les pierres éventuelles et la livraison sécurisée.
              </p>
            </div>
          </div>
          <Suspense fallback={<div className="h-[640px] animate-pulse rounded-xl border border-line bg-white" />}>
            <AdviceForm />
          </Suspense>
        </section>

        <section className="grid gap-[clamp(24px,4vw,64px)] pt-[clamp(56px,7vw,96px)] lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
          <div>
            <div className="eyebrow">Guide</div>
            <h2 className="h-section">L&apos;essentiel avant d&apos;acheter</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-body">Les réponses de nos conseillers aux questions les plus fréquentes sur le titre, les documents et les prix.</p>
          </div>
          <FaqList items={guide.map((f) => ({ q: f.question, a: f.answer }))} />
        </section>
      </main>
    </>
  );
}
