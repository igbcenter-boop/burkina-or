"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "@/components/toast";
import { sealShipment, updateItemStatus } from "@/lib/actions/pro";

export function ItemActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (s: "confirmed" | "unavailable" | "preparing") =>
    start(async () => {
      const r = await updateItemStatus(id, s);
      if (!r.ok) toast(r.error ?? "Action impossible");
      router.refresh();
    });
  if (status === "pending")
    return (
      <div className="flex gap-2">
        <button disabled={pending} onClick={() => run("unavailable")} className="h-9 rounded-lg border border-err/40 bg-white px-3 text-xs font-semibold text-err">
          Indisponible
        </button>
        <button disabled={pending} onClick={() => run("confirmed")} className="h-9 rounded-lg border-0 bg-ok px-3 text-xs font-semibold text-white">
          Confirmer la disponibilité
        </button>
      </div>
    );
  if (status === "confirmed")
    return (
      <button disabled={pending} onClick={() => run("preparing")} className="h-9 rounded-lg border border-gold-dark bg-white px-3 text-xs font-semibold text-gold-dark">
        Démarrer la préparation
      </button>
    );
  return null;
}

export function SealForm({ shipmentId }: { shipmentId: string }) {
  const router = useRouter();
  const [seal, setSeal] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await sealShipment(shipmentId, seal);
          if (!r.ok) return toast(r.error ?? "Erreur");
          toast("Colis scellé · le transporteur est notifié");
          router.refresh();
        });
      }}
      className="flex gap-2"
    >
      <input value={seal} onChange={(e) => setSeal(e.target.value)} placeholder="N° de scellé" className="h-9 w-36 rounded-lg border border-line bg-white px-3 text-xs outline-none focus:border-gold" required />
      <button disabled={pending} className="h-9 rounded-lg border-0 bg-gold px-3 text-xs font-semibold text-ink">
        Colis scellé
      </button>
    </form>
  );
}
