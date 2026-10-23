import { Suspense } from "react";
import { ACard, APill, ASkeleton } from "@/components/admin-ui";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dateTime } from "@/lib/format";
import { markContactHandled } from "@/lib/actions/admin";
import { ActButton } from "../act-button";

export const metadata = { title: "Messages de contact" };

export default function ContactsPage() {
  return (
    <Suspense fallback={<ASkeleton rows={5} />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  await requireStaff();
  const db = createAdminClient();
  const [{ data: msgs }, { data: alerts }] = await Promise.all([
    db.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(200),
    db.from("price_alerts").select("*").order("created_at", { ascending: false }).limit(100),
  ]);
  return (
    <>
      <div className="flex flex-col gap-3">
        {(msgs ?? []).map((m) => (
          <ACard key={m.id} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-semibold">{m.name}</span>
                <span className="text-[13px] text-a-muted"> · {[m.email, m.phone].filter(Boolean).join(" · ")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-a-muted">{dateTime(m.created_at)}</span>
                {m.handled ? <APill tone="ok">Traité</APill> : <ActButton action={markContactHandled.bind(null, m.id)} success="Marqué comme traité">Marquer traité</ActButton>}
              </div>
            </div>
            <div className="text-[13px] font-semibold text-a-gold">{m.subject}</div>
            <p className="m-0 whitespace-pre-wrap text-sm">{m.message}</p>
          </ACard>
        ))}
        {!msgs?.length && <ACard className="text-center text-sm text-a-muted">Aucun message.</ACard>}
      </div>
      <ACard pad={false}>
        <div className="border-b border-a-line2 px-[22px] py-4 font-semibold">Alertes de cours ({alerts?.length ?? 0})</div>
        {(alerts ?? []).map((a) => (
          <div key={a.id} className="flex justify-between gap-3 border-b border-a-line2 px-[22px] py-3 text-sm">
            <span>{a.contact}</span>
            <span className="text-a-muted">{a.target_price ? `${a.target_price} FCFA/g` : "toute variation"} · {dateTime(a.created_at)}</span>
          </div>
        ))}
      </ACard>
    </>
  );
}
