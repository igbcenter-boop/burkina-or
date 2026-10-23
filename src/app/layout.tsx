import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { PwaInstall } from "@/components/pwa";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Burkina Or · L'or accessible, en toute confiance",
    template: "%s · Burkina Or",
  },
  description:
    "Lingotins certifiés dès 1 gramme, bijoux des meilleurs artisans du Burkina, comptoirs vérifiés et livraison sécurisée. La place de marché de l'or au Burkina Faso et en Afrique de l'Ouest.",
  applicationName: "Burkina Or",
  appleWebApp: { capable: true, title: "Burkina Or", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  openGraph: { type: "website", locale: "fr_FR", siteName: "Burkina Or", images: [{ url: "/icons/icon-512.png", width: 512, height: 512 }] },
};

export const viewport: Viewport = {
  themeColor: "#0E0E10",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${cormorant.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body>
        {children}
        <PwaInstall />
      </body>
    </html>
  );
}
