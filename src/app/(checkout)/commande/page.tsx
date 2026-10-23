import type { Metadata } from "next";
import { Suspense } from "react";
import { Checkout } from "@/components/checkout/checkout";
import { CheckoutHeader } from "@/components/checkout/header";
import { getCheckoutContext } from "@/lib/actions/checkout";

export const metadata: Metadata = { title: "Panier & commande", robots: { index: false } };

export default function CommandePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-ivory">
          <CheckoutHeader step={0} />
          <div className="mx-auto max-w-[1240px] px-[clamp(16px,3vw,40px)] py-12">
            <div className="h-12 w-72 animate-pulse rounded-md bg-sand" />
            <div className="mt-6 h-56 animate-pulse rounded-xl border border-line bg-white" />
          </div>
        </div>
      }
    >
      <CheckoutLoader />
    </Suspense>
  );
}

async function CheckoutLoader() {
  const ctx = await getCheckoutContext();
  return <Checkout ctx={ctx} />;
}
