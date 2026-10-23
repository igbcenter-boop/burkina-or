import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui";
import { FaqList } from "@/components/home/widgets";
import { getFaqs } from "@/lib/data";

export const metadata: Metadata = { title: "Questions fréquentes", description: "Acheter de l'or sereinement : prix, pureté, livraison, paiement, retours et vente sur Burkina Or." };

export default async function FaqPage() {
  const faqs = await getFaqs();
  const cats = [...new Set(faqs.map((f) => f.category))];
  return (
    <>
      <PageHero crumbs={[{ href: "/", label: "Accueil" }, { label: "FAQ" }]} title="Questions fréquentes" text="Tout ce qu'il faut savoir pour acheter, recevoir et revendre de l'or en confiance." />
      <main className="wrap grid items-start gap-[clamp(20px,4vw,56px)] pb-24 pt-10 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav className="flex flex-wrap gap-2 lg:sticky lg:top-6 lg:flex-col lg:rounded-xl lg:border lg:border-line lg:bg-white lg:p-5">
          {cats.map((c) => (
            <Link key={c} href={`#${encodeURIComponent(c)}`} className="rounded-full border border-line bg-white px-3 py-1.5 text-sm text-text lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
              {c}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-10">
          {cats.map((c) => (
            <section key={c} id={encodeURIComponent(c)} className="scroll-mt-6">
              <h2 className="mb-2 font-serif text-[30px] font-semibold">{c}</h2>
              <FaqList items={faqs.filter((f) => f.category === c).map((f) => ({ q: f.question, a: f.answer }))} firstOpen={false} />
            </section>
          ))}
          <div className="rounded-xl bg-sand p-6 text-[15px]">
            Vous ne trouvez pas votre réponse ?{" "}
            <Link href="/conseil" className="font-semibold">
              Parlez à un conseiller
            </Link>{" "}
            ou{" "}
            <Link href="/contact" className="font-semibold">
              écrivez-nous
            </Link>
            .
          </div>
        </div>
      </main>
    </>
  );
}
