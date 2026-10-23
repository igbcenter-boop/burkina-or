"use client";

import { useActionState } from "react";
import { buyerQuoteAction } from "@/lib/actions/account";
import type { FormState } from "@/lib/actions/public";

export function QuoteDecision({ id }: { id: string }) {
  const [, action, pending] = useActionState<FormState, FormData>(buyerQuoteAction, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3 border-t border-line bg-ivory px-4 py-3">
      <input type="hidden" name="quote_id" value={id} />
      <span className="flex-1 text-sm text-body">Le vendeur vous a transmis une offre.</span>
      <button name="action" value="refuse" disabled={pending} className="h-10 rounded-lg border border-err/50 bg-transparent px-4 text-[13px] font-semibold text-err">
        Refuser
      </button>
      <button name="action" value="accept" disabled={pending} className="h-10 rounded-lg border-0 bg-ok px-4 text-[13px] font-semibold text-white">
        Accepter l&apos;offre
      </button>
    </form>
  );
}
