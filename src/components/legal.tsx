import Link from "next/link";
import type { ReactNode } from "react";
import { PageHero } from "./ui";

/** Mise en page des pages légales : sommaire collant + sections numérotées. */
export function LegalPage({ title, intro, updated, sections }: { title: string; intro: string; updated: string; sections: { id: string; title: string; body: ReactNode }[] }) {
  return (
    <>
      <PageHero crumbs={[{ href: "/", label: "Accueil" }, { label: title }]} title={title} text={intro} />
      <main className="wrap grid items-start gap-[clamp(20px,4vw,56px)] pb-24 pt-10 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav className="hidden rounded-xl border border-line bg-white p-5 lg:sticky lg:top-6 lg:block">
          <div className="mb-3 text-xs uppercase tracking-[.12em] text-muted">Sommaire</div>
          <ol className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
            {sections.map((s, i) => (
              <li key={s.id}>
                <Link href={`#${s.id}`} className="text-text hover:text-gold-dark">
                  {i + 1}. {s.title}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
        <article className="rounded-xl border border-line bg-white p-[clamp(22px,4vw,48px)]">
          <div className="text-xs text-muted">Dernière mise à jour : {updated}</div>
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-6 border-t border-sand pt-6 first-of-type:border-0 [&:not(:first-of-type)]:mt-8">
              <h2 className="m-0 font-serif text-[28px] font-semibold">
                {i + 1}. {s.title}
              </h2>
              <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-body [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-text">{s.body}</div>
            </section>
          ))}
        </article>
      </main>
    </>
  );
}
