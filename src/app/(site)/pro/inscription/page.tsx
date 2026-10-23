import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getMyShops, requireUser } from "@/lib/auth";
import { ROLE_TO_SHOP } from "@/lib/labels";
import { ShopSignupForm } from "./form";

export const metadata: Metadata = { title: "Ouvrir mon espace professionnel" };

export default function ProSignupPage() {
  return (
    <main className="wrap max-w-[920px] pb-24 pt-[clamp(24px,4vw,48px)]">
      <div className="eyebrow">Espace professionnel</div>
      <h1 className="h-section">Présentez votre structure</h1>
      <p className="mt-3 max-w-[640px] text-[15px] leading-relaxed text-body">
        Ces informations apparaîtront sur votre page publique après validation. Vous déposerez ensuite vos pièces justificatives (RCCM, IFU, autorisations) pour vérification par l&apos;équipe conformité.
      </p>
      <Suspense fallback={<div className="mt-8 h-[600px] animate-pulse rounded-xl border border-line bg-white" />}>
        <Content />
      </Suspense>
    </main>
  );
}

async function Content() {
  const s = await requireUser("/pro/inscription");
  const shops = await getMyShops();
  if (shops.length) redirect("/pro");
  return <ShopSignupForm fixedType={ROLE_TO_SHOP[s.profile.role] ?? null} defaults={{ name: s.profile.full_name ?? "", phone: s.profile.phone ?? "", email: s.email ?? "", city: s.profile.city ?? "Ouagadougou" }} />;
}
