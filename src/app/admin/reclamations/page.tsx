import Link from "next/link";
import { Suspense } from "react";
import { ACard, AChips, APill, ASkeleton } from "@/components/admin-ui";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { since } from "@/lib/format";
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUS, type Tone } from "@/lib/labels";

export const metadata = { title: "Réclamations" };

const FILTERS: Record<string, [string, string[]]> = {
  ouvertes: ["Ouvertes", ["open", "assigned", "in_progress"]],
  resolues: ["Résolues", ["resolved", "closed"]],
  toutes: ["Toutes", ["open", "assigned", "in_progress", "resolved", "closed"]],
};
const PRIO: Record<string, Tone> = { basse: "mute", normale: "info", haute: "warn", critique: "err" };

export default function ComplaintsAdminPage({ searchParams }: PageProps<"/admin/reclamations">) {
  return (
    <Suspense fallback={<ASkeleton rows={6} />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/reclamations">["searchParams"] }) {
  await requireStaff();
  const sp = await searchParams;
  const f = (sp.filtre as string) in FILTERS ? (sp.filtre as string) : "ouvertes";
  const db = createAdminClient();
  const { data } = await db.from("complaints").select("*, order:orders(number), shop:shops(name), assignee:profiles!complaints_assigned_to_fkey(full_name)").order("created_at", { ascending: false });
  const all = data ?? [];
  const rows = all.filter((c) => FILTERS[f][1].includes(c.status));
  return (
    <>
      <AChips items={Object.entries(FILTERS).map(([id, [label, st]]) => ({ href: `/admin/reclamations?filtre=${id}`, label: `${label} · ${all.filter((c) => st.includes(c.status)).length}`, on: f === id }))} />
      <ACard pad={false}>
        {rows.map((c) => {
          const late = ["open", "assigned", "in_progress"].includes(c.status) && Date.now() - new Date(c.created_at).getTime() > 72 * 3600000;
          return (
            <Link key={c.id} href={`/admin/reclamations/${c.id}`} className="flex flex-wrap items-center gap-4 border-b border-a-line2 px-[22px] py-4 text-a-text hover:bg-a-sel hover:text-a-text">
              <div className="min-w-[240px] flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[15px] font-semibold">{c.subject}</span>
                  <APill tone={PRIO[c.priority]}>{c.priority}</APill>
                  {late && <APill tone="err">&gt; 72 h</APill>}
                </div>
                <div className="mt-1 text-[13px] text-a-muted">
                  {c.number} · {COMPLAINT_CATEGORIES[c.category] ?? c.category} · {c.reporter_name}
                  {(c.order as { number: string } | null)?.number ? ` · ${(c.order as { number: string }).number}` : ""}
                  {(c.shop as { name: string } | null)?.name ? ` · ${(c.shop as { name: string }).name}` : ""}
                </div>
              </div>
              <span className="text-xs text-a-muted">{(c.assignee as { full_name: string } | null)?.full_name ?? "Non attribuée"}</span>
              <APill tone={COMPLAINT_STATUS[c.status][1]} dot>
                {COMPLAINT_STATUS[c.status][0]}
              </APill>
              <span className="w-24 text-right text-xs text-a-muted">{since(c.created_at)}</span>
            </Link>
          );
        })}
        {!rows.length && <div className="p-10 text-center text-sm text-a-muted">Aucune réclamation.</div>}
      </ACard>
    </>
  );
}
