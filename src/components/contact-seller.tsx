"use client";

import { useActionState, useState } from "react";
import { Icon } from "./icons";
import { startConversation } from "@/lib/actions/account";
import type { FormState } from "@/lib/actions/public";

/** Bouton + fenêtre « Contacter » (messagerie interne, compte requis). */
export function ContactSeller({ shopId, shopName, back, label = "Contacter", subject, variant = "outline" }: { shopId: string; shopName: string; back: string; label?: string; subject?: string; variant?: "outline" | "gold" }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(startConversation, null);
  return (
    <>
      <button onClick={() => setOpen(true)} className={variant === "gold" ? "btn-gold" : "btn-outline"}>
        <Icon name="chat" size={16} />
        {label}
      </button>
      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4">
          <form action={action} onClick={(e) => e.stopPropagation()} className="flex w-full max-w-[520px] flex-col gap-4 rounded-[20px] bg-white p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,.5)]">
            <div className="text-[11px] uppercase tracking-[.14em] text-gold-dark">Message</div>
            <h3 className="m-0 font-serif text-[28px] font-semibold">{shopName}</h3>
            <input type="hidden" name="shop_id" value={shopId} />
            <input type="hidden" name="back" value={back} />
            {subject && <input type="hidden" name="subject" value={subject} />}
            <textarea name="message" rows={5} className="field" placeholder="Votre message…" required />
            <p className="m-0 text-xs text-muted">Les échanges restent sur Burkina Or. Ne communiquez jamais de code de paiement ou de remise.</p>
            {state?.error && <span className="text-sm text-err">{state.error}</span>}
            <div className="flex gap-2.5">
              <button type="button" onClick={() => setOpen(false)} className="btn-outline flex-1">
                Annuler
              </button>
              <button disabled={pending} className="btn-gold flex-[1.3]">
                {pending ? "Envoi…" : "Envoyer"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
