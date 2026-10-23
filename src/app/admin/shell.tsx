"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Toaster } from "@/components/toast";

type Item = { href: string; label: string; icon: IconName; badge?: ReactNode };
type Section = { title: string; items: Item[] };

const TITLES: [RegExp, string, string][] = [
  [/^\/admin$/, "Pilotage", "Tableau de bord"],
  [/^\/admin\/kyc/, "Conformité", "Validation des comptes"],
  [/^\/admin\/moderation/, "Conformité", "Modération des produits & offres"],
  [/^\/admin\/commandes/, "Opérations", "Commandes & transactions"],
  [/^\/admin\/livraisons/, "Opérations", "Livraisons & prestataires"],
  [/^\/admin\/reclamations/, "Opérations", "Réclamations"],
  [/^\/admin\/conseil/, "Opérations", "Conseil & accompagnement"],
  [/^\/admin\/devis/, "Opérations", "Demandes de devis"],
  [/^\/admin\/catalogue/, "Catalogue", "Boutique officielle & catégories"],
  [/^\/admin\/boutiques/, "Catalogue", "Boutiques & professionnels"],
  [/^\/admin\/utilisateurs/, "Utilisateurs", "Comptes & rôles"],
  [/^\/admin\/contacts/, "Utilisateurs", "Messages de contact"],
  [/^\/admin\/parametres/, "Système", "Paramètres de la plateforme"],
  [/^\/admin\/audit/, "Système", "Journal d'audit"],
];

