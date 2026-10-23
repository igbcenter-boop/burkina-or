"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin";
import type { FormState } from "./public";

const str = (fd: FormData, k: string, max = 2000) => String(fd.get(k) ?? "").trim().slice(0, max);

async function me() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const { supabase, user } = await me();
  if (!user) return { error: "Session expirée." };
  const full_name = str(fd, "full_name", 120);
  if (full_name.length < 2) return { error: "Indiquez votre nom complet." };
  const { error } = await supabase
    .from("profiles")
    .update({ full_name, phone: str(fd, "phone", 40) || null, city: str(fd, "city", 80) || null, address: str(fd, "address", 200) || null })
    .eq("id", user.id);
  if (error) return { error: "Enregistrement impossible." };
  revalidatePath("/compte", "layout");
  return { ok: true, message: "Profil mis à jour." };
}

/** Ouvre (ou reprend) une conversation avec un vendeur. */
export async function startConversation(_: FormState, fd: FormData): Promise<FormState> {
  const { supabase, user } = await me();
  const shopId = str(fd, "shop_id", 64);
  const back = str(fd, "back", 200) || "/";
  if (!user) redirect(`/connexion?suite=${encodeURIComponent(back)}`);
  const body = str(fd, "message", 3000);
  if (body.length < 3) return { error: "Écrivez votre message." };
  const subject = str(fd, "subject", 160) || null;
  const orderId = str(fd, "order_id", 64) || null;
  let { data: conv } = await supabase.from("conversations").select("id").eq("client_id", user.id).eq("shop_id", shopId).maybeSingle();
  if (!conv) {
    const { data, error } = await supabase.from("conversations").insert({ client_id: user.id, shop_id: shopId, subject, order_id: orderId }).select("id").single();
    if (error || !data) return { error: "Impossible de contacter ce vendeur." };
    conv = data;
  }
  await supabase.from("messages").insert({ conversation_id: conv.id, sender_id: user.id, sender_side: "client", body });
  await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conv.id);
  const admin = createAdminClient();
  const { data: shop } = await admin.from("shops").select("owner_id").eq("id", shopId).single();
  if (shop?.owner_id) await admin.from("notifications").insert({ user_id: shop.owner_id, title: "Nouveau message client", body: body.slice(0, 120), link: `/pro/messages/${conv.id}` });
  redirect(`/compte/messages/${conv.id}`);
}

/** Message dans une conversation existante (client, vendeur ou équipe). */
export async function sendMessage(_: FormState, fd: FormData): Promise<FormState> {
  const { supabase, user } = await me();
  if (!user) return { error: "Session expirée." };
  const convId = str(fd, "conversation_id", 64);
  const body = str(fd, "message", 3000);
  const side = str(fd, "side", 10) === "seller" ? "seller" : "client";
  if (body.length < 1) return { error: "Message vide." };
  const { data: conv } = await supabase.from("conversations").select("id,client_id,shop_id").eq("id", convId).maybeSingle();
  if (!conv) return { error: "Conversation introuvable." };
  const { error } = await supabase.from("messages").insert({ conversation_id: convId, sender_id: user.id, sender_side: side, body });
  if (error) return { error: "Envoi impossible." };
  await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", convId);
  const admin = createAdminClient();
  if (side === "client") {
    const { data: shop } = await admin.from("shops").select("owner_id").eq("id", conv.shop_id).single();
    if (shop?.owner_id) await admin.from("notifications").insert({ user_id: shop.owner_id, title: "Nouveau message client", body: body.slice(0, 120), link: `/pro/messages/${convId}` });
  } else {
    await admin.from("notifications").insert({ user_id: conv.client_id, title: "Réponse du vendeur", body: body.slice(0, 120), link: `/compte/messages/${convId}` });
  }
  revalidatePath(side === "client" ? `/compte/messages/${convId}` : `/pro/messages/${convId}`);
  return { ok: true };
}

export async function createComplaint(_: FormState, fd: FormData): Promise<FormState> {
  const { supabase, user } = await me();
  if (!user) return { error: "Session expirée." };
  const subject = str(fd, "subject", 160);
  const description = str(fd, "description", 4000);
  if (subject.length < 4 || description.length < 10) return { error: "Précisez l'objet et décrivez le problème (10 caractères minimum)." };
  const orderId = str(fd, "order_id", 64) || null;
  let shopId: string | null = null;
  if (orderId) {
    const { data: item } = await supabase.from("order_items").select("shop_id").eq("order_id", orderId).limit(1).maybeSingle();
    shopId = item?.shop_id ?? null;
  }
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const category = str(fd, "category", 40) || "autre";
  const { data, error } = await supabase
    .from("complaints")
    .insert({
      user_id: user.id,
      reporter_name: profile?.full_name,
      order_id: orderId,
      shop_id: shopId,
      category,
      subject,
      description,
      priority: category === "livraison" && /scell|vol|perdu|abîm/i.test(description) ? "haute" : "normale",
    })
    .select("id")
    .single();
  if (error || !data) return { error: "La réclamation n'a pas pu être enregistrée." };
  redirect(`/compte/reclamations/${data.id}`);
}

