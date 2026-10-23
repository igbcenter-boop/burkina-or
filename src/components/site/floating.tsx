"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, WhatsAppIcon } from "../icons";
import { useCartCount } from "@/lib/cart-store";

/** Bouton flottant « Parler à un conseiller » (WhatsApp). */
export function AdvisorFab({ whatsapp }: { whatsapp: string }) {
  const path = usePathname();
  const onProduct = /^\/(boutique-officielle|bijoux)\/[^/]+$/.test(path);
  return (
    <a
      href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("Bonjour, je souhaite parler à un conseiller Burkina Or.")}`}
      target="_blank"
      rel="noreferrer"
      className={`fixed right-[clamp(16px,2vw,28px)] z-[38] flex h-[52px] items-center gap-2.5 rounded-full bg-ok pl-4 pr-5 text-sm font-semibold text-white shadow-[0_12px_32px_-12px_rgba(0,0,0,.5)] hover:bg-ok-dark hover:text-white lg:bottom-7 ${
        onProduct ? "bottom-[152px]" : "bottom-[84px]"
      }`}
    >
      <WhatsAppIcon />
      <span className="wide:hidden">Conseiller</span>
      <span className="hidden wide:inline">Parler à un conseiller</span>
    </a>
  );
}

/** Barre de navigation inférieure (mobile). */
export function MobileNav() {
  const path = usePathname();
  const count = useCartCount();
  const items: { href: string; label: string; icon: "home" | "grid" | "chat" | "cart" | "user"; match: (p: string) => boolean }[] = [
    { href: "/", label: "Accueil", icon: "home", match: (p) => p === "/" },
    { href: "/bijoux", label: "Catégories", icon: "grid", match: (p) => p.startsWith("/bijoux") || p.startsWith("/boutique-officielle") },
    { href: "/conseil", label: "Conseil", icon: "chat", match: (p) => p.startsWith("/conseil") },
    { href: "/commande", label: "Panier", icon: "cart", match: (p) => p.startsWith("/commande") },
    { href: "/compte", label: "Compte", icon: "user", match: (p) => p.startsWith("/compte") || p.startsWith("/connexion") },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[36] grid h-[68px] grid-cols-5 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      {items.map((it) => {
        const on = it.match(path);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`relative flex flex-col items-center justify-center gap-1 text-[11px] ${on ? "font-semibold text-gold-dark" : "font-medium text-muted"}`}
          >
            <Icon name={it.icon} size={22} />
            {it.label}
            {it.icon === "cart" && (
              <span className="absolute left-[calc(50%+6px)] top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] bg-gold px-[5px] text-[11px] font-semibold text-ink">
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
