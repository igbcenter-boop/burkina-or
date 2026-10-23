"use server";

import { headers } from "next/headers";
import { revalidatePath, updateTag } from "next/cache";
import { createClient as createJsClient } from "@supabase/supabase-js";
import { createClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin";
import { ADMIN_ROLES, STAFF_ROLES } from "../labels";
import { n0, slugify } from "../format";
import type { FormState } from "./public";
import type { OrderStatus, UserRole } from "../types";

type Result = { ok: boolean; error?: string; message?: string };

async function staff(adminOnly = false) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Session expirée");
  const { data: p } = await supabase.from("profiles").select("role,full_name,email,status").eq("id", data.user.id).single();
  const role = p?.role as UserRole;
  if (!p || p.status !== "active" || !STAFF_ROLES.includes(role) || (adminOnly && !ADMIN_ROLES.includes(role))) throw new Error("Accès refusé");
  return { supabase, user: data.user, profile: p as { role: UserRole; full_name: string; email: string } };
}

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "—";
}

async function audit(supabase: Awaited<ReturnType<typeof createClient>>, action: string, target: string, sensitive = false, metadata: Record<string, unknown> = {}) {
  await supabase.rpc("log_audit", { p_action: action, p_target: target, p_sensitive: sensitive, p_ip: await ip(), p_metadata: metadata });
}

/** Double validation des opérations sensibles : ré-authentification par mot de passe. */
async function reauth(email: string, password: string) {
  if (!password) return false;
  const c = createJsClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  return !error;
}

async function notify(userId: string | null | undefined, title: string, body: string, link: string) {
  if (!userId) return;
  await createAdminClient().from("notifications").insert({ user_id: userId, title, body, link });
}

