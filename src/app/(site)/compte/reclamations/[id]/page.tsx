import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Pill } from "@/components/ui";
import { Composer, Thread } from "@/components/thread";
import { PanelSkeleton } from "@/components/skeletons";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dateShort, dateTime } from "@/lib/format";
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUS } from "@/lib/labels";
import { addComplaintMessage } from "@/lib/actions/account";

export const metadata: Metadata = { title: "Réclamation" };

export default function ComplaintPage({ params }: PageProps<"/compte/reclamations/[id]">) {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/compte/reclamations/[id]">["params"] }) {
  const { id } = await params;
  const s = await requireUser(`/compte/reclamations/${id}`);
  const supabase = await createClient();
  const { data: c } = await supabase.from("complaints").select("*, order:orders(number)").eq("id", id).maybeSingle();
  if (!c || c.user_id !== s.userId) notFound();
  const { data: msgs } = await supabase.from("complaint_messages").select("*").eq("complaint_id", id).order("created_at");
  const closed = ["resolved", "closed"].includes(c.status);
  return (
    <div className="flex flex-col gap-4">
      <Link href="/compte/reclamations" className="text-sm font-semibold">
        ← Réclamations
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[13px] text-muted">
            {c.number} · {COMPLAINT_CATEGORIES[c.category] ?? c.category}
            {(c.order as { number: string } | null)?.number ? ` · commande ${(c.order as { number: string }).number}` : ""} · ouverte le {dateShort(c.created_at)}
          </div>
          <h1 className="m-0 mt-1 font-serif text-[clamp(30px,3.4vw,42px)] font-semibold">{c.subject}</h1>
        </div>
        <Pill tone={COMPLAINT_STATUS[c.status][1]} className="h-8 px-3.5 text-[13px]">
          {COMPLAINT_STATUS[c.status][0]}
        </Pill>
      </div>
      {c.resolution && (
        <div className="rounded-xl bg-ok-bg px-5 py-4 text-sm text-ok">
          <b>Solution apportée{c.resolved_at ? ` le ${dateTime(c.resolved_at)}` : ""} · </b>
          {c.resolution}
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <Thread
          mine="client"
          messages={[
            { id: "desc", body: c.description, side: "client", created_at: c.created_at, author: "Vous" },
            ...(msgs ?? []).map((m) => ({ id: m.id, body: m.body, side: m.sender_side, created_at: m.created_at, author: m.sender_side === "client" ? "Vous" : "Service client Burkina Or" })),
          ]}
        />
        {!closed && <Composer action={addComplaintMessage} hidden={{ complaint_id: id }} placeholder="Ajouter une information, une photo décrite…" />}
      </div>
    </div>
  );
}
