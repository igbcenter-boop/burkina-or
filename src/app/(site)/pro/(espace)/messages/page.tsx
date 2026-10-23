import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/ui";
import { PanelSkeleton } from "@/components/skeletons";
import { requirePro } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { initials, since } from "@/lib/format";

export const metadata: Metadata = { title: "Messages clients" };

export default function SellerMessagesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="m-0 font-serif text-[clamp(32px,3.6vw,44px)] font-semibold">Messages clients</h1>
      <Suspense fallback={<PanelSkeleton />}>
        <List />
      </Suspense>
    </div>
  );
}

async function List() {
  const { shop } = await requirePro();
  const supabase = await createClient();
  const { data } = await supabase.from("conversations").select("id, subject, last_message_at, client_id, messages(body,created_at,sender_side)").eq("shop_id", shop.id).order("last_message_at", { ascending: false });
  const convs = (data ?? []) as { id: string; subject: string | null; last_message_at: string; client_id: string; messages: { body: string; created_at: string; sender_side: string }[] }[];
  if (!convs.length) return <EmptyState icon="chat" title="Aucun message" text="Les questions des acheteurs sur vos produits arrivent ici." />;
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      {convs.map((c) => {
        const last = [...c.messages].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
        const waiting = last?.sender_side === "client";
        return (
          <Link key={c.id} href={`/pro/messages/${c.id}`} className="flex items-center gap-4 border-t border-sand px-5 py-4 text-text first:border-0 hover:bg-ivory hover:text-text">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-sand text-sm font-semibold text-gold-dark">{initials(c.subject ?? "Client")}</span>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-3">
                <span className="font-semibold">{c.subject ?? "Question client"}</span>
                <span className="text-xs text-muted">{since(c.last_message_at)}</span>
              </div>
              <div className="truncate text-[13px] text-muted">{last?.body}</div>
            </div>
            {waiting && <span className="h-2.5 w-2.5 flex-none rounded-full bg-gold" title="En attente de réponse" />}
          </Link>
        );
      })}
    </div>
  );
}
