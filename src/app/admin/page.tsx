import Link from "next/link";
import { Suspense } from "react";
import { ACard, ACardHead, APill, ASkeleton } from "@/components/admin-ui";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGoldQuote } from "@/lib/data";
import { dateCompact, dec, fcfa, n0, orderNo } from "@/lib/format";
import { ORDER_STATUS, type Tone } from "@/lib/labels";
import { ExportButton } from "./export-button";

const PERIODS: [string, string, number][] = [
  ["jour", "Aujourd'hui", 1],
  ["7j", "7 jours", 7],
  ["30j", "30 jours", 30],
  ["12m", "12 mois", 365],
];

export default function AdminDashboard({ searchParams }: PageProps<"/admin">) {
  return (
    <Suspense fallback={<ASkeleton rows={6} />}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  await requireStaff();
  const sp = await searchParams;
  const period = PERIODS.find((p) => p[0] === sp.periode) ?? PERIODS[2];
  const days = period[2];
  const db = createAdminClient();
  const now = Date.now();
  const from = new Date(now - days * 86400000).toISOString();
  const prevFrom = new Date(now - 2 * days * 86400000).toISOString();
  const d30 = new Date(now - 30 * 86400000).toISOString();

  const [ordersRes, itemsRes, shopsRes, newShopsRes, quotesRes, shipsRes, complaintsRes, kycRes, verifRes, recentRes, quote, expRes, verifiedShopsRes] = await Promise.all([
    db.from("orders").select("id,total,created_at,payment_status,status").gte("created_at", prevFrom),
    db.from("order_items").select("kind,line_total,commission_amount,order:orders!inner(created_at,payment_status)").gte("order.created_at", from).eq("order.payment_status", "paid"),
    db.from("shops").select("*", { count: "exact", head: true }).eq("status", "verified"),
    db.from("shops").select("*", { count: "exact", head: true }).eq("status", "verified").gte("verified_at", d30),
    db.from("quote_requests").select("status"),
    db.from("shipments").select("status"),
    db.from("complaints").select("status,created_at"),
    db.from("shops").select("id,name,submitted_at,status").in("status", ["pending", "more_info"]).order("submitted_at"),
    db.from("verification_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
    db.from("orders").select("id,number,customer_name,total,status,created_at,order_items(shop:shops(name))").order("created_at", { ascending: false }).limit(5),
    getGoldQuote(),
    db.from("shops").select("name,authorization_expires").not("authorization_expires", "is", null).lte("authorization_expires", new Date(now + 30 * 86400000).toISOString().slice(0, 10)).eq("status", "verified"),
    db.from("shops").select("submitted_at,verified_at").not("verified_at", "is", null).gte("verified_at", new Date(now - 180 * 86400000).toISOString()),
  ]);

  const orders = ordersRes.data ?? [];
  const paid = orders.filter((o) => o.payment_status === "paid" && !["refunded", "cancelled"].includes(o.status));
  const cur = paid.filter((o) => o.created_at >= from);
  const prev = paid.filter((o) => o.created_at < from);
  const sum = (l: { total: number }[]) => l.reduce((s, o) => s + Number(o.total), 0);
  const delta = (a: number, b: number): [string, Tone] => (b ? [((a - b) / b) * 100 >= 0 ? `▲ ${dec(((a - b) / b) * 100, 1)} %` : `▼ ${dec(Math.abs(((a - b) / b) * 100), 1)} %`, a >= b ? "ok" : "err"] : a ? ["▲ nouveau", "ok"] : ["—", "mute"]);
  const items = itemsRes.data ?? [];
  const commissions = items.reduce((s, i) => s + Number(i.commission_amount), 0);
  const quotesOpen = (quotesRes.data ?? []).filter((q) => ["new", "answered", "negotiating"].includes(q.status)).length;
  const ships = shipsRes.data ?? [];
  const inTransit = ships.filter((s) => ["assigned", "accepted", "preparing", "collected", "shipped", "at_hub"].includes(s.status)).length;
  const incidents = ships.filter((s) => s.status === "incident").length;
  const complaints = (complaintsRes.data ?? []).filter((c) => ["open", "assigned", "in_progress"].includes(c.status));
  const late72 = complaints.filter((c) => now - new Date(c.created_at).getTime() > 72 * 3600000).length;
  const kyc = kycRes.data ?? [];
  const kycLate = kyc.filter((s) => now - new Date(s.submitted_at).getTime() > 48 * 3600000);
  const verified = verifiedShopsRes.data ?? [];
  const avgKyc = verified.length ? Math.round(verified.reduce((s, x) => s + (new Date(x.verified_at!).getTime() - new Date(x.submitted_at).getTime()), 0) / verified.length / 3600000) : 0;
  const incidentRate = ships.length ? (incidents / ships.length) * 100 : 0;

  // Histogramme : ventes payées des 30 derniers jours
  const bars = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now - (29 - i) * 86400000);
    const key = d.toISOString().slice(0, 10);
    const v = paid.filter((o) => o.created_at.slice(0, 10) === key).reduce((s, o) => s + Number(o.total), 0);
    return { key, v, label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) };
  });
  const maxBar = Math.max(1, ...bars.map((b) => b.v));
  const peak = bars.reduce((a, b) => (b.v > a.v ? b : a), bars[0]);
  const M = (v: number) => (v >= 1e6 ? `${dec(v / 1e6, 1)} M FCFA` : fcfa(v));

  const SPACES: [string, string, string][] = [
    ["lingot", "Boutique officielle", "#B8923A"],
    ["bijou", "Bijoux", "var(--a-gold)"],
    ["gros", "Gros & comptoirs", "#2B4C7E"],
    ["service", "Services", "#1E6B4A"],
  ];
  const totalItems = items.reduce((s, i) => s + Number(i.line_total), 0) || 1;
  const split = SPACES.map(([k, label, color]) => {
    const v = items.filter((i) => i.kind === k).reduce((s, i) => s + Number(i.line_total), 0);
    return { label, color, v, pct: Math.round((v / totalItems) * 100) };
  });

  const kpis: [string, string, string, Tone, string][] = [
    ["Ventes", M(sum(cur)), ...delta(sum(cur), sum(prev)), "vs période préc."],
    ["Commandes", n0(cur.length), ...delta(cur.length, prev.length), "vs période préc."],
    ["Commissions", M(commissions), commissions ? "nettes" : "—", "ok", "prélevées vendeurs"],
    ["Boutiques actives", n0(shopsRes.count ?? 0), `+ ${newShopsRes.count ?? 0}`, "ok", "ce mois"],
    ["Devis en cours", n0(quotesOpen), "espace pro", "info", "à suivre"],
    ["Livraisons en cours", n0(inTransit), `${incidents} incident${incidents > 1 ? "s" : ""}`, incidents ? "warn" : "ok", "en temps réel"],
    ["Réclamations ouvertes", n0(complaints.length), `${late72} > 72 h`, late72 ? "err" : "ok", "à traiter"],
  ];

  const alerts: [Tone, string, string, string, string][] = [];
  if (kycLate.length) alerts.push(["err", `${kycLate.length} dossier${kycLate.length > 1 ? "s" : ""} KYC hors délai (> 48 h)`, kycLate.slice(0, 2).map((s) => s.name).join(", "), "/admin/kyc", "Traiter"]);
  if (incidents) alerts.push(["err", `${incidents} incident${incidents > 1 ? "s" : ""} de livraison`, "Colis bloqués ou endommagés à traiter", "/admin/livraisons?filtre=incident", "Ouvrir"]);
  for (const s of expRes.data ?? []) alerts.push(["warn", `Autorisation expirant le ${new Date(s.authorization_expires!).toLocaleDateString("fr-FR")}`, s.name, "/admin/boutiques", "Relancer"]);
  if (verifRes.count) alerts.push(["warn", `${verifRes.count} caractéristique${verifRes.count > 1 ? "s" : ""} à vérifier`, "Rapports de laboratoire reçus", "/admin/moderation", "Vérifier"]);
  if (Math.abs(quote.changePct) > 1) alerts.push(["info", `Variation du cours de ${dec(quote.changePct)} % sur 24 h`, "Catalogue officiel réindexé automatiquement", "/admin/parametres", "Voir"]);
  if (late72) alerts.push(["err", `${late72} réclamation${late72 > 1 ? "s" : ""} ouverte${late72 > 1 ? "s" : ""} depuis plus de 72 h`, "Délai de traitement dépassé", "/admin/reclamations", "Traiter"]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-[10px] border border-a-line bg-a-soft p-1">
          {PERIODS.map(([id, label]) => {
            const on = id === period[0];
            return (
              <Link
                key={id}
                href={`/admin?periode=${id}`}
                scroll={false}
                className={`flex h-9 items-center whitespace-nowrap rounded-[7px] px-3.5 text-[13px] font-medium ${on ? "bg-a-card text-a-text shadow-[0_1px_3px_rgba(0,0,0,.12)] hover:text-a-text" : "text-a-muted hover:text-a-text"}`}
              >
                {label}
              </Link>
            );
          })}
        </div>
        <ExportButton what={`Tableau de bord · ${period[1]}`} href={`/admin/export/commandes?depuis=${from.slice(0, 10)}`} label="Exporter le rapport" />
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] gap-3.5">
        {kpis.map(([label, value, d, tone, sub]) => (
          <div key={label} className="flex flex-col gap-2 rounded-xl border border-a-line bg-a-card p-[18px]">
            <div className="text-[13px] text-a-muted">{label}</div>
            <div className="whitespace-nowrap text-[26px] font-semibold tracking-[-.01em] tnum">{value}</div>
            <div className="flex items-center gap-2 text-xs">
              <APill tone={tone} className="h-[22px] rounded-md px-[7px] font-semibold">
                {d}
              </APill>
              <span className="text-a-muted">{sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-5 wide:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <ACard>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="m-0 text-base font-semibold">Volume des ventes · 30 derniers jours</h2>
              <span className="text-[13px] text-a-muted">{peak.v ? `Pic le ${peak.label} · ${M(peak.v)}` : "Aucune vente encaissée"}</span>
            </div>
            <div className="relative mt-[22px] flex h-[220px] items-end gap-1 border-b border-a-line">
              {[25, 50, 75].map((t) => (
                <div key={t} className="absolute left-0 right-0 border-t border-dashed border-a-line2" style={{ top: `${t}%` }} />
              ))}
              {bars.map((b, i) => (
                <div
                  key={b.key}
                  title={`${b.label} · ${M(b.v)}`}
                  className="relative flex-1 rounded-t-[3px]"
                  style={{ height: `${Math.max(2, Math.round((b.v / maxBar) * 100))}%`, background: i === 29 ? "#B8923A" : "var(--a-bar)" }}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-a-muted tnum">
              {[0, 7, 14, 21, 29].map((i) => (
                <span key={i}>{bars[i].label}</span>
              ))}
            </div>
            <div className="my-[18px] h-px bg-a-line2" />
            <div className="mb-3 text-[13px] font-semibold">Répartition par espace · {period[1]}</div>
            <div className="flex h-3 gap-0.5 overflow-hidden rounded-md">
              {split.map((s) => (
                <div key={s.label} style={{ width: `${s.pct}%`, background: s.color }} />
              ))}
            </div>
            <div className="mt-3.5 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
              {split.map((s) => (
                <div key={s.label} className="flex items-start gap-2.5">
                  <span className="mt-1 h-2.5 w-2.5 flex-none rounded-[3px]" style={{ background: s.color }} />
                  <div>
                    <div className="text-[13px]">{s.label}</div>
                    <div className="text-[13px] font-semibold tnum">
                      {s.pct} % · {M(s.v)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ACard>

          <ACard pad={false}>
            <ACardHead
              title="Dernières transactions"
              right={
                <Link href="/admin/commandes" className="text-[13px] font-semibold text-a-gold">
                  Tout voir →
                </Link>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="bg-a-soft text-left text-xs text-a-muted">
                    <th className="py-2.5 pl-[22px] pr-3 font-medium">Commande</th>
                    <th className="px-3 py-2.5 font-medium">Client</th>
                    <th className="px-3 py-2.5 font-medium">Vendeur</th>
                    <th className="px-3 py-2.5 text-right font-medium">Montant</th>
                    <th className="py-2.5 pl-3 pr-[22px] font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {(recentRes.data ?? []).map((o) => {
                    const shops = [...new Set(((o.order_items ?? []) as unknown as { shop: { name: string } | null }[]).map((i) => i.shop?.name).filter(Boolean))].join(", ");
                    const [label, tone] = ORDER_STATUS[o.status as keyof typeof ORDER_STATUS];
                    return (
                      <tr key={o.id} className="border-t border-a-line2">
                        <td className="whitespace-nowrap py-[13px] pl-[22px] pr-3 font-medium tnum">
                          <Link href={`/admin/commandes?commande=${o.id}`} className="text-a-text hover:text-a-gold">
                            {orderNo(o.number)}
                          </Link>
                        </td>
                        <td className="px-3 py-[13px]">{o.customer_name}</td>
                        <td className="px-3 py-[13px] text-a-muted">{shops}</td>
                        <td className="whitespace-nowrap px-3 py-[13px] text-right font-semibold tnum">{fcfa(o.total)}</td>
                        <td className="py-[13px] pl-3 pr-[22px]">
                          <APill tone={tone} dot>
                            {label}
                          </APill>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ACard>
        </div>

        <ACard pad={false}>
          <ACardHead title="Alertes" right={<span className="text-xs text-a-muted">{alerts.length} actives</span>} />
          {alerts.map(([tone, title, sub, href, cta]) => (
            <div key={title} className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-3.5 border-b border-a-line2 px-[22px] py-4">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: `var(--p-${tone})` }} />
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-snug">{title}</div>
                <div className="mt-[3px] text-xs leading-snug text-a-muted">{sub}</div>
              </div>
              <Link href={href} className="flex h-9 items-center rounded-lg border border-a-line px-3 text-xs font-semibold text-a-text hover:text-a-gold">
                {cta}
              </Link>
            </div>
          ))}
          {!alerts.length && <div className="px-[22px] py-8 text-center text-sm text-a-muted">Aucune alerte active.</div>}
          <div className="grid grid-cols-2 gap-3.5 px-[22px] py-[18px]">
            <div>
              <div className="text-xs text-a-muted">Délai moyen KYC</div>
              <div className="mt-1 text-xl font-semibold">{avgKyc ? `${avgKyc} h` : "—"}</div>
            </div>
            <div>
              <div className="text-xs text-a-muted">Taux d&apos;incident livraison</div>
              <div className="mt-1 text-xl font-semibold">{dec(incidentRate, 1)} %</div>
            </div>
          </div>
          <div className="border-t border-a-line2 px-[22px] py-3 text-xs text-a-muted">Dernière commande {recentRes.data?.[0] ? dateCompact(recentRes.data[0].created_at) : "—"}</div>
        </ACard>
      </div>
    </>
  );
}
