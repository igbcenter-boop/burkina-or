import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/shell";
import { ForgotForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function Page() {
  return (
    <AuthShell title="Mot de passe oublié" subtitle="Nous vous envoyons un lien sécurisé pour définir un nouveau mot de passe.">
      <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-sand" />}>
        <ForgotForm />
      </Suspense>
    </AuthShell>
  );
}
