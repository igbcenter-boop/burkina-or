"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Icon } from "./icons";

type ToastState = { text: string; sub?: string; link?: { href: string; label: string }; id: number } | null;

let current: ToastState = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

export function toast(text: string, opts: { sub?: string; link?: { href: string; label: string }; duration?: number } = {}) {
  current = { text, sub: opts.sub, link: opts.link, id: Date.now() };
  listeners.forEach((l) => l());
  clearTimeout(timer);
  timer = setTimeout(() => {
    current = null;
    listeners.forEach((l) => l());
  }, opts.duration ?? 2600);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Toast sombre des maquettes (« Ajouté au panier · Voir le panier »). */
export function Toaster({ position = "bottom" }: { position?: "bottom" | "top" }) {
  const t = useSyncExternalStore(subscribe, () => current, () => null);
  if (!t) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-1/2 z-[70] flex w-max max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-3 rounded-xl border border-gold-light/25 bg-text px-[18px] py-3.5 text-ivory shadow-[0_16px_40px_-12px_rgba(0,0,0,.45)] ${
        position === "top" ? "top-[140px]" : "bottom-[150px] lg:bottom-24"
      }`}
    >
      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-ok">
        <Icon name="check" size={14} stroke={2.5} className="text-white" />
      </span>
      <span className="text-sm font-semibold">{t.text}</span>
      {t.sub && <span className="text-xs text-stone">{t.sub}</span>}
      {t.link && (
        <Link href={t.link.href} className="ml-2 text-[13px] font-semibold text-gold-light">
          {t.link.label}
        </Link>
      )}
    </div>
  );
}
