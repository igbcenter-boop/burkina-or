import { Suspense } from "react";
import { ASkeleton } from "@/components/admin-ui";
import { requireStaff, isAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGoldQuote, getSettings } from "@/lib/data";
import { dec } from "@/lib/format";
import { SettingsForm } from "./form";

export const metadata = { title: "Paramètres" };

export default function SettingsPage() {
  return (
    <Suspense fallback={<ASkeleton rows={4} />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const s = await requireStaff();
  const [settings, quote] = await Promise.all([getSettings(), getGoldQuote()]);
  const db = createAdminClient();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data: items }, { data: ships }] = await Promise.all([
    db.from("order_items").select("kind,line_total,product:products(category:categories(slug)),order:orders!inner(created_at,payment_status)").gte("order.created_at", since).eq("order.payment_status", "paid"),
    db.from("shipments").select("price,order:orders!inner(created_at,payment_status)").gte("order.created_at", since).eq("order.payment_status", "paid"),
  ]);
  const vol: Record<string, number> = { lingot: 0, bijou: 0, sur_mesure: 0, gros: 0, service: 0, livraison: 0 };
  for (const i of items ?? []) {
    const slug = (i.product as unknown as { category: { slug: string } | null } | null)?.category?.slug;
    const k = i.kind === "bijou" && slug === "sur-mesure" ? "sur_mesure" : i.kind;
    vol[k] = (vol[k] ?? 0) + Number(i.line_total);
  }
  vol.livraison = (ships ?? []).reduce((a, x) => a + Number(x.price), 0);
  const M = (v: number) => (v >= 1e6 ? `${dec(v / 1e6, 1)} M` : v >= 1e3 ? `${dec(v / 1e3, 0)} k` : String(Math.round(v)));
  return (
    <SettingsForm
      canEdit={isAdmin(s.profile)}
      pricing={settings.pricing}
      commissions={settings.commissions}
      payments={settings.payments}
      locales={settings.locales}
      raw={quote.raw}
      volumes={Object.fromEntries(Object.entries(vol).map(([k, v]) => [k, M(v) + " / 30 j"]))}
      updatedAt={quote.updatedAt}
    />
  );
}
