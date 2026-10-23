"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { toast } from "@/components/toast";
import { createClient } from "@/lib/supabase/client";
import { carrierUpdate } from "@/lib/actions/pro";
import type { ShipmentStatus } from "@/lib/types";

const NEXT: Partial<Record<ShipmentStatus, [ShipmentStatus, string]>> = {
  pending: ["accepted", "Accepter la mission"],
  assigned: ["accepted", "Accepter la mission"],
  preparing: ["collected", "Colis collecté"],
  accepted: ["collected", "Colis collecté"],
  collected: ["shipped", "En route"],
  shipped: ["at_hub", "Arrivé au point de distribution"],
  at_hub: ["delivered", "Remettre au destinataire"],
  incident: ["shipped", "Reprendre l'acheminement"],
};

export function MissionActions({ shipmentId, status, sealed }: { shipmentId: string; status: ShipmentStatus; sealed: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [code, setCode] = useState("");
  const [incident, setIncident] = useState(false);
  const [note, setNote] = useState("");
  const photo = useRef<HTMLInputElement>(null);
  const next = NEXT[status];

  const run = (s: ShipmentStatus, extra: { code?: string; note?: string; photoPath?: string } = {}) =>
    start(async () => {
      const r = await carrierUpdate({ shipmentId, status: s, ...extra });
      if (!r.ok) return toast(r.error ?? "Action impossible");
      toast(s === "delivered" ? "Remise confirmée · code validé" : "Étape enregistrée");
      setIncident(false);
      router.refresh();
    });

  const collectWithPhoto = async (f: File) => {
    const path = `${shipmentId}/collecte-${Date.now()}.${(f.name.split(".").pop() || "jpg").toLowerCase()}`;
    const { error } = await createClient().storage.from("shipments").upload(path, f, { contentType: f.type });
    if (error) return toast("Photo non envoyée : " + error.message);
    run("collected", { photoPath: path });
  };

  return (
    <div className="flex flex-col gap-3 border-t border-line bg-ivory px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        {next && next[0] === "delivered" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run("delivered", { code });
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="Code à 4 chiffres" className="h-10 w-40 rounded-lg border border-line bg-white px-3 text-center text-lg font-semibold tracking-[.3em] outline-none focus:border-gold tnum" />
            <button disabled={pending || code.length !== 4} className="h-10 rounded-lg border-0 bg-ok px-4 text-[13px] font-semibold text-white disabled:opacity-50">
              Valider la remise
            </button>
          </form>
        ) : next && next[0] === "collected" ? (
          <>
            <button disabled={pending || !sealed} onClick={() => photo.current?.click()} className="flex h-10 items-center gap-2 rounded-lg border-0 bg-gold px-4 text-[13px] font-semibold text-ink disabled:opacity-50">
              <Icon name="upload" size={15} />
              Collecté · photo du scellé
            </button>
            <button disabled={pending || !sealed} onClick={() => run("collected")} className="h-10 rounded-lg border border-line bg-white px-3 text-[13px] font-semibold text-text disabled:opacity-50">
              Sans photo
            </button>
            {!sealed && <span className="text-xs text-muted">En attente de la mise sous scellé par le vendeur.</span>}
            <input ref={photo} type="file" accept="image/*" capture="environment" hidden onChange={(e) => e.target.files?.[0] && collectWithPhoto(e.target.files[0])} />
          </>
        ) : (
          next && (
            <button disabled={pending} onClick={() => run(next[0])} className="h-10 rounded-lg border-0 bg-gold px-4 text-[13px] font-semibold text-ink">
              {next[1]}
            </button>
          )
        )}
        {status !== "incident" && (
          <button onClick={() => setIncident(!incident)} className="ml-auto h-10 rounded-lg border border-err/40 bg-white px-3 text-[13px] font-semibold text-err">
            Signaler un incident
          </button>
        )}
      </div>
      {incident && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run("incident", { note });
          }}
          className="flex flex-wrap gap-2"
        >
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Retard, destinataire absent, scellé endommagé, retenue douanière…" className="h-10 min-w-[240px] flex-1 rounded-lg border border-line bg-white px-3 text-[13px] outline-none focus:border-gold" required />
          <button disabled={pending} className="h-10 rounded-lg border-0 bg-err px-4 text-[13px] font-semibold text-white">
            Déclarer l&apos;incident
          </button>
        </form>
      )}
    </div>
  );
}
