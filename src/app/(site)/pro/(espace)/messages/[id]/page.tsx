import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Composer, Thread } from "@/components/thread";
import { PanelSkeleton } from "@/components/skeletons";
import { requirePro } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendMessage } from "@/lib/actions/account";

export const metadata: Metadata = { title: "Conversation client" };

export default function SellerConversationPage({ params }: PageProps<"/pro/messages/[id]">) {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/pro/messages/[id]">["params"] }) {
  const { id } = await params;
  const { shop } = await requirePro();
  const supabase = await createClient();
  const { data: conv } = await supabase.from("conversations").select("id, subject, shop_id").eq("id", id).eq("shop_id", shop.id).maybeSingle();
  if (!conv) notFound();
  const { data: msgs } = await supabase.from("messages").select("*").eq("conversation_id", id).order("created_at");
  return (
    <div className="flex flex-col gap-4">
      <Link href="/pro/messages" className="text-sm font-semibold">
        ← Messages clients
      </Link>
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="border-b border-line px-5 py-4">
          <div className="font-semibold">{conv.subject ?? "Question client"}</div>
          <div className="text-xs text-muted">Répondez sous 24 h : la réactivité est prise en compte dans votre note vendeur.</div>
        </div>
        <Thread mine="seller" messages={(msgs ?? []).map((m) => ({ id: m.id, body: m.body, side: m.sender_side, created_at: m.created_at, author: m.sender_side === "seller" ? "Vous" : m.sender_side === "staff" ? "Burkina Or" : "Client" }))} />
        <Composer action={sendMessage} hidden={{ conversation_id: id, side: "seller" }} />
      </div>
    </div>
  );
}
