import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icons";
import { Pill } from "@/components/ui";
import { PanelSkeleton } from "@/components/skeletons";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dateShort, fcfa, orderNo, since } from "@/lib/format";
import { ORDER_STATUS, ROLE_LABELS } from "@/lib/labels";
import type { Order } from "@/lib/types";

export const metadata: Metadata = { title: "Mon compte" };

export default function AccountPage() {
  return (
    <Suspense fallback={<PanelSkeleton rows={6} />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const s = await requireUser("/compte");
  const supabase = await createClient();
  const [{ data: orders }, { count: favs }, { data: notifs }, { count: unread }] = await Promise.all([
    supabase.from("orders").select("*").eq("user_id", s.userId).order("created_at", { ascending: false }).limit(5),
    supabase.from("favorites").select("*", { count: "exact", head: true }).eq("user_id", s.userId),
    supabase.from("notifications").select("*").eq("user_id", s.userId).order("created_at", { ascending: false }).limit(4),
    supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", s.userId).is("read_at", null),
  ]);
  const list = (orders ?? []) as Order[];
  const active = list.filter((o) => !["delivered", "cancelled", "refunded"].includes(o.status)).length;
  const pro = ["bijoutier", "grossiste", "fondeur", "livreur"].includes(s.profile.role);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-[13px] text-muted">{ROLE_LABELS[s.profile.role]}</div>
        <h1 className="m-0 mt-1 font-serif text-[clamp(32px,3.6vw,44px)] font-semibold">Bonjour {s.profile.full_name?.split(" ")[0]}</h1>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-4">
        {[
          ["Commandes en cours", active, "/compte/commandes"],
          ["Favoris", favs ?? 0, "/compte/favoris"],
          ["Notifications non lues", unread ?? 0, "/compte/notifications"],
        ].map(([l, v, h]) => (
          <Link key={l as string} href={h as string} className="rounded-xl border border-line bg-white p-5 text-text hover:text-text">
            <div className="text-[13px] text-muted">{l}</div>
            <div className="mt-1 font-serif text-[40px] font-semibold leading-none tnum">{v}</div>
          </Link>
        ))}
      </div>
      {pro && (
        <Link href="/pro" className="flex items-center gap-4 rounded-xl bg-ink p-5 text-ivory hover:text-ivory">
          <Icon name="store" size={22} className="text-gold-light" />
          <span className="flex-1">
            <span className="block font-semibold">Espace professionnel</span>
            <span className="block text-[13px] text-stone">Boutique, produits, commandes, documents de vérification</span>
          </span>
          <Icon name="chevron-right" size={18} className="text-gold-light" />
        </Link>
      )}
      <section className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="m-0 text-base font-semibold">Dernières commandes</h2>
          <Link href="/compte/commandes" className="text-[13px] font-semibold">
            Tout voir →
          </Link>
        </div>
        {list.length ? (
          list.map((o) => (
            <Link key={o.id} href={`/compte/commandes/${o.number}`} className="flex flex-wrap items-center gap-4 border-t border-sand px-5 py-4 text-text hover:bg-ivory hover:text-text">
              <div className="min-w-[140px] flex-1">
                <div className="font-semibold tnum">{orderNo(o.number)}</div>
                <div className="text-xs text-muted">{dateShort(o.created_at)}</div>
              </div>
              <Pill tone={ORDER_STATUS[o.status][1]} dot>
                {ORDER_STATUS[o.status][0]}
              </Pill>
              <div className="w-32 text-right font-semibold tnum">{fcfa(o.total)}</div>
            </Link>
          ))
        ) : (
          <div className="border-t border-sand px-5 py-10 text-center text-sm text-muted">
            Aucune commande pour l&apos;instant.{" "}
            <Link href="/boutique-officielle" className="font-semibold">
              Découvrir les lingotins
            </Link>
          </div>
        )}
      </section>
      <section className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="m-0 text-base font-semibold">Notifications</h2>
          <Link href="/compte/notifications" className="text-[13px] font-semibold">
            Tout voir →
          </Link>
        </div>
        {(notifs ?? []).map((n) => (
          <Link key={n.id} href={n.link ?? "/compte/notifications"} className="flex items-start gap-3 border-t border-sand px-5 py-3.5 text-text hover:bg-ivory hover:text-text">
            <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${n.read_at ? "bg-line" : "bg-gold"}`} />
            <span className="flex-1">
              <span className="block text-sm font-semibold">{n.title}</span>
              <span className="block text-[13px] text-muted">{n.body}</span>
            </span>
            <span className="text-xs text-muted">{since(n.created_at)}</span>
          </Link>
        ))}
        {!notifs?.length && <div className="border-t border-sand px-5 py-8 text-center text-sm text-muted">Aucune notification.</div>}
      </section>
    </div>
  );
}
