import type { OrderStatus, PaymentMethod, ShipmentStatus, ShopStatus, ShopType, UserRole } from "./types";

export type Tone = "ok" | "warn" | "err" | "info" | "mute" | "gold";

export const ORDER_STATUS: Record<OrderStatus, [string, Tone]> = {
  pending_payment: ["Attente paiement", "warn"],
  paid: ["Payée", "ok"],
  confirmed: ["Confirmée", "ok"],
  preparing: ["En préparation", "info"],
  collected: ["Collectée", "info"],
  shipped: ["En expédition", "info"],
  at_hub: ["Au point de distribution", "info"],
  delivered: ["Livrée", "ok"],
  incident: ["Incident", "err"],
  cancelled: ["Annulée", "mute"],
  refunded: ["Remboursement", "mute"],
};

/** Étapes de la frise de suivi (maquette « Suivi de commande »). */
export const TRACK_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "paid", label: "Payée" },
  { status: "confirmed", label: "Confirmée" },
  { status: "preparing", label: "En préparation" },
  { status: "collected", label: "Collectée" },
  { status: "shipped", label: "En expédition" },
  { status: "at_hub", label: "Arrivée au point de distribution" },
  { status: "delivered", label: "Livrée" },
];

export const SHIPMENT_STATUS: Record<ShipmentStatus, [string, Tone]> = {
  pending: ["En attente", "warn"],
  assigned: ["Attribuée", "info"],
  accepted: ["Acceptée", "info"],
  preparing: ["En préparation", "info"],
  collected: ["Collectée", "info"],
  shipped: ["En expédition", "info"],
  at_hub: ["Au point de distribution", "info"],
  delivered: ["Livrée", "ok"],
  incident: ["Incident", "err"],
};

/** [libellé, logo, fond logo, texte logo, description, code USSD] */
export const PAYMENT_METHODS: Record<PaymentMethod, [string, string, string, string, string, string]> = {
  om: ["Orange Money", "OM", "#FF7900", "#0E0E10", "Validation sur votre téléphone", "*144#"],
  moov: ["Moov Money", "MOOV", "#0066B3", "#FFFFFF", "Validation sur votre téléphone", "*555#"],
  wave: ["Wave", "W", "#1DC8F2", "#0E0E10", "Validation dans l'application", "l'application Wave"],
  card: ["Carte bancaire", "CB", "#1A1814", "#FAF7F0", "Visa, Mastercard · 3-D Secure", ""],
  vir: ["Virement bancaire", "VIR", "#2B4C7E", "#FFFFFF", "Commande réservée 48 h", ""],
  agence: ["Paiement en agence", "AG", "#8C6A1F", "#FFFFFF", "Espèces ou chèque certifié", ""],
};

export const MOBILE_MONEY: PaymentMethod[] = ["om", "moov", "wave"];

export const SHOP_TYPES: Record<ShopType, string> = {
  officielle: "Boutique officielle",
  bijoutier: "Bijoutier",
  comptoir: "Grossiste / Comptoir",
  fondeur: "Fondeur / Prestataire",
  livreur: "Prestataire logistique",
};

export const SHOP_STATUS: Record<ShopStatus, [string, Tone]> = {
  pending: ["En attente", "warn"],
  more_info: ["Compléments demandés", "mute"],
  verified: ["Vérifié", "ok"],
  refused: ["Refusé", "err"],
  suspended: ["Suspendu", "err"],
};

export const ROLE_LABELS: Record<UserRole, string> = {
  client: "Client",
  bijoutier: "Bijoutier",
  grossiste: "Grossiste / Comptoir",
  fondeur: "Fondeur",
  livreur: "Livreur",
  conseiller: "Conseiller",
  moderateur: "Conformité & modération",
  finance: "Finance",
  admin: "Administrateur",
  super_admin: "Super-administrateur",
};

export const ROLE_TO_SHOP: Partial<Record<UserRole, ShopType>> = {
  bijoutier: "bijoutier",
  grossiste: "comptoir",
  fondeur: "fondeur",
  livreur: "livreur",
};

export const STAFF_ROLES: UserRole[] = ["conseiller", "moderateur", "finance", "admin", "super_admin"];
export const ADMIN_ROLES: UserRole[] = ["admin", "super_admin"];

