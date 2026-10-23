"use client";

import { useActionState, useState } from "react";
import { ImagesField } from "./upload";
import { OCCASIONS } from "@/lib/labels";
import { saveProduct } from "@/lib/actions/pro";
import type { FormState } from "@/lib/actions/public";
import type { Category, Product, ShopType } from "@/lib/types";

const PURS = ["999,9 ‰", "999 ‰", "916 ‰", "750 ‰", "585 ‰"];

function Field({ label, children, full = false, hint }: { label: string; children: React.ReactNode; full?: boolean; hint?: string }) {
  return (
    <label className={`flex flex-col gap-2 ${full ? "sm:col-span-2" : ""}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

/** Formulaire produit : bijou, offre de gros, prestation ou lingotin (boutique officielle). */
export function ProductForm({ shopId, shopType, categories, product }: { shopId: string; shopType: ShopType; categories: Category[]; product?: Product | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProduct, null);
  const official = shopType === "officielle";
  const jewel = shopType === "bijoutier";
  const pro = shopType === "comptoir" || shopType === "fondeur";
  const [mode, setMode] = useState<string>(product?.pricing_mode ?? (official ? "indexed" : pro ? "quote" : "fixed"));
  const p = product;

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="shop_id" value={shopId} />
      {p && <input type="hidden" name="id" value={p.id} />}
      {official && <input type="hidden" name="kind" value="lingot" />}

      <section className="rounded-xl border border-line bg-white p-6">
        <h2 className="m-0 mb-4 text-base font-semibold">Description</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom" full>
            <input name="name" required defaultValue={p?.name} className="field" placeholder={jewel ? "Alliance Wend-Panga" : pro ? "Barres or brut 22 ct" : "Lingotin 5 g · 24 carats"} />
          </Field>
          <Field label="Catégorie">
            <select name="category_id" defaultValue={p?.category_id ?? ""} className="field">
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Statut">
            <select name="status" defaultValue={p?.status === "draft" ? "draft" : "published"} className="field">
              <option value="published">Publié</option>
              <option value="draft">Brouillon</option>
            </select>
          </Field>
          <Field label="Description" full>
            <textarea name="description" rows={5} defaultValue={p?.description ?? ""} className="field" />
          </Field>
          <Field label="Photos" full>
            <ImagesField name="images" folder={shopId} initial={p?.images ?? []} />
          </Field>
          <Field label="Vidéo de présentation (lien)" full hint="YouTube, Facebook, TikTok…">
            <input name="video_url" defaultValue={p?.video_url ?? ""} className="field" placeholder="https://" />
          </Field>
        </div>
      </section>

      {!(shopType === "fondeur") && (
        <section className="rounded-xl border border-line bg-white p-6">
          <h2 className="m-0 mb-1 text-base font-semibold">Caractéristiques de l&apos;or</h2>
          <p className="mb-4 mt-0 text-[13px] text-muted">Ces valeurs sont affichées « Déclaré par le vendeur ». Elles passent en « Vérifié par Burkina Or » après analyse en laboratoire agréé.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Poids (g)">
              <input name="weight_g" inputMode="decimal" defaultValue={p?.weight_g ?? ""} className="field tnum" />
            </Field>
            <Field label="Titre / pureté">
              <select name="purity" defaultValue={p?.purity ?? (jewel ? "750 ‰" : "999,9 ‰")} className="field">
                {PURS.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Forme / modèle">
              <input name="form" defaultValue={p?.form ?? ""} className="field" placeholder={official ? "Rectangulaire" : jewel ? "Demi-jonc" : "Barres"} />
            </Field>
            <Field label="Dimensions">
              <input name="dimensions" defaultValue={p?.dimensions ?? ""} className="field" />
            </Field>
            <Field label="Origine de l'or">
              <input name="origin" defaultValue={p?.origin ?? ""} className="field" placeholder="Mines artisanales agréées · Burkina Faso" />
            </Field>
            <Field label="Rapport / certificat n°">
              <input name="certificate_number" defaultValue={p?.certificate_number ?? ""} className="field" />
            </Field>
            {(jewel || official) && (
              <Field label="Pierres & matériaux">
                <input name="stones" defaultValue={p?.stones ?? ""} className="field" placeholder="Zircon 0,50 ct" />
              </Field>
            )}
            <Field label="Laboratoire">
              <input name="certificate_lab" defaultValue={p?.certificate_lab ?? ""} className="field" />
            </Field>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-line bg-white p-6">
        <h2 className="m-0 mb-4 text-base font-semibold">Prix & disponibilité</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Mode de prix">
            <select name="pricing_mode" value={mode} onChange={(e) => setMode(e.target.value)} className="field">
              {!pro && <option value="fixed">Prix fixe</option>}
              {(official || jewel) && <option value="indexed">Indexé sur le cours (poids × cours + façon)</option>}
              {pro && <option value="quote">Sur devis</option>}
              {pro && <option value="fixed">Prix fixe</option>}
            </select>
          </Field>
          {mode === "fixed" && (
            <Field label="Prix de vente (FCFA)">
              <input name="fixed_price" inputMode="numeric" defaultValue={p?.fixed_price ?? ""} className="field tnum" required />
            </Field>
          )}
          {mode === "indexed" && (
            <Field label="Façon (FCFA)" hint="Fabrication, frappe, écrin">
              <input name="fabrication_fee" inputMode="numeric" defaultValue={p?.fabrication_fee ?? 0} className="field tnum" />
            </Field>
          )}
          {pro && (
            <>
              <Field label="Tarification affichée">
                <input name="price_terms" defaultValue={p?.price_terms ?? ""} className="field" placeholder="Cours du jour − 4 %" />
              </Field>
              <Field label={shopType === "fondeur" ? "Minimum" : "Commande minimale"}>
                <input name="min_order_qty" defaultValue={p?.min_order_qty ?? ""} className="field" placeholder="100 g" />
              </Field>
              <Field label={shopType === "fondeur" ? "Capacité" : "Quantité disponible"}>
                <input name="available_qty" defaultValue={p?.available_qty ?? ""} className="field" placeholder="2,5 kg" />
              </Field>
              <Field label="Conditions de vente" full>
                <input name="sale_conditions" defaultValue={p?.sale_conditions ?? ""} className="field" />
              </Field>
            </>
          )}
          <Field label="Disponibilité">
            <select name="stock_status" defaultValue={p?.stock_status ?? "in"} className="field">
              <option value="in">En stock</option>
              <option value="low">Stock limité</option>
              <option value="out">Rupture</option>
            </select>
          </Field>
          {!pro && (
            <>
              <Field label="Quantité en stock" hint="Vide = sur commande">
                <input name="stock_qty" inputMode="numeric" defaultValue={p?.stock_qty ?? ""} className="field tnum" />
              </Field>
              <Field label="Maximum par commande">
                <input name="max_per_order" inputMode="numeric" defaultValue={p?.max_per_order ?? 5} className="field tnum" />
              </Field>
            </>
          )}
        </div>
      </section>

      {jewel && (
        <section className="rounded-xl border border-line bg-white p-6">
          <h2 className="m-0 mb-4 text-base font-semibold">Variantes, fabrication & mise en avant</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tailles disponibles (séparées par des virgules)">
              <input name="sizes" defaultValue={p?.sizes.join(", ") ?? ""} className="field" placeholder="48, 50, 52, 54" />
            </Field>
            <Field label="Délai de fabrication (jours)">
              <input name="lead_time_days" inputMode="numeric" defaultValue={p?.lead_time_days ?? ""} className="field tnum" />
            </Field>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" name="customizable" defaultChecked={p?.customizable} className="h-4 w-4 accent-[#1A1814]" />
              Personnalisable (gravure, ajustement)
            </label>
            <Field label="Détail de la personnalisation">
              <input name="personalization" defaultValue={p?.personalization ?? ""} className="field" placeholder="Gravure offerte, 20 caractères" />
            </Field>
            <Field label="Collection">
              <input name="collection" defaultValue={p?.collection ?? ""} className="field" placeholder="Mariage 2026" />
            </Field>
            <Field label="Conditions de livraison">
              <input name="delivery_info" defaultValue={p?.delivery_info ?? ""} className="field" placeholder="Expédition sous 48 h" />
            </Field>
            <div className="sm:col-span-2">
              <div className="label mb-2">Occasions</div>
              <div className="flex flex-wrap gap-3">
                {OCCASIONS.map((o) => (
                  <label key={o} className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm">
                    <input type="checkbox" name="occasions" value={o} defaultChecked={p?.occasions.includes(o)} className="accent-[#1A1814]" />
                    {o}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {state?.error && <div className="rounded-[10px] bg-err-bg px-4 py-3 text-sm text-err">{state.error}</div>}
      <button disabled={pending} className="btn-gold h-[52px] self-start px-8">
        {pending ? "Enregistrement…" : p ? "Enregistrer les modifications" : "Publier"}
      </button>
    </form>
  );
}
