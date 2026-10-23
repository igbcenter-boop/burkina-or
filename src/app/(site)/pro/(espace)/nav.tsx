"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { SHOP_STATUS, SHOP_TYPES } from "@/lib/labels";
import type { ShopStatus, ShopType } from "@/lib/types";

type NavShop = { name: string; type: ShopType; status: ShopStatus; mono: string | null; slug: string };

export function ProNav({ shop }: { shop: NavShop }) {
  const path = usePathname();
  const items: [string, string, IconName, boolean][] = [
    ["/pro", "Tableau de bord", "dashboard", true],
    ["/pro/boutique", shop.type === "livreur" ? "Ma structure" : "Ma boutique", "store", true],
    ["/pro/produits", shop.type === "comptoir" ? "Offres de gros" : shop.type === "fondeur" ? "Prestations" : "Produits", "gem", shop.type !== "livreur"],
    ["/pro/commandes", "Commandes", "receipt", shop.type !== "livreur" && shop.type !== "fondeur"],
    ["/pro/devis", "Demandes de devis", "quote", shop.type === "comptoir" || shop.type === "fondeur"],
    ["/pro/livraisons", "Missions de livraison", "truck", shop.type === "livreur"],
    ["/pro/finances", "Paiements & commissions", "coins", shop.type !== "livreur"],
    ["/pro/messages", "Messages clients", "chat", true],
    ["/pro/documents", "Documents de vérification", "file-check", true],
  ];
  const [label, tone] = SHOP_STATUS[shop.status];
  const publicHref = { bijoutier: `/bijoutiers/${shop.slug}`, comptoir: `/grossistes/${shop.slug}`, fondeur: `/fondeurs/${shop.slug}`, livreur: "/livraison", officielle: "/boutique-officielle" }[shop.type];
  return (
    <aside className="flex flex-col gap-3 lg:sticky lg:top-6">
      <div className="rounded-xl bg-ink p-5 text-ivory">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-ink-2 font-serif text-lg font-bold text-gold-light">{shop.mono}</span>
          <div className="min-w-0">
            <div className="truncate font-semibold">{shop.name}</div>
            <div className="text-xs text-stone">{SHOP_TYPES[shop.type]}</div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span
            className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold ${tone === "ok" ? "bg-ok/25 text-ok-light" : tone === "err" ? "bg-err/30 text-err-light" : "bg-gold/20 text-gold-light"}`}
          >
            {label}
          </span>
          {shop.status === "verified" && (
            <Link href={publicHref} className="text-xs font-semibold text-gold-light hover:text-gold-light">
              Voir ma page →
            </Link>
          )}
        </div>
      </div>
      <nav aria-label="Espace professionnel" className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:rounded-xl lg:border lg:border-line lg:bg-white lg:p-3">
        {items
          .filter((i) => i[3])
          .map(([href, label, icon]) => {
            const on = href === "/pro" ? path === href : path.startsWith(href);
            return (
              <Link key={href} href={href} className={`flex h-11 flex-none items-center gap-3 whitespace-nowrap rounded-lg px-3 text-sm font-medium ${on ? "bg-sand text-gold-dark" : "text-text hover:bg-ivory hover:text-text"}`}>
                <Icon name={icon} size={17} />
                {label}
              </Link>
            );
          })}
      </nav>
    </aside>
  );
}
