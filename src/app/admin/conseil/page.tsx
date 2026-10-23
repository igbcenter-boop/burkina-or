import { Suspense } from "react";
import { ACard, AChips, APill, ASkeleton } from "@/components/admin-ui";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dateTime, since } from "@/lib/format";
import { ADVICE_CHANNELS, ADVICE_NEEDS, ADVICE_STATUS } from "@/lib/labels";
import { setAdviceField } from "@/lib/actions/admin";
import { ActSelect } from "../act-button";
import { AdvisorNote } from "./note";

export const metadata = { title: "Conseil" };

const FILTERS: Record<string, [string, string[]]> = {
  traiter: ["À traiter", ["new", "assigned", "in_progress"]],
  traitees: ["Traitées", ["done", "cancelled"]],
  toutes: ["Toutes", ["new", "assigned", "in_progress", "done", "cancelled"]],
};

export default function AdviceAdminPage({ searchParams }: PageProps<"/admin/conseil">) {
  return (
    <Suspense fallback={<ASkeleton rows={5} />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/conseil">["searchParams"] }) {
  await requireStaff();
  const sp = await searchParams;
  const f = (sp.filtre as string) in FILTERS ? (sp.filtre as string) : "traiter";
  const db = createAdminClient();
  const [{ data }, { data: staff }] = await Promise.all([
    db.from("advice_requests").select("*").order("created_at", { ascending: false }),
    db.from("profiles").select("id,full_name").in("role", ["conseiller", "admin", "super_admin"]).order("full_name"),
  ]);
  const all = data ?? [];
  const rows = all.filter((a) => FILTERS[f][1].includes(a.status));
  return (
    <>
      <AChips items={Object.entries(FILTERS).map(([id, [label, st]]) => ({ href: `/admin/conseil?filtre=${id}`, label: `${label} · ${all.filter((a) => st.includes(a.status)).length}`, on: f === id }))} />
      <div className="flex flex-col gap-3">
        {rows.map((a) => (
          <ACard key={a.id} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[15px] font-semibold">{a.name}</span>
                  <APill tone={ADVICE_STATUS[a.status][1]}>{ADVICE_STATUS[a.status][0]}</APill>
                </div>
                <div className="mt-1 text-[13px] text-a-muted">
                  {ADVICE_NEEDS[a.need] ?? a.need} · {[a.product_type, a.quantity, a.budget].filter(Boolean).join(" · ")}
                </div>
                <div className="text-[13px] text-a-muted">
                  {[a.phone, a.email].filter(Boolean).join(" · ")} · {ADVICE_CHANNELS[a.channel] ?? a.channel}
                  {a.preferred_date ? ` · souhaité ${dateTime(a.preferred_date)}` : ""}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-a-muted">{since(a.created_at)}</span>
                <ActSelect action={setAdviceField.bind(null, a.id, "advisor_id")} value={a.advisor_id ?? ""} options={[["", "Conseiller…"], ...(staff ?? []).map((s) => [s.id, s.full_name] as [string, string])]} />
                <ActSelect action={setAdviceField.bind(null, a.id, "status")} value={a.status} options={Object.entries(ADVICE_STATUS).map(([k, [l]]) => [k, l])} />
              </div>
            </div>
            {a.message && <p className="m-0 rounded-[10px] bg-a-soft px-4 py-3 text-sm">{a.message}</p>}
            <AdvisorNote id={a.id} initial={a.advisor_notes ?? ""} />
          </ACard>
        ))}
        {!rows.length && <ACard className="text-center text-sm text-a-muted">Aucune demande.</ACard>}
      </div>
    </>
  );
}
