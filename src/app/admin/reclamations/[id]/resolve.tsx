"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "@/components/toast";
import { updateComplaint } from "@/lib/actions/admin";

const PRESETS = ["Remboursement intégral effectué", "Relivraison organisée", "Échange accepté par le vendeur", "Réparation / ajustement réalisé", "Information apportée, pas d'anomalie constatée"];

export function ResolveForm({ id }: { id: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateComplaint(id, { status: "resolved", resolution: text });
          if (!r.ok) return toast(r.error ?? "Erreur");
          toast("Réclamation résolue · client notifié");
          router.refresh();
        });
      }}
      className="flex flex-col gap-3 rounded-xl border border-a-line bg-a-card p-[22px] text-sm"
    >
      <div className="text-xs uppercase tracking-[.12em] text-a-muted">Enregistrer la solution</div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button type="button" key={p} onClick={() => setText(p)} className="rounded-full border border-a-line bg-transparent px-2.5 py-1 text-xs text-a-text">
            {p}
          </button>
        ))}
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} required className="rounded-lg border border-a-line bg-a-input p-3 text-sm text-a-text outline-none" placeholder="Solution apportée…" />
      <button disabled={pending || !text} className="h-11 rounded-lg border-0 bg-ok text-[13px] font-semibold text-white disabled:opacity-50">
        Marquer comme résolue
      </button>
    </form>
  );
}
