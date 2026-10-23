"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { Icon } from "../icons";
import { CITIES } from "@/lib/labels";
import { requestPasswordReset, signIn, signUp, updatePassword } from "@/lib/actions/auth";
import type { FormState } from "@/lib/actions/public";

function ErrorBox({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return <div className="rounded-[10px] bg-err-bg px-4 py-3 text-sm text-err">{state.error}</div>;
}

function Success({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[10px] bg-ok-bg px-4 py-4 text-sm leading-relaxed text-ok">
      <Icon name="check" size={18} stroke={2} className="mt-0.5 flex-none" />
      {text}
    </div>
  );
}

function PasswordInput({ name = "password", autoComplete = "current-password", placeholder }: { name?: string; autoComplete?: string; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input name={name} type={show ? "text" : "password"} required minLength={name === "password" && autoComplete === "new-password" ? 8 : undefined} autoComplete={autoComplete} placeholder={placeholder} className="field pr-12" />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Masquer" : "Afficher"} className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center border-0 bg-transparent text-muted">
        <Icon name="eye" size={18} />
      </button>
    </div>
  );
}

export function LoginForm() {
  const sp = useSearchParams();
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, null);
  const err = sp.get("erreur");
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="suite" value={sp.get("suite") ?? ""} />
      {err === "suspendu" && <div className="rounded-[10px] bg-err-bg px-4 py-3 text-sm text-err">Ce compte est suspendu.</div>}
      {err === "lien" && <div className="rounded-[10px] bg-warn-bg px-4 py-3 text-sm text-warn">Lien expiré ou invalide. Reconnectez-vous ou demandez un nouveau lien.</div>}
      <ErrorBox state={state} />
      <label className="flex flex-col gap-2">
        <span className="label">Adresse e-mail</span>
        <input name="email" type="email" required autoComplete="email" className="field" placeholder="vous@exemple.bf" />
      </label>
      <label className="flex flex-col gap-2">
        <span className="flex items-baseline justify-between">
          <span className="label">Mot de passe</span>
          <Link href="/mot-de-passe-oublie" className="text-[13px] font-medium">
            Mot de passe oublié ?
          </Link>
        </span>
        <PasswordInput />
      </label>
      <button disabled={pending} className="btn-gold mt-2 h-[52px] text-[15px]">
        {pending ? "Connexion…" : "Se connecter"}
      </button>
      <p className="text-center text-sm text-muted">
        Pas encore de compte ?{" "}
        <Link href={`/inscription${sp.get("suite") ? `?suite=${encodeURIComponent(sp.get("suite")!)}` : ""}`} className="font-semibold">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}

const KINDS: { id: string; label: string; desc: string }[] = [
  { id: "client", label: "Particulier", desc: "Acheter de l'or et des bijoux, suivre mes commandes" },
  { id: "bijoutier", label: "Bijoutier", desc: "Ouvrir ma boutique et vendre mes créations" },
  { id: "grossiste", label: "Grossiste / comptoir", desc: "Publier des offres de gros, recevoir des devis" },
  { id: "fondeur", label: "Fondeur / laboratoire", desc: "Proposer fonte, affinage, analyses" },
  { id: "livreur", label: "Transporteur", desc: "Prendre en charge des livraisons sécurisées" },
];

export function SignupForm() {
  const sp = useSearchParams();
  const [kind, setKind] = useState(sp.get("activite") ?? "client");
  const [state, action, pending] = useActionState<FormState, FormData>(signUp, null);
  if (state?.ok) return <Success text={state.message ?? "Compte créé."} />;
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="suite" value={sp.get("suite") ?? ""} />
      <input type="hidden" name="kind" value={kind} />
      <ErrorBox state={state} />
      <div>
        <div className="label mb-2">Je crée un compte</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {KINDS.map((k) => {
            const on = kind === k.id;
            return (
              <button
                type="button"
                key={k.id}
                onClick={() => setKind(k.id)}
                className={`flex items-start gap-3 rounded-[10px] p-3 text-left text-text ${k.id === "client" ? "sm:col-span-2" : ""}`}
                style={{ border: on ? "1.5px solid #B8923A" : "1px solid #E6DFCF", background: on ? "#FAF7F0" : "#FFF" }}
              >
                <span className="mt-0.5 h-[18px] w-[18px] flex-none rounded-full bg-white" style={{ border: on ? "5px solid #B8923A" : "1.5px solid #8A857C" }} />
                <span>
                  <span className="block text-sm font-semibold">{k.label}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted">{k.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
        {kind !== "client" && (
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Les comptes professionnels sont activés après vérification de vos pièces (RCCM, IFU, autorisations) par notre équipe conformité, sous 48 h.
          </p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="label">{kind === "client" ? "Nom complet" : "Nom du responsable"}</span>
          <input name="full_name" required autoComplete="name" className="field" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Adresse e-mail</span>
          <input name="email" type="email" required autoComplete="email" className="field" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Téléphone / WhatsApp</span>
          <input name="phone" autoComplete="tel" className="field tnum" placeholder="+226 70 00 00 00" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Ville</span>
          <select name="city" className="field" defaultValue="Ouagadougou">
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Mot de passe (8 caractères min.)</span>
          <PasswordInput autoComplete="new-password" />
        </label>
      </div>
      <label className="flex items-start gap-3 text-sm leading-normal">
        <input type="checkbox" name="cgu" className="mt-1 h-4 w-4 accent-[#1A1814]" />
        <span>
          J&apos;accepte les <Link href="/cgu-cgv" target="_blank">conditions générales</Link> et la <Link href="/confidentialite" target="_blank">politique de confidentialité</Link>.
        </span>
      </label>
      <button disabled={pending} className="btn-gold h-[52px] text-[15px]">
        {pending ? "Création…" : "Créer mon compte"}
      </button>
      <p className="text-center text-sm text-muted">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="font-semibold">
          Se connecter
        </Link>
      </p>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestPasswordReset, null);
  if (state?.ok) return <Success text={state.message!} />;
  return (
    <form action={action} className="flex flex-col gap-4">
      <ErrorBox state={state} />
      <label className="flex flex-col gap-2">
        <span className="label">Adresse e-mail du compte</span>
        <input name="email" type="email" required autoComplete="email" className="field" />
      </label>
      <button disabled={pending} className="btn-gold h-[52px] text-[15px]">
        {pending ? "Envoi…" : "Recevoir le lien"}
      </button>
      <Link href="/connexion" className="text-center text-sm font-semibold">
        ← Retour à la connexion
      </Link>
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(updatePassword, null);
  if (state?.ok)
    return (
      <div className="flex flex-col gap-4">
        <Success text={state.message!} />
        <Link href="/compte" className="btn-gold">
          Accéder à mon compte
        </Link>
      </div>
    );
  return (
    <form action={action} className="flex flex-col gap-4">
      <ErrorBox state={state} />
      <label className="flex flex-col gap-2">
        <span className="label">Nouveau mot de passe</span>
        <PasswordInput autoComplete="new-password" />
      </label>
      <label className="flex flex-col gap-2">
        <span className="label">Confirmation</span>
        <PasswordInput name="confirm" autoComplete="new-password" />
      </label>
      <button disabled={pending} className="btn-gold h-[52px] text-[15px]">
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
