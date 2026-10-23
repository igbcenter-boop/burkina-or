"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../icons";
import { Logo } from "../ui";
import { TickerBar } from "../gold";
import { useCartCount } from "@/lib/cart-store";
import { UserMenu } from "./user-menu";

export const MENU: [string, string][] = [
  ["Boutique officielle", "/boutique-officielle"],
  ["Bijoux", "/bijoux"],
  ["Bijoutiers", "/bijoutiers"],
  ["Grossistes & comptoirs", "/grossistes"],
  ["Fondeurs & services", "/fondeurs"],
  ["Livraison", "/livraison"],
  ["Conseil", "/conseil"],
];

type Cat = { slug: string; name: string };

export function SiteHeader({ categories }: { categories: Cat[] }) {
  const [mega, setMega] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const count = useCartCount();
  const closeMenus = useCallback(() => {
    setMega(false);
    setDrawer(false);
  }, []);

  return (
    <header className="relative z-30 bg-ink text-ivory" onMouseLeave={() => mega && setMega(false)}>
      <Suspense fallback={null}>
        <PathWatcher onChange={closeMenus} />
      </Suspense>
      <TickerBar>
        <span className="ml-auto hidden gap-[18px] md:flex">
          <span>Livraison assurée dans 7 pays</span>
          <Link href="/pro" className="text-gold-light hover:text-gold-light">
            Espace professionnel
          </Link>
        </span>
      </TickerBar>

      <div className="wrap flex flex-wrap items-center gap-[clamp(12px,2.5vw,32px)] py-3.5">
        <button
          onClick={() => setDrawer(true)}
          aria-label="Menu"
          className="-ml-2.5 flex h-11 w-11 items-center justify-center border-0 bg-transparent text-ivory lg:hidden"
        >
          <Icon name="menu" size={22} />
        </button>
        <Logo />
        <Suspense fallback={<div className="order-3 mx-auto h-12 min-w-0 flex-[1_1_360px] rounded-full bg-ivory lg:order-none lg:max-w-[560px]" />}>
          <SearchBar />
        </Suspense>
        <div className="ml-auto flex items-center gap-1">
          <button className="hidden h-11 items-center gap-2 border-0 bg-transparent px-3 text-[13px] font-medium text-cream lg:flex" title="Langue et devise">
            <Icon name="globe" size={18} />
            FR · FCFA
          </button>
          <UserMenu />
          <Link href="/commande" aria-label="Panier" className="relative flex h-11 w-11 items-center justify-center text-ivory hover:text-ivory">
            <Icon name="cart" size={22} />
            <span className="absolute right-0.5 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] bg-gold px-[5px] text-[11px] font-semibold text-ink">
              {count}
            </span>
          </Link>
        </div>
      </div>

      <nav className="hidden border-t border-white/[.06] lg:block">
        <div className="wrap scrollbar-none flex h-12 items-stretch gap-1 overflow-x-auto">
          <Suspense fallback={<NavLinks path="" mega={mega} setMega={setMega} />}>
            <ActiveNavLinks mega={mega} setMega={setMega} />
          </Suspense>
          <Link href="/conseil" className="ml-auto flex items-center gap-2 px-1 text-[13px] text-gold-light hover:text-gold-light">
            <span className="h-2 w-2 rounded-full bg-ok shadow-[0_0_0_3px_rgba(30,107,74,.35)]" />
            Conseillers en ligne
          </Link>
        </div>
      </nav>

      {mega && (
        <div className="absolute left-0 right-0 top-full hidden border-t border-gold bg-white text-text shadow-[0_24px_48px_-24px_rgba(14,14,16,.35)] lg:block">
          <div className="wrap grid grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.3fr)] gap-10 py-8">
            <MegaCol title="Catégories" links={categories.filter((c) => c.slug !== "sur-mesure").map((c) => [c.name, `/bijoux?categorie=${c.slug}`])} />
            <MegaCol
              title="Occasions"
              links={[
                ["Mariage & dot", "/bijoux?occasion=Mariage%20%26%20dot"],
                ["Fiançailles", "/bijoux?occasion=Fian%C3%A7ailles"],
                ["Baptême", "/bijoux?occasion=Bapt%C3%AAme"],
                ["Tabaski & fêtes", "/bijoux?occasion=Tabaski%20%26%20f%C3%AAtes"],
                ["Cadeau", "/bijoux?occasion=Cadeau"],
              ]}
            />
            <div>
              <div className="mb-3.5 text-[11px] uppercase tracking-[.14em] text-gold-dark">Par titre</div>
              <div className="flex flex-col gap-2.5 text-sm">
                <Link href="/bijoux?titre=24" className="text-text">Or 24 carats</Link>
                <Link href="/bijoux?titre=22" className="text-text">Or 22 carats</Link>
                <Link href="/bijoux?titre=18" className="text-text">Or 18 carats</Link>
                <Link href="/bijoux?categorie=sur-mesure" className="font-semibold text-gold-dark">Créations sur mesure →</Link>
              </div>
            </div>
            <div className="stripes-ink relative flex min-h-[200px] flex-col justify-end overflow-hidden rounded-xl p-5 text-ivory">
              <span className="absolute left-4 top-3.5 font-mono text-[11px] text-muted-2">photo · parure de mariage</span>
              <div className="font-serif text-[26px] font-semibold">Collection Mariage 2026</div>
              <Link href="/bijoux?collection=Mariage%202026" className="mt-1 text-[13px] font-semibold text-gold-light hover:text-gold-light">
                Découvrir la collection →
              </Link>
            </div>
          </div>
        </div>
      )}

      {drawer && (
        <div onClick={() => setDrawer(false)} className="fixed inset-0 z-50 bg-ink/55 lg:hidden">
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 left-0 top-0 flex w-[min(86vw,360px)] flex-col gap-1 overflow-auto bg-ink p-5 text-ivory"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="font-serif text-[26px] font-semibold">
                Burkina <span className="text-gold-light">Or</span>
              </span>
              <button onClick={() => setDrawer(false)} aria-label="Fermer" className="flex h-11 w-11 items-center justify-center border-0 bg-transparent text-ivory">
                <Icon name="x" size={20} />
              </button>
            </div>
            {MENU.map(([label, href]) => (
              <Link key={href} href={href} className="flex min-h-[52px] items-center justify-between border-b border-white/[.07] text-base text-ivory hover:text-gold-light">
                {label}
                <span className="text-muted-2">›</span>
              </Link>
            ))}
            <Link href="/pro" className="flex min-h-[52px] items-center justify-between border-b border-white/[.07] text-base text-gold-light">
              Espace professionnel<span className="text-muted-2">›</span>
            </Link>
            <div className="mt-auto flex gap-2.5 pt-5">
              <span className="flex h-10 items-center rounded-lg border border-gold-light/40 px-3.5 text-[13px] text-gold-light">FR · FCFA</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/** Ferme les menus à chaque changement de page. */
function PathWatcher({ onChange }: { onChange: () => void }) {
  const path = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    onChange();
  }, [path, onChange]);
  return null;
}

function ActiveNavLinks(props: { mega: boolean; setMega: (v: boolean) => void }) {
  return <NavLinks path={usePathname()} {...props} />;
}

function NavLinks({ path, mega, setMega }: { path: string; mega: boolean; setMega: (v: boolean) => void }) {
  const active = (href: string) => !!path && (path === href || path.startsWith(href + "/"));
  return (
    <>
      {MENU.map(([label, href]) => {
        const on = (label === "Bijoux" && mega) || active(href);
        return (
          <Link
            key={href}
            href={href}
            onMouseEnter={() => setMega(label === "Bijoux")}
            className="flex flex-none items-center whitespace-nowrap border-b-2 px-3.5 text-sm font-medium"
            style={{ color: on ? "#D9BC6E" : "#E6DFCF", borderBottomColor: on ? "#B8923A" : "transparent" }}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}

function MegaCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="mb-3.5 text-[11px] uppercase tracking-[.14em] text-gold-dark">{title}</div>
      <div className="flex flex-col gap-2.5 text-sm">
        {links.map(([l, h]) => (
          <Link key={h} href={h} className="text-text">
            {l}
          </Link>
        ))}
      </div>
    </div>
  );
}

const SEARCH_TYPES: [string, string][] = [
  ["tout", "Tout"],
  ["lingot", "Lingotins"],
  ["bijou", "Bijoux"],
  ["bijoutiers", "Bijoutiers"],
  ["gros", "Grossistes"],
  ["service", "Services"],
];

function SearchBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const path = usePathname();
  const [q, setQ] = useState(path === "/recherche" ? sp.get("q") ?? "" : "");
  const [t, setT] = useState(path === "/recherche" ? sp.get("t") ?? "tout" : "tout");
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/recherche?q=${encodeURIComponent(q.trim())}&t=${t}`);
      }}
      className="order-3 mx-auto flex h-12 min-w-0 flex-[1_1_360px] overflow-hidden rounded-full bg-ivory lg:order-none lg:max-w-[560px]"
    >
      <select
        value={t}
        onChange={(e) => setT(e.target.value)}
        aria-label="Catégorie de recherche"
        className="flex-none cursor-pointer border-0 border-r border-line bg-sand py-0 pl-[18px] pr-3 text-[13px] font-medium text-text outline-none"
      >
        {SEARCH_TYPES.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Lingotin 5 g, alliance 18 carats, bijoutier à Bobo…"
        aria-label="Rechercher"
        className="min-w-0 flex-1 border-0 bg-transparent px-3.5 text-sm text-text outline-none"
      />
      <button aria-label="Rechercher" className="m-1 flex h-10 w-11 flex-none items-center justify-center rounded-full border-0 bg-gold text-ink">
        <Icon name="search" size={20} stroke={1.75} />
      </button>
    </form>
  );
}
