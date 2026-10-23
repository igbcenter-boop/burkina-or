"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin";
import { slugify } from "../format";
import { PURITIES } from "../pricing";
import { kycRequirements, ROLE_TO_SHOP } from "../labels";
import type { FormState } from "./public";
import type { OrderStatus, ShipmentStatus, ShopType, UserRole } from "../types";

const str = (fd: FormData, k: string, max = 2000) => String(fd.get(k) ?? "").trim().slice(0, max);
const num = (fd: FormData, k: string) => {
  const v = str(fd, k).replace(/\s/g, "").replace(",", ".");
  return v === "" ? null : Number(v);
};
const list = (fd: FormData, k: string) => str(fd, k).split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);

async function ctx() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/connexion?suite=/pro");
  const { data: profile } = await supabase.from("profiles").select("role,full_name,status").eq("id", data.user.id).single();
  return { supabase, user: data.user, profile: profile as { role: UserRole; full_name: string; status: string } };
}

async function myShop(shopId: string) {
  const c = await ctx();
  const { data: shop } = await c.supabase.from("shops").select("*").eq("id", shopId).eq("owner_id", c.user.id).maybeSingle();
  return { ...c, shop };
}

async function uniqueSlug(base: string, table: "shops" | "products", exceptId?: string) {
  const db = createAdminClient();
  let slug = slugify(base) || "boutique";
  for (let i = 2; i < 50; i++) {
    const { data } = await db.from(table).select("id").eq("slug", slug).maybeSingle();
    if (!data || data.id === exceptId) return slug;
    slug = `${slugify(base)}-${i}`;
  }
  return `${slugify(base)}-${Date.now().toString(36)}`;
}

async function notifyStaff(title: string, body: string, link: string) {
  const db = createAdminClient();
  const { data: staff } = await db.from("profiles").select("id").in("role", ["admin", "super_admin", "moderateur"]);
  if (staff?.length) await db.from("notifications").insert(staff.map((s) => ({ user_id: s.id, title, body, link })));
}

