import Link from "next/link";
import { Suspense } from "react";
import { ACard, APill, ASkeleton } from "@/components/admin-ui";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dateShort, fcfa } from "@/lib/format";
import { ReportActions, VerifActions, ProductModeration, NewReportForm } from "./actions";

export const metadata = { title: "Modération" };

export default function ModerationPage({ searchParams }: PageProps<"/admin/moderation">) {
  return (
    <Suspense fallback={<ASkeleton rows={4} />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/moderation">["searchParams"] }) {
  await requireStaff();
  const sp = await searchParams;
  const tab = (sp.onglet as string) ?? "verif";
  const db = createAdminClient();
  const [{ data: verifs }, { data: reports }, { data: products }, { data: allProducts }] = await Promise.all([
    db.from("verification_requests").select("*, product:products(name,slug,kind,images,shop:shops(name))").order("created_at", { ascending: false }),
    db.from("product_reports").select("*, product:products(id,name,slug,kind,status,shop:shops(name))").order("created_at", { ascending: false }),
    tab === "produits" ? db.from("products").select("id,name,slug,kind,status,featured,fixed_price,pricing_mode,purity,weight_verified,purity_verified,shop:shops(name,type)").order("updated_at", { ascending: false }).limit(200) : Promise.resolve({ data: [] }),
    tab === "verif" ? db.from("products").select("id,name,shop:shops(name)").neq("kind", "service").order("name") : Promise.resolve({ data: [] }),
  ]);
  const pendingV = (verifs ?? []).filter((v) => v.status === "pending").length;
  // Signalements regroupés par produit
  const byProduct = new Map<string, { product: { id: string; name: string; slug: string; kind: string; status: string; shop: { name: string } }; reasons: string[]; count: number; open: boolean; status: string; last: string }>();
  for (const r of reports ?? []) {
    const p = r.product as { id: string; name: string; slug: string; kind: string; status: string; shop: { name: string } };
    if (!p) continue;
    const g = byProduct.get(p.id) ?? { product: p, reasons: [] as string[], count: 0, open: false, status: r.status as string, last: r.created_at as string };
    g.count++;
    if (!g.reasons.includes(r.reason)) g.reasons.push(r.reason);
    if (r.status === "open") g.open = true;
    else g.status = r.status;
    byProduct.set(p.id, g);
  }
  const signals = [...byProduct.values()].sort((a, b) => Number(b.open) - Number(a.open));
  const openSig = signals.filter((s) => s.open).length;
  const TABS: [string, string][] = [
    ["verif", `Caractéristiques à vérifier (${pendingV})`],
    ["sig", `Signalements (${openSig})`],
    ["produits", "Toutes les annonces"],
  ];
  const href = (p: { kind: string; slug: string }) => (p.kind === "lingot" ? `/boutique-officielle/${p.slug}` : p.kind === "bijou" ? `/bijoux/${p.slug}` : p.kind === "service" ? `/fondeurs/services/${p.slug}` : `/grossistes/offres/${p.slug}`);

  return (
    <>
      <div className="flex gap-1 overflow-x-auto border-b border-a-line">
        {TABS.map(([id, label]) => (
          <Link
            key={id}
            href={`/admin/moderation?onglet=${id}`}
            scroll={false}
            className="-mb-px flex h-12 flex-none items-center whitespace-nowrap border-b-2 px-3.5 text-sm"
            style={{ fontWeight: tab === id ? 600 : 500, color: tab === id ? "var(--a-text)" : "var(--a-muted)", borderBottomColor: tab === id ? "#B8923A" : "transparent" }}
          >
            {label}
          </Link>
        ))}
      </div>

      {tab === "verif" && (
        <>
          <p className="m-0 max-w-[760px] text-sm leading-relaxed text-a-muted">
            Une caractéristique passe de « Déclaré par le vendeur » à « Vérifié par Burkina Or » uniquement sur la base d&apos;un rapport d&apos;analyse d&apos;un laboratoire agréé, avec un écart inférieur à la tolérance (± 2 ‰ pour la pureté, ± 0,05 g pour le poids).
          </p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,360px),1fr))] gap-4">
            {(verifs ?? []).map((v) => {
              const p = v.product as { name: string; slug: string; kind: string; images: string[]; shop: { name: string } };
              const vf = v.status === "verified", susp = v.status === "suspended", mismatch = !v.within_tolerance;
              return (
                <article key={v.id} className="flex flex-col gap-4 rounded-xl border border-a-line bg-a-card p-5">
                  <div className="flex gap-3.5">
                    <div className="h-16 w-16 flex-none rounded-[10px]" style={{ background: "var(--a-soft) repeating-linear-gradient(45deg,rgba(140,106,31,.08) 0 8px,transparent 8px 16px)" }} />
                    <div className="min-w-0">
                      <Link href={href(p)} target="_blank" className="font-serif text-[21px] font-semibold leading-tight text-a-text hover:text-a-gold">
                        {p.name}
                      </Link>
                      <div className="mt-[3px] text-[13px] text-a-muted">{p.shop.name}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)] items-center gap-2.5 rounded-[10px] bg-a-soft p-3.5">
                    <div>
                      <div className="text-[11px] uppercase tracking-[.1em] text-a-muted">{v.field} déclaré</div>
                      <div className="mt-1 text-base font-semibold tnum">{v.declared}</div>
                    </div>
                    <span className="text-a-muted">→</span>
                    <div>
                      <div className="text-[11px] uppercase tracking-[.1em] text-a-muted">Mesuré</div>
                      <div className="mt-1 text-base font-semibold tnum" style={{ color: mismatch ? "var(--p-err)" : "var(--a-text)" }}>
                        {v.measured}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2.5 text-xs text-a-muted">
                    <span>
                      Rapport <b className="font-mono font-normal text-a-text">{v.report_number}</b>
                    </span>
                    <span>{v.lab}</span>
                  </div>
                  <APill tone={vf ? "ok" : susp ? "err" : "mute"} className="h-7 self-start font-semibold">
                    {vf ? "Vérifié par Burkina Or" : susp ? "Annonce suspendue" : "Déclaré par le vendeur"}
                  </APill>
                  {mismatch && v.status === "pending" && (
                    <div className="rounded-[10px] bg-p-err-bg px-3.5 py-3 text-[13px] leading-normal text-p-err">Écart de {v.gap} hors tolérance. La vérification est impossible : le vendeur doit corriger l&apos;annonce.</div>
                  )}
                  {v.status === "pending" ? (
                    <VerifActions id={v.id} canVerify={!mismatch} />
                  ) : (
                    <div className="text-xs text-a-muted">
                      {vf ? `Vérifié le ${dateShort(v.handled_at)} · rapport ${v.report_number} rattaché` : `Vendeur notifié le ${dateShort(v.handled_at)} · correction demandée sous 72 h`}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          <NewReportForm products={(allProducts ?? []).map((p) => ({ id: p.id, name: p.name, shop: (p.shop as unknown as { name: string })?.name ?? "" }))} />
        </>
      )}

      {tab === "sig" && (
        <ACard pad={false}>
          {signals.map((s) => (
            <div key={s.product.id} className="flex flex-wrap items-center gap-4 border-b border-a-line2 px-[22px] py-[18px]">
              <div className="min-w-0 flex-[1_1_280px]">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Link href={href(s.product)} target="_blank" className="text-[15px] font-semibold text-a-text hover:text-a-gold">
                    {s.product.name}
                  </Link>
                  <APill tone="err" className="h-[22px] font-semibold">
                    {s.count} signalement{s.count > 1 ? "s" : ""}
                  </APill>
                </div>
                <div className="mt-[3px] text-[13px] text-a-muted">{s.product.shop.name}</div>
                <div className="mt-2 text-sm leading-normal">{s.reasons.join(" · ")}</div>
              </div>
              {s.open ? (
                <ReportActions productId={s.product.id} />
              ) : (
                <APill tone={s.status === "removed" ? "err" : s.status === "asked" ? "warn" : "mute"} className="h-[30px] font-semibold">
                  {s.status === "removed" ? "Produit retiré" : s.status === "asked" ? "Justificatif demandé" : "Classé sans suite"}
                </APill>
              )}
            </div>
          ))}
          {!signals.length && <div className="px-6 py-12 text-center text-sm text-a-muted">Aucun signalement.</div>}
        </ACard>
      )}

      {tab === "produits" && (
        <ACard pad={false}>
          {(products ?? []).map((p) => {
            const shop = p.shop as unknown as { name: string; type: string };
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-4 border-b border-a-line2 px-[22px] py-3.5 text-sm">
                <div className="min-w-[220px] flex-1">
                  <Link href={href(p)} target="_blank" className="font-semibold text-a-text hover:text-a-gold">
                    {p.name}
                  </Link>
                  <div className="text-xs text-a-muted">
                    {shop?.name} · {p.purity ?? "—"} · {p.pricing_mode === "fixed" ? fcfa(p.fixed_price) : p.pricing_mode === "indexed" ? "indexé" : "sur devis"}
                    {(p.weight_verified || p.purity_verified) && " · vérifié"}
                  </div>
                </div>
                <APill tone={p.status === "published" ? "ok" : p.status === "draft" ? "mute" : "err"}>{{ published: "En ligne", draft: "Brouillon", pending: "En attente", suspended: "Suspendu", removed: "Retiré" }[p.status as string]}</APill>
                <ProductModeration id={p.id} status={p.status} featured={p.featured} />
              </div>
            );
          })}
        </ACard>
      )}
    </>
  );
}
