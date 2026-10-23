import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, Pill } from "@/components/ui";
import { PanelSkeleton } from "@/components/skeletons";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dateTime } from "@/lib/format";
import { ADVICE_CHANNELS, ADVICE_NEEDS, ADVICE_STATUS } from "@/lib/labels";

export const metadata: Metadata = { title: "Mes demandes de conseil" };

export default function AdviceListPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 font-serif text-[clamp(32px,3.6vw,44px)] font-semibold">Conseil</h1>
        <Link href="/conseil#rendez-vous" className="btn-gold h-10 text-[13px]">
          Nouvelle demande
        </Link>
      </div>
      <Suspense fallback={<PanelSkeleton />}>
        <List />
      </Suspense>
    </div>
  );
}

async function List() {
  const s = await requireUser("/compte/conseil");
  const supabase = await createClient();
  const { data } = await supabase.from("advice_requests").select("*").eq("user_id", s.userId).order("created_at", { ascending: false });
  if (!data?.length) return <EmptyState icon="calendar" title="Aucune demande" text="Un conseiller peut vous aider à choisir, comprendre les prix et acheter en toute sécurité." />;
  return (
    <div className="flex flex-col gap-3">
      {data.map((a) => (
        <div key={a.id} className="rounded-xl border border-line bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-semibold">{ADVICE_NEEDS[a.need] ?? a.need}</div>
            <Pill tone={ADVICE_STATUS[a.status][1]}>{ADVICE_STATUS[a.status][0]}</Pill>
          </div>
          <div className="mt-1 text-[13px] text-muted">
            {[a.product_type, a.quantity, a.budget].filter(Boolean).join(" · ")} · {ADVICE_CHANNELS[a.channel] ?? a.channel}
            {a.preferred_date ? ` · ${dateTime(a.preferred_date)}` : ""}
          </div>
          {a.message && <p className="mb-0 mt-3 text-sm text-body">{a.message}</p>}
          {a.advisor_notes && (
            <div className="mt-3 rounded-[10px] bg-sand px-4 py-3 text-sm">
              <b>Réponse du conseiller · </b>
              {a.advisor_notes}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