// ─── Structure professionnelle ──────────────────────────────────────
export async function createShop(_: FormState, fd: FormData): Promise<FormState> {
  const { supabase, user, profile } = await ctx();
  const name = str(fd, "name", 120);
  let type = (ROLE_TO_SHOP[profile.role] ?? str(fd, "type", 20)) as ShopType;
  if (!["bijoutier", "comptoir", "fondeur", "livreur"].includes(type)) type = "bijoutier";
  if (name.length < 2) return { error: "Indiquez le nom de votre structure." };
  if (!str(fd, "city")) return { error: "Indiquez votre ville." };
  const slug = await uniqueSlug(name, "shops");
  const { data, error } = await supabase
    .from("shops")
    .insert({
      owner_id: user.id,
      type,
      name,
      slug,
      mono: name.split(/\s+/).filter((w) => w.length > 2).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || name.slice(0, 2).toUpperCase(),
      specialty: str(fd, "specialty", 120) || null,
      description: str(fd, "description", 3000) || null,
      city: str(fd, "city", 80),
      address: str(fd, "address", 200) || null,
      phone: str(fd, "phone", 40) || null,
      email: str(fd, "email", 160) || user.email,
      responsible_name: str(fd, "responsible_name", 120) || profile.full_name,
      rccm: str(fd, "rccm", 60) || null,
      ifu: str(fd, "ifu", 60) || null,
      zones: list(fd, "zones"),
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Création impossible : " + (error?.message ?? "erreur inconnue") };
  // Rôle professionnel si le compte était « client »
  if (profile.role === "client") {
    const role: UserRole = type === "comptoir" ? "grossiste" : (type as UserRole);
    await createAdminClient().from("profiles").update({ role }).eq("id", user.id);
  }
  // Pièces attendues, à téléverser
  await supabase.from("kyc_documents").insert(kycRequirements(type).map(([label, issuer], i) => ({ shop_id: data.id, label, issuer, sort: i + 1 })));
  await notifyStaff("Nouveau dossier professionnel", `${name} · ${type} · ${str(fd, "city")}`, "/admin/kyc");
  redirect("/pro/documents");
}

export async function updateShop(_: FormState, fd: FormData): Promise<FormState> {
  const shopId = str(fd, "shop_id", 64);
  const { supabase, shop } = await myShop(shopId);
  if (!shop) return { error: "Structure introuvable." };
  const tariffs = str(fd, "tariffs", 3000)
    .split("\n")
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((p) => p.length >= 3 && p[0])
    .map(([zone, price, delay]) => ({ zone, price: Number(price.replace(/\D/g, "")) || 0, delay }));
  const patch: Record<string, unknown> = {
    name: str(fd, "name", 120) || shop.name,
    specialty: str(fd, "specialty", 120) || null,
    tagline: str(fd, "tagline", 160) || null,
    description: str(fd, "description", 4000) || null,
    savoir_faire: str(fd, "savoir_faire", 2000) || null,
    city: str(fd, "city", 80) || shop.city,
    address: str(fd, "address", 200) || null,
    phone: str(fd, "phone", 40) || null,
    email: str(fd, "email", 160) || null,
    whatsapp: str(fd, "whatsapp", 40).replace(/\D/g, "") || null,
    website: str(fd, "website", 200) || null,
    zones: list(fd, "zones"),
    commercial_terms: str(fd, "commercial_terms", 2000) || null,
    capacities: str(fd, "capacities", 500) || null,
    min_order: str(fd, "min_order", 120) || null,
    insurance: str(fd, "insurance", 500) || null,
    responsible_name: str(fd, "responsible_name", 120) || null,
    rccm: str(fd, "rccm", 60) || null,
    ifu: str(fd, "ifu", 60) || null,
    authorization_number: str(fd, "authorization_number", 80) || null,
  };
  if (shop.type === "livreur") patch.tariffs = tariffs;
  const logo = str(fd, "logo_url", 500);
  const cover = str(fd, "cover_url", 500);
  if (logo) patch.logo_url = logo;
  if (cover) patch.cover_url = cover;
  const { error } = await supabase.from("shops").update(patch).eq("id", shopId);
  if (error) return { error: "Enregistrement impossible : " + error.message };
  updateTag("shops");
  revalidatePath("/pro", "layout");
  return { ok: true, message: "Boutique mise à jour." };
}

// ─── Produits ───────────────────────────────────────────────────────
export async function saveProduct(_: FormState, fd: FormData): Promise<FormState> {
  const shopId = str(fd, "shop_id", 64);
  const id = str(fd, "id", 64);
  const { supabase, shop, profile } = await myShop(shopId);
  const staff = ["admin", "super_admin"].includes(profile.role);
  if (!shop && !staff) return { error: "Boutique introuvable." };
  const shopType = (shop?.type ?? "officielle") as ShopType;
  const kind = shopType === "officielle" ? (str(fd, "kind") === "bijou" ? "bijou" : "lingot") : shopType === "bijoutier" ? "bijou" : shopType === "comptoir" ? "gros" : "service";
  const name = str(fd, "name", 160);
  if (name.length < 3) return { error: "Le nom du produit est trop court." };
  const purity = str(fd, "purity", 20) || null;
  const pricing_mode = (["indexed", "fixed", "quote"].includes(str(fd, "pricing_mode")) ? str(fd, "pricing_mode") : kind === "gros" || kind === "service" ? "quote" : "fixed") as "indexed" | "fixed" | "quote";
  const fixed_price = num(fd, "fixed_price");
  const weight_g = num(fd, "weight_g");
  if (pricing_mode === "fixed" && !fixed_price) return { error: "Indiquez le prix de vente." };
  if (pricing_mode === "indexed" && !weight_g) return { error: "Le prix indexé nécessite le poids en grammes." };
  const images = fd.getAll("images").map(String).filter(Boolean).slice(0, 8);
  const row = {
    shop_id: shopId,
    kind,
    category_id: str(fd, "category_id", 64) || null,
    name,
    description: str(fd, "description", 5000) || null,
    images,
    video_url: str(fd, "video_url", 300) || null,
    image_label: str(fd, "image_label", 80) || name.toLowerCase(),
    weight_g,
    purity,
    purity_factor: PURITIES[purity ?? ""]?.factor ?? 1,
    karat: PURITIES[purity ?? ""]?.ct ?? null,
    form: str(fd, "form", 80) || null,
    dimensions: str(fd, "dimensions", 80) || null,
    pricing_mode,
    fabrication_fee: num(fd, "fabrication_fee") ?? 0,
    fixed_price,
    stock_status: (["in", "low", "out"].includes(str(fd, "stock_status")) ? str(fd, "stock_status") : "in") as "in" | "low" | "out",
    stock_qty: num(fd, "stock_qty"),
    max_per_order: Math.max(1, num(fd, "max_per_order") ?? 5),
    sizes: list(fd, "sizes"),
    stones: str(fd, "stones", 200) || null,
    lead_time_days: num(fd, "lead_time_days"),
    customizable: fd.get("customizable") === "on",
    personalization: str(fd, "personalization", 200) || null,
    delivery_info: str(fd, "delivery_info", 200) || null,
    occasions: fd.getAll("occasions").map(String),
    collection: str(fd, "collection", 80) || null,
    origin: str(fd, "origin", 200) || null,
    certificate_number: str(fd, "certificate_number", 80) || null,
    certificate_lab: str(fd, "certificate_lab", 120) || null,
    min_order_qty: str(fd, "min_order_qty", 60) || null,
    available_qty: str(fd, "available_qty", 60) || null,
    price_terms: str(fd, "price_terms", 160) || null,
    sale_conditions: str(fd, "sale_conditions", 1000) || null,
    status: (str(fd, "status") === "draft" ? "draft" : "published") as "draft" | "published",
  };
  if (id) {
    const { error } = await supabase.from("products").update(row).eq("id", id);
    if (error) return { error: "Enregistrement impossible : " + error.message };
  } else {
    const slug = await uniqueSlug(`${name}-${shop?.mono ?? ""}`, "products");
    const { error } = await supabase.from("products").insert({ ...row, slug });
    if (error) return { error: "Création impossible : " + error.message };
  }
  updateTag("products");
  revalidatePath("/pro/produits");
  redirect(shopType === "officielle" && staff ? "/admin/catalogue" : "/pro/produits");
}

export async function setProductStatus(id: string, status: "draft" | "published") {
  const { supabase } = await ctx();
  await supabase.from("products").update({ status }).eq("id", id);
  updateTag("products");
  revalidatePath("/pro/produits");
}

export async function deleteProduct(id: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    // Produit déjà commandé : on l'archive plutôt que de le supprimer.
    await supabase.from("products").update({ status: "draft" }).eq("id", id);
  }
  updateTag("products");
  revalidatePath("/pro/produits");
}

// ─── Pièces justificatives ──────────────────────────────────────────
export async function recordKycDocument(input: { docId: string; shopId: string; path: string; number?: string; expires?: string }) {
  const { supabase, shop } = await myShop(input.shopId);
  if (!shop) return { ok: false, error: "Structure introuvable." };
  const { error } = await supabase
    .from("kyc_documents")
    .update({ file_path: input.path, doc_number: input.number || null, expires_at: input.expires || null })
    .eq("id", input.docId)
    .eq("shop_id", input.shopId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/pro/documents");
  return { ok: true };
}

export async function submitKyc(shopId: string) {
  const { shop } = await myShop(shopId);
  if (!shop) return;
  const db = createAdminClient();
  if (shop.status === "more_info" || shop.status === "refused") await db.from("shops").update({ status: "pending", submitted_at: new Date().toISOString() }).eq("id", shopId);
  await notifyStaff("Dossier KYC complété", `${shop.name} a transmis ses pièces`, "/admin/kyc");
  revalidatePath("/pro", "layout");
}

// ─── Commandes vendeur ──────────────────────────────────────────────
const ITEM_TO_ORDER: Record<string, OrderStatus> = { confirmed: "confirmed", preparing: "preparing", ready: "preparing" };

async function syncOrderStatus(orderId: string) {
  const db = createAdminClient();
  const { data: o } = await db.from("orders").select("status,number,user_id").eq("id", orderId).single();
  if (!o || !["paid", "confirmed", "preparing"].includes(o.status)) return;
  const { data: items } = await db.from("order_items").select("seller_status").eq("order_id", orderId);
  const st = (items ?? []).map((i) => i.seller_status);
  let next: OrderStatus | null = null;
  if (st.length && st.every((s) => ["confirmed", "preparing", "ready"].includes(s)) && o.status === "paid") next = "confirmed";
  if (st.length && st.every((s) => ["preparing", "ready"].includes(s)) && o.status !== "preparing") next = "preparing";
  if (next && next !== o.status) {
    await db.from("orders").update({ status: next }).eq("id", orderId);
    const label = next === "confirmed" ? "Confirmée" : "En préparation";
    const note = next === "confirmed" ? "Disponibilité confirmée par les vendeurs" : "Mise sous scellé et pesée contrôlée";
    await db.from("order_events").insert({ order_id: orderId, status: next, label, note });
    if (o.user_id) await db.from("notifications").insert({ user_id: o.user_id, title: `Commande ${o.number} · ${label.toLowerCase()}`, body: note, link: `/compte/commandes/${o.number}` });
  }
}

export async function updateItemStatus(itemId: string, status: "confirmed" | "unavailable" | "preparing" | "ready") {
  const { supabase, user } = await ctx();
  const { data: item } = await supabase.from("order_items").select("id, order_id, shop_id, name, shop:shops(owner_id)").eq("id", itemId).maybeSingle();
  if (!item || (item.shop as unknown as { owner_id: string })?.owner_id !== user.id) return { ok: false, error: "Article introuvable." };
  const { error } = await supabase.from("order_items").update({ seller_status: status }).eq("id", itemId);
  if (error) return { ok: false, error: error.message };
  const db = createAdminClient();
  if (status === "unavailable") {
    const { data: o } = await db.from("orders").select("number").eq("id", item.order_id).single();
    await notifyStaff("Article indisponible", `${item.name} · commande ${o?.number}`, "/admin/commandes");
  }
  if (ITEM_TO_ORDER[status]) await syncOrderStatus(item.order_id);
  revalidatePath("/pro/commandes");
  return { ok: true };
}

/** Le vendeur scelle le colis : n° de scellé, prêt pour la collecte. */
export async function sealShipment(shipmentId: string, seal: string) {
  const { supabase, user } = await ctx();
  const { data: sh } = await supabase.from("shipments").select("id, order_id, shop:shops!shipments_shop_id_fkey(owner_id)").eq("id", shipmentId).maybeSingle();
  if (!sh || (sh.shop as unknown as { owner_id: string })?.owner_id !== user.id) return { ok: false, error: "Expédition introuvable." };
  if (!/^[A-Z0-9-]{3,20}$/i.test(seal)) return { ok: false, error: "Numéro de scellé invalide." };
  await supabase.from("shipments").update({ seal_number: seal.toUpperCase(), status: "preparing" }).eq("id", shipmentId);
  await supabase.from("shipment_events").insert({ shipment_id: shipmentId, status: "preparing", label: "Colis scellé", note: `Mise sous scellé n° ${seal.toUpperCase()}, pesée contrôlée`, created_by: user.id });
  const db = createAdminClient();
  await db.from("order_items").update({ seller_status: "ready" }).eq("order_id", sh.order_id).in("shop_id", (await supabase.from("shops").select("id").eq("owner_id", user.id)).data?.map((s) => s.id) ?? []);
  await syncOrderStatus(sh.order_id);
  revalidatePath("/pro/commandes");
  return { ok: true };
}

// ─── Devis (vendeur) ────────────────────────────────────────────────
export async function respondQuote(_: FormState, fd: FormData): Promise<FormState> {
  const { supabase, user } = await ctx();
  const id = str(fd, "quote_id", 64);
  const body = str(fd, "message", 3000);
  const offer = num(fd, "price_offer");
  const status = str(fd, "status", 20);
  const { data: q } = await supabase.from("quote_requests").select("id,number,buyer_id,shop_id").eq("id", id).maybeSingle();
  if (!q) return { error: "Demande introuvable." };
  if (body) {
    const { error } = await supabase.from("quote_messages").insert({ quote_id: id, sender_id: user.id, sender_side: "seller", body, price_offer: offer, conditions: str(fd, "conditions", 500) || null });
    if (error) return { error: "Envoi impossible : " + error.message };
  }
  const next = ["refused", "closed", "accepted"].includes(status) ? status : offer ? "answered" : "negotiating";
  await supabase.from("quote_requests").update({ status: next }).eq("id", id);
  if (q.buyer_id) {
    await createAdminClient()
      .from("notifications")
      .insert({ user_id: q.buyer_id, title: `Devis ${q.number} : réponse du vendeur`, body: offer ? "Une offre de prix vous attend." : body.slice(0, 120), link: `/compte/devis/${id}` });
  }
  revalidatePath(`/pro/devis/${id}`);
  return { ok: true };
}

// ─── Missions de livraison (transporteur) ───────────────────────────
const SHIP_FLOW: Partial<Record<ShipmentStatus, { label: string; order?: OrderStatus }>> = {
  accepted: { label: "Mission acceptée" },
  collected: { label: "Collectée", order: "collected" },
  shipped: { label: "En expédition", order: "shipped" },
  at_hub: { label: "Arrivée au point de distribution", order: "at_hub" },
  delivered: { label: "Livrée", order: "delivered" },
  incident: { label: "Incident signalé", order: "incident" },
};

export async function carrierUpdate(input: { shipmentId: string; status: ShipmentStatus; note?: string; code?: string; photoPath?: string }) {
  const { supabase, user } = await ctx();
  const { data: sh } = await supabase.from("shipments").select("*, carrier:shops!shipments_carrier_id_fkey(owner_id,name)").eq("id", input.shipmentId).maybeSingle();
  if (!sh || (sh.carrier as unknown as { owner_id: string })?.owner_id !== user.id) return { ok: false, error: "Mission introuvable." };
  const flow = SHIP_FLOW[input.status];
  if (!flow) return { ok: false, error: "Statut invalide." };
  if (input.status === "collected" && !sh.seal_number) return { ok: false, error: "Le vendeur n'a pas encore scellé le colis." };
  if (input.status === "delivered") {
    const { data: ok } = await supabase.rpc("verify_delivery_code", { p_shipment: input.shipmentId, p_code: (input.code ?? "").trim() });
    if (!ok) return { ok: false, error: "Code de remise incorrect. Ne remettez pas le colis." };
  }
  if (input.status === "incident" && !(input.note ?? "").trim()) return { ok: false, error: "Décrivez l'incident." };
  await supabase.from("shipments").update({ status: input.status }).eq("id", input.shipmentId);
  const note =
    input.note?.trim() ||
    { accepted: `Pris en charge par ${(sh.carrier as unknown as { name: string }).name}`, collected: "Photo du colis scellé transmise par le livreur", shipped: `En route vers ${sh.to_city}`, at_hub: `Plateforme de distribution, ${sh.to_city}`, delivered: "Remise contre code + signature" }[input.status as string] ||
    "";
  await supabase.from("shipment_events").insert({ shipment_id: input.shipmentId, status: input.status, label: flow.label, note, photo_path: input.photoPath ?? null, created_by: user.id });

  // Répercussion sur la commande
  if (flow.order) {
    const db = createAdminClient();
    const { data: o } = await db.from("orders").select("id,status,number,user_id").eq("id", sh.order_id).single();
    const { data: all } = await db.from("shipments").select("status").eq("order_id", sh.order_id);
    let target: OrderStatus | null = flow.order;
    if (input.status === "delivered" && (all ?? []).some((s) => s.status !== "delivered")) target = null; // d'autres colis en route
    // Plusieurs colis : la commande ne fait qu'avancer (pas de retour à une étape antérieure).
    const RANK: Partial<Record<OrderStatus, number>> = { paid: 0, confirmed: 1, preparing: 2, collected: 3, shipped: 4, at_hub: 5, delivered: 6 };
    if (target && target !== "incident" && o && o.status !== "incident" && (RANK[target] ?? 0) <= (RANK[o.status as OrderStatus] ?? -1)) target = null;
    if (o && target && o.status !== target && !["cancelled", "refunded"].includes(o.status)) {
      await db.from("orders").update({ status: target, ...(target === "delivered" ? { delivered_at: new Date().toISOString() } : {}) }).eq("id", o.id);
      await db.from("order_events").insert({ order_id: o.id, status: target, label: flow.label, note });
      if (o.user_id) await db.from("notifications").insert({ user_id: o.user_id, title: `Commande ${o.number} · ${flow.label.toLowerCase()}`, body: note, link: `/compte/commandes/${o.number}` });
      if (target === "incident") {
        await db.from("complaints").insert({ user_id: o.user_id, reporter_name: "Transporteur", order_id: o.id, category: "livraison", subject: "Incident de livraison", description: note, priority: "haute", status: "open" });
        await notifyStaff("Incident de livraison", `${o.number} · ${note}`, "/admin/livraisons");
      }
    }
  }
  revalidatePath("/pro/livraisons");
  return { ok: true };
}
