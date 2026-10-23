import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PanelSkeleton } from "@/components/skeletons";
import { requireUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/labels";
import { dateShort } from "@/lib/format";
import { ProfileForm } from "./form";
import { ResetForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Mon profil" };

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="m-0 font-serif text-[clamp(32px,3.6vw,44px)] font-semibold">Mon profil</h1>
      <Suspense fallback={<PanelSkeleton />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const s = await requireUser("/compte/profil");
  const p = s.profile;
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <ProfileForm profile={{ full_name: p.full_name ?? "", phone: p.phone ?? "", city: p.city ?? "", address: p.address ?? "" }} email={s.email ?? ""} />
      <div className="flex flex-col gap-5">
        <div className="rounded-xl border border-line bg-white p-6 text-sm">
          <div className="text-[15px] font-semibold">Compte</div>
          <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
            <span className="text-muted">Type</span>
            <span className="font-medium">{ROLE_LABELS[p.role]}</span>
            <span className="text-muted">Membre depuis</span>
            <span className="font-medium">{dateShort(p.created_at)}</span>
          </div>
          {p.role === "client" && (
            <Link href="/pro/inscription" className="mt-4 inline-block font-semibold">
              Ouvrir un compte professionnel →
            </Link>
          )}
        </div>
        <div className="rounded-xl border border-line bg-white p-6">
          <div className="mb-4 text-[15px] font-semibold">Changer de mot de passe</div>
          <ResetForm />
        </div>
      </div>
    </div>
  );
}
