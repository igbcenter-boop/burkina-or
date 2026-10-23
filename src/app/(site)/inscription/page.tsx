import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/shell";
import { SignupForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Inscription" };

export default function Page() {
  return (
    <AuthShell title="Créer un compte" subtitle="Particulier ou professionnel : quelques informations suffisent pour commencer.">
      <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-sand" />}>
        <SignupForm />
      </Suspense>
    </AuthShell>
  );
}
