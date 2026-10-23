import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Mono } from "@/components/ui";
import { Composer, Thread } from "@/components/thread";
import { PanelSkeleton } from "@/components/skeletons";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendMessage } from "@/lib/actions/account";

export const metadata: Metadata = { title: "Conversation" };

export default function ConversationPage({ params }: PageProps<"/compte/messages/[id]">) {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/compte/messages/[id]">["params"] }) {
  const { id } = await params;
  const s = await requireUser(`/compte/messages/${id}`);
  const supabase = await createClient();
  const { data: conv } = await supabase.from("conversations").select("id, subject, client_id, shop:shops(name,mono,slug,type,city)").eq("id", id).maybeSingle();
  if (!conv || conv.client_id !== s.userId) notFound();
  const shop = conv.shop as unknown as { name: string; mono: string | null; slug: string; type: string; city: string | null };
  const { data: msgs } = await supabase.from("messages").select("*").eq("conversation_id", id).order("created_at");
  const base = shop.type === "bijoutier" ? "/bijoutiers/" : shop.type === "comptoir" ? "/grossistes/" : shop.type === "fondeur" ? "/fondeurs/" : "/";
  return (
    <div className="flex flex-col gap-4">
      <Link href="/compte/messages" className="text-sm font-semibold">
        ← Messages
      </Link>
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <Mono text={shop.mono} className="h-11 w-11 rounded-lg bg-sand" />
          <div className="flex-1">
            <Link href={base + shop.slug} className="font-semibold text-text">
              {shop.name}
            </Link>
            <div className="text-xs text-muted">
              {shop.city}
              {conv.subject ? ` · ${conv.subject}` : ""}
            </div>
          </div>
        </div>
        <Thread mine="client" messages={(msgs ?? []).map((m) => ({ id: m.id, body: m.body, side: m.sender_side, created_at: m.created_at, author: m.sender_side === "client" ? "Vous" : m.sender_side === "staff" ? "Burkina Or" : shop.name }))} />
        <Composer action={sendMessage} hidden={{ conversation_id: id, side: "client" }} />
      </div>
    </div>
  );
}
