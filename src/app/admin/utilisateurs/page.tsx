import { Suspense } from "react";
import { ACard, AChips, APill, ASkeleton } from "@/components/admin-ui";
import { isAdmin, requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dateShort } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/labels";
import { setUserRoleValue, setUserStatus } from "@/lib/actions/admin";
import type { UserRole } from "@/lib/types";
import { ActButton, ActSelect } from "../act-button";
import { ExportButton } from "../export-button";
import { UserSearch } from "./search";

export const metadata = { title: "Comptes & rôles" };

const GROUPS: Record<string, [string, UserRole[]]> = {
  tous: ["Tous", []],
  clients: ["Clients", ["client"]],
  pros: ["Professionnels", ["bijoutier", "grossiste", "fondeur", "livreur"]],
  equipe: ["Équipe", ["conseiller", "moderateur", "finance", "admin", "super_admin"]],
};

export default function UsersPage({ searchParams }: PageProps<"/admin/utilisateurs">) {
  return (
    <Suspense fallback={<ASkeleton rows={6} />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/utilisateurs">["searchParams"] }) {
  const me = await requireStaff();
  const sp = await searchParams;
  const g = (sp.groupe as string) in GROUPS ? (sp.groupe as string) : "tous";
  const q = String(sp.q ?? "").toLowerCase();
  const db = createAdminClient();
  const { data } = await db.from("profiles").select("*").order("created_at", { ascending: false }).limit(500);
  const all = data ?? [];
  const inGroup = (r: UserRole, k: string) => !GROUPS[k][1].length || GROUPS[k][1].includes(r);
  const rows = all.filter((u) => inGroup(u.role, g) && (!q || `${u.full_name} ${u.email} ${u.phone}`.toLowerCase().includes(q)));
  const admin = isAdmin(me.profile);
  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <AChips items={Object.entries(GROUPS).map(([id, [label]]) => ({ href: `/admin/utilisateurs?groupe=${id}${q ? `&q=${encodeURIComponent(q)}` : ""}`, label: `${label} · ${all.filter((u) => inGroup(u.role, id)).length}`, on: g === id }))} />
        <UserSearch initial={q} />
        <div className="ml-auto">
          <ExportButton what="Utilisateurs · CSV" href="/admin/export/utilisateurs" />
        </div>
      </div>
      <ACard pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead>
              <tr className="bg-a-soft text-left text-xs text-a-muted">
                <th className="py-3 pl-5 pr-3 font-medium">Utilisateur</th>
                <th className="px-3 py-3 font-medium">Contact</th>
                <th className="px-3 py-3 font-medium">Inscription</th>
                <th className="px-3 py-3 font-medium">Rôle</th>
                <th className="py-3 pl-3 pr-5 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-t border-a-line2">
                  <td className="py-3 pl-5 pr-3 font-semibold">{u.full_name}</td>
                  <td className="px-3 py-3 text-a-muted">
                    {u.email}
                    <div className="text-xs">
                      {u.phone} {u.city ? `· ${u.city}` : ""}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-a-muted">{dateShort(u.created_at)}</td>
                  <td className="px-3 py-3">
                    {admin && u.id !== me.userId ? <ActSelect action={setUserRoleValue.bind(null, u.id)} value={u.role} options={Object.entries(ROLE_LABELS)} /> : <span>{ROLE_LABELS[u.role as UserRole]}</span>}
                  </td>
                  <td className="py-3 pl-3 pr-5">
                    <div className="flex items-center gap-2">
                      <APill tone={u.status === "active" ? "ok" : "err"}>{u.status === "active" ? "Actif" : "Suspendu"}</APill>
                      {admin && u.id !== me.userId && (
                        <ActButton action={setUserStatus.bind(null, u.id, u.status === "active" ? "suspended" : "active")} variant={u.status === "active" ? "danger" : "ok"} confirmText={u.status === "active" ? `Suspendre ${u.full_name} ?` : undefined}>
                          {u.status === "active" ? "Suspendre" : "Réactiver"}
                        </ActButton>
                      )}
                    </div>
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
