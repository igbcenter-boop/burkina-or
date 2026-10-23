"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";

const ITEMS: [string, string, IconName][] = [
  ["/compte", "Tableau de bord", "dashboard"],
  ["/compte/commandes", "Mes commandes", "receipt"],
  ["/compte/favoris", "Mes favoris", "heart"],
  ["/compte/messages", "Messages", "chat"],
  ["/compte/devis", "Demandes de devis", "quote"],
  ["/compte/conseil", "Conseil", "calendar"],
  ["/compte/reclamations", "Réclamations", "flag"],
  ["/compte/notifications", "Notifications", "bell"],
  ["/compte/profil", "Mon profil", "user"],
];

export function AccountNav() {
  const path = usePathname();
  return (
    <nav aria-label="Espace client" className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:sticky lg:top-6 lg:mx-0 lg:flex-col lg:overflow-visible lg:rounded-xl lg:border lg:border-line lg:bg-white lg:p-3">
      <div className="hidden px-3 pb-2 pt-1 text-[11px] uppercase tracking-[.14em] text-muted lg:block">Mon espace</div>
      {ITEMS.map(([href, label, icon]) => {
        const on = href === "/compte" ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex h-11 flex-none items-center gap-3 whitespace-nowrap rounded-lg px-3 text-sm font-medium ${on ? "bg-sand text-gold-dark" : "text-text hover:bg-ivory hover:text-text"}`}
          >
            <Icon name={icon} size={17} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
