import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ACard, APill, ASkeleton } from "@/components/admin-ui";
import { Composer, Thread } from "@/components/thread";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dateTime } from "@/lib/format";
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUS } from "@/lib/labels";
import { setComplaintField, staffComplaintMessage } from "@/lib/actions/admin";
import { ActSelect } from "../../act-button";
import { ResolveForm } from "./resolve";

export const metadata = { title: "Réclamation" };

export default function ComplaintAdminPage({ params }: PageProps<"/admin/reclamations/[id]">) {
  return (
    <Suspense fallback={<ASkeleton rows={5} />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/admin/reclamations/[id]">["params"] }) {
  const { id } = await params;
  await requireStaff();
  const db = createAdminClient();
  const [{ data: c }, { data: msgs }, { data: staff }] = await Promise.all([
    db.from("complaints").select("*, order:orders(id,number,total,status), shop:shops(name,phone,email), client:profiles!complaints_user_id_fkey(full_name,email,phone)").eq("id", id).maybeSingle(),
    db.from("complaint_messages").select("*").eq("complaint_id", id).order("created_at"),
    db.from("profiles").select("id,full_name,role").in("role", ["conseiller", "moderateur", "finance", "admin", "super_admin"]).order("full_name"),
  ]);
  if (!c) notFound();
  const order = c.order as { id: string; number: string; total: number; status: string } | null;
  const client = c.client as { full_name: string; email: string; phone: string } | null;
  const shop = c.shop as { name: string; phone: string; email: string } | null;
  const open = !["resolved", "closed"].includes(c.status);

  return (
    <>
      <Link href="/admin/reclamations" className="text-sm font-semibold text-a-gold">
        ← Réclamations
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[13px] text-a-muted">
            {c.number} · {COMPLAINT_CATEGORIES[c.category]} · ouverte le {dateTime(c.created_at)}
          </div>
          <h2 className="m-0 mt-1 font-serif text-[30px] font-semibold">{c.subject}</h2>
        </div>
        <APill tone={COMPLAINT_STATUS[c.status][1]} dot className="h-8 px-3.5 text-[13px]">
          {COMPLAINT_STATUS[c.status][0]}
        </APill>
      </div>
      <div className="grid items-start gap-5 wide:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
        <ACard pad={false}>
          <Thread
            mine="staff"
            messages={[
              { id: "d", body: c.description, side: "client", created_at: c.created_at, author: c.reporter_name },
              ...(msgs ?? []).map((m) => ({ id: m.id, body: m.body, side: m.sender_side, created_at: m.created_at, author: m.sender_side === "staff" ? "Burkina Or" : c.reporter_name })),
            ]}
          />
          {open && <Composer action={staffComplaintMessage} hidden={{ complaint_id: id }} placeholder="Répondre au client…" />}
        </ACard>
        <div className="flex flex-col gap-4">
          <ACard className="flex flex-col gap-3 text-sm">
            <div className="text-xs uppercase tracking-[.12em] text-a-muted">Traitement</div>
            <label className="flex items-center justify-between gap-3">
              <span className="text-a-muted">Responsable</span>
              <ActSelect action={setComplaintField.bind(null, id, "assigned_to")} value={c.assigned_to ?? ""} options={[["", "Non attribuée"], ...(staff ?? []).map((s) => [s.id, s.full_name] as [string, string])]} />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-a-muted">Priorité</span>
              <ActSelect action={setComplaintField.bind(null, id, "priority")} value={c.priority} options={["basse", "normale", "haute", "critique"].map((p) => [p, p])} />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-a-muted">Statut</span>
              <ActSelect action={setComplaintField.bind(null, id, "status")} value={c.status} options={Object.entries(COMPLAINT_STATUS).map(([k, [l]]) => [k, l])} />
            </label>
          </ACard>
          {open ? (
            <ResolveForm id={id} />
          ) : (
            c.resolution && (
              <ACard className="text-sm">
                <div className="text-xs uppercase tracking-[.12em] text-a-muted">Solution enregistrée</div>
                <p className="mb-0 mt-2">{c.resolution}</p>
                <div className="mt-2 text-xs text-a-muted">{dateTime(c.resolved_at)}</div>
              </ACard>
            )
          )}
          <ACard className="flex flex-col gap-3 text-sm">
            <div className="text-xs uppercase tracking-[.12em] text-a-muted">Parties</div>
            <div>
              <div className="text-a-muted">Client</div>
              <div className="font-semibold">{client?.full_name ?? c.reporter_name}</div>
              <div className="text-xs text-a-muted">{[client?.email, client?.phone].filter(Boolean).join(" · ")}</div>
            </div>
            {shop && (
              <div>
                <div className="text-a-muted">Vendeur</div>
                <div className="font-semibold">{shop.name}</div>
                <div className="text-xs text-a-muted">{[shop.phone, shop.email].filter(Boolean).join(" · ")}</div>
              </div>
            )}
            {order && (
              <Link href={`/admin/commandes?commande=${order.id}`} className="font-semibold text-a-gold">
                Commande {order.number} →
              </Link>
            )}
          </ACard>
        </div>
      </div>
    </>
  );
}
