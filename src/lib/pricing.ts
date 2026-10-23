import type { GoldQuote, Product, ShippingOption, ShippingSettings } from "./types";

export const PURITIES: Record<string, { factor: number; ct: string; carats: string }> = {
  "999,9 ‰": { factor: 1, ct: "24 ct", carats: "24 carats" },
  "999 ‰": { factor: 0.999, ct: "24 ct", carats: "24 carats" },
  "916 ‰": { factor: 0.9167, ct: "22 ct", carats: "22 carats" },
  "750 ‰": { factor: 0.75, ct: "18 ct", carats: "18 carats" },
  "585 ‰": { factor: 0.585, ct: "14 ct", carats: "14 carats" },
};

export function publicPrice(raw: number, marginPct: number) {
  return raw * (1 + marginPct / 100);
}

export type PriceBreakdown = {
  gold: number;        // valeur de l'or
  fabrication: number; // façon
  total: number;
  perGram: number | null;
  onQuote: boolean;
};

/** Prix unitaire d'un produit au cours `p24` (prix public 24 ct, FCFA/g). */
export function priceOf(
  p: Pick<Product, "pricing_mode" | "weight_g" | "purity_factor" | "fabrication_fee" | "fixed_price">,
  p24: number,
): PriceBreakdown {
  if (p.pricing_mode === "indexed" && p.weight_g) {
    const gold = Number(p.weight_g) * p24 * Number(p.purity_factor || 1);
    const fabrication = Number(p.fabrication_fee || 0);
    const total = gold + fabrication;
    return { gold, fabrication, total, perGram: total / Number(p.weight_g), onQuote: false };
  }
  if (p.pricing_mode === "fixed" && p.fixed_price != null) {
    const total = Number(p.fixed_price);
    return { gold: 0, fabrication: 0, total, perGram: p.weight_g ? total / Number(p.weight_g) : null, onQuote: false };
  }
  return { gold: 0, fabrication: 0, total: 0, perGram: null, onQuote: true };
}

/** Variation en % entre le cours actuel et la clôture précédente. */
export function change(q: Pick<GoldQuote, "p24" | "ref24">) {
  return q.ref24 ? ((q.p24 - q.ref24) / q.ref24) * 100 : 0;
}

/** La cotation en direct a lieu du lundi au vendredi. */
export function marketOpen(d = new Date()) {
  const day = d.getUTCDay();
  return day >= 1 && day <= 5;
}

export type Zone = "local" | "burkina" | "international";

export function zoneFor(fromCity: string | null | undefined, toCity: string | null | undefined, s: ShippingSettings): Zone {
  if (!toCity) return "local";
  if (fromCity && fromCity === toCity) return "local";
  const country = s.cities[toCity] ?? "BF";
  return country === "BF" ? "burkina" : "international";
}

export function optionsFor(mode: "domicile" | "retrait", s: ShippingSettings): ShippingOption[] {
  return mode === "domicile" ? s.domicile : s.retrait;
}

/** Commission applicable à une ligne selon le type de produit. */
export function commissionKey(kind: Product["kind"], categorySlug?: string | null) {
  if (kind === "bijou") return categorySlug === "sur-mesure" ? "sur_mesure" : "bijou";
  return kind;
}
