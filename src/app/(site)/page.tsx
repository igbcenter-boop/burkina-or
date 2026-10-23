import Link from "next/link";
import { Icon, StarIcon, WhatsAppIcon } from "@/components/icons";
import { Mono, SectionHead, Visual } from "@/components/ui";
import { JewelCard, LingotCard } from "@/components/products";
import { Gold3D } from "@/components/home/gold-3d";
import { FaqList, HeroPriceCard, PriceAlertForm } from "@/components/home/widgets";
import { getCategories, getFaqs, getProducts, getReviews, getSettings, getShops } from "@/lib/data";

export default async function HomePage() {
  const [lingots, cats, shops, jewels, reviews, faqs, settings] = await Promise.all([
    getProducts({ kind: "lingot", order: "weight" }),
    getCategories("bijou"),
    getShops("bijoutier", true),
    getProducts({ kind: "bijou", order: "recent", limit: 4 }),
    getReviews({ featured: true, limit: 3 }),
    getFaqs(true),
    getSettings(),
  ]);
  const bars = [1, 5, 10, 20]
    .map((g) => lingots.find((p) => Number(p.weight_g) === g && p.purity === "999,9 ‰" && p.form === "Rectangulaire"))
    .filter((p) => !!p);
  const wa = settings.company.whatsapp;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-ink text-ivory">
        <div className="noise absolute inset-0 opacity-[.16]" />
        <div className="wrap relative grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-center gap-[clamp(32px,5vw,72px)] py-[clamp(40px,7vw,96px)]">
          <div>
            <div className="inline-flex h-[30px] items-center gap-2 rounded-full border border-gold-light/40 px-3 text-xs text-gold-light">
              <Icon name="shield-check" size={14} stroke={1.75} />
              Or certifié · Vendeurs vérifiés
            </div>
            <h1 className="mt-6 font-serif text-[clamp(46px,6.4vw,92px)] font-semibold leading-[.98] tracking-[-.01em] [text-wrap:balance]">
              L&apos;or accessible, <span className="gold-text italic">en toute confiance.</span>
            </h1>
            <p className="mt-6 max-w-[520px] text-[clamp(15px,1.3vw,18px)] leading-relaxed text-stone [text-wrap:pretty]">
              Lingotins certifiés dès 1 gramme, bijoux des meilleurs artisans du Burkina et livraison sécurisée jusqu&apos;à votre porte. Le prix est calculé au cours du jour et détaillé ligne par ligne.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/boutique-officielle/lingotin-1g-24ct" className="flex h-[54px] items-center gap-2.5 rounded-lg bg-gold px-[26px] text-[15px] font-semibold text-ink hover:bg-gold-light hover:text-ink">
                Acheter de l&apos;or dès 1 g
                <Icon name="arrow-right" size={18} stroke={1.75} />
              </Link>
              <Link href="/bijoux" className="flex h-[54px] items-center rounded-lg border border-gold-light/55 px-[26px] text-[15px] font-semibold text-ivory hover:border-gold-light hover:text-ivory">
                Découvrir les bijoux
              </Link>
            </div>
          </div>
          <div className="relative min-h-[clamp(360px,42vw,560px)]">
            <div className="absolute -bottom-5 -left-10 -right-[60px] -top-10 z-[1]">
              <Gold3D />
            </div>
            <HeroPriceCard />
          </div>
        </div>
        <div className="h-px bg-[linear-gradient(90deg,transparent,#B8923A,transparent)]" />
      </section>

      {/* RÉASSURANCE */}
      <section className="border-b border-line bg-white">
        <div className="wrap grid grid-cols-[repeat(auto-fit,minmax(min(100%,230px),1fr))] gap-5 py-[clamp(20px,3vw,32px)]">
          <Reassure icon="shield-check" green title="Vendeurs vérifiés" text="Registre de commerce et autorisations contrôlés." />
          <Reassure icon="route" title="Traçabilité" text="Origine et pureté vérifiées ou clairement déclarées." />
          <Reassure icon="lock" title="Paiement sécurisé" text="Orange Money, Moov, Wave, carte, virement." />
          <Reassure icon="truck" title="Livraison assurée" text="Colis scellé, remise contre code sécurisé." />
        </div>
      </section>

      <main className="wrap">
        {/* LINGOTINS */}
        <section id="lingotins" className="pt-[clamp(56px,7vw,96px)]">
          <SectionHead eyebrow="Boutique officielle" title="Lingotins phares" link={{ href: "/boutique-officielle", label: "Tous les lingotins" }} />
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,160px),1fr))] gap-[clamp(12px,1.6vw,20px)] lg:grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))]">
            {bars.map((p) => (
              <LingotCard key={p.id} p={p} />
            ))}
          </div>
        </section>

        {/* CATÉGORIES */}
        <section id="bijoux" className="pt-[clamp(56px,7vw,96px)]">
          <div className="mb-7">
            <div className="eyebrow">Bijoux</div>
            <h2 className="h-section">Explorer par catégorie</h2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(46%,150px),1fr))] gap-[clamp(10px,1.4vw,16px)]">
            {cats.map((c) => (
              <Link key={c.id} href={`/bijoux?categorie=${c.slug}`} className="group flex flex-col gap-2.5 text-text hover:text-text">
                <Visual src={c.image_url} label={null} tone="sand" center={false} className="flex aspect-square items-end rounded-xl p-2.5 group-hover:shadow-[inset_0_0_0_1px_#B8923A]">
                  {!c.image_url && <span className="font-mono text-[10px] text-muted">{c.image_label}</span>}
                </Visual>
                <div className="flex items-baseline justify-between">
                  <span className="text-[15px] font-semibold">{c.name}</span>
                  <span className="text-xs text-muted tnum">{c.count}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* MARIAGE */}
        <section id="mariage" className="pt-[clamp(56px,7vw,96px)]">
          <div className="relative grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] overflow-hidden rounded-xl bg-ink text-ivory">
            <div className="flex flex-col justify-center gap-[18px] p-[clamp(28px,4.5vw,64px)]">
              <div className="text-xs uppercase tracking-[.14em] text-gold-light">Collection Mariage 2026</div>
              <h2 className="m-0 font-serif text-[clamp(34px,4vw,56px)] font-semibold leading-[1.02] [text-wrap:balance]">Alliances, parures et or de dot</h2>
              <p className="m-0 max-w-[460px] text-[15px] leading-[1.65] text-stone">
                Des pièces de bijoutiers vérifiés. Gravure offerte sur les alliances, fabrication sur mesure en 10 à 21 jours, livraison assurée avant la cérémonie.
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <Link href="/bijoux?collection=Mariage%202026" className="flex h-[50px] items-center rounded-lg bg-gold px-[22px] text-sm font-semibold text-ink hover:bg-gold-light hover:text-ink">
                  Voir la collection
                </Link>
                <Link href="/conseil?besoin=mariage" className="flex h-[50px] items-center rounded-lg border border-gold-light/55 px-[22px] text-sm font-semibold text-ivory hover:text-ivory">
                  Préparer mon mariage avec un conseiller
                </Link>
              </div>
            </div>
            <div className="grid min-h-[360px] grid-cols-2 gap-0.5">
              <div className="stripes-ink-2 row-span-2 flex items-end p-3.5"><span className="font-mono text-[11px] text-muted-2">photo · mariée, parure complète</span></div>
              <div className="stripes-ink-2 flex items-end p-3.5"><span className="font-mono text-[11px] text-muted-2">photo · alliances</span></div>
              <div className="stripes-ink-2 flex items-end p-3.5"><span className="font-mono text-[11px] text-muted-2">photo · écrin</span></div>
            </div>
          </div>
        </section>

        {/* ARTISANS */}
        <section className="pt-[clamp(56px,7vw,96px)]">
          <SectionHead eyebrow="Savoir-faire" title="Artisans à la une" link={{ href: "/bijoutiers", label: "Annuaire des bijoutiers" }} />
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,290px),1fr))] gap-[clamp(12px,1.6vw,20px)]">
            {shops.slice(0, 4).map((s) => (
              <Link key={s.id} href={`/bijoutiers/${s.slug}`} className="overflow-hidden rounded-xl border border-line bg-white text-text hover:text-text hover:shadow-[0_10px_28px_-12px_rgba(26,24,20,.18)]">
                <Visual src={s.cover_url} label={null} tone="ink2" center={false} className="flex h-[120px] items-start justify-end px-3 py-2.5">
                  {!s.cover_url && <span className="font-mono text-[10px] text-muted-2">photo · atelier</span>}
                </Visual>
                <div className="px-[18px] pb-[18px]">
                  <Mono text={s.mono} className="-mt-8 h-16 w-16 rounded-xl border-[3px] border-white bg-ivory text-[22px] shadow-[0_1px_3px_rgba(26,24,20,.1)]" />
                  <div className="mt-3 flex items-center gap-1.5 text-[15px] font-semibold">
                    {s.name}
                    <Icon name="shield-check" size={15} stroke={1.75} className="text-ok" />
                  </div>
                  <div className="mt-0.5 text-[13px] text-muted">
                    {s.city} · {s.specialty}
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-[13px]">
                    <StarIcon />
                    <b className="tnum">{String(s.rating).replace(".", ",")}</b>
                    <span className="text-muted">· {s.reviews_count} avis</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* NOUVELLES COLLECTIONS */}
        <section className="pt-[clamp(56px,7vw,96px)]">
          <SectionHead eyebrow="Nouveautés" title="Nouvelles collections" link={{ href: "/bijoux?tri=recent", label: "Tous les bijoux" }} />
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,160px),1fr))] gap-[clamp(12px,1.6vw,20px)] lg:grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))]">
            {jewels.map((p) => (
              <JewelCard key={p.id} p={p} showNew />
            ))}
          </div>
        </section>

        {/* CONSEIL + CHIFFRES */}
        <section id="conseil" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-[clamp(16px,2vw,24px)] pt-[clamp(56px,7vw,96px)]">
          <div className="flex flex-col gap-4 rounded-xl bg-sand p-[clamp(28px,4vw,48px)]">
            <div className="flex items-center">
              <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-sand bg-white font-semibold text-gold-dark">RK</span>
              <span className="-ml-3 flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-sand bg-ink-2 font-semibold text-gold-light">AB</span>
              <span className="ml-3.5 flex items-center gap-1.5 text-[13px] font-semibold text-ok">
                <span className="h-2 w-2 rounded-full bg-ok" />2 conseillers disponibles
              </span>
            </div>
            <h2 className="m-0 font-serif text-[clamp(30px,3.2vw,42px)] font-semibold leading-[1.05]">Besoin de conseil ?</h2>
            <p className="m-0 max-w-[460px] text-[15px] leading-[1.65] text-body">
              Premier achat, constitution d&apos;une épargne en or, choix d&apos;un titre pour une alliance : un conseiller Burkina Or vous répond gratuitement, sans engagement.
            </p>
            <div className="mt-1.5 flex flex-wrap gap-3">
              <Link href="/conseil#rendez-vous" className="flex h-[50px] items-center rounded-lg bg-text px-[22px] text-sm font-semibold text-ivory hover:text-ivory">
                Prendre rendez-vous
              </Link>
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="flex h-[50px] items-center gap-2 rounded-lg border border-text px-[22px] text-sm font-semibold text-text hover:text-text">
                <WhatsAppIcon size={20} />
                WhatsApp
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 content-center gap-x-6 gap-y-[clamp(20px,3vw,36px)] rounded-xl border border-line bg-white p-[clamp(28px,4vw,48px)]">
            {settings.homeStats.map(([v, l]) => (
              <div key={l} className="border-t border-gold pt-4">
                <div className="font-serif text-[clamp(38px,4vw,54px)] font-semibold leading-none tnum">{v}</div>
                <div className="mt-2 text-[13px] leading-normal text-muted">{l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* TÉMOIGNAGES */}
        <section className="pt-[clamp(56px,7vw,96px)]">
          <div className="mb-7">
            <div className="eyebrow">Témoignages</div>
            <h2 className="h-section">Ils nous ont confié leur or</h2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-[clamp(12px,1.6vw,20px)]">
            {reviews.map((r) => (
              <figure key={r.id} className="m-0 flex flex-col gap-5 rounded-xl border border-line bg-white p-7">
                <div className="flex gap-0.5">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <StarIcon key={i} size={16} />
                  ))}
                </div>
                <blockquote className="m-0 font-serif text-[22px] leading-[1.35] [text-wrap:pretty]">« {r.body} »</blockquote>
                <figcaption className="mt-auto flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sand text-sm font-semibold text-gold-dark">{r.initials}</span>
                  <div>
                    <div className="text-sm font-semibold">{r.author_name}</div>
                    <div className="text-xs text-muted">{r.author_meta}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-[clamp(24px,4vw,64px)] pt-[clamp(56px,7vw,96px)]">
          <div>
            <div className="eyebrow">Questions fréquentes</div>
            <h2 className="h-section mb-4">Acheter de l&apos;or sereinement</h2>
            <Link href="/faq" className="text-sm font-semibold">
              Toute la FAQ →
            </Link>
          </div>
          <FaqList items={faqs.map((f) => ({ q: f.question, a: f.answer }))} />
        </section>
      </main>

      {/* ALERTE COURS */}
      <section className="mt-[clamp(56px,7vw,96px)] bg-sand">
        <div className="wrap grid grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))] items-center gap-6 py-[clamp(36px,5vw,64px)]">
          <div>
            <h2 className="m-0 font-serif text-[clamp(28px,3vw,40px)] font-semibold leading-[1.1]">Le cours de l&apos;or en temps réel</h2>
            <p className="mt-2.5 text-[15px] leading-relaxed text-body">
              Cotation en direct du lundi au vendredi, données de marché collectées 24 h/24. Recevez une alerte dès que le cours atteint votre prix cible.
            </p>
          </div>
          <PriceAlertForm />
        </div>
      </section>
    </>
  );
}

function Reassure({ icon, title, text, green = false }: { icon: "shield-check" | "route" | "lock" | "truck"; title: string; text: string; green?: boolean }) {
  return (
    <div className="flex items-start gap-3.5">
      <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-full ${green ? "bg-ok-bg text-ok" : "bg-sand text-gold-dark"}`}>
        <Icon name={icon} size={20} />
      </span>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-0.5 text-[13px] leading-normal text-muted">{text}</div>
      </div>
    </div>
  );
}
