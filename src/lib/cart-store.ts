"use client";

import { useSyncExternalStore } from "react";

export type CartLine = {
  key: string;
  productId: string;
  slug: string;
  qty: number;
  options?: { size?: string; engraving?: string };
};

export type CartState = {
  lines: CartLine[];
  /** Horodatage (ms) et cours public 24 ct au moment de la garantie de prix. */
  lockedAt: number | null;
  lockedPrice: number | null;
};

const KEY = "bo-cart-v1";
const EMPTY: CartState = { lines: [], lockedAt: null, lockedPrice: null };
const listeners = new Set<() => void>();
let state: CartState = EMPTY;
let loaded = false;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    state = EMPTY;
  }
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    try {
      state = e.newValue ? { ...EMPTY, ...JSON.parse(e.newValue) } : EMPTY;
    } catch {
      state = EMPTY;
    }
    listeners.forEach((l) => l());
  });
}

function commit(next: CartState) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* stockage indisponible : le panier reste en mémoire */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  load();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getCart(): CartState {
  load();
  return state;
}

export function useCart(): CartState {
  return useSyncExternalStore(subscribe, getCart, () => EMPTY);
}

export function useCartCount(): number {
  const c = useCart();
  return c.lines.reduce((s, l) => s + l.qty, 0);
}

const lineKey = (productId: string, o?: CartLine["options"]) => [productId, o?.size ?? "", o?.engraving ?? ""].join("|");

export const cart = {
  add(productId: string, slug: string, qty: number, p24: number, options?: CartLine["options"], max = 99) {
    const cur = getCart();
    const key = lineKey(productId, options);
    const existing = cur.lines.find((l) => l.key === key);
    const lines = existing
      ? cur.lines.map((l) => (l.key === key ? { ...l, qty: Math.min(max, l.qty + qty) } : l))
      : [...cur.lines, { key, productId, slug, qty: Math.min(max, qty), options }];
    commit({ lines, lockedAt: Date.now(), lockedPrice: p24 });
  },
  setQty(key: string, qty: number) {
    const cur = getCart();
    commit({ ...cur, lines: cur.lines.map((l) => (l.key === key ? { ...l, qty: Math.max(1, qty) } : l)) });
  },
  remove(key: string) {
    const cur = getCart();
    const lines = cur.lines.filter((l) => l.key !== key);
    commit(lines.length ? { ...cur, lines } : EMPTY);
  },
  restore(lines: CartLine[]) {
    const cur = getCart();
    commit({ ...cur, lines });
  },
  relock(p24: number) {
    const cur = getCart();
    commit({ ...cur, lockedAt: Date.now(), lockedPrice: p24 });
  },
  clear() {
    commit(EMPTY);
  },
};
