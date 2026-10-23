import type { Metadata } from "next";
import { Icon, WhatsAppIcon } from "@/components/icons";
import { PageHero } from "@/components/ui";
import { getAgencies, getSettings } from "@/lib/data";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Contact", description: "Contactez l'équipe Burkina Or : téléphone, WhatsApp, e-mail et agences." };

export default async function ContactPage() {
  const [{ company }, agencies] = await Promise.all([getSettings(), getAgencies()]);
  return (
    <>
      <PageHero crumbs={[{ href: "/", label: "Accueil" }, { label: "Contact" }]} title="Nous contacter" text="Une question sur une commande, un produit, un compte professionnel ou un partenariat ? Notre équipe vous répond sous 24 h ouvrées." />
      <main className="wrap grid items-start gap-[clamp(20px,3vw,40px)] pb-24 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="flex flex-col gap-4">
          {[
            ["phone", "Téléphone", company.phone, `tel:${company.phone.replace(/\s/g, "")}`],
            ["mail", "E-mail", company.email, `mailto:${company.email}`],
          ].map(([i, k, v, h]) => (
            <a key={k} href={h} className="flex items-center gap-4 rounded-xl border border-line bg-white p-5 text-text hover:text-text">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sand text-gold-dark">
                <Icon name={i as "phone"} size={20} />
              </span>
              <span>
                <span className="block text-xs text-muted">{k}</span>
                <span className="block font-semibold">{v}</span>
              </span>
            </a>
          ))}
          <a href={`https://wa.me/${company.whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-4 rounded-xl bg-ok p-5 text-white hover:bg-ok-dark hover:text-white">
            <WhatsAppIcon size={26} />
            <span>
              <span className="block text-xs opacity-80">WhatsApp</span>
              <span className="block font-semibold">Écrire à un conseiller</span>
            </span>
          </a>
          <div className="rounded-xl border border-line bg-white p-5">
            <div className="mb-3 text-[15px] font-semibold">Agences</div>
            {agencies.map((a) => (
              <div key={a.id} className="border-t border-sand py-3 text-sm first:border-0 first:pt-0">
                <div className="font-semibold">{a.name}</div>
                <div className="text-muted">{a.address}</div>
                <div className="text-xs text-muted">
                  {a.hours} · {a.phone}
                </div>
              </div>
            ))}
          </div>
        </div>
        <ContactForm />
      </main>
    </>
  );
}
