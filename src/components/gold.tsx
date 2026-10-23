"use client";

import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { marketOpen } from "@/lib/pricing";
import { n0, pct } from "@/lib/format";
import type { GoldQuote } from "@/lib/types";

type GoldCtx = { quote: GoldQuote; open: boolean };
const Ctx = createContext<GoldCtx | null>(null);

/** Diffuse le cours de l'or et le rafraîchit toutes les 60 s. */
export function GoldProvider({ initial, children }: { initial: GoldQuote; children: ReactNode }) {
  const [quote, setQuote] = useState(initial);
  const [open, setOpen] = useState(true);
  useEffect(() => {
    // Ouverture du marché calculée côté client (heure locale), après hydratation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(marketOpen());
    const tick = async () => {
      setOpen(marketOpen());
      try {
        const r = await fetch("/api/cours", { cache: "no-store" });
        if (r.ok) setQuote(await r.json());
      } catch {
        /* hors ligne : on conserve le dernier cours */
      }
    };
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, []);
  return <Ctx value={{ quote, open }}>{children}</Ctx>;
}

export function useGold(): GoldCtx {
  const v = use(Ctx);
  if (!v) throw new Error("useGold doit être utilisé sous <GoldProvider>");
  return v;
}

export function useLive() {
  const { quote, open } = useGold();
  const chg = quote.changePct;
  return {
    quote,
    open,
    varLabel: pct(chg),
    varColor: chg >= 0 ? "#7CC4A0" : "#E58A84",
    liveLabel: open ? "En direct" : "Marché fermé · reprise lundi",
    liveDot: open ? "#7CC4A0" : "#8A857C",
    liveHalo: open ? "rgba(124,196,160,.25)" : "transparent",
  };
}

/** Bandeau supérieur : cours 24 / 22 / 18 ct. */
export function TickerBar({ children }: { children?: ReactNode }) {
  const { quote, varLabel, varColor, liveLabel, liveDot, liveHalo } = useLive();
  return (
    <div className="border-b border-gold-light/[.18] bg-ink-2">
      <div className="wrap flex h-9 items-center gap-5 overflow-hidden whitespace-nowrap text-xs text-stone">
        <span className="flex items-center gap-2 text-[11px] uppercase tracking-[.12em] text-gold-light">
          <span className="h-[7px] w-[7px] rounded-full" style={{ background: liveDot, boxShadow: `0 0 0 3px ${liveHalo}` }} />
          {liveLabel}
        </span>
        <span className="tnum">
          <b className="font-semibold text-ivory">{n0(quote.p24)} FCFA</b> /g 24 ct <span style={{ color: varColor }}>{varLabel}</span>
        </span>
        <span className="tnum">
          22 ct <b className="font-medium text-ivory">{n0(quote.p22)}</b>
        </span>
        <span className="tnum">
          18 ct <b className="font-medium text-ivory">{n0(quote.p18)}</b>
        </span>
        {children}
      </div>
    </div>
  );
}

/** Horloge « hh:mm:ss » rendue uniquement côté client (évite les écarts d'hydratation). */
export function LiveClock({ closedLabel = "Clôture ven." }: { closedLabel?: string }) {
  const { open } = useGold();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // Horloge : rendue uniquement côté client pour éviter un écart d'hydratation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!open) return <>{closedLabel}</>;
  return <>{now ? now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--"}</>;
}
