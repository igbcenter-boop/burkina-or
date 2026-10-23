import { Suspense } from "react";
import { ASkeleton } from "@/components/admin-ui";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { KycBoard, type KycDossier } from "./board";

export const metadata = { title: "Validation des comptes" };

export default function KycPage() {
  return (
    <Suspense fallback={<ASkeleton rows={5} />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  await requireStaff();
  const db = createAdminClient();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const [{ data: shops }, { count: validated }] = await Promise.all([
    db.from("shops").select("*, kyc_documents(*), owner:profiles!shops_owner_id_fkey(full_name,email,phone)").in("status", ["pending", "more_info"]).order("submitted_at"),
    db.from("shops").select("*", { count: "exact", head: true }).eq("status", "verified").gte("verified_at", monthStart.toISOString()),
  ]);
  const dossiers: KycDossier[] = [];
  for (const s of shops ?? []) {
    const docs = [...(s.kyc_documents as { id: string; label: string; issuer: string | null; file_path: string | null; doc_number: string | null; issued_at: string | null; expires_at: string | null; status: "pending" | "ok" | "ko"; note: string | null; sort: number }[])].sort((a, b) => a.sort - b.sort);
    const withUrls = await Promise.all(
      docs.map(async (d) => {
        let url: string | null = null;
        if (d.file_path) {
          const { data } = await db.storage.from("kyc").createSignedUrl(d.file_path, 900);
          url = data?.signedUrl ?? null;
        }
        return { ...d, url, pdf: !!d.file_path?.toLowerCase().endsWith(".pdf") };
      }),
    );
    dossiers.push({
      id: s.id,
      mono: s.mono ?? "BO",
      name: s.name,
      type: s.type,
      city: s.city ?? "",
      resp: s.responsible_name ?? (s.owner as { full_name: string } | null)?.full_name ?? "—",
      contact: [(s.owner as { email: string } | null)?.email, s.phone].filter(Boolean).join(" · "),
      rccm: s.rccm ?? "—",
      ifu: s.ifu ?? "—",
      zones: (s.zones as string[]).join(", ") || "—",
      submittedAt: s.submitted_at,
      status: s.status,
      docs: withUrls,
    });
  }
  return <KycBoard dossiers={dossiers} validatedThisMonth={validated ?? 0} />;
}
