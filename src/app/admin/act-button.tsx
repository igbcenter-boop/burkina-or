"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { toast } from "@/components/toast";

type Res = { ok: boolean; error?: string; message?: string };

/** Bouton déclenchant une action serveur liée (avec confirmation optionnelle). */
export function ActButton({
  action,
  children,
  success = "Enregistré",
  confirmText,
  variant = "outline",
  className = "",
}: {
  action: () => Promise<Res>;
  children: ReactNode;
  success?: string;
  confirmText?: string;
  variant?: "outline" | "gold" | "danger" | "ok" | "ghost";
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const styles = {
    outline: "border border-a-line bg-transparent text-a-text",
    gold: "border-0 bg-gold text-ink",
    danger: "border border-err/60 bg-transparent text-a-err",
    ok: "border-0 bg-ok text-white",
    ghost: "border-0 bg-transparent text-a-muted",
  }[variant];
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirmText && !window.confirm(confirmText)) return;
        start(async () => {
          const r = await action();
          if (!r.ok) return toast(r.error ?? "Action impossible");
          toast(r.message ?? success);
          router.refresh();
        });
      }}
      className={`h-9 whitespace-nowrap rounded-lg px-3 text-xs font-semibold disabled:opacity-60 ${styles} ${className}`}
    >
      {pending ? "…" : children}
    </button>
  );
}

/** Liste déroulante appliquant immédiatement une action serveur. */
export function ActSelect({ action, value, options, className = "" }: { action: (v: string) => Promise<Res>; value: string; options: [string, string][]; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      disabled={pending}
      value={value}
      onChange={(e) =>
        start(async () => {
          const r = await action(e.target.value);
          if (!r.ok) return toast(r.error ?? "Action impossible");
          toast("Mis à jour");
          router.refresh();
        })
      }
      className={`h-9 rounded-lg border border-a-line bg-a-input px-2 text-xs text-a-text ${className}`}
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}
