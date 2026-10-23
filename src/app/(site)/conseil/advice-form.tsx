"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Icon } from "@/components/icons";
import { ADVICE_CHANNELS, ADVICE_NEEDS } from "@/lib/labels";
import { createAdviceRequest, type FormState } from "@/lib/actions/public";

export function AdviceForm() {
  const sp = useSearchParams();
  const [state, action, pending] = useActionState<FormState, FormData>(createAdviceRequest, null);
  const need = sp.get("besoin") ?? "premier_achat";
  const product = sp.get("produit") ?? "";
  if (state?.ok)
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-line bg-white p-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ok">
          <Icon name="check" size={30} stroke={2.25} className="text-white" />
        </div>
        <h2 className="m-0 font-serif text-[30px] font-semibold">Demande reçue</h2>
        <p className="m-0 max-w-[420px] text-[15px] leading-relaxed text-body">{state.message}</p>
      </div>
    );
  return (
    <form action={action} className="flex flex-col gap-4 rounded-xl border border-line bg-white p-[clamp(20px,3vw,32px)]">
      <div>
        <div className="eyebrow">Prendre rendez-vous</div>
        <h2 className="m-0 mt-1 font-serif text-[clamp(28px,3vw,36px)] font-semibold">Parler à un conseiller</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="label">Votre besoin</span>
          <select name="need" defaultValue={need in ADVICE_NEEDS ? need : "autre"} className="field">
            {Object.entries(ADVICE_NEEDS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Type de produit recherché</span>
          <input name="product_type" defaultValue={product} className="field" placeholder="Lingotin, alliance, parure…" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Quantité souhaitée</span>
          <input name="quantity" className="field" placeholder="ex. 5 g, 2 alliances" />
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="label">Budget indicatif</span>
          <input name="budget" className="field" placeholder="ex. 400 000 FCFA" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Nom complet</span>
          <input name="name" required className="field" autoComplete="name" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Téléphone / WhatsApp</span>
          <input name="phone" className="field tnum" autoComplete="tel" placeholder="+226 …" />
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="label">
            E-mail <span className="font-normal text-muted">(facultatif)</span>
          </span>
          <input name="email" type="email" className="field" autoComplete="email" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Canal préféré</span>
          <select name="channel" className="field">
            {Object.entries(ADVICE_CHANNELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-[1fr_110px] gap-2">
          <label className="flex flex-col gap-2">
            <span className="label">Date souhaitée</span>
            <input name="date" type="date" className="field" />
          </label>
          <label className="flex flex-col gap-2">
            <span className="label">Heure</span>
            <input name="time" type="time" defaultValue="10:00" className="field" />
          </label>
        </div>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="label">Votre question</span>
          <textarea name="message" rows={4} className="field" placeholder="Décrivez votre projet ou vos questions…" />
        </label>
      </div>
      {state?.error && <div className="rounded-[10px] bg-err-bg px-4 py-3 text-sm text-err">{state.error}</div>}
      <button disabled={pending} className="btn-dark h-[52px] text-[15px]">
        {pending ? "Envoi…" : "Être rappelé par un conseiller"}
      </button>
      <p className="m-0 text-xs text-muted">Service gratuit pour l&apos;information et l&apos;orientation. Les prestations d&apos;accompagnement approfondi (expertise, négociation) peuvent faire l&apos;objet d&apos;un devis.</p>
    </form>
  );
}
