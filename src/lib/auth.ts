import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { ADMIN_ROLES, STAFF_ROLES } from "./labels";
import type { Profile, Shop } from "./types";

export type Session = { userId: string; email: string | null; profile: Profile };

/** Lecture de la session (par requête). À appeler sous une frontière <Suspense>. */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) return null;
  return { userId: user.id, email: user.email ?? null, profile: profile as Profile };
});

export async function requireUser(next = "/compte"): Promise<Session> {
  const s = await getSession();
  if (!s) redirect(`/connexion?suite=${encodeURIComponent(next)}`);
  if (s.profile.status === "suspended") redirect("/connexion?erreur=suspendu");
  return s;
}

export async function requireStaff(): Promise<Session> {
  const s = await requireUser("/admin");
  if (!STAFF_ROLES.includes(s.profile.role)) redirect("/compte");
  return s;
}

export async function requireAdmin(): Promise<Session> {
  const s = await requireStaff();
  if (!ADMIN_ROLES.includes(s.profile.role)) redirect("/admin");
  return s;
}

export const getMyShops = cache(async (): Promise<Shop[]> => {
  const s = await getSession();
  if (!s) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("shops").select("*").eq("owner_id", s.userId).order("created_at");
  return (data ?? []) as Shop[];
});

/** Espace professionnel : l'utilisateur doit posséder au moins une structure. */
export async function requirePro(): Promise<Session & { shops: Shop[]; shop: Shop }> {
  const s = await requireUser("/pro");
  const shops = await getMyShops();
  if (!shops.length) redirect("/pro/inscription");
  return { ...s, shops, shop: shops[0] };
}

export function isStaff(p: Profile | null | undefined) {
  return !!p && STAFF_ROLES.includes(p.role);
}
export function isAdmin(p: Profile | null | undefined) {
  return !!p && ADMIN_ROLES.includes(p.role);
}
