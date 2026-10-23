import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, Mono } from "@/components/ui";
import { PanelSkeleton } from "@/components/skeletons";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { since } from "@/lib/format";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="m-0 font-serif text-[clamp(32px,3.6vw,44px)] font-semibold">Messages</h1>
      <Suspense fallback={<PanelSkeleton />}>
        <List />
      </Suspense>
    </div>
  );
}

async function List() {
  const s = await requireUser("/compte/messages");
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select("id, subject, last_message_at, shop:shops(name,mono,city), messages(body,created_at,sender_side)")
    .eq("client_id", s.userId)
    .order("last_message_at", { ascending: false });
  const convs = (data ?? []) as unknown as { id: string; subject: string | null; last_message_at: string; shop: { name: string; mono: string | null; city: string | null }; messages: { body: string; created_at: string; sender_side: string }[] }[];
  if (!convs.length) return <EmptyState icon="chat" title="Aucune conversation" text="Contactez un bijoutier ou un comptoir depuis sa page : vos échanges apparaîtront ici." />;
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      {convs.map((c) => {
        const last = [...c.messages].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
        return (
          <Link key={c.id} href={`/compte/messages/${c.id}`} className="flex items-center gap-4 border-t border-sand px-5 py-4 text-text first:border-0 hover:bg-ivory hover:text-text">
            <Mono text={c.shop.mono} className="h-11 w-11 flex-none rounded-lg bg-sand" />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-3">
                <span className="font-semibold">{c.shop.name}</span>
                <span className="text-xs text-muted">{since(c.last_message_at)}</span>
              </div>
              <div className="truncate text-[13px] text-muted">
                {c.subject ? `${c.subject} · ` : ""}
                {last ? (last.sender_side === "client" ? "Vous : " : "") + last.body : ""}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