const wrap = async (fn: () => Promise<Result>): Promise<Result> => {
  try {
    return await fn();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
};

// ─── KYC ────────────────────────────────────────────────────────────
export async function setDocStatus(docId: string, status: "ok" | "ko", note?: string): Promise<Result> {
  return wrap(async () => {
    const { supabase, user } = await staff();
    const { data: doc } = await supabase.from("kyc_documents").update({ status, note: note ?? null, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("id", docId).select("label, shop:shops(name)").single();
    await audit(supabase, status === "ok" ? "Pièce marquée conforme" : "Pièce marquée non conforme", `${(doc?.shop as unknown as { name: string })?.name} · ${doc?.label}`);
    revalidatePath("/admin/kyc");
    return { ok: true };
  });
}

export async function decideShop(shopId: string, decision: "validate" | "refuse" | "suspend" | "info" | "reactivate", opts: { motif?: string; message?: string; docIds?: string[] } = {}): Promise<Result> {
  return wrap(async () => {
    const { supabase, user } = await staff();
    const { data: shop } = await supabase.from("shops").select("id,name,type,owner_id,status").eq("id", shopId).single();
    if (!shop) return { ok: false, error: "Dossier introuvable" };
    if (decision === "validate") {
      const { data: docs } = await supabase.from("kyc_documents").select("status").eq("shop_id", shopId);
      if ((docs ?? []).some((d) => d.status !== "ok")) return { ok: false, error: "Toutes les pièces doivent être conformes." };
      await supabase.from("shops").update({ status: "verified", verified_at: new Date().toISOString(), verified_by: user.id, refusal_reason: null }).eq("id", shopId);
      // Les brouillons créés avant validation sont publiés.
      await createAdminClient().from("products").update({ status: "published" }).eq("shop_id", shopId).eq("status", "draft");
      await audit(supabase, "Compte validé", `${shop.name} · ${shop.type}`, true);
      await notify(shop.owner_id, "Votre compte est vérifié", "Félicitations : vos annonces sont en ligne avec le badge « Vendeur vérifié ».", "/pro");
    } else if (decision === "refuse") {
      await supabase.from("shops").update({ status: "refused", refusal_reason: opts.motif ?? null }).eq("id", shopId);
      await audit(supabase, "Dossier refusé", `${shop.name} · ${opts.motif ?? ""}`, true);
      await notify(shop.owner_id, "Dossier refusé", opts.motif ?? "Votre dossier n'a pas pu être validé.", "/pro");
    } else if (decision === "suspend") {
      await supabase.from("shops").update({ status: "suspended" }).eq("id", shopId);
      await audit(supabase, "Compte suspendu", shop.name, true);
      await notify(shop.owner_id, "Compte suspendu", "Aucune publication ni transaction n'est possible jusqu'à la levée de la suspension.", "/pro");
    } else if (decision === "reactivate") {
      await supabase.from("shops").update({ status: "verified" }).eq("id", shopId);
      await audit(supabase, "Suspension levée", shop.name, true);
      await notify(shop.owner_id, "Compte réactivé", "Votre boutique est de nouveau active.", "/pro");
    } else {
      await supabase.from("shops").update({ status: "more_info" }).eq("id", shopId);
      if (opts.docIds?.length) await supabase.from("kyc_documents").update({ status: "ko", note: "Pièce à fournir à nouveau", reviewed_by: user.id, reviewed_at: new Date().toISOString() }).in("id", opts.docIds);
      await audit(supabase, "Compléments demandés", shop.name);
      await notify(shop.owner_id, "Compléments demandés", opts.message?.slice(0, 300) ?? "Des pièces sont à fournir à nouveau.", "/pro/documents");
    }
    updateTag("shops");
    updateTag("products");
    revalidatePath("/admin", "layout");
    return { ok: true };
  });
}

// ─── Modération ─────────────────────────────────────────────────────
export async function handleVerification(verifId: string, action: "verify" | "suspend"): Promise<Result> {
  return wrap(async () => {
    const { supabase, user } = await staff();
    const { data: v } = await supabase.from("verification_requests").select("*, product:products(id,name,shop_id,shop:shops(name,owner_id))").eq("id", verifId).single();
    if (!v) return { ok: false, error: "Introuvable" };
    const product = v.product as unknown as { id: string; name: string; shop: { name: string; owner_id: string | null } };
    const db = createAdminClient();
    if (action === "verify") {
      if (!v.within_tolerance) return { ok: false, error: "Écart hors tolérance : vérification impossible." };
      const field = v.field === "Poids" ? { weight_verified: true } : v.field === "Origine" ? { origin_verified: true } : { purity_verified: true };
      await db.from("products").update({ ...field, certificate_number: v.report_number, certificate_lab: v.lab }).eq("id", product.id);
      await supabase.from("verification_requests").update({ status: "verified", handled_by: user.id, handled_at: new Date().toISOString() }).eq("id", verifId);
      await audit(supabase, "Caractéristique vérifiée", `${product.name} · ${v.field} ${v.measured}`, true);
      await notify(product.shop.owner_id, "Caractéristique vérifiée", `${v.field} de « ${product.name} » : désormais « Vérifié par Burkina Or ».`, "/pro/produits");
    } else {
      await db.from("products").update({ status: "suspended" }).eq("id", product.id);
      await supabase.from("verification_requests").update({ status: "suspended", handled_by: user.id, handled_at: new Date().toISOString() }).eq("id", verifId);
      await audit(supabase, "Annonce suspendue (écart hors tolérance)", `${product.name} · ${product.shop.name}`, true);
      await notify(product.shop.owner_id, "Annonce suspendue", `Écart de ${v.gap} sur « ${product.name} » : corrigez l'annonce sous 72 h.`, "/pro/produits");
    }
    updateTag("products");
    revalidatePath("/admin/moderation");
    return { ok: true };
  });
}

export async function createVerification(_: FormState, fd: FormData): Promise<FormState> {
  const r = await wrap(async () => {
    const { supabase } = await staff();
    const productId = String(fd.get("product_id") ?? "");
    const field = String(fd.get("field") ?? "Pureté");
    const declared = String(fd.get("declared") ?? "").trim();
    const measured = String(fd.get("measured") ?? "").trim();
    const gap = String(fd.get("gap") ?? "").trim();
    if (!productId || !declared || !measured) return { ok: false, error: "Produit, valeur déclarée et valeur mesurée sont requis." };
    await supabase.from("verification_requests").insert({ product_id: productId, field, declared, measured, report_number: String(fd.get("report") ?? "") || null, lab: String(fd.get("lab") ?? "") || null, within_tolerance: !gap, gap: gap || null });
    await audit(supabase, "Rapport d'analyse enregistré", `${field} · ${declared} → ${measured}`);
    revalidatePath("/admin/moderation");
    return { ok: true };
  });
  return r.ok ? { ok: true } : { error: r.error };
}

export async function handleReports(productId: string, action: "rm" | "ask" | "no"): Promise<Result> {
  return wrap(async () => {
    const { supabase, user } = await staff();
    const { data: p } = await supabase.from("products").select("id,name,shop:shops(name,owner_id)").eq("id", productId).single();
    const shop = p?.shop as unknown as { name: string; owner_id: string | null };
    const status = action === "rm" ? "removed" : action === "ask" ? "asked" : "dismissed";
    await supabase.from("product_reports").update({ status, handled_by: user.id, handled_at: new Date().toISOString() }).eq("product_id", productId).eq("status", "open");
    if (action === "rm") {
      await createAdminClient().from("products").update({ status: "removed" }).eq("id", productId);
      await audit(supabase, "Produit retiré", `${p?.name} · ${shop?.name}`, true);
      await notify(shop?.owner_id, "Produit retiré du catalogue", `« ${p?.name} » a été retiré suite à des signalements.`, "/pro/produits");
    } else if (action === "ask") {
      await audit(supabase, "Justificatif demandé", `${p?.name} · ${shop?.name}`);
      await notify(shop?.owner_id, "Justificatif demandé", `Merci de fournir un justificatif pour « ${p?.name} » (origine, analyse, photos).`, "/pro/messages");
    } else {
      await audit(supabase, "Signalement classé", p?.name ?? productId);
    }
    updateTag("products");
    revalidatePath("/admin/moderation");
    return { ok: true };
  });
}

export async function setProductModeration(productId: string, status: "published" | "suspended" | "removed", featured?: boolean): Promise<Result> {
  return wrap(async () => {
    const { supabase } = await staff();
    const patch: Record<string, unknown> = { status };
    if (featured !== undefined) patch.featured = featured;
    const { data: p } = await createAdminClient().from("products").update(patch).eq("id", productId).select("name").single();
    await audit(supabase, status === "published" ? "Produit rétabli" : status === "removed" ? "Produit retiré" : "Produit suspendu", p?.name ?? productId, status !== "published");
    updateTag("products");
    revalidatePath("/admin", "layout");
    return { ok: true };
  });
}

// ─── Commandes ──────────────────────────────────────────────────────
const LABEL: Partial<Record<OrderStatus, string>> = { paid: "Payée", confirmed: "Confirmée", preparing: "En préparation", collected: "Collectée", shipped: "En expédition", at_hub: "Au point de distribution", delivered: "Livrée", incident: "Incident", cancelled: "Annulée" };

export async function setOrderStatus(orderId: string, status: OrderStatus, note?: string): Promise<Result> {
  return wrap(async () => {
    const { supabase } = await staff();
    const db = createAdminClient();
    const patch: Record<string, unknown> = { status };
    if (status === "paid") Object.assign(patch, { payment_status: "paid", paid_at: new Date().toISOString() });
    if (status === "delivered") patch.delivered_at = new Date().toISOString();
    const { data: o } = await db.from("orders").update(patch).eq("id", orderId).select("number,user_id,total").single();
    await db.from("order_events").insert({ order_id: orderId, status, label: LABEL[status] ?? status, note: note || "Mise à jour par l'équipe Burkina Or" });
    await audit(supabase, "Statut de commande modifié", `${o?.number} → ${LABEL[status] ?? status}`, status === "paid");
    await notify(o?.user_id, `Commande ${o?.number} · ${(LABEL[status] ?? status).toLowerCase()}`, note || "Mise à jour de votre commande.", `/compte/commandes/${o?.number}`);
    revalidatePath("/admin/commandes");
    return { ok: true };
  });
}

export async function refundOrder(orderId: string, password: string): Promise<Result> {
  return wrap(async () => {
    const { supabase, profile } = await staff();
    if (!["finance", "admin", "super_admin"].includes(profile.role)) return { ok: false, error: "Réservé à la Finance et à l'administration." };
    if (!(await reauth(profile.email, password))) return { ok: false, error: "Mot de passe incorrect." };
    const db = createAdminClient();
    const { data: o } = await db.from("orders").update({ status: "refunded", payment_status: "refunded" }).eq("id", orderId).select("number,total,user_id").single();
    await db.from("order_events").insert({ order_id: orderId, status: "refunded", label: "Remboursement initié", note: "Remboursement validé par la Finance" });
    await audit(supabase, "Remboursement initié", `${o?.number} · ${n0(o?.total)} FCFA`, true);
    await notify(o?.user_id, `Remboursement · ${o?.number}`, `Un remboursement de ${n0(o?.total)} FCFA a été initié.`, `/compte/commandes/${o?.number}`);
    revalidatePath("/admin/commandes");
    return { ok: true };
  });
}

export async function assignCarrier(shipmentId: string, carrierId: string): Promise<Result> {
  return wrap(async () => {
    const { supabase } = await staff();
    const db = createAdminClient();
    const { data: sh } = await db.from("shipments").update({ carrier_id: carrierId || null, status: carrierId ? "assigned" : "pending" }).eq("id", shipmentId).select("order:orders(number), carrier:shops!shipments_carrier_id_fkey(name,owner_id)").single();
    const carrier = sh?.carrier as unknown as { name: string; owner_id: string | null } | null;
    await audit(supabase, "Transporteur attribué", `${(sh?.order as unknown as { number: string })?.number} → ${carrier?.name ?? "aucun"}`);
    await notify(carrier?.owner_id, "Nouvelle mission de livraison", `Commande ${(sh?.order as unknown as { number: string })?.number}`, "/pro/livraisons");
    revalidatePath("/admin/livraisons");
    return { ok: true };
  });
}

// ─── Paramètres (opération sensible) ────────────────────────────────
export async function saveSettings(input: {
  password: string;
  pricing: { margin_pct: number; lock_minutes: number; breaker_enabled: boolean; breaker_pct: number; source: string; fx: string };
  commissions: Record<string, number>;
  payments: Record<string, { enabled: boolean; fee: string }>;
}): Promise<Result> {
  return wrap(async () => {
    const { supabase, profile, user } = await staff(true);
    if (!(await reauth(profile.email, input.password))) return { ok: false, error: "Mot de passe incorrect." };
    const { data: cur } = await supabase.from("settings").select("key,value").in("key", ["pricing", "commissions", "payments"]);
    const old = Object.fromEntries((cur ?? []).map((r) => [r.key, r.value]));
    const rows = [
      { key: "pricing", value: { ...old.pricing, ...input.pricing }, updated_by: user.id, updated_at: new Date().toISOString() },
      { key: "commissions", value: input.commissions, updated_by: user.id, updated_at: new Date().toISOString() },
      { key: "payments", value: input.payments, updated_by: user.id, updated_at: new Date().toISOString() },
    ];
    const { error } = await supabase.from("settings").upsert(rows);
    if (error) return { ok: false, error: error.message };
    const changes: string[] = [];
    if (old.pricing?.margin_pct !== input.pricing.margin_pct) changes.push(`marge ${String(old.pricing?.margin_pct).replace(".", ",")} % → ${String(input.pricing.margin_pct).replace(".", ",")} %`);
    for (const [k, v] of Object.entries(input.commissions)) if (old.commissions?.[k] !== v) changes.push(`commission ${k} ${old.commissions?.[k]} % → ${v} %`);
    for (const [k, v] of Object.entries(input.payments)) if (old.payments?.[k]?.enabled !== v.enabled) changes.push(`${k} ${v.enabled ? "activé" : "désactivé"}`);
    await audit(supabase, "Paramètres enregistrés", changes.join(" · ") || "Cours, commissions & paiements", true);
    updateTag("settings");
    updateTag("gold");
    revalidatePath("/", "layout");
    return { ok: true, message: "Paramètres enregistrés" };
  });
}

export async function addGoldPrice(raw: number, usdOz?: number, fx?: number): Promise<Result> {
  return wrap(async () => {
    const { supabase } = await staff(true);
    if (!raw || raw < 1000 || raw > 1_000_000) return { ok: false, error: "Cours brut invalide (FCFA/g)." };
    await supabase.from("gold_prices").insert({ price_raw_per_g: raw, usd_per_oz: usdOz ?? null, usd_xof: fx ?? null, source: "Saisie manuelle" });
    await audit(supabase, "Cours de l'or mis à jour", `${n0(raw)} FCFA/g (brut)`, true);
    updateTag("gold");
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

export async function saveContent(key: "home_stats" | "company", value: unknown): Promise<Result> {
  return wrap(async () => {
    const { supabase } = await staff(true);
    await supabase.from("settings").upsert({ key, value, updated_at: new Date().toISOString() });
    await audit(supabase, "Contenu modifié", key);
    updateTag("settings");
    return { ok: true };
  });
}

// ─── Utilisateurs ───────────────────────────────────────────────────
export async function setUserRole(userId: string, role: UserRole): Promise<Result> {
  return wrap(async () => {
    const { supabase, profile, user } = await staff(true);
    if (userId === user.id) return { ok: false, error: "Vous ne pouvez pas modifier votre propre rôle." };
    if ((ADMIN_ROLES.includes(role) || role === "finance") && profile.role !== "super_admin") return { ok: false, error: "Seul un super-administrateur peut attribuer ce rôle." };
    const { data: u } = await supabase.from("profiles").update({ role }).eq("id", userId).select("full_name,email").single();
    await audit(supabase, "Rôle modifié", `${u?.full_name ?? u?.email} → ${role}`, true);
    revalidatePath("/admin/utilisateurs");
    return { ok: true };
  });
}

export async function setUserStatus(userId: string, status: "active" | "suspended"): Promise<Result> {
  return wrap(async () => {
    const { supabase, user } = await staff(true);
    if (userId === user.id) return { ok: false, error: "Action impossible sur votre propre compte." };
    const { data: u } = await supabase.from("profiles").update({ status }).eq("id", userId).select("full_name,email").single();
    await audit(supabase, status === "suspended" ? "Utilisateur suspendu" : "Utilisateur réactivé", u?.full_name ?? u?.email ?? userId, true);
    revalidatePath("/admin/utilisateurs");
    return { ok: true };
  });
}

// ─── Réclamations ───────────────────────────────────────────────────
export async function updateComplaint(id: string, patch: { status?: string; assigned_to?: string | null; priority?: string; resolution?: string }): Promise<Result> {
  return wrap(async () => {
    const { supabase } = await staff();
    const p: Record<string, unknown> = { ...patch };
    if (patch.status === "resolved") p.resolved_at = new Date().toISOString();
    if (patch.assigned_to && !patch.status) p.status = "assigned";
    const { data: c } = await supabase.from("complaints").update(p).eq("id", id).select("number,subject,user_id").single();
    await audit(supabase, patch.status === "resolved" ? "Réclamation résolue" : "Réclamation mise à jour", `${c?.number} · ${c?.subject}`);
    if (patch.status === "resolved" || patch.resolution) await notify(c?.user_id, `Réclamation ${c?.number} résolue`, patch.resolution ?? "Votre réclamation a été traitée.", `/compte/reclamations/${id}`);
    revalidatePath(`/admin/reclamations/${id}`);
    revalidatePath("/admin/reclamations");
    return { ok: true };
  });
}

export async function staffComplaintMessage(_: FormState, fd: FormData): Promise<FormState> {
  const r = await wrap(async () => {
    const { supabase, user } = await staff();
    const id = String(fd.get("complaint_id") ?? "");
    const body = String(fd.get("message") ?? "").trim();
    if (!body) return { ok: false, error: "Message vide" };
    await supabase.from("complaint_messages").insert({ complaint_id: id, sender_id: user.id, sender_side: "staff", body });
    const { data: c } = await supabase.from("complaints").select("number,user_id,status").eq("id", id).single();
    if (c?.status === "open" || c?.status === "assigned") await supabase.from("complaints").update({ status: "in_progress" }).eq("id", id);
    await notify(c?.user_id, `Réclamation ${c?.number} : nouveau message`, body.slice(0, 120), `/compte/reclamations/${id}`);
    revalidatePath(`/admin/reclamations/${id}`);
    return { ok: true };
  });
  return r.ok ? { ok: true } : { error: r.error };
}

// ─── Conseil ────────────────────────────────────────────────────────
export async function updateAdvice(id: string, patch: { status?: string; advisor_id?: string | null; advisor_notes?: string }): Promise<Result> {
  return wrap(async () => {
    const { supabase } = await staff();
    const p: Record<string, unknown> = { ...patch };
    if (patch.advisor_id && !patch.status) p.status = "assigned";
    const { data: a } = await supabase.from("advice_requests").update(p).eq("id", id).select("name,user_id").single();
    await audit(supabase, "Demande de conseil mise à jour", a?.name ?? id);
    if (patch.advisor_notes) await notify(a?.user_id, "Réponse de votre conseiller", patch.advisor_notes.slice(0, 160), "/compte/conseil");
    revalidatePath("/admin/conseil");
    return { ok: true };
  });
}

// ─── Catégories ─────────────────────────────────────────────────────
export async function saveCategory(_: FormState, fd: FormData): Promise<FormState> {
  const r = await wrap(async () => {
    const { supabase } = await staff(true);
    const id = String(fd.get("id") ?? "");
    const name = String(fd.get("name") ?? "").trim();
    if (name.length < 2) return { ok: false, error: "Nom trop court" };
    const row = { name, kind: String(fd.get("kind") ?? "bijou"), image_label: String(fd.get("image_label") ?? "") || name.toLowerCase(), sort: Number(fd.get("sort") ?? 0), active: fd.get("active") !== "off" };
    if (id) await supabase.from("categories").update(row).eq("id", id);
    else await supabase.from("categories").insert({ ...row, slug: slugify(name) });
    await audit(supabase, id ? "Catégorie modifiée" : "Catégorie créée", name);
    updateTag("categories");
    updateTag("products");
    revalidatePath("/admin/catalogue");
    return { ok: true };
  });
  return r.ok ? { ok: true } : { error: r.error };
}

export async function toggleCategory(id: string, active: boolean): Promise<Result> {
  return wrap(async () => {
    const { supabase } = await staff(true);
    await supabase.from("categories").update({ active }).eq("id", id);
    await audit(supabase, active ? "Catégorie activée" : "Catégorie désactivée", id);
    updateTag("categories");
    revalidatePath("/admin/catalogue");
    return { ok: true };
  });
}

export async function markContactHandled(id: string): Promise<Result> {
  return wrap(async () => {
    const { supabase } = await staff();
    await supabase.from("contact_messages").update({ handled: true }).eq("id", id);
    revalidatePath("/admin/contacts");
    return { ok: true };
  });
}

export async function logExport(what: string): Promise<Result> {
  return wrap(async () => {
    const { supabase } = await staff();
    await audit(supabase, "Export de rapport", what);
    return { ok: true };
  });
}

/** Variantes « champ unique » utilisables avec `.bind()` depuis un composant serveur. */
export async function setComplaintField(id: string, field: "assigned_to" | "priority" | "status", value: string): Promise<Result> {
  return updateComplaint(id, { [field]: field === "assigned_to" ? value || null : value });
}

export async function setAdviceField(id: string, field: "advisor_id" | "status", value: string): Promise<Result> {
  return updateAdvice(id, { [field]: field === "advisor_id" ? value || null : value });
}

export async function setUserRoleValue(userId: string, value: string): Promise<Result> {
  return setUserRole(userId, value as UserRole);
}

export async function setShopFeatured(shopId: string, featured: boolean): Promise<Result> {
  return wrap(async () => {
    const { supabase } = await staff(true);
    const { data: s } = await supabase.from("shops").update({ featured }).eq("id", shopId).select("name").single();
    await audit(supabase, featured ? "Boutique mise à la une" : "Boutique retirée de la une", s?.name ?? shopId);
    updateTag("shops");
    revalidatePath("/admin/boutiques");
    return { ok: true };
  });
}
