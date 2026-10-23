import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/shell";
import { ResetForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default function Page() {
  return (
    <AuthShell title="Nouveau mot de passe" subtitle="Choisissez un mot de passe d’au moins 8 caractères.">
      <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-sand" />}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
