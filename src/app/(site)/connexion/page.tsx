import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/shell";
import { LoginForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Connexion" };

export default function Page() {
  return (
    <AuthShell title="Se connecter" subtitle="Accédez à vos commandes, à votre espace professionnel ou à l’administration.">
      <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-sand" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
