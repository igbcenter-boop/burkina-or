import type { ReactNode } from "react";
import { Icon } from "../icons";

/** Mise en page des écrans d'authentification : promesse de marque à gauche, formulaire à droite. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="wrap grid items-start gap-8 py-[clamp(28px,5vw,64px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
      <section className="relative hidden overflow-hidden rounded-xl bg-ink p-10 text-ivory lg:block lg:min-h-[560px]">
        <div className="noise absolute inset-0 opacity-[.14]" />
        <div className="relative flex h-full flex-col gap-6">
          <div className="text-xs uppercase tracking-[.14em] text-gold-light">Burkina Or</div>
          <h2 className="m-0 font-serif text-[46px] font-semibold leading-[1.02]">
            L&apos;or accessible, <span className="gold-text italic">en toute confiance.</span>
          </h2>
          <ul className="m-0 flex list-none flex-col gap-4 p-0 text-[15px] text-stone">
            {[
              ["shield-check", "Vendeurs vérifiés : RCCM, IFU et autorisations contrôlés"],
              ["lock", "Paiement sécurisé : Mobile Money, carte, virement"],
              ["truck", "Livraison scellée, remise contre code à 4 chiffres"],
              ["file-check", "Certificat d'analyse pour chaque lingotin"],
            ].map(([i, t]) => (
              <li key={t} className="flex items-start gap-3">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-gold-light/35 text-gold-light">
                  <Icon name={i as "lock"} size={17} />
                </span>
                <span className="pt-1.5">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="rounded-xl border border-line bg-white p-[clamp(22px,4vw,40px)]">
        <h1 className="m-0 font-serif text-[clamp(32px,3.6vw,44px)] font-semibold leading-[1.05]">{title}</h1>
        {subtitle && <p className="mb-0 mt-2 text-[15px] leading-relaxed text-muted">{subtitle}</p>}
        <div className="mt-7">{children}</div>
      </section>
    </main>
  );
}
