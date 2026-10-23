"use client";

import { useActionState } from "react";
import { CITIES } from "@/lib/labels";
import { updateProfile } from "@/lib/actions/account";
import type { FormState } from "@/lib/actions/public";

export function ProfileForm({ profile, email }: { profile: { full_name: string; phone: string; city: string; address: string }; email: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, null);
  return (
    <form action={action} className="flex flex-col gap-4 rounded-xl border border-line bg-white p-6">
      <div className="text-[15px] font-semibold">Informations personnelles</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="label">Nom complet</span>
          <input name="full_name" defaultValue={profile.full_name} required className="field" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">E-mail</span>
          <input value={email} disabled className="field bg-ivory text-muted" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Téléphone</span>
          <input name="phone" defaultValue={profile.phone} className="field tnum" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Ville</span>
          <select name="city" defaultValue={profile.city || "Ouagadougou"} className="field">
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Quartier / adresse de livraison</span>
          <input name="address" defaultValue={profile.address} className="field" />
        </label>
      </div>
      {state?.error && <div className="rounded-[10px] bg-err-bg px-4 py-3 text-sm text-err">{state.error}</div>}
      {state?.ok && <div className="rounded-[10px] bg-ok-bg px-4 py-3 text-sm text-ok">{state.message}</div>}
      <button disabled={pending} className="btn-dark self-start">
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
