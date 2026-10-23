import { PURITIES } from "./pricing";
import { grams } from "./format";
import type { Product } from "./types";

export type SpecRow = { k: string; v: string; verified: boolean; tip: string };

const V = (k: string, v: string, tip = "Contrôlé par analyse"): SpecRow => ({ k, v, verified: true, tip });
const D = (k: string, v: string): SpecRow => ({ k, v, verified: false, tip: "Information non contrôlée" });

/**
 * Lignes « Caractéristiques & origine » : chaque valeur est marquée
 * « Vérifié par Burkina Or » ou « Déclaré par le vendeur ».
 */
export function specRows(p: Product): SpecRow[] {
  const rows: SpecRow[] = [];
  const pur = PURITIES[p.purity ?? ""];
  if (p.weight_g != null) {
    const w = p.kind === "lingot" ? `${Number(p.weight_g).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} g` : grams(p.weight_g);
    rows.push(p.weight_verified ? V("Poids", w, "Pesé sur balance certifiée") : D("Poids", w));
  }
  if (p.purity) {
    const label = p.kind === "bijou" ? "Titre" : "Pureté";
    const v = `${p.purity}${pur ? " · " + pur.carats : ""}`;
    rows.push(p.purity_verified ? V(label, v) : D(label, v));
  }
  if (p.serial_prefix) rows.push(V("Numéro de série", `${p.serial_prefix} · n° individuel gravé`, "Gravé et enregistré à la frappe"));
  if (p.form) rows.push(D("Forme & dimensions", [p.form, p.dimensions].filter(Boolean).join(" · ")));
  if (p.stones) rows.push(D("Pierres & matériaux", p.stones));
  if (p.refining) rows.push(p.certificate_number ? V("Affinage", p.refining, "Rapport d'affinage contrôlé") : D("Affinage", p.refining));
  if (p.origin) rows.push(p.origin_verified ? V("Origine de l'or", p.origin, "Traçabilité documentée") : D("Origine de l'or", p.origin));
  if (p.lead_time_days) rows.push(D("Délai de fabrication", `${p.lead_time_days} jours`));
  for (const s of p.specs ?? []) rows.push(s.verified ? V(s.k, s.v) : D(s.k, s.v));
  return rows;
}
