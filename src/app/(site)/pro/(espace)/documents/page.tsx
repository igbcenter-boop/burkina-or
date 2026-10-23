import type { Metadata } from "next";
import { Suspense } from "react";
import { PanelSkeleton } from "@/components/skeletons";
import { requirePro } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SHOP_STATUS } from "@/lib/labels";
import { DocRow, SubmitKyc } from "./docs";

export const metadata: Metadata = { title: "Documents de vérification" };

export default function DocumentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="m-0 font-serif text-[clamp(32px,3.6vw,44px)] font-semibold">Documents de vérification</h1>
        <p className="mt-2 max-w-[680px] text-[15px] leading-relaxed text-body">
          Vos pièces sont stockées dans un espace privé, consultable uniquement par vous et par l&apos;équipe conformité de Burkina Or. Formats acceptés : PDF, JPEG, PNG (10 Mo max).
        </p>
      </div>
      <Suspense fallback={<PanelSkeleton />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const { shop } = await requirePro();
  const supabase = await createClient();
  const { data } = await supabase.from("kyc_documents").select("*").eq("shop_id", shop.id).order("sort");
  const docs = data ?? [];
  const okN = docs.filter((d) => d.status === "ok").length;
  const uploaded = docs.filter((d) => d.file_path || d.status === "ok").length;
  const [label, tone] = SHOP_STATUS[shop.status];
  return (
    <>
      <div className="flex flex-wrap items-center gap-5 rounded-xl border border-line bg-white p-5">
        <div className="min-w-[200px] flex-1">
          <div className="text-sm text-muted">Statut du dossier</div>
          <div className={`mt-0.5 text-lg font-semibold ${tone === "ok" ? "text-ok" : tone === "err" ? "text-err" : "text-warn"}`}>{label}</div>
        </div>
        <div className="min-w-[200px] flex-1">
          <div className="text-sm text-muted">Pièces conformes</div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sand">
            <div className="h-full bg-ok" style={{ width: `${docs.length ? (okN / docs.length) * 100 : 0}%` }} />
          </div>
          <div className="mt-1 text-xs text-muted tnum">
            {okN} / {docs.length} validées · {uploaded} transmises
          </div>
        </div>
        {shop.status !== "verified" && <SubmitKyc shopId={shop.id} ready={uploaded === docs.length && docs.length > 0} />}
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        {docs.map((d) => (
          <DocRow key={d.id} shopId={shop.id} doc={{ id: d.id, label: d.label, issuer: d.issuer, status: d.status, file_path: d.file_path, note: d.note, doc_number: d.doc_number, expires_at: d.expires_at }} />
        ))}
      </div>
    </>
  );
}
