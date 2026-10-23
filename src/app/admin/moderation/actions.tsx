"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "@/components/toast";
import { createVerification, handleReports, handleVerification, setProductModeration } from "@/lib/actions/admin";
import type { FormState } from "@/lib/actions/public";

function useAct() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return toast(r.error ?? "Action impossible");
      toast(msg);
      router.refresh();
    });
  return { pending, run };
}

export function VerifActions({ id, canVerify }: { id: string; canVerify: boolean }) {
  const { pending, run } = useAct();
  return (
    <div className="flex flex-wrap gap-2.5">
      {canVerify ? (
        <button disabled={pending} onClick={() => run(() => handleVerification(id, "verify"), "Caractéristique désormais vérifiée")} className="h-11 flex-[1_1_160px] rounded-lg border-0 bg-ok text-[13px] font-semibold text-white">
          Passer en « Vérifié »
        </button>
      ) : (
        <button disabled={pending} onClick={() => run(() => handleVerification(id, "suspend"), "Annonce suspendue, vendeur notifié")} className="h-11 flex-[1_1_160px] rounded-lg border-0 bg-err text-[13px] font-semibold text-white">
          Suspendre et notifier
        </button>
      )}
    </div>
  );
}

export function ReportActions({ productId }: { productId: string }) {
  const { pending, run } = useAct();
  return (
    <div className="flex flex-wrap gap-2">
      <button disabled={pending} onClick={() => run(() => handleReports(productId, "no"), "Signalement classé")} className="h-10 border-0 bg-transparent px-3 text-[13px] font-semibold text-a-muted">
        Classer sans suite
      </button>
      <button disabled={pending} onClick={() => run(() => handleReports(productId, "ask"), "Demande envoyée au vendeur")} className="h-10 rounded-lg border border-a-gold bg-transparent px-3.5 text-[13px] font-semibold text-a-gold">
        Demander un justificatif
      </button>
      <button disabled={pending} onClick={() => run(() => handleReports(productId, "rm"), "Produit retiré du catalogue")} className="h-10 rounded-lg border-0 bg-err px-3.5 text-[13px] font-semibold text-white">
        Retirer le produit
      </button>
    </div>
  );
}

export function ProductModeration({ id, status, featured }: { id: string; status: string; featured: boolean }) {
  const { pending, run } = useAct();
  return (
    <div className="flex flex-wrap gap-2">
      <button disabled={pending} onClick={() => run(() => setProductModeration(id, status === "published" ? "published" : "published", !featured), featured ? "Retiré de la une" : "Mis en avant")} className="h-9 rounded-lg border border-a-line bg-transparent px-3 text-xs font-semibold text-a-text">
        {featured ? "★ À la une" : "☆ Mettre en avant"}
      </button>
      {status === "published" ? (
        <button disabled={pending} onClick={() => run(() => setProductModeration(id, "suspended"), "Annonce suspendue")} className="h-9 rounded-lg border border-err/50 bg-transparent px-3 text-xs font-semibold text-a-err">
          Suspendre
        </button>
      ) : (
        status !== "draft" && (
          <button disabled={pending} onClick={() => run(() => setProductModeration(id, "published"), "Annonce rétablie")} className="h-9 rounded-lg border-0 bg-ok px-3 text-xs font-semibold text-white">
            Rétablir
          </button>
        )
      )}
    </div>
  );
}

export function NewReportForm({ products }: { products: { id: string; name: string; shop: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(createVerification, null);
  useEffect(() => {
    if (state?.ok) {
      toast("Rapport enregistré");
      // Fermeture du formulaire en réponse au résultat de l'action serveur.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="self-start rounded-lg border border-dashed border-gold px-4 py-3 text-[13px] font-semibold text-a-gold">
        + Enregistrer un rapport d&apos;analyse reçu
      </button>
    );
  return (
    <form action={action} className="grid gap-3 rounded-xl border border-a-line bg-a-card p-5 sm:grid-cols-3">
      <label className="flex flex-col gap-1.5 sm:col-span-3">
        <span className="text-[13px] font-medium">Produit analysé</span>
        <select name="product_id" required className="h-11 rounded-lg border border-a-line bg-a-input px-2 text-sm text-a-text">
          <option value="">Choisir…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.shop}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">Caractéristique</span>
        <select name="field" className="h-11 rounded-lg border border-a-line bg-a-input px-2 text-sm text-a-text">
          <option>Pureté</option>
          <option>Titre</option>
          <option>Poids</option>
          <option>Origine</option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">Valeur déclarée</span>
        <input name="declared" required className="h-11 rounded-lg border border-a-line bg-a-input px-3 text-sm text-a-text outline-none" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">Valeur mesurée</span>
        <input name="measured" required className="h-11 rounded-lg border border-a-line bg-a-input px-3 text-sm text-a-text outline-none" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">N° de rapport</span>
        <input name="report" className="h-11 rounded-lg border border-a-line bg-a-input px-3 text-sm text-a-text outline-none" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">Laboratoire</span>
        <input name="lab" className="h-11 rounded-lg border border-a-line bg-a-input px-3 text-sm text-a-text outline-none" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">Écart hors tolérance (vide si conforme)</span>
        <input name="gap" placeholder="ex. 14 ‰" className="h-11 rounded-lg border border-a-line bg-a-input px-3 text-sm text-a-text outline-none" />
      </label>
      {state?.error && <span className="text-sm text-a-err sm:col-span-3">{state.error}</span>}
      <div className="flex gap-2 sm:col-span-3">
        <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-lg border border-a-line bg-transparent px-4 text-sm font-semibold text-a-text">
          Annuler
        </button>
        <button disabled={pending} className="h-11 rounded-lg border-0 bg-gold px-4 text-sm font-semibold text-ink">
          Enregistrer
        </button>
      </div>
    </form>
  );
}
