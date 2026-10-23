"use client";

import { useActionState } from "react";
import { Icon } from "@/components/icons";
import { sendContact, type FormState } from "@/lib/actions/public";

export function ContactForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(sendContact, null);
  if (state?.ok)
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-line bg-white p-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ok">
          <Icon name="check" size={30} stroke={2.25} className="text-white" />
        </div>
        <h2 className="m-0 font-serif text-[30px] font-semibold">Message envoyé</h2>
        <p className="m-0 text-[15px] text-body">{state.message}</p>
      </div>
    );
  return (
    <form action={action} className="flex flex-col gap-4 rounded-xl border border-line bg-white p-[clamp(20px,3vw,32px)]">
      <h2 className="m-0 font-serif text-[30px] font-semibold">Écrire à l&apos;équipe</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="label">Nom complet</span>
          <input name="name" required className="field" autoComplete="name" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">E-mail</span>
          <input name="email" type="email" className="field" autoComplete="email" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Téléphone</span>
          <input name="phone" className="field tnum" autoComplete="tel" />
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="label">Objet</span>
          <select name="subject" className="field">
            <option>Question sur une commande</option>
            <option>Question sur un produit</option>
            <option>Compte professionnel</option>
            <option>Partenariat / presse</option>
            <option>Autre</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="label">Message</span>
          <textarea name="message" rows={6} required className="field" />
        </label>
      </div>
      {state?.error && <div className="rounded-[10px] bg-err-bg px-4 py-3 text-sm text-err">{state.error}</div>}
      <button disabled={pending} className="btn-dark h-[52px] text-[15px]">
        {pending ? "Envoi…" : "Envoyer"}
      </button>
    </form>
  );
}
