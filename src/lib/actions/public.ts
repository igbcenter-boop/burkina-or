"use server";

import { createClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin";

export type FormState = { ok?: boolean; error?: string; message?: string; id?: string } | null;

const str = (fd: FormData, k: string, max = 2000) => String(fd.get(k) ?? "").trim().slice(0, max);

async function currentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Alerte de cours (bloc « Le cours de l'or en temps réel »). */
export async function createPriceAlert(_: FormState, fd: FormData): Promise<FormState> {
  const contact = str(fd, "contact", 160);
  const target = Number(str(fd, "target").replace(/\s/g, "")) || null;
  if (contact.length < 6 || !(/@/.test(contact) || /\d{6,}/.test(contact.replace(/\D/g, "")))) {
    return { error: "Indiquez une adresse e-mail ou un numéro WhatsApp valide." };
  }
  const supabase = await createClient();
  const userId = await currentUserId();
  const { error } = await supabase.from("price_alerts").insert({ contact, target_price: target, user_id: userId });
  if (error) return { error: "Impossible d'enregistrer l'alerte pour le moment." };
  return { ok: true };
}

export async function sendContact(_: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name", 120);
  const message = str(fd, "message", 4000);
  const email = str(fd, "email", 160);
  const phone = str(fd, "phone", 40);
  if (name.length < 2 || message.length < 10) return { error: "Merci de renseigner votre nom et un message d'au moins 10 caractères." };
  if (!email && !phone) return { error: "Indiquez un e-mail ou un téléphone pour que nous puissions vous répondre." };
  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").insert({ name, email: email || null, phone: phone || null, subject: str(fd, "subject", 160) || null, message });
  if (error) return { error: "Envoi impossible pour le moment, réessayez." };
  return { ok: true, message: "Message envoyé. Notre équipe vous répond sous 24 h ouvrées." };
}

/** Demande de conseil / prise de rendez-vous avec un conseiller. */
export async function createAdviceRequest(_: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name", 120);
  const phone = str(fd, "phone", 40);
  const email = str(fd, "email", 160);
  const need = str(fd, "need", 40) || "autre";
  if (name.length < 2) return { error: "Indiquez votre nom." };
  if (!phone && !email) return { error: "Indiquez un téléphone ou un e-mail pour être recontacté." };
  const date = str(fd, "date", 40);
  const time = str(fd, "time", 10);
  const preferred = date ? new Date(`${date}T${time || "10:00"}:00Z`).toISOString() : null;
  const userId = await currentUserId();
  const supabase = await createClient();
  const { error } = await supabase.from("advice_requests").insert({
    user_id: userId,
    name,
    phone: phone || null,
    email: email || null,
    need,
    product_type: str(fd, "product_type", 80) || null,
    quantity: str(fd, "quantity", 80) || null,
    budget: str(fd, "budget", 80) || null,
    message: str(fd, "message", 3000) || null,
    channel: str(fd, "channel", 20) || "telephone",
    preferred_date: preferred,
  });
  if (error) return { error: "Votre demande n'a pas pu être enregistrée. Réessayez ou écrivez-nous sur WhatsApp." };
  return { ok: true, message: "Demande reçue. Un conseiller Burkina Or vous recontacte au créneau choisi." };
}

export async function reportProduct(_: FormState, fd: FormData): Promise<FormState> {
  const productId = str(fd, "product_id", 64);
  const reason = str(fd, "reason", 1000);
  if (!productId || reason.length < 5) return { error: "Décrivez brièvement le problème constaté." };
  const supabase = await createClient();
  const userId = await currentUserId();
  const { error } = await supabase.from("product_reports").insert({ product_id: productId, reason, reporter_id: userId });
  if (error) return { error: "Signalement impossible pour le moment." };
  return { ok: true, message: "Merci, notre équipe de modération va examiner cette annonce." };
}

/** Demande de devis auprès d'un grossiste, comptoir ou fondeur (compte requis). */
export async function requestQuote(_: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Connectez-vous pour envoyer une demande de devis." };
  const shopId = str(fd, "shop_id", 64);
  const quantity = str(fd, "quantity", 80);
  const message = str(fd, "message", 3000);
  if (!shopId || !quantity) return { error: "Précisez la quantité souhaitée." };
  const { data: profile } = await supabase.from("profiles").select("full_name,phone,email").eq("id", auth.user.id).single();
  const { data, error } = await supabase
    .from("quote_requests")
    .insert({
      buyer_id: auth.user.id,
      buyer_name: profile?.full_name,
      buyer_phone: str(fd, "phone", 40) || profile?.phone,
      buyer_email: profile?.email ?? auth.user.email,
      buyer_company: str(fd, "company", 120) || null,
      shop_id: shopId,
      product_id: str(fd, "product_id", 64) || null,
      product_type: str(fd, "product_type", 80) || null,
      quantity,
      purity: str(fd, "purity", 40) || null,
      budget: str(fd, "budget", 80) || null,
      delivery_city: str(fd, "city", 80) || null,
      message: message || null,
    })
    .select("id, number")
    .single();
  if (error || !data) return { error: "La demande n'a pas pu être envoyée." };
  // Notifie le vendeur (service role : le client ne peut pas écrire chez autrui).
  const admin = createAdminClient();
  const { data: shop } = await admin.from("shops").select("owner_id,name").eq("id", shopId).single();
  if (shop?.owner_id) {
    await admin.from("notifications").insert({
      user_id: shop.owner_id,
      title: `Nouvelle demande de devis ${data.number}`,
      body: `${profile?.full_name ?? "Un acheteur"} · ${quantity}`,
      link: `/pro/devis/${data.id}`,
    });
  }
  return { ok: true, id: data.id, message: `Demande ${data.number} envoyée. Suivez la réponse dans votre espace client.` };
}
