"use client";

import { useActionState } from "react";
import { SingleImageField } from "@/components/upload";
import { CITIES } from "@/lib/labels";
import { updateShop } from "@/lib/actions/pro";
import type { FormState } from "@/lib/actions/public";
import type { Shop } from "@/lib/types";

function F({ name, label, def, area = false, full = false, ph }: { name: string; label: string; def?: string | null; area?: boolean; full?: boolean; ph?: string }) {
  return (
    <label className={`flex flex-col gap-2 ${full ? "sm:col-span-2" : ""}`}>
      <span className="label">{label}</span>
      {area ? <textarea name={name} defaultValue={def ?? ""} rows={4} placeholder={ph} className="field" /> : <input name={name} defaultValue={def ?? ""} placeholder={ph} className="field" />}
    </label>
  );
}

export function ShopForm({ shop }: { shop: Shop }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateShop, null);
  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="shop_id" value={shop.id} />
      <section className="rounded-xl border border-line bg-white p-6">
        <h2 className="m-0 mb-4 text-base font-semibold">Identité visuelle</h2>
        <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
          <SingleImageField name="logo_url" folder={shop.id} initial={shop.logo_url} label="Logo" />
          <SingleImageField name="cover_url" folder={shop.id} initial={shop.cover_url} label="Photo de couverture (atelier, vitrine)" wide />
        </div>
      </section>
      <section className="rounded-xl border border-line bg-white p-6">
        <h2 className="m-0 mb-4 text-base font-semibold">Présentation</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <F name="name" label="Nom" def={shop.name} />
          <F name="specialty" label="Spécialité" def={shop.specialty} />
          <F name="tagline" label="Accroche (une ligne)" def={shop.tagline} full />
          <F name="description" label="Présentation de l'activité" def={shop.description} area full />
          {shop.type === "bijoutier" && <F name="savoir_faire" label="Savoir-faire & spécialités" def={shop.savoir_faire} area full />}
          <F name="commercial_terms" label="Conditions commerciales" def={shop.commercial_terms} area full ph="Acompte, délais, échanges, garanties…" />
          {(shop.type === "comptoir" || shop.type === "fondeur") && (
            <>
              <F name="capacities" label="Capacités" def={shop.capacities} ph="ex. jusqu'à 25 kg / mois" />
              <F name="min_order" label="Commande minimale" def={shop.min_order} ph="ex. 100 g" />
              <F name="authorization_number" label="N° d'autorisation / agrément" def={shop.authorization_number} />
            </>
          )}
          {shop.type === "livreur" && (
            <>
              <F name="insurance" label="Assurance (compagnie, couverture)" def={shop.insurance} full />
              <label className="flex flex-col gap-2 sm:col-span-2">
                <span className="label">Tarifs (une ligne par zone : zone | prix | délai)</span>
                <textarea name="tariffs" rows={4} className="field font-mono text-[13px]" defaultValue={shop.tariffs.map((t) => `${t.zone} | ${t.price} | ${t.delay}`).join("\n")} />
              </label>
            </>
          )}
        </div>
      </section>
      <section className="rounded-xl border border-line bg-white p-6">
        <h2 className="m-0 mb-4 text-base font-semibold">Coordonnées professionnelles</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="label">Ville</span>
            <select name="city" defaultValue={shop.city ?? "Ouagadougou"} className="field">
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <F name="address" label="Adresse" def={shop.address} />
          <F name="phone" label="Téléphone" def={shop.phone} />
          <F name="whatsapp" label="WhatsApp (chiffres, indicatif inclus)" def={shop.whatsapp} ph="22670000000" />
          <F name="email" label="E-mail" def={shop.email} />
          <F name="website" label="Site web" def={shop.website} />
          <F name="zones" label="Zones desservies (séparées par des virgules)" def={shop.zones.join(", ")} full />
          <F name="responsible_name" label="Responsable" def={shop.responsible_name} />
          <F name="rccm" label="RCCM" def={shop.rccm} />
          <F name="ifu" label="IFU" def={shop.ifu} />
        </div>
      </section>
      {state?.error && <div className="rounded-[10px] bg-err-bg px-4 py-3 text-sm text-err">{state.error}</div>}
      {state?.ok && <div className="rounded-[10px] bg-ok-bg px-4 py-3 text-sm text-ok">{state.message}</div>}
      <button disabled={pending} className="btn-gold h-[52px] self-start px-8">
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
