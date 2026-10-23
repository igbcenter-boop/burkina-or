import { TRACK_STEPS } from "./labels";
import type { OrderEvent, OrderStatus, Shipment } from "./types";

/** Nombre de jours d'après un libellé de délai (« 24 à 48 h », « 2 à 4 jours »). */
export function delayDays(d: string | null | undefined) {
  const m = d?.match(/(\d+)(?:\s*à\s*(\d+))?\s*(h|jour)/);
  if (!m) return 3;
  const n = Number(m[2] ?? m[1]);
  return m[3] === "h" ? Math.max(1, Math.ceil(n / 24)) : n;
}

export function etaOf(createdAt: string, shipments: Pick<Shipment, "delay" | "eta">[]) {
  const fixed = shipments.map((s) => s.eta).filter(Boolean) as string[];
  if (fixed.length) return fixed.sort().at(-1)!;
  const days = Math.max(1, ...shipments.map((s) => delayDays(s.delay)));
  return new Date(new Date(createdAt).getTime() + days * 86400000).toISOString();
}

const ORDER_RANK: Partial<Record<OrderStatus, number>> = {
  pending_payment: -1, paid: 0, confirmed: 1, preparing: 2, collected: 3, shipped: 4, at_hub: 5, delivered: 6,
};

/** Rang d'avancement d'une commande dans la frise de suivi (−1 = non payée). */
export function trackIndex(status: OrderStatus, events: Pick<OrderEvent, "status">[]) {
  if (status in ORDER_RANK) return ORDER_RANK[status]!;
  // Incident / remboursement : on conserve la dernière étape atteinte.
  return Math.max(-1, ...events.map((e) => ORDER_RANK[e.status] ?? -1));
}

export type TimelineRow = { label: string; note: string; time: string | null; done: boolean; current: boolean };

export function buildTimeline(status: OrderStatus, events: OrderEvent[], mode: "domicile" | "retrait"): TimelineRow[] {
  const idx = trackIndex(status, events);
  const delivered = status === "delivered";
  return TRACK_STEPS.map((s, i) => {
    const ev = [...events].reverse().find((e) => e.status === s.status);
    const label = i === 5 && mode === "retrait" ? "Arrivée en agence" : s.label;
    const fallback: Record<string, string> = {
      paid: "Paiement confirmé",
      confirmed: "Disponibilité confirmée par les vendeurs",
      preparing: "Mise sous scellé et pesée contrôlée",
      collected: "Photo du colis scellé transmise par le livreur",
      shipped: mode === "domicile" ? "En route vers votre adresse" : "En route vers votre agence",
      at_hub: "Plateforme de distribution",
      delivered: "Remise contre code + signature",
    };
    return {
      label,
      note: ev?.note ?? fallback[s.status],
      time: ev?.created_at ?? null,
      done: i < idx || (delivered && i === 6),
      current: i === idx && !delivered,
    };
  });
}
