import Link from "next/link";
import type { ReactNode } from "react";
import { ADMIN_TONE, type Tone } from "@/lib/labels";

export function APill({ tone = "mute", children, dot = false, className = "" }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={`inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium ${ADMIN_TONE[tone]} ${className}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function ACard({ children, className = "", pad = true }: { children: ReactNode; className?: string; pad?: boolean }) {
  return <section className={`overflow-hidden rounded-xl border border-a-line bg-a-card ${pad ? "p-[22px]" : ""} ${className}`}>{children}</section>;
}

export function ACardHead({ title, right }: { title: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-a-line2 px-[22px] py-[18px]">
      <h2 className="m-0 text-base font-semibold">{title}</h2>
      {right}
    </div>
  );
}

/** Puces de filtre (style maquette : actif = fond texte). */
export function AChips({ items }: { items: { href: string; label: string; on: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          scroll={false}
          className={`flex h-[38px] items-center whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium ${i.on ? "border-a-text bg-a-text text-a-bg hover:text-a-bg" : "border-a-line bg-a-card text-a-text hover:text-a-text"}`}
        >
          {i.label}
        </Link>
      ))}
    </div>
  );
}

export function ATable({ head, children, min = 640 }: { head: ReactNode[]; children: ReactNode; min?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm" style={{ minWidth: min }}>
        <thead>
          <tr className="bg-a-soft text-left text-xs text-a-muted">
            {head.map((h, i) => (
              <th key={i} className={`py-3 font-medium ${i === 0 ? "pl-5 pr-3" : i === head.length - 1 ? "pl-3 pr-5" : "px-3"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function AEmpty({ title, text }: { title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-6 py-12 text-center">
      <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-p-ok-bg text-xl text-p-ok">✓</span>
      <div className="text-[15px] font-semibold">{title}</div>
      {text && <div className="text-[13px] text-a-muted">{text}</div>}
    </div>
  );
}

export function ASkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl border border-a-line bg-a-card" />
      ))}
    </div>
  );
}
