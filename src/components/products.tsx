"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "./icons";
import { Tag, Visual } from "./ui";
import { toast } from "./toast";
import { useGold } from "./gold";
import { cart } from "@/lib/cart-store";
import { fcfa, n0 } from "@/lib/format";
import { PURITIES, priceOf } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/client";
import type { ProductWithShop } from "@/lib/types";

export type CardProduct = Pick<
  ProductWithShop,
  | "id" | "slug" | "name" | "kind" | "images" | "image_label" | "weight_g" | "purity" | "purity_factor" | "karat" | "form"
  | "pricing_mode" | "fabrication_fee" | "fixed_price" | "stock_status" | "badge" | "max_per_order" | "weight_verified"
  | "purity_verified" | "shop" | "price_terms" | "min_order_qty" | "stock_qty"
>;

export function hrefOf(p: Pick<CardProduct, "kind" | "slug">) {
  if (p.kind === "lingot") return `/boutique-officielle/${p.slug}`;
  if (p.kind === "bijou") return `/bijoux/${p.slug}`;
  if (p.kind === "service") return `/fondeurs/services/${p.slug}`;
  return `/grossistes/offres/${p.slug}`;
}

export function usePrice(p: Parameters<typeof priceOf>[0]) {
  const { quote } = useGold();
  return priceOf(p, quote.p24);
}

/** Prix en direct + détail « Or … + façon … ». */
export function LivePrice({ p, big = false }: { p: CardProduct; big?: boolean }) {
  const pr = usePrice(p);
  if (pr.onQuote) return <div className={`${big ? "text-[19px]" : "text-lg"} font-semibold`}>Sur devis</div>;
  return (
    <div>
      <div className={`${big ? "text-[19px]" : "text-lg"} font-semibold tnum`}>{fcfa(pr.total)}</div>
      {p.pricing_mode === "indexed" && (
        <div className="text-xs text-muted tnum">
          Or {n0(pr.gold)} + façon {n0(pr.fabrication)}
        </div>
      )}
    </div>
  );
}

export function useAddToCart() {
  const { quote } = useGold();
  return (p: Pick<CardProduct, "id" | "slug" | "max_per_order" | "name">, qty = 1, options?: { size?: string; engraving?: string }, msg?: string) => {
    cart.add(p.id, p.slug, qty, quote.p24, options, p.max_per_order || 20);
    toast(msg ?? "Ajouté au panier", { link: { href: "/commande", label: "Voir le panier" } });
  };
}

export function AddToCartButton({ p, className = "", label = "Ajouter au panier" }: { p: CardProduct; className?: string; label?: string }) {
  const add = useAddToCart();
  const out = p.stock_status === "out";
  return (
    <button
      onClick={() => (out ? toast("Nous vous préviendrons du réassort") : add(p, 1, undefined, p.kind === "lingot" ? `Lingotin ${n0(p.weight_g)} g ajouté` : undefined))}
      className={`h-11 rounded-lg border-0 text-[13px] font-semibold ${out ? "bg-sand text-body" : "bg-gold text-ink hover:bg-gold-light"} ${className}`}
    >
      {out ? "Me prévenir" : label}
    </button>
  );
}

function badgeOf(p: CardProduct): [string, string, string] | null {
  if (p.stock_status === "out") return ["Rupture", "#F6E4E2", "#A8322D"];
  if (p.stock_status === "low" || p.badge === "limited") return ["Stock limité", "#F8EEDC", "#8A5A12"];
  if (p.badge === "new") return ["Nouveau", "#0E0E10", "#D9BC6E"];
  if (p.badge === "top") return ["Le plus vendu", "#FFFFFF", "#1A1814"];
  return null;
}

