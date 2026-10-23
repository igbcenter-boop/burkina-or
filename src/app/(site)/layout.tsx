import { Suspense } from "react";
import { GoldProvider } from "@/components/gold";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { AdvisorFab, MobileNav } from "@/components/site/floating";
import { Toaster } from "@/components/toast";
import { getCategories, getGoldQuote, getSettings } from "@/lib/data";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [quote, categories, settings] = await Promise.all([getGoldQuote(), getCategories("bijou"), getSettings()]);
  return (
    <GoldProvider initial={quote}>
      <div className="min-h-screen bg-ivory pb-[68px] lg:pb-0">
        <SiteHeader categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} />
        {children}
        <SiteFooter company={settings.company} />
        <Suspense fallback={null}>
          <AdvisorFab whatsapp={settings.company.whatsapp} />
          <MobileNav />
        </Suspense>
        <Toaster />
      </div>
    </GoldProvider>
  );
}
