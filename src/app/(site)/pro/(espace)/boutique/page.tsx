import type { Metadata } from "next";
import { Suspense } from "react";
import { PanelSkeleton } from "@/components/skeletons";
import { requirePro } from "@/lib/auth";
import { ShopForm } from "./form";

export const metadata: Metadata = { title: "Ma boutique" };

export default function ShopEditPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="m-0 font-serif text-[clamp(32px,3.6vw,44px)] font-semibold">Ma page professionnelle</h1>
      <Suspense fallback={<PanelSkeleton rows={8} />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const { shop } = await requirePro();
  return <ShopForm shop={shop} />;
}
