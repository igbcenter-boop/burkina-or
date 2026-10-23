"use client";

import { useActionState, useState } from "react";
import { CITIES, kycRequirements, SHOP_TYPES } from "@/lib/labels";
import { createShop } from "@/lib/actions/pro";
import type { FormState } from "@/lib/actions/public";
import type { ShopType } from "@/lib/types";

const TYPES: ShopType[] = ["bijoutier", "comptoir", "fondeur", "livreur"];

export function ShopSignupForm({ fixedType, defaults }: { fixedType: ShopType | null; defaults: { name: string; phone: string; email: string; city: string } }) {
  const [type, setType] = useState<ShopType>(fixedType ?? "bijoutier");
  const [state, action, pending] = useActionState<FormState, FormData>(createShop, null);
  return (
    <form action={action} className="mt-8 flex flex-col gap-5 rounded-xl border border-line bg-white p-[clamp(20px,3vw,32px)]">
      <input type="hidden" name="type" value={type} />
      {!fixedType && (
        <div>
          <div className="label mb-2">Activité</div>
          <div className="grid gap-2 sm:grid-cols-4">
            {TYPES.map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setType(t)}
                className="rounded-[10px] p-3 text-left text-sm font-semibold text-text"
                style={{ border: type === t ? "1.5px solid #B8923A" : "1px solid #E6DFCF", background: type === t ? "#FAF7F0" : "#FFF" }}
              >
                {SHOP_TYPES[t]}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="label">Nom de la structure (boutique, atelier, société)</span>
          <input name="name" required className="field" placeholder="ex. Atelier Wendpanga" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Spécialité</span>
          <input name="specialty" className="field" placeholder={type === "bijoutier" ? "Alliances, parures…" : type === "comptoir" ? "Or brut, barres…" : type === "fondeur" ? "Fonte, affinage…" : "Transport de valeurs"} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Ville</span>
          <select name="city" defaultValue={defaults.city} className="field">
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="label">Présentation de l&apos;activité</span>
          <textarea name="description" rows={4} className="field" placeholder="Votre histoire, votre savoir-faire, vos engagements…" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Adresse</span>
          <input name="address" className="field" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Zones desservies (séparées par des virgules)</span>
          <input name="zones" className="field" placeholder="Burkina Faso, Côte d'Ivoire" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Téléphone professionnel</span>
          <input name="phone" defaultValue={defaults.phone} className="field tnum" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">E-mail professionnel</span>
          <input name="email" type="email" defaultValue={defaults.email} className="field" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Responsable</span>
          <input name="responsible_name" defaultValue={defaults.name} className="field" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">N° RCCM</span>
          <input name="rccm" className="field" placeholder="BF-OUA-2024-A-0000" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">N° IFU</span>
          <input name="ifu" className="field" />
        </label>
      </div>
      <div className="rounded-[10px] bg-ivory p-4 text-[13px] text-body">
        <b className="text-text">Pièces qui vous seront demandées :</b> {kycRequirements(type).map(([l]) => l).join(" · ")}
      </div>
      {state?.error && <div className="rounded-[10px] bg-err-bg px-4 py-3 text-sm text-err">{state.error}</div>}
      <button disabled={pending} className="btn-gold h-[52px] self-start px-8 text-[15px]">
        {pending ? "Création…" : "Continuer vers mes documents"}
      </button>
    </form>
  );
}
