import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getMyShops, requireUser } from "@/lib/auth";
import { ProNav } from "./nav";

export default function ProLayout({ children }: LayoutProps<"/pro">) {
  return (
    <div className="wrap grid items-start gap-[clamp(20px,3vw,36px)] pb-24 pt-[clamp(20px,3vw,36px)] lg:grid-cols-[260px_minmax(0,1fr)]">
      <Suspense fallback={<div className="h-[420px] animate-pulse rounded-xl bg-ink" />}>
        <NavLoader />
      </Suspense>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

async function NavLoader() {
  await requireUser("/pro");
  const shops = await getMyShops();
  if (!shops.length) redirect("/pro/inscription");
  const s = shops[0];
  return <ProNav shop={{ name: s.name, type: s.type, status: s.status, mono: s.mono, slug: s.slug }} />;
}
