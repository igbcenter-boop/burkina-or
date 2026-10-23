import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/ui";
import { getProductBySlug, getSettings } from "@/lib/data";
import { dateLong, grams } from "@/lib/format";
import { PURITIES } from "@/lib/pricing";
import { PrintButton } from "../../print-button";

export const metadata: Metadata = { title: "Certificat d'analyse", robots: { index: false } };

export default function CertificatePage({ params }: PageProps<"/certificat/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto h-[900px] max-w-[800px] animate-pulse rounded-xl bg-white" />}>
      <Certificate params={params} />
    </Suspense>
  );
}

async function Certificate({ params }: { params: PageProps<"/certificat/[slug]">["params"] }) {
  const { slug } = await params;
  const [p, settings] = await Promise.all([getProductBySlug(slug), getSettings()]);
  if (!p || !p.certificate_number) notFound();
  const pur = PURITIES[p.purity ?? ""];
  const rows: [string, string, boolean][] = [
    ["Désignation", p.name, true],
    ["Poids net", grams(p.weight_g), p.weight_verified],
    ["Titre / pureté", `${p.purity ?? "—"}${pur ? " · " + pur.carats : ""}`, p.purity_verified],
    ["Forme & dimensions", [p.form, p.dimensions].filter(Boolean).join(" · ") || "—", false],
    ["Série", p.serial_prefix ? `${p.serial_prefix} · n° individuel gravé` : "—", true],
    ["Affinage", p.refining ?? "—", !!p.refining],
    ["Origine déclarée", p.origin ?? "—", p.origin_verified],
    ["Méthode d'essai", "Coupellation (essai au feu) · ISO 11426", true],
  ];
  return (
    <div className="mx-auto max-w-[800px] px-4 print:max-w-none print:px-0">
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href={p.kind === "lingot" ? `/boutique-officielle/${p.slug}` : `/bijoux/${p.slug}`} className="text-sm font-semibold">← Retour à la fiche produit</Link>
        <PrintButton />
      </div>
      <article className="relative overflow-hidden rounded-xl border border-line bg-white p-[clamp(24px,5vw,56px)] print:rounded-none print:border-0">
        <div className="h-1 gold-bg absolute inset-x-0 top-0" />
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
          <div>
            <Logo href={null} light={false} size={34} />
            <div className="mt-2 text-xs uppercase tracking-[.16em] text-gold-dark">Certificat d&apos;analyse</div>
          </div>
          <div className="text-right text-sm">
            <div className="font-mono text-base font-semibold">N° {p.certificate_number}</div>
            <div className="text-muted">Délivré le {dateLong(p.certificate_date)}</div>
            <div className="text-muted">{p.certificate_lab}</div>
          </div>
        </header>
        <h1 className="mt-8 font-serif text-4xl font-semibold">{p.name}</h1>
        <p className="mt-2 text-sm leading-relaxed text-body">
          Le laboratoire certifie que l&apos;échantillon référencé ci-dessous a été analysé conformément aux méthodes en vigueur. Les mentions « vérifié » résultent de mesures ; les autres sont déclarées par le fournisseur.
        </p>
        <table className="mt-8 w-full border-collapse text-sm">
          <tbody>
            {rows.map(([k, v, verified]) => (
              <tr key={k} className="border-t border-sand">
                <th className="w-[40%] py-3 pr-4 text-left font-medium text-muted">{k}</th>
                <td className="py-3 font-semibold">{v}</td>
                <td className="py-3 text-right">
                  <span className={`inline-flex h-6 items-center rounded-md px-2 text-[11px] font-semibold ${verified ? "bg-ok-bg text-ok" : "bg-mute-bg text-body"}`}>
                    {verified ? "Vérifié" : "Déclaré"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <footer className="mt-12 grid gap-6 border-t border-line pt-6 text-xs text-muted sm:grid-cols-2">
          <div>
            {settings.company.name} · {settings.company.address}
            <br />
            RCCM {settings.company.rccm} · {settings.company.agrement}
          </div>
          <div className="flex items-end justify-end gap-6">
            <div className="text-right">
              Cachet et signature du laboratoire
              <div className="mt-2 ml-auto h-16 w-16 rounded-full border-[1.5px] border-info/45" />
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
}
