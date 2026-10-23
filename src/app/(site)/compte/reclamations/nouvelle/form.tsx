"use client";

import { useActionState } from "react";
import { COMPLAINT_CATEGORIES } from "@/lib/labels";
import { createComplaint } from "@/lib/actions/account";
import type { FormState } from "@/lib/actions/public";

export function ComplaintForm({ orders, defaultOrder }: { orders: { id: string; number: string }[]; defaultOrder: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createComplaint, null);
  return (
    <form action={action} className="flex max-w-[720px] flex-col gap-4 rounded-xl border border-line bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="label">Commande concernée</span>
          <select name="order_id" defaultValue={defaultOrder} className="field">
            <option value="">Aucune / autre sujet</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.number}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Catégorie</span>
          <select name="category" className="field">
            {Object.entries(COMPLAINT_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="label">Objet</span>
          <input name="subject" required className="field" placeholder="ex. Scellé abîmé à la livraison" />
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="label">Description</span>
          <textarea name="description" rows={6} required className="field" placeholder="Décrivez la situation, les dates, ce que vous attendez (remboursement, échange…)" />
        </label>
      </div>
      {state?.error && <div className="rounded-[10px] bg-err-bg px-4 py-3 text-sm text-err">{state.error}</div>}
      <button disabled={pending} className="btn-dark self-start">
        {pending ? "Envoi…" : "Envoyer la réclamation"}
      </button>
      <p className="m-0 text-xs text-muted">Votre dossier est attribué à un responsable sous 24 h ouvrées. Vous suivez son traitement et échangez avec l&apos;équipe dans le dossier.</p>
    </form>
  );
}