/** Carte lingotin (accueil & boutique officielle). */
export function LingotCard({ p, compare, onCompare, showForm = false }: { p: CardProduct; compare?: boolean; onCompare?: () => void; showForm?: boolean }) {
  const badge = badgeOf(p);
  const href = hrefOf(p);
  return (
    <article
      className="flex flex-col overflow-hidden rounded-xl bg-white transition-shadow hover:shadow-[0_10px_28px_-12px_rgba(26,24,20,.18)]"
      style={{ border: compare ? "1.5px solid #B8923A" : "1px solid #E6DFCF" }}
    >
      <Link href={href} className="block">
        <Visual src={p.images[0]} label={p.image_label ?? p.name} tone={p.purity === "999,9 ‰" ? "ink" : "ink2"} className="aspect-[4/3]">
          {badge && (
            <span className="absolute left-3 top-3 inline-flex h-6 items-center rounded-md px-2 text-[11px] font-semibold" style={{ background: badge[1], color: badge[2] }}>
              {badge[0]}
            </span>
          )}
        </Visual>
      </Link>
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex flex-wrap gap-1.5">
          <Tag tone={p.purity_verified ? "ok" : "mute"} icon={p.purity_verified ? "shield" : "info"}>
            {p.purity} {p.purity_verified ? "vérifié" : "déclaré"}
          </Tag>
          {showForm && p.form && (
            <span className="inline-flex h-6 items-center rounded-md border border-line bg-ivory px-2 text-[11px] font-medium text-body">{p.form}</span>
          )}
        </div>
        <Link href={href} className="text-text hover:text-text">
          <h3 className="m-0 font-serif text-[22px] font-semibold">{p.name.replace(" · 24 carats", " · 24 ct").replace(" · 22 carats", " · 22 ct").replace(" · 18 carats", " · 18 ct")}</h3>
        </Link>
        <div className="mt-auto">
          <LivePrice p={p} big />
        </div>
        <div className="flex items-center gap-2">
          <AddToCartButton p={p} className="flex-1" />
          {onCompare && (
            <button
              onClick={onCompare}
              aria-label="Comparer"
              title="Comparer"
              className="flex h-11 w-11 flex-none items-center justify-center rounded-lg"
              style={{ border: compare ? "1.5px solid #8C6A1F" : "1px solid #E6DFCF", background: compare ? "#F1EBDD" : "#FFFFFF", color: compare ? "#8C6A1F" : "#6E6A63" }}
            >
              <Icon name="scale" size={18} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Favoris (persistés en base pour les utilisateurs connectés) ─────
let favIds: Set<string> | null = null;
let favUser: string | null = null;
const favListeners = new Set<() => void>();
let favLoading: Promise<void> | null = null;
function loadFavs() {
  if (favLoading) return favLoading;
  favLoading = (async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    favUser = data.user?.id ?? null;
    if (!favUser) {
      favIds = new Set();
    } else {
      const { data: rows } = await supabase.from("favorites").select("product_id").eq("user_id", favUser);
      favIds = new Set((rows ?? []).map((r) => r.product_id as string));
    }
    favListeners.forEach((l) => l());
  })();
  return favLoading;
}
function useFavs() {
  useEffect(() => {
    loadFavs();
  }, []);
  return useSyncExternalStore(
    (cb) => {
      favListeners.add(cb);
      return () => favListeners.delete(cb);
    },
    () => favIds,
    () => null,
  );
}

export function FavButton({ productId, className = "" }: { productId: string; className?: string }) {
  const favs = useFavs();
  const [busy, setBusy] = useState(false);
  const on = !!favs?.has(productId);
  return (
    <button
      disabled={busy}
      onClick={async (e) => {
        e.preventDefault();
        await loadFavs();
        if (!favUser) {
          toast("Connectez-vous pour enregistrer vos favoris", { link: { href: "/connexion", label: "Se connecter" } });
          return;
        }
        setBusy(true);
        const supabase = createClient();
        if (on) {
          await supabase.from("favorites").delete().eq("user_id", favUser).eq("product_id", productId);
          favIds = new Set([...(favIds ?? [])].filter((x) => x !== productId));
        } else {
          await supabase.from("favorites").insert({ user_id: favUser, product_id: productId });
          favIds = new Set([...(favIds ?? []), productId]);
          toast("Ajouté à vos favoris", { link: { href: "/compte/favoris", label: "Voir" } });
        }
        favListeners.forEach((l) => l());
        setBusy(false);
      }}
      aria-label={on ? "Retirer des favoris" : "Ajouter aux favoris"}
      aria-pressed={on}
      className={`flex h-11 w-11 items-center justify-center rounded-full border-0 bg-white ${className}`}
    >
      <Icon name="heart" size={18} fill={on ? "#A8322D" : "none"} stroke={1.5} style={{ color: on ? "#A8322D" : "#1A1814" }} />
    </button>
  );
}

/** Carte bijou (nouveautés, catalogue, boutique bijoutier). */
export function JewelCard({ p, showNew = false }: { p: CardProduct; showNew?: boolean }) {
  const href = hrefOf(p);
  const verified = p.weight_verified;
  return (
    <article className="overflow-hidden rounded-xl border border-line bg-white transition-shadow hover:shadow-[0_10px_28px_-12px_rgba(26,24,20,.18)]">
      <Link href={href} className="block">
        <Visual src={p.images[0]} label={p.image_label ?? p.name} tone="sand" className="aspect-square">
          {(showNew || p.badge === "new") && (
            <span className="absolute left-3 top-3 inline-flex h-6 items-center rounded-md bg-ink px-2 text-[11px] font-semibold text-gold-light">Nouveau</span>
          )}
          <FavButton productId={p.id} className="absolute right-2 top-2" />
        </Visual>
      </Link>
      <div className="p-4">
        <Tag tone={verified ? "ok" : "mute"}>
          {p.karat ?? PURITIES[p.purity ?? ""]?.ct} · {verified ? "poids vérifié" : "déclaré"}
        </Tag>
        <Link href={href} className="text-text hover:text-text">
          <h3 className="mt-2.5 font-serif text-[21px] font-semibold">{p.name}</h3>
        </Link>
        <div className="mt-0.5 text-[13px] text-muted">{p.shop.name}</div>
        <div className="mt-3 text-lg font-semibold tnum">
          <JewelPrice p={p} />
        </div>
      </div>
    </article>
  );
}

function JewelPrice({ p }: { p: CardProduct }) {
  const pr = usePrice(p);
  if (pr.onQuote) return <>Sur devis</>;
  return <>{fcfa(pr.total)}</>;
}
