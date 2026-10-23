import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "./shell";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGoldQuote } from "@/lib/data";
import { initials, n0, pct } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: { default: "Administration", template: "%s · Administration Burkina Or" }, robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const quote = await getGoldQuote();
  return (
    <Suspense fallback={<div className="min-h-screen bg-ivory lg:grid lg:grid-cols-[248px_1fr]"><div className="hidden bg-ink lg:block" /><div /></div>}>
    <AdminShell
      price={{ p24: n0(quote.p24), change: pct(quote.changePct).replace("+", ""), up: quote.changePct >= 0 }}
      user={
        <Suspense fallback={<div className="h-10 w-full animate-pulse rounded-lg bg-ink" />}>
          <AdminUser />
        </Suspense>
      }
      badges={{
        kyc: (
          <Suspense fallback={null}>
            <Badge kind="kyc" />
          </Suspense>
        ),
        mod: (
          <Suspense fallback={null}>
            <Badge kind="mod" />
          </Suspense>
        ),
        complaints: (
          <Suspense fallback={null}>
            <Badge kind="complaints" />
          </Suspense>
        ),
      }}
    >
      {children}
    </AdminShell>
    </Suspense>
  );
}

async function AdminUser() {
  const s = await requireStaff();
  return (
    <>
      <span className="gold-bg flex h-10 w-10 flex-none items-center justify-center rounded-full text-sm font-bold text-ink">{initials(s.profile.full_name)}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{s.profile.full_name}</div>
        <div className="text-xs text-[#A39E94]">{ROLE_LABELS[s.profile.role]}</div>
      </div>
    </>
  );
}

async function Badge({ kind }: { kind: "kyc" | "mod" | "complaints" }) {
  await requireStaff();
  const db = createAdminClient();
  let n = 0;
  if (kind === "kyc") {
    const { count } = await db.from("shops").select("*", { count: "exact", head: true }).in("status", ["pending", "more_info"]);
    n = count ?? 0;
  } else if (kind === "mod") {
    const [{ count: v }, { data: r }] = await Promise.all([
      db.from("verification_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
      db.from("product_reports").select("product_id").eq("status", "open"),
    ]);
    n = (v ?? 0) + new Set((r ?? []).map((x) => x.product_id)).size;
  } else {
    const { count } = await db.from("complaints").select("*", { count: "exact", head: true }).in("status", ["open", "assigned", "in_progress"]);
    n = count ?? 0;
  }
  if (!n) return null;
  return (
    <span
      className={`flex h-5 min-w-[22px] items-center justify-center rounded-[10px] px-1.5 text-[11px] font-semibold ${kind === "kyc" ? "bg-err text-white" : "bg-gold-light/20 text-gold-light"}`}
    >
      {n}
    </span>
  );
}
