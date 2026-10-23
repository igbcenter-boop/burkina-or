import { GoldProvider } from "@/components/gold";
import { Toaster } from "@/components/toast";
import { getGoldQuote } from "@/lib/data";

export default async function CheckoutLayout({ children }: LayoutProps<"/">) {
  const quote = await getGoldQuote();
  return (
    <GoldProvider initial={quote}>
      {children}
      <Toaster position="bottom" />
    </GoldProvider>
  );
}
