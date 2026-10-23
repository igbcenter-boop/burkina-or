import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { Mono, PageHero } from "@/components/ui";
import { getAgencies, getSettings, getShops } from "@/lib/data";
import { fcfa } from "@/lib/format";
import { TRACK_STEPS } from "@/lib/labels";
import { TrackForm } from "./track-form";

export const metadata: Metadata = {
  title: "Livraison sécurisée de l'or",
  description: "Colis scellé et photographié, assuré à 100 % de sa valeur, remis uniquement contre code à 4 chiffres. Tarifs, délais, agences et transporteurs partenaires.",
};

export default async function DeliveryPage() {
  const [settings, carriers, agencies] = await Promise.all([getSettings(), getShops("livreur"), getAgencies()]);
  const s = settings.shipping;
  const zones = [
    ["local", "Même ville (ex. Ouagadougou)"],
    ["burkina", "Autres villes du Burkina"],
    ["international", "Abidjan, Bamako, Niamey, Lomé…"],
  ] as const;
  return (
    <>
      <PageHero
        crumbs={[{ href: "/", label: "Accueil" }, { label: "Livraison" }]}
        title="Livraison sécurisée"
        text="L'or voyage sous scellé, assuré à sa valeur, et ne vous est remis qu'en échange de votre code personnel. Chaque étape est enregistrée et visible dans votre espace client."
      >
        <span className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full bg-ok/20 px-3.5 text-[13px] font-semibold text-ok-light">
          <Icon name="shield-check" size={15} stroke={1.75} />
          Assurée 100 % de la valeur
        </span>
      </PageHero>
      <main className="wrap pb-24">
        <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,230px),1fr))] gap-5 border-b border-line py-8">
          {[
            ["package", "Colis scellé", "Mise sous scellé numéroté et pesée contrôlée avant le départ."],
            ["eye", "Photo à la collecte", "Le livreur photographie le colis scellé : vous recevez la preuve."],
            ["lock", "Remise contre code", "Votre code à 4 chiffres n'est donné qu'après vérification du scellé."],
            ["shield-check", "Assurance intégrale", "Valeur déclarée couverte par l'assurance du transporteur agréé."],
          ].map(([i, t, d]) => (
            <div key={t} className="flex items-start gap-3.5">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-sand text-gold-dark">
                <Icon name={i as "lock"} size={20} />
              </span>
              <div>
                <div className="text-sm font-semibold">{t}</div>
                <div className="mt-0.5 text-[13px] leading-normal text-muted">{d}</div>
              </div>
            </div>
          ))}
        </section>

        <section className="grid gap-6 pt-[clamp(40px,5vw,64px)] lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div>
            <div className="eyebrow">Tarifs & délais</div>
            <h2 className="h-section mb-6">Zones desservies</h2>
            <div className="overflow-x-auto rounded-xl border border-line bg-white">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="bg-sand-2 text-left text-xs text-muted">
                    <th className="px-5 py-3 font-medium">Mode</th>
                    {zones.map(([z, l]) => (
                      <th key={z} className="px-3 py-3 font-medium">
                        {l}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...s.domicile, ...s.retrait].map((o) => (
                    <tr key={o.id} className="border-t border-sand">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold">{o.name}</div>
                        <div className="text-xs text-muted">{o.note}</div>
                      </td>
                      {zones.map(([z]) => (
                        <td key={z} className="px-3 py-3.5 tnum">
                          <div className="font-semibold">{o.prices[z] ? fcfa(o.prices[z]) : "Offert"}</div>
                          <div className="text-xs text-muted">{o.delays[z]}</div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[13px] text-muted">
              Les frais sont calculés par expédition (un colis par vendeur) selon la ville de départ et de destination. Rétractation possible sous {s.retraction_hours} h tant que le colis n&apos;est pas expédié.
            </p>
          </div>
          <div className="flex flex-col gap-5">
            <TrackForm />
            <div className="rounded-xl border border-line bg-white p-6">
              <div className="eyebrow">Étapes de suivi</div>
              <ol className="m-0 mt-3 flex list-none flex-col gap-0 p-0">
                {TRACK_STEPS.map((st, i) => (
                  <li key={st.status} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ok text-white">
                        <Icon name="check" size={11} stroke={3} />
                      </span>
                      {i < TRACK_STEPS.length - 1 && <span className="min-h-5 w-0.5 flex-1 bg-ok/30" />}
                    </div>
                    <span className="pb-3 text-sm">{st.label}</span>
                  </li>
                ))}
              </ol>
              <p className="mb-0 text-xs text-muted">En cas d&apos;incident (retard, colis abîmé, retenue douanière), un statut « Incident » est affiché et un dossier est ouvert automatiquement.</p>
            </div>
          </div>
        </section>

        <section className="pt-[clamp(40px,5vw,64px)]">
          <div className="eyebrow">Transporteurs partenaires</div>
          <h2 className="h-section mb-6">Des prestataires agréés et assurés</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-5">
            {carriers.map((c) => (
              <article key={c.id} className="flex flex-col gap-4 rounded-xl border border-line bg-white p-6">
                <div className="flex items-center gap-3.5">
                  <Mono text={c.mono} className="h-12 w-12 rounded-xl bg-ink text-lg text-gold-light!" />
                  <div>
                    <div className="flex items-center gap-1.5 font-semibold">
                      {c.name}
                      <Icon name="shield-check" size={15} stroke={1.75} className="text-ok" />
                    </div>
                    <div className="text-[13px] text-muted">{c.tagline}</div>
                  </div>
                </div>
                <p className="m-0 text-sm leading-relaxed text-body">{c.description}</p>
                {c.tariffs.length > 0 && (
                  <div className="rounded-[10px] bg-ivory p-3 text-[13px]">
                    {c.tariffs.map((t) => (
                      <div key={t.zone} className="flex justify-between gap-3 py-1">
                        <span className="text-muted">{t.zone}</span>
                        <span className="font-semibold tnum">
                          {fcfa(t.price)} · {t.delay}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-xs text-muted">{c.insurance}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 pt-[clamp(40px,5vw,64px)] lg:grid-cols-2">
          <div className="rounded-xl bg-sand p-[clamp(22px,3vw,36px)]">
            <div className="eyebrow">Retrait en agence</div>
            <h2 className="m-0 mt-2 font-serif text-[clamp(26px,3vw,36px)] font-semibold">Nos agences sécurisées</h2>
            <div className="mt-4 flex flex-col gap-3">
              {agencies.map((a) => (
                <div key={a.id} className="flex items-start gap-3 rounded-[10px] bg-white p-4">
                  <Icon name="pin" size={18} className="mt-0.5 text-gold-dark" />
                  <div className="flex-1 text-sm">
                    <div className="font-semibold">{a.name}</div>
                    <div className="text-muted">{a.address}</div>
                  </div>
                  <div className="text-right text-xs text-muted">
                    {a.hours}
                    <br />
                    {a.phone}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-between gap-5 rounded-xl bg-ink p-[clamp(22px,3vw,36px)] text-ivory">
            <div>
              <div className="text-xs uppercase tracking-[.14em] text-gold-light">Transporteurs</div>
              <h2 className="m-0 mt-2 font-serif text-[clamp(26px,3vw,36px)] font-semibold">Devenir livreur partenaire</h2>
              <p className="mb-0 mt-2 text-[15px] leading-relaxed text-stone">
                Recevez des missions de livraison de colis de valeur, enregistrez chaque étape et confirmez la remise par code. Assurance transport de valeurs et validation de votre dossier requises.
              </p>
            </div>
            <Link href="/vendre?activite=livreur" className="btn-gold self-start">
              Déposer mon dossier
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
