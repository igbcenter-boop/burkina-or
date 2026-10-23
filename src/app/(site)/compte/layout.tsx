import { Suspense } from "react";
import { AccountNav } from "./nav";

export default function AccountLayout({ children }: LayoutProps<"/compte">) {
  return (
    <div className="wrap grid items-start gap-[clamp(20px,3vw,36px)] pb-24 pt-[clamp(20px,3vw,36px)] lg:grid-cols-[250px_minmax(0,1fr)]">
      <Suspense fallback={<div className="h-12 animate-pulse rounded-xl bg-white lg:h-[420px]" />}>
        <AccountNav />
      </Suspense>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
