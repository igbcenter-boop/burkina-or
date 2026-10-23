"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Icon } from "./icons";
import { CITIES } from "@/lib/labels";
import { requestQuote, type FormState } from "@/lib/actions/public";

/** Formulaire de demande de devis (offres de gros, prestations de fonderie). */
export function QuoteForm({
  shopId,
  productId,
  productType,
  purity,
  back,
  service = false,
}: {
  shopId: string;
  productId?: string;
  productType?: string;
  purity?: string | null;
  back: string;
  service?: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(requestQuote, null);
  if (state?.ok)
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-line bg-white p-6">
        <div className="flex items-start gap-3 rounded-[10px] bg-ok-bg px-4 py-4 text-sm leading-relaxed text-ok">
          <Icon name="check" size={18} stroke={2} className="mt-0.5 flex-none" />
          {state.message}
        </div>
        <Link href={`/compte/devis/${state.id}`} className="btn-dark">
          Suivre ma demande
        </Link>
      </div>
    );
  const needLogin = state?.error?.startsWith("Connectez-vous");
  return (
    <form action={action} className="flex flex-col gap-4 rounded-xl border border-line bg-white p-6">
      <div>
        <div className="eyebrow">{service ? "Demande de prestation" : "Demande de devis"}</div>
        <h2 className="m-0 mt-1 font-serif text-[28px] font-semibold">{service ? "Obtenir un devis" : "Recevoir une offre"}</h2>
        <p className="mb-0 mt-1 text-[13px] text-muted">Réponse du professionnel sous 24 h ouvrées, échanges suivis dans votre espace.</p>
      </div>
      <input type="hidden" name="shop_id" value={shopId} />
      {productId && <input type="hidden" name="product_id" value={productId} />}
      {productType && <input type="hidden" name="product_type" value={productType} />}
      <div className="grid gap-3.5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="label">{service ? "Quantité à traiter" : "Quantité souhaitée"}</span>
          <input name="quantity" required className="field" placeholder={service ? "ex. 800 g de débris 18 ct" : "ex. 500 g"} />
        </label>
        {!service && (
          <label className="flex flex-col gap-2">
            <span className="label">Pureté souhaitée</span>
            <input name="purity" className="field" defaultValue={purity ?? ""} placeholder="916 ‰" />
          </label>
        )}
        <label className="flex flex-col gap-2">
          <span className="label">Société / atelier</span>
          <input name="company" className="field" placeholder="Facultatif" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Téléphone</span>
          <input name="phone" className="field tnum" placeholder="+226 …" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Ville de livraison</span>
          <select name="city" className="field" defaultValue="Ouagadougou">
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Budget / prix cible</span>
          <input name="budget" className="field" placeholder="Facultatif" />
        </label>
      </div>
      <label className="flex flex-col gap-2">
        <span className="label">Message</span>
        <textarea name="message" rows={4} className="field" placeholder="Délais, conditionnement, documents attendus (rapport d'analyse, origine)…" />
      </label>
      {state?.error && (
        <div className="rounded-[10px] bg-err-bg px-4 py-3 text-sm text-err">
          {state.error}{" "}
          {needLogin && (
            <Link href={`/connexion?suite=${encodeURIComponent(back)}`} className="font-semibold text-err underline">
              Se connecter
            </Link>
          )}
        </div>
      )}
      <button disabled={pending} className="btn-gold h-[52px]">
        {pending ? "Envoi…" : "Envoyer la demande"}
      </button>
    </form>
  );
}
