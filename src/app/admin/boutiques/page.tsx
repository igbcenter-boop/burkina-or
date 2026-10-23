import Link from "next/link";
import { Suspense } from "react";
import { ACard, AChips, APill, ASkeleton } from "@/components/admin-ui";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dateShort } from "@/lib/format";
import { SHOP_STATUS, SHOP_TYPES } from "@/lib/labels";
import { decideShop, setShopFeatured } from "@/lib/actions/admin";
import type { ShopStatus, ShopType } from "@/lib/types";
import { ActButton } from "../act-button";

export const metadata = { title: "Boutiques & professionnels" };

const PUBLIC: Record<ShopType, string> = { bijoutier: "/bijoutiers/", comptoir: "/grossistes/", fondeur: "/fondeurs/", livreur: "/livraison#", officielle: "/boutique-officielle#" };

export default function ShopsAdminPage({ searchParams }: PageProps<"/admin/boutiques">) {
  return (
    <Suspense fallback={<ASkeleton rows={6} />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/boutiques">["searchParams"] }) {
  await requireStaff();
  const sp = await searchParams;
  const type = (sp.type as string) ?? "tous";
  const db = createAdminClient();
  const { data } = await db.from("shops").select("*, products(count), owner:profiles!shops_owner_id_fkey(full_name,email)").order("created_at", { ascending: false });
  const all = data ?? [];
  const rows = all.filter((s) => type === "tous" || s.type === type);
  const soon = Date.now() + 30 * 86400000;
  return (
    <>
      <AChips items={[["tous", "Toutes"], ...Object.entries(SHOP_TYPES)].map(([id, label]) => ({ href: `/admin/boutiques?type=${id}`, label: `${label} · ${all.filter((s) => id === "tous" || s.type === id).length}`, on: type === id }))} />
      <ACard pad={false}>
        {rows.map((s) => {
          const [label, tone] = SHOP_STATUS[s.status as ShopStatus];
          const exp = s.authorization_expires ? new Date(s.authorization_expires).getTime() : null;
          return (
            <div key={s.id} className="flex flex-wrap items-center gap-4 border-b border-a-line2 px-[22px] py-4 text-sm">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-a-soft font-serif text-base font-bold text-a-gold">{s.mono}</span>
              <div className="min-w-[220px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {s.status === "verified" ? (
                    <Link href={PUBLIC[s.type as ShopType] + s.slug} target="_blank" className="font-semibold text-a-text hover:text-a-gold">
                      {s.name}
                    </Link>
                  ) : (
                    <span className="font-semibold">{s.name}</span>
                  )}
                  <APill tone={tone}>{label}</APill>
                  {s.featured && <APill tone="gold">À la une</APill>}
                  {exp && exp < soon && <APill tone={exp < Date.now() ? "err" : "warn"}>Autorisation {exp < Date.now() ? "expirée" : "expire"} le {dateShort(s.authorization_expires)}</APill>}
                </div>
                <div className="mt-0.5 text-xs text-a-muted">
                  {SHOP_TYPES[s.type as ShopType]} · {s.city} · {(s.products as { count: number }[])[0]?.count ?? 0} annonces · {(s.owner as { full_name: string; email: string } | null)?.email ?? "sans titulaire"}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {s.status === "verified" && s.type !== "officielle" && (
                  <>
                    <ActButton action={setShopFeatured.bind(null, s.id, !s.featured)}>{s.featured ? "Retirer de la une" : "Mettre à la une"}</ActButton>
                    <ActButton action={decideShop.bind(null, s.id, "suspend", {})} variant="danger" confirmText={`Suspendre ${s.name} ?`} success="Boutique suspendue">
                      Suspendre
                    </ActButton>
                  </>
                )}
                {s.status === "suspended" && (
                  <ActButton action={decideShop.bind(null, s.id, "reactivate", {})} variant="ok" success="Boutique réactivée">
                    Lever la suspension
                  </ActButton>
                )}
                {(s.status === "pending" || s.status === "more_info") && (
                  <Link href="/admin/kyc" className="flex h-9 items-center rounded-lg border border-a-gold px-3 text-xs font-semibold text-a-gold">
                    Examiner le dossier
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </ACard>
    </>
  );
}
