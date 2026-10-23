import Link from "next/link";
import { Logo } from "../ui";
import type { CompanySettings } from "@/lib/types";

const PAYMENTS = ["Orange Money", "Moov Money", "Wave", "Visa", "Mastercard", "Virement", "Paiement en agence"];

export function SiteFooter({ company }: { company: CompanySettings }) {
  return (
    <footer className="relative overflow-hidden bg-ink text-stone">
      <div className="h-px bg-[linear-gradient(90deg,transparent,#B8923A,transparent)]" />
      <div className="wrap pb-8 pt-[clamp(40px,5vw,72px)]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-9">
          <div className="flex max-w-[340px] flex-col gap-4 md:col-span-2">
            <Logo size={32} href={null} />
            <p className="m-0 text-sm leading-relaxed">La place de marché de l&apos;or et de la joaillerie au Burkina Faso et en Afrique de l&apos;Ouest.</p>
            <div className="text-[13px] leading-[1.7]">
              {company.address}
              <br />
              {company.phone} · {company.email}
            </div>
          </div>
          <FootCol
            title="Acheter"
            links={[
              ["Boutique officielle", "/boutique-officielle"],
              ["Bijoux", "/bijoux"],
              ["Bijoutiers", "/bijoutiers"],
              ["Livraison", "/livraison"],
              ["Conseil", "/conseil"],
            ]}
          />
          <FootCol
            title="Professionnels"
            links={[
              ["Vendre sur Burkina Or", "/vendre"],
              ["Grossistes & comptoirs", "/grossistes"],
              ["Fondeurs & services", "/fondeurs"],
              ["Devenir livreur partenaire", "/vendre?activite=livreur"],
            ]}
          />
          <FootCol
            title="Aide & légal"
            links={[
              ["À propos", "/a-propos"],
              ["FAQ", "/faq"],
              ["Retours & réclamations", "/retours-reclamations"],
              ["CGU / CGV", "/cgu-cgv"],
              ["Confidentialité", "/confidentialite"],
              ["Contact", "/contact"],
            ]}
          />
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-5 border-t border-white/[.08] pt-6">
          <div className="flex flex-wrap gap-2">
            {PAYMENTS.map((p) => (
              <span key={p} className="inline-flex h-8 items-center rounded-md border border-white/[.12] px-3 text-xs text-cream">
                {p}
              </span>
            ))}
          </div>
          <div className="flex gap-[18px] text-[13px]">
            {["Facebook", "Instagram", "LinkedIn", "TikTok"].map((s) => (
              <a key={s} href={`https://www.${s.toLowerCase()}.com/burkinaor`} target="_blank" rel="noreferrer" className="text-stone hover:text-gold-light">
                {s}
              </a>
            ))}
          </div>
        </div>
        <div className="mt-5 text-xs text-muted-2">
          © 2026 {company.name} · RCCM {company.rccm} · {company.agrement}
        </div>
      </div>
    </footer>
  );
}

function FootCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="mb-4 text-xs uppercase tracking-[.14em] text-gold-light">{title}</div>
      <div className="flex flex-col gap-2.5 text-sm">
        {links.map(([l, h]) => (
          <Link key={h} href={h} className="text-stone hover:text-gold-light">
            {l}
          </Link>
        ))}
      </div>
    </div>
  );
}
