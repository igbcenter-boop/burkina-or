import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STAFF_ROLES } from "@/lib/labels";

const csv = (rows: (string | number | null | undefined)[][]) =>
  "﻿" + rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");

/** Exports CSV du back-office (séparateur « ; », compatible Excel FR). */
export async function GET(request: NextRequest, ctx: RouteContext<"/admin/export/[type]">) {
  const { type } = await ctx.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Non authentifié", { status: 401 });
  const { data: p } = await supabase.from("profiles").select("role,status").eq("id", auth.user.id).single();
  if (!p || p.status !== "active" || !STAFF_ROLES.includes(p.role)) return new Response("Accès refusé", { status: 403 });

  const db = createAdminClient();
  const since = request.nextUrl.searchParams.get("depuis");
  let body = "";
  if (type === "commandes") {
    let q = db.from("orders").select("number,created_at,customer_name,customer_email,status,payment_method,payment_status,payment_ref,subtotal,delivery_total,total,city,order_items(name,qty,line_total,commission_amount,shop:shops(name))").order("created_at", { ascending: false });
    if (since) q = q.gte("created_at", since);
    const { data } = await q;
    body = csv([
      ["Commande", "Date", "Client", "E-mail", "Statut", "Paiement", "Statut paiement", "Réf. transaction", "Sous-total", "Livraison", "Total", "Ville", "Vendeurs", "Commissions"],
      ...(data ?? []).map((o) => {
        const items = (o.order_items ?? []) as unknown as { line_total: number; commission_amount: number; shop: { name: string } | null }[];
        return [o.number, o.created_at, o.customer_name, o.customer_email, o.status, o.payment_method, o.payment_status, o.payment_ref, o.subtotal, o.delivery_total, o.total, o.city, [...new Set(items.map((i) => i.shop?.name))].join(" / "), items.reduce((s, i) => s + Number(i.commission_amount), 0)];
      }),
    ]);
  } else if (type === "audit") {
    const { data } = await db.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(5000);
    body = csv([["Horodatage", "Acteur", "Rôle", "Action", "Cible", "IP", "Sensible"], ...(data ?? []).map((a) => [a.created_at, a.actor_name, a.actor_role, a.action, a.target, a.ip, a.sensitive ? "oui" : "non"])]);
  } else if (type === "utilisateurs") {
    const { data } = await db.from("profiles").select("full_name,email,phone,city,role,status,created_at").order("created_at", { ascending: false });
    body = csv([["Nom", "E-mail", "Téléphone", "Ville", "Rôle", "Statut", "Inscription"], ...(data ?? []).map((u) => [u.full_name, u.email, u.phone, u.city, u.role, u.status, u.created_at])]);
  } else {
    return new Response("Export inconnu", { status: 404 });
  }
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="burkina-or-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