export function AdminShell({
  children,
  user,
  badges,
  price,
}: {
  children: ReactNode;
  user: ReactNode;
  badges: { kyc: ReactNode; mod: ReactNode; complaints: ReactNode };
  price: { p24: string; change: string; up: boolean };
}) {
  const path = usePathname();
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    try {
      // Préférence locale lue après hydratation (le rendu serveur reste en thème clair).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDark(localStorage.getItem("bo-admin-theme") === "sombre");
    } catch {
      /* stockage indisponible */
    }
  }, []);
  const [lastPath, setLastPath] = useState(path);
  if (path !== lastPath) {
    setLastPath(path);
    setDrawer(false);
  }

  const toggle = () => {
    setDark((d) => {
      try {
        localStorage.setItem("bo-admin-theme", d ? "clair" : "sombre");
      } catch {
        /* stockage indisponible */
      }
      return !d;
    });
  };

  const sections: Section[] = [
    { title: "Pilotage", items: [{ href: "/admin", label: "Tableau de bord", icon: "dashboard" }] },
    {
      title: "Conformité",
      items: [
        { href: "/admin/kyc", label: "Validation des comptes", icon: "user-check", badge: badges.kyc },
        { href: "/admin/moderation", label: "Modération", icon: "flag", badge: badges.mod },
      ],
    },
    {
      title: "Opérations",
      items: [
        { href: "/admin/commandes", label: "Commandes & transactions", icon: "receipt" },
        { href: "/admin/livraisons", label: "Livraisons", icon: "truck" },
        { href: "/admin/reclamations", label: "Réclamations", icon: "alert", badge: badges.complaints },
        { href: "/admin/conseil", label: "Conseil", icon: "calendar" },
        { href: "/admin/devis", label: "Devis professionnels", icon: "quote" },
      ],
    },
    {
      title: "Catalogue",
      items: [
        { href: "/admin/catalogue", label: "Boutique officielle", icon: "store" },
        { href: "/admin/boutiques", label: "Boutiques & pros", icon: "gem" },
      ],
    },
    {
      title: "Utilisateurs",
      items: [
        { href: "/admin/utilisateurs", label: "Comptes & rôles", icon: "users" },
        { href: "/admin/contacts", label: "Messages de contact", icon: "mail" },
      ],
    },
    {
      title: "Système",
      items: [
        { href: "/admin/parametres", label: "Paramètres", icon: "sliders" },
        { href: "/admin/audit", label: "Journal d'audit", icon: "history" },
      ],
    },
  ];
  const t = TITLES.find(([re]) => re.test(path)) ?? TITLES[0];

  return (
    <div data-theme={dark ? "dark" : "light"} className="bo-admin grid min-h-screen bg-a-bg text-a-text lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside
        className={`fixed left-0 top-0 z-[45] h-screen w-[280px] flex-col overflow-auto border-r border-gold-light/[.16] bg-ink text-ivory lg:sticky lg:flex lg:w-auto ${drawer ? "flex" : "hidden"}`}
      >
        <div className="flex items-center justify-between px-[22px] pb-[18px] pt-[22px]">
          <Link href="/admin" className="block">
            <div className="flex items-center gap-2.5 font-serif text-[26px] font-semibold leading-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="" width={30} height={30} className="rounded-[22%]" />
              <span className="text-ivory">Burkina</span>
              <span className="gold-text">Or</span>
            </div>
            <div className="mt-1.5 text-[11px] uppercase tracking-[.16em] text-gold-light">Administration</div>
          </Link>
          <button onClick={() => setDrawer(false)} aria-label="Fermer le menu" className="flex h-11 w-11 items-center justify-center border-0 bg-transparent text-ivory lg:hidden">
            <Icon name="x" size={20} />
          </button>
        </div>
        <div className="mx-[22px] h-px bg-[linear-gradient(90deg,rgba(184,146,58,.55),transparent)]" />
        <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
          {sections.map((s, si) => (
            <div key={s.title}>
              <div className={`px-3 pb-1.5 text-[11px] uppercase tracking-[.14em] text-muted-2 ${si ? "pt-3.5" : "pt-2"}`}>{s.title}</div>
              {s.items.map((it) => {
                const on = it.href === "/admin" ? path === "/admin" : path.startsWith(it.href);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium"
                    style={{ background: on ? "rgba(184,146,58,.16)" : "transparent", color: on ? "#D9BC6E" : "#C9C2B3" }}
                  >
                    <Icon name={it.icon} size={18} />
                    <span className="flex-1">{it.label}</span>
                    {it.badge}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="m-3 flex items-center gap-3 rounded-xl bg-ink-2 p-3.5">{user}</div>
        <Link href="/" className="mx-3 mb-4 flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 text-xs text-stone hover:text-gold-light">
          <Icon name="arrow-left" size={14} />
          Retour au site
        </Link>
      </aside>
      {drawer && <div onClick={() => setDrawer(false)} className="fixed inset-0 z-[44] bg-ink/55 lg:hidden" />}

      <div className="flex min-w-0 flex-col">
        <header className="border-b border-a-line bg-a-bg">
          <div className="flex items-center gap-3.5 px-[clamp(16px,3vw,36px)] py-3.5">
            <button onClick={() => setDrawer(true)} aria-label="Menu" className="-ml-2 flex h-11 w-11 flex-none items-center justify-center border-0 bg-transparent text-a-text lg:hidden">
              <Icon name="menu" size={22} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-a-muted">Administration › {t[1]}</div>
              <h1 className="m-0 mt-0.5 font-serif text-[clamp(26px,2.6vw,34px)] font-semibold leading-[1.1]">{t[2]}</h1>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (q.trim()) router.push(`/admin/commandes?q=${encodeURIComponent(q.trim())}`);
              }}
              className="hidden h-11 w-[280px] items-center gap-2.5 rounded-full border border-a-line bg-a-card px-4 text-a-muted wide:flex"
            >
              <Icon name="search" size={16} stroke={1.75} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Commande, client, vendeur…" className="min-w-0 flex-1 border-0 bg-transparent text-sm text-a-text outline-none" />
            </form>
            <span className="hidden h-11 items-center gap-2 whitespace-nowrap rounded-full border border-gold-light/25 bg-ink px-3.5 text-[13px] text-ivory tnum wide:flex">
              <span className="h-[7px] w-[7px] rounded-full bg-ok-light" />
              {price.p24} FCFA/g <span style={{ color: price.up ? "#7CC4A0" : "#E58A84" }}>{price.change}</span>
            </span>
            <button onClick={toggle} aria-label="Changer de thème" className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-a-line bg-a-card text-a-text">
              <Icon name={dark ? "sun" : "moon"} size={18} />
            </button>
            <Link href="/admin/reclamations" aria-label="Alertes" className="relative flex h-11 w-11 flex-none items-center justify-center rounded-full border border-a-line bg-a-card text-a-text hover:text-a-text">
              <Icon name="bell" size={18} />
              <span className="absolute right-2.5 top-[9px] h-2 w-2 rounded-full border-2 border-a-card bg-err" />
            </Link>
          </div>
        </header>
        <main className="flex w-full max-w-[1520px] flex-col gap-5 px-[clamp(16px,3vw,36px)] pb-[120px] pt-[clamp(16px,2.6vw,32px)]">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
