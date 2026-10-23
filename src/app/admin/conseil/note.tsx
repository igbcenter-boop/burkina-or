"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "@/components/toast";
import { updateAdvice } from "@/lib/actions/admin";

export function AdvisorNote({ id, initial }: { id: string; initial: string }) {
  const router = useRouter();
  const [text, setText] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateAdvice(id, { advisor_notes: text, status: "done" });
          if (!r.ok) return toast(r.error ?? "Erreur");
          toast("Réponse enregistrée · client notifié");
          router.refresh();
        });
      }}
      className="flex flex-wrap gap-2"
    >
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Compte rendu / recommandations envoyées au client" className="h-10 min-w-[240px] flex-1 rounded-lg border border-a-line bg-a-input px-3 text-[13px] text-a-text outline-none" />
      <button disabled={pending || !text || text === initial} className="h-10 rounded-lg border-0 bg-gold px-4 text-xs font-semibold text-ink disabled:opacity-50">
        Enregistrer & clôturer
      </button>
    </form>
  );
}
