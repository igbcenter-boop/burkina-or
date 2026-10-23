import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumb } from "@/components/ui";
import { getProductBySlug, getProducts, getSettings } from "@/lib/data";
import { specRows } from "@/lib/specs";
import { LingotDetail } from "./detail";
import { ProductSkeleton } from "@/components/skeletons";

export async function generateStaticParams() {
  const list = await getProducts({ kind: "lingot" });
  return list.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/boutique-officielle/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  return p ? { title: p.name, description: p.description ?? undefined } : { title: "Produit introuvable" };
}

export default function LingotPage({ params }: PageProps<"/boutique-officielle/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/boutique-officielle/[slug]">["params"] }) {
  const { slug } = await params;
  const [p, all, settings] = await Promise.all([getProductBySlug(slug), getProducts({ kind: "lingot", order: "weight" }), getSettings()]);
  if (!p || p.kind !== "lingot") notFound();
  const siblings = all.filter((x) => x.purity === p.purity).map((x) => ({ g: Number(x.weight_g), slug: x.slug, out: x.stock_status === "out", form: x.form }));
  // Un bouton par poids (le format rectangulaire est privilégié s'il existe)
  const byWeight = new Map<number, (typeof siblings)[number]>();
  for (const s of siblings) {
    const cur = byWeight.get(s.g);
    if (!cur || (s.form === p.form && cur.form !== p.form)) byWeight.set(s.g, s);
  }
  byWeight.set(Number(p.weight_g), { g: Number(p.weight_g), slug: p.slug, out: p.stock_status === "out", form: p.form });
  const weights = [...byWeight.values()].sort((a, b) => a.g - b.g);
  const similar = all.filter((x) => x.id !== p.id && x.purity === "999,9 ‰").sort((a, b) => b.sales_count - a.sales_count).slice(0, 4);
  const s = settings.shipping;
  const fse = s.domicile[0];
  const ship = [
    { name: "Retrait en agence Burkina Or", delay: "Ouagadougou ou Bobo-Dioulasso · " + s.retrait[0].delays.local, price: s.retrait[0].prices.local },
    { name: "Livraison à domicile · Ouagadougou", delay: `${fse.name} · ${fse.delays.local}`, price: fse.prices.local },
    { name: "Autres villes du Burkina", delay: `Koudougou, Ouahigouya… · ${fse.delays.burkina}`, price: fse.prices.burkina },
    { name: "Abidjan, Bamako, Niamey", delay: `Transporteur de valeurs · ${fse.delays.international}`, price: fse.prices.international },
  ];

  return (
    <main className="wrap pt-[clamp(16px,2.5vw,28px)]">
      <Breadcrumb items={[{ href: "/", label: "Accueil" }, { href: "/boutique-officielle", label: "Boutique officielle" }, { label: p.name }]} />
      <LingotDetail p={p} specs={specRows(p)} weights={weights} similar={similar} ship={ship} retractionHours={s.retraction_hours} />
    </main>
  );
}
