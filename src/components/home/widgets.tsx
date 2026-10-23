"use client";

import { useActionState, useState } from "react";
import { Icon } from "../icons";
import { LiveClock, useLive } from "../gold";
import { n0 } from "@/lib/format";
import { createPriceAlert, type FormState } from "@/lib/actions/public";

/** Carte « Cours 24 ct » du hero avec sparkline. */
export function HeroPriceCard() {
  const { quote, varLabel, varColor, liveLabel } = useLive();
  const h = quote.history.length > 1 ? quote.history : [quote.ref24, quote.p24];
  const min = Math.min(...h), max = Math.max(...h);
  const pts = h.map((v, i) => `${Math.round((i / (h.length - 1)) * 200)},${Math.round(44 - ((v - min) / (max - min || 1)) * 36)}`).join(" ");
  return (
    <div className="absolute bottom-0 left-0 z-[2] w-[min(260px,62%)] rounded-xl border border-gold-light/25 bg-ink-2/[.82] p-[18px] backdrop-blur-[8px]">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[.14em] text-gold-light">
        <span>Cours 24 ct</span>
        <span className="font-sans normal-case tracking-normal text-muted-2 tnum">
          <LiveClock />
        </span>
      </div>
      <div className="mt-2 text-[26px] font-semibold tnum">
        {n0(quote.p24)}
        <span className="text-[13px] font-normal text-stone"> FCFA/g</span>
      </div>
      <div className="mt-0.5 text-xs tnum" style={{ color: varColor }}>
        {varLabel} · {liveLabel}
      </div>
      <svg viewBox="0 0 200 50" preserveAspectRatio="none" className="mt-2.5 h-[46px] w-full">
        <polyline points={pts} fill="none" stroke="#D9BC6E" strokeWidth="1.5" />
        <polyline points={`${pts} 200,50 0,50`} fill="rgba(184,146,58,.12)" />
      </svg>
    </div>
  );
}

export function FaqList({ items, firstOpen = true }: { items: { q: string; a: string }[]; firstOpen?: boolean }) {
  const [open, setOpen] = useState(firstOpen ? 0 : -1);
  return (
    <div className="border-t border-line">
      {items.map((f, i) => (
        <div key={i} className="border-b border-line">
          <button
            onClick={() => setOpen(open === i ? -1 : i)}
            aria-expanded={open === i}
            className="flex min-h-16 w-full items-center justify-between gap-4 border-0 bg-transparent py-4 text-left text-base font-semibold text-text"
          >
            {f.q}
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-line text-lg font-normal text-gold-dark">{open === i ? "−" : "+"}</span>
          </button>
          {open === i && <p className="mb-5 mt-0 max-w-[680px] text-[15px] leading-relaxed text-body">{f.a}</p>}
        </div>
      ))}
    </div>
  );
}

export function PriceAlertForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createPriceAlert, null);
  if (state?.ok) {
    return (
      <div className="flex min-h-[54px] items-center gap-3 rounded-lg bg-ok-bg px-[18px] py-3 text-[15px] font-semibold text-ok">
        <Icon name="check" size={18} stroke={2} />
        Alerte créée. Nous vous préviendrons dès que le cours atteint votre seuil.
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2.5">
        <input
          name="contact"
          required
          aria-label="Adresse e-mail ou téléphone"
          placeholder="E-mail ou numéro WhatsApp"
          className="h-[54px] min-w-0 flex-[1_1_240px] rounded-lg border border-line bg-white px-4 text-[15px] text-text outline-none focus:border-gold"
        />
        <input
          name="target"
          inputMode="numeric"
          aria-label="Prix cible (FCFA/g)"
          placeholder="Prix cible FCFA/g (facultatif)"
          className="h-[54px] min-w-0 flex-[1_1_180px] rounded-lg border border-line bg-white px-4 text-[15px] text-text outline-none focus:border-gold"
        />
        <button disabled={pending} className="h-[54px] flex-none rounded-lg border-0 bg-text px-6 text-[15px] font-semibold text-ivory">
          {pending ? "Envoi…" : "Créer mon alerte"}
        </button>
      </div>
      {state?.error && <span className="text-[13px] text-err">{state.error}</span>}
    </form>
  );
}
