import { Suspense } from "react";
import { ACard, AChips, ASkeleton } from "@/components/admin-ui";
import { Icon } from "@/components/icons";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { timestamp } from "@/lib/format";
import { ExportButton } from "../export-button";

export const metadata = { title: "Journal d'audit" };

export default function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  return (
    <Suspense fallback={<ASkeleton rows={6} />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/audit">["searchParams"] }) {
  await requireStaff();
  const sp = await searchParams;
  const f = ["tous", "humains", "sensibles"].includes(sp.filtre as string) ? (sp.filtre as string) : "tous";
  const db = createAdminClient();
  let q = db.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(300);
  if (f === "sensibles") q = q.eq("sensitive", true);
  if (f === "humains") q = q.neq("actor_name", "Système");
  const { data } = await q;
  const fresh = Date.now() - 3600000;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <AChips
          items={[
            ["tous", "Toutes les actions"],
            ["humains", "Actions humaines"],
            ["sensibles", "Opérations sensibles"],
          ].map(([id, label]) => ({ href: `/admin/audit?filtre=${id}`, label, on: f === id }))}
        />
        <span className="ml-auto text-[13px] text-a-muted">Journal infalsifiable · conservation 10 ans</span>
        <ExportButton what="Journal d'audit · CSV" href="/admin/export/audit" />
      </div>
      <ACard pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-a-soft text-left text-xs text-a-muted">
                <th className="py-3 pl-5 pr-3 font-medium">Horodatage</th>
                <th className="px-3 py-3 font-medium">Acteur</th>
                <th className="px-3 py-3 font-medium">Action</th>
                <th className="px-3 py-3 font-medium">Cible</th>
                <th className="px-3 py-3 font-medium">Adresse IP</th>
                <th className="py-3 pl-3 pr-5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((a) => (
                <tr key={a.id} className="border-t border-a-line2" style={{ background: new Date(a.created_at).getTime() > fresh ? "var(--a-sel)" : "transparent" }}>
                  <td className="whitespace-nowrap py-[13px] pl-5 pr-3 font-mono text-xs text-a-muted">{timestamp(a.created_at)}</td>
                  <td className="px-3 py-[13px]">
                    <div className="font-semibold">{a.actor_name}</div>
                    <div className="text-xs text-a-muted">{a.actor_role}</div>
                  </td>
                  <td className="px-3 py-[13px] font-medium">{a.action}</td>
                  <td className="px-3 py-[13px] text-a-muted">{a.target}</td>
                  <td className="px-3 py-[13px] font-mono text-xs text-a-muted">{a.ip}</td>
                  <td className="py-[13px] pl-3 pr-5">
                    {a.sensitive && (
                      <span className="inline-flex h-6 items-center gap-[5px] whitespace-nowrap rounded-full bg-p-gold-bg px-2 text-[11px] font-semibold text-p-gold">
                        <Icon name="lock" size={11} stroke={2} />
                        Sensible
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ACard>
    </>
  );
}
