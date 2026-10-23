import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/ui";
import { PanelSkeleton } from "@/components/skeletons";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dateTime } from "@/lib/format";
import { markNotificationsRead } from "@/lib/actions/account";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 font-serif text-[clamp(32px,3.6vw,44px)] font-semibold">Notifications</h1>
        <form action={markNotificationsRead}>
          <button className="btn-outline h-10 text-[13px]">Tout marquer comme lu</button>
        </form>
      </div>
      <Suspense fallback={<PanelSkeleton />}>
        <List />
      </Suspense>
    </div>
  );
}

async function List() {
  const s = await requireUser("/compte/notifications");
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("*").eq("user_id", s.userId).order("created_at", { ascending: false }).limit(100);
  if (!data?.length) return <EmptyState icon="bell" title="Aucune notification" text="Paiements, expéditions, réponses des vendeurs : vous serez prévenu ici." />;
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      {data.map((n) => (
        <Link key={n.id} href={n.link ?? "#"} className="flex items-start gap-3 border-t border-sand px-5 py-4 text-text first:border-0 hover:bg-ivory hover:text-text">
          <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${n.read_at ? "bg-line" : "bg-gold"}`} />
          <span className="flex-1">
            <span className="block text-sm font-semibold">{n.title}</span>
            <span className="block text-[13px] text-muted">{n.body}</span>
          </span>
          <span className="whitespace-nowrap text-xs text-muted">{dateTime(n.created_at)}</span>
        </Link>
      ))}
    </div>
  );
}