export async function addComplaintMessage(_: FormState, fd: FormData): Promise<FormState> {
  const { supabase, user } = await me();
  if (!user) return { error: "Session expirée." };
  const id = str(fd, "complaint_id", 64);
  const body = str(fd, "message", 3000);
  if (!body) return { error: "Message vide." };
  const { error } = await supabase.from("complaint_messages").insert({ complaint_id: id, sender_id: user.id, sender_side: "client", body });
  if (error) return { error: "Envoi impossible." };
  revalidatePath(`/compte/reclamations/${id}`);
  return { ok: true };
}

export async function markNotificationsRead() {
  const { supabase, user } = await me();
  if (!user) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/compte", "layout");
}

/** Rétractation : annulation possible tant que rien n'est expédié. */
export async function cancelOrder(orderId: string): Promise<{ ok: boolean; error?: string }> {
  const { user } = await me();
  if (!user) return { ok: false, error: "Session expirée." };
  const db = createAdminClient();
  const { data: o } = await db.from("orders").select("id,status,payment_status,user_id,number").eq("id", orderId).maybeSingle();
  if (!o || o.user_id !== user.id) return { ok: false, error: "Commande introuvable." };
  if (!["pending_payment", "paid", "confirmed"].includes(o.status)) return { ok: false, error: "Le colis est déjà en préparation : ouvrez une réclamation pour un retour." };
  const refund = o.payment_status === "paid";
  await db.from("orders").update({ status: refund ? "refunded" : "cancelled", payment_status: refund ? "refunded" : o.payment_status }).eq("id", orderId);
  await db.from("order_events").insert({ order_id: orderId, status: refund ? "refunded" : "cancelled", label: refund ? "Annulée · remboursement initié" : "Annulée", note: "Rétractation par le client" });
  // Restitution du stock réservé
  const { data: items } = await db.from("order_items").select("product_id,qty").eq("order_id", orderId);
  for (const it of items ?? []) {
    if (!it.product_id) continue;
    const { data: p } = await db.from("products").select("stock_qty").eq("id", it.product_id).single();
    if (p?.stock_qty != null) {
      const q = p.stock_qty + it.qty;
      await db.from("products").update({ stock_qty: q, stock_status: q <= 3 ? "low" : "in" }).eq("id", it.product_id);
    }
  }
  updateTag("products");
  revalidatePath(`/compte/commandes/${o.number}`);
  return { ok: true };
}

export async function leaveReview(_: FormState, fd: FormData): Promise<FormState> {
  const { supabase, user } = await me();
  if (!user) return { error: "Session expirée." };
  const orderId = str(fd, "order_id", 64);
  const rating = Math.min(5, Math.max(1, Number(fd.get("rating")) || 5));
  const body = str(fd, "body", 1500);
  if (body.length < 5) return { error: "Quelques mots sur votre expérience ?" };
  const { data: o } = await supabase.from("orders").select("id,status,city").eq("id", orderId).eq("user_id", user.id).maybeSingle();
  if (!o || o.status !== "delivered") return { error: "Vous pourrez laisser un avis après la livraison." };
  const { data: item } = await supabase.from("order_items").select("product_id,shop_id,name").eq("order_id", orderId).limit(1).single();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const name = profile?.full_name ?? "Client";
  const initials = name.split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();
  const { error } = await supabase.from("reviews").insert({
    user_id: user.id,
    order_id: orderId,
    product_id: item?.product_id,
    shop_id: item?.shop_id,
    author_name: name,
    author_meta: `${item?.name ?? "Commande"} · ${o.city ?? ""}`,
    initials,
    rating,
    body,
  });
  if (error) return { error: "Avis non enregistré." };
  updateTag("reviews");
  return { ok: true, message: "Merci pour votre avis !" };
}

/** Réponse de l'acheteur sur une demande de devis (accepter / refuser / message). */
export async function buyerQuoteAction(_: FormState, fd: FormData): Promise<FormState> {
  const { supabase, user } = await me();
  if (!user) return { error: "Session expirée." };
  const id = str(fd, "quote_id", 64);
  const action = str(fd, "action", 20);
  const body = str(fd, "message", 3000);
  const { data: q } = await supabase.from("quote_requests").select("id,shop_id,number,buyer_id").eq("id", id).maybeSingle();
  if (!q || q.buyer_id !== user.id) return { error: "Demande introuvable." };
  if (action === "accept" || action === "refuse") {
    await supabase.from("quote_requests").update({ status: action === "accept" ? "accepted" : "refused" }).eq("id", id);
    await supabase.from("quote_messages").insert({ quote_id: id, sender_id: user.id, sender_side: "buyer", body: action === "accept" ? "J'accepte votre offre. Merci de me communiquer les modalités de règlement et d'enlèvement." : body || "Je décline cette offre." });
  } else {
    if (!body) return { error: "Message vide." };
    await supabase.from("quote_messages").insert({ quote_id: id, sender_id: user.id, sender_side: "buyer", body });
    await supabase.from("quote_requests").update({ status: "negotiating" }).eq("id", id);
  }
  const admin = createAdminClient();
  const { data: shop } = await admin.from("shops").select("owner_id").eq("id", q.shop_id).single();
  if (shop?.owner_id) await admin.from("notifications").insert({ user_id: shop.owner_id, title: `Devis ${q.number} : réponse de l'acheteur`, body: action === "accept" ? "Offre acceptée" : action === "refuse" ? "Offre refusée" : body.slice(0, 120), link: `/pro/devis/${id}` });
  revalidatePath(`/compte/devis/${id}`);
  return { ok: true };
}
