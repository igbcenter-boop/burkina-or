"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";
import type { FormState } from "./public";

const str = (fd: FormData, k: string, max = 300) => String(fd.get(k) ?? "").trim().slice(0, max);

/** N'autorise que les redirections internes (évite les redirections ouvertes). */
function safeNext(v: string | null | undefined, fallback = "/compte") {
  if (!v || !v.startsWith("/") || v.startsWith("//")) return fallback;
  return v;
}

async function origin() {
  const h = await headers();
  return process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

export async function signIn(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { error: "Saisissez votre e-mail et votre mot de passe." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/confirm/i.test(error.message)) return { error: "Confirmez d'abord votre adresse e-mail grâce au lien reçu." };
    return { error: "E-mail ou mot de passe incorrect." };
  }
  const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", data.user.id).single();
  if (profile?.status === "suspended") {
    await supabase.auth.signOut();
    return { error: "Ce compte est suspendu. Contactez le support Burkina Or." };
  }
  const staff = ["conseiller", "moderateur", "finance", "admin", "super_admin"].includes(profile?.role ?? "");
  const pro = ["bijoutier", "grossiste", "fondeur", "livreur"].includes(profile?.role ?? "");
  redirect(safeNext(str(fd, "suite"), staff ? "/admin" : pro ? "/pro" : "/compte"));
}

export async function signUp(_: FormState, fd: FormData): Promise<FormState> {
  const full_name = str(fd, "full_name", 120);
  const email = str(fd, "email").toLowerCase();
  const phone = str(fd, "phone", 40);
  const city = str(fd, "city", 80);
  const password = String(fd.get("password") ?? "");
  const kind = str(fd, "kind", 20);
  const role = ["bijoutier", "grossiste", "fondeur", "livreur"].includes(kind) ? kind : "client";
  if (full_name.length < 2) return { error: "Indiquez votre nom complet." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Adresse e-mail invalide." };
  if (password.length < 8) return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  if (fd.get("cgu") !== "on") return { error: "Veuillez accepter les conditions générales d'utilisation." };
  const next = safeNext(str(fd, "suite"), role === "client" ? "/compte" : "/pro/inscription");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, phone, city, role },
      emailRedirectTo: `${await origin()}/auth/callback?suite=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    if (/registered|exists/i.test(error.message)) return { error: "Un compte existe déjà avec cette adresse. Connectez-vous." };
    if (/rate limit/i.test(error.message)) return { error: "Trop de demandes d'inscription pour le moment. Réessayez dans quelques minutes." };
    return { error: "Inscription impossible : " + error.message };
  }
  if (data.session) redirect(next);
  return { ok: true, message: `Un e-mail de confirmation a été envoyé à ${email}. Cliquez sur le lien pour activer votre compte.` };
}

export async function requestPasswordReset(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  if (!email) return { error: "Indiquez votre adresse e-mail." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${await origin()}/auth/callback?suite=/reinitialiser` });
  // Réponse identique que le compte existe ou non (pas d'énumération).
  return { ok: true, message: "Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé." };
}

export async function updatePassword(_: FormState, fd: FormData): Promise<FormState> {
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (password.length < 8) return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  if (password !== confirm) return { error: "Les deux mots de passe ne correspondent pas." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Lien expiré ou invalide. Recommencez la procédure." };
  return { ok: true, message: "Mot de passe mis à jour." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
