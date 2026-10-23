"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";

export function TrackForm() {
  const router = useRouter();
  const [n, setN] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const num = n.toUpperCase().replace(/\s/g, "").replace(/^(\d)/, "BO-$1");
        if (num) router.push(`/compte/commandes/${encodeURIComponent(num)}`);
      }}
      className="rounded-xl bg-ink p-6 text-ivory"
    >
      <div className="text-xs uppercase tracking-[.14em] text-gold-light">Suivre un colis</div>
      <p className="mb-4 mt-2 text-sm text-stone">Saisissez votre numéro de commande (connexion requise).</p>
      <div className="flex gap-2">
        <input value={n} onChange={(e) => setN(e.target.value)} placeholder="BO-104873" className="h-12 min-w-0 flex-1 rounded-lg border border-gold-light/30 bg-ink-2 px-4 text-ivory outline-none placeholder:text-muted-2 focus:border-gold-light" />
        <button className="flex h-12 items-center gap-2 rounded-lg border-0 bg-gold px-4 text-sm font-semibold text-ink">
          <Icon name="search" size={16} />
          Suivre
        </button>
      </div>
    </form>
  );
}
