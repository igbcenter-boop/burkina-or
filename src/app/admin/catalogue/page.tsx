import Link from "next/link";
import { Suspense } from "react";
import { ACard, ACardHead, APill, ASkeleton } from "@/components/admin-ui";
import { Icon } from "@/components/icons";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGoldQuote } from "@/lib/data";
import { fcfa, n0 } from "@/lib/format";
import { priceOf } from "@/lib/pricing";
import { setProductModeration, toggleCategory } from "@/lib/actions/admin";
import type { Category, Product } from "@/lib/types";
import { ActButton } from "../act-button";
import { CategoryForm } from "./category-form";

export const metadata = { title: "Boutique officielle & catégories" };

export default function CataloguePage() {
  return (
    <Suspense fallback={<ASkeleton rows={6} />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  await requireStaff();
  const db = createAdminClient();
  const [{ data: products }, { data: cats }, quote] = await Promise.all([
    db.from("products").select("*").eq("shop_id", "a0000000-0000-4000-8000-000000000001").order("weight_g"),
    db.from("categories").select("*").order("kind").order("sort"),
    getGoldQuote(),
  ]);
  const list = (products ?? []) as Product[];
  return (
    <>
      <ACard pad={false}>
        <ACardHead
          title={`Lingotins & médailles · ${list.length}`}
          right={
            <Link href="/admin/catalogue/nouveau" className="flex h-10 items-center gap-2 rounded-lg bg-gold px-3.5 text-[13px] font-semibold text-ink hover:text-ink">
              <Icon name="plus" size={15} />
              Nouveau produit
            </Link>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="bg-a-soft text-left text-xs text-a-muted">
                <th className="py-3 pl-5 pr-3 font-medium">Produit</th>
                <th className="px-3 py-3 font-medium">Pureté</th>
                <th className="px-3 py-3 text-right font-medium">Façon</th>
                <th className="px-3 py-3 text-right font-medium">Prix public</th>
                <th className="px-3 py-3 font-medium">Stock</th>
                <th className="px-3 py-3 font-medium">Statut</th>
                <th className="py-3 pl-3 pr-5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-t border-a-line2">
                  <td className="py-3 pl-5 pr-3">
                    <Link href={`/admin/catalogue/${p.id}`} className="font-semibold text-a-text hover:text-a-gold">
                      {p.name}
                    </Link>
                    <div className="text-xs text-a-muted">
                      {p.form} · {p.serial_prefix}
                    </div>
                  </td>
                  <td className="px-3 py-3">{p.purity}</td>
                  <td className="px-3 py-3 text-right tnum">{n0(p.fabrication_fee)}</td>
                  <td className="px-3 py-3 text-right font-semibold tnum">{fcfa(priceOf(p, quote.p24).total)}</td>
                  <td className="px-3 py-3">
                    <APill tone={p.stock_status === "in" ? "ok" : p.stock_status === "low" ? "warn" : "err"}>{p.stock_status === "in" ? `${p.stock_qty ?? "—"} en stock` : p.stock_status === "low" ? `Limité · ${p.stock_qty}` : "Rupture"}</APill>
                  </td>
                  <td className="px-3 py-3">
                    <APill tone={p.status === "published" ? "ok" : "mute"}>{p.status === "published" ? "En ligne" : "Hors ligne"}</APill>
                  </td>
                  <td className="py-3 pl-3 pr-5">
                    <div className="flex gap-2">
                      <Link href={`/admin/catalogue/${p.id}`} className="flex h-9 items-center rounded-lg border border-a-line px-3 text-xs font-semibold text-a-text">
                        Modifier
                      </Link>
                      <ActButton action={setProductModeration.bind(null, p.id, p.status === "published" ? "suspended" : "published", p.featured)} success="Mis à jour">
                        {p.status === "published" ? "Retirer" : "Publier"}
                      </ActButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ACard>

      <div className="grid items-start gap-5 wide:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
        <ACard pad={false}>
          <ACardHead title="Catégories" />
          {((cats ?? []) as Category[]).map((c) => (
            <div key={c.id} className="flex items-center gap-3 border-b border-a-line2 px-[22px] py-3 text-sm">
              <span className="flex-1">
                <b>{c.name}</b> <span className="text-xs text-a-muted">· {c.slug}</span>
              </span>
              <APill tone="mute">{{ bijou: "Bijoux", lingot: "Lingotins", gros: "Gros", service: "Services" }[c.kind]}</APill>
              <ActButton action={toggleCategory.bind(null, c.id, !c.active)} variant={c.active ? "outline" : "ok"}>
                {c.active ? "Désactiver" : "Activer"}
              </ActButton>
            </div>
          ))}
        </ACard>
        <CategoryForm />
      </div>
    </>
  );
}