/** Pièces justificatives exigées selon l'activité (maquette KYC). */
const KYC_BASE: [string, string][] = [
  ["Registre de commerce (RCCM)", "Tribunal de commerce"],
  ["Identifiant financier unique (IFU)", "Direction générale des impôts"],
];
const KYC_END: [string, string][] = [
  ["Pièce d'identité du responsable", "CNIB ou passeport"],
  ["Coordonnées bancaires / Mobile Money", "RIB ou attestation opérateur"],
];
const KYC_EXTRA: Record<Exclude<ShopType, "officielle">, [string, string][]> = {
  comptoir: [
    ["Autorisation de commercialisation de l'or", "Ministère de l'Énergie, des Mines et des Carrières"],
    ["Rapport d'analyse récent", "Laboratoire agréé"],
  ],
  bijoutier: [["Carte professionnelle d'artisan bijoutier", "Chambre des métiers de l'artisanat"]],
  fondeur: [["Agrément laboratoire / fonderie", "Ministère des Mines"]],
  livreur: [["Assurance transport de valeurs", "Compagnie d'assurance agréée CIMA"]],
};
export function kycRequirements(type: ShopType): [string, string][] {
  if (type === "officielle") return [];
  return [...KYC_BASE, ...KYC_EXTRA[type], ...KYC_END];
}

export const ADVICE_NEEDS: Record<string, string> = {
  premier_achat: "Premier achat d'or",
  epargne: "Constituer une épargne en or",
  mariage: "Mariage, dot & fiançailles",
  bijou: "Choisir un bijou",
  revente: "Revendre mon or",
  pro: "Achat professionnel / en gros",
  autre: "Autre besoin",
};

export const ADVICE_CHANNELS: Record<string, string> = {
  telephone: "Appel téléphonique",
  whatsapp: "WhatsApp",
  agence: "Rendez-vous en agence",
  visio: "Visioconférence",
};

export const ADVICE_STATUS: Record<string, [string, Tone]> = {
  new: ["Nouvelle", "info"],
  assigned: ["Attribuée", "gold"],
  in_progress: ["En cours", "warn"],
  done: ["Traitée", "ok"],
  cancelled: ["Annulée", "mute"],
};

export const COMPLAINT_CATEGORIES: Record<string, string> = {
  livraison: "Livraison",
  produit: "Produit non conforme",
  paiement: "Paiement",
  vendeur: "Vendeur",
  remboursement: "Remboursement",
  autre: "Autre",
};

export const COMPLAINT_STATUS: Record<string, [string, Tone]> = {
  open: ["Ouverte", "warn"],
  assigned: ["Attribuée", "info"],
  in_progress: ["En traitement", "info"],
  resolved: ["Résolue", "ok"],
  closed: ["Clôturée", "mute"],
};

export const QUOTE_STATUS: Record<string, [string, Tone]> = {
  new: ["Nouvelle", "info"],
  answered: ["Offre envoyée", "gold"],
  negotiating: ["En négociation", "warn"],
  accepted: ["Acceptée", "ok"],
  refused: ["Refusée", "err"],
  closed: ["Clôturée", "mute"],
};

export const OCCASIONS = ["Mariage & dot", "Fiançailles", "Baptême", "Tabaski & fêtes", "Cadeau"];

export const CITIES = [
  "Ouagadougou", "Bobo-Dioulasso", "Koudougou", "Ouahigouya", "Banfora", "Kaya", "Tenkodogo", "Fada N'Gourma", "Dédougou",
  "Abidjan", "Bamako", "Niamey", "Lomé", "Accra", "Dakar", "Cotonou",
];

export const TONE_CLASSES: Record<Tone, string> = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  err: "bg-err-bg text-err",
  info: "bg-info-bg text-info",
  mute: "bg-mute-bg text-body",
  gold: "bg-sand text-gold-dark",
};

/** Variante back-office (s'adapte au thème sombre). */
export const ADMIN_TONE: Record<Tone, string> = {
  ok: "bg-p-ok-bg text-p-ok",
  warn: "bg-p-warn-bg text-p-warn",
  err: "bg-p-err-bg text-p-err",
  info: "bg-p-info-bg text-p-info",
  mute: "bg-p-mute-bg text-p-mute",
  gold: "bg-p-gold-bg text-p-gold",
};
