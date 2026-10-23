import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, StarIcon, type IconName } from "./icons";
import { TONE_CLASSES, type Tone } from "@/lib/labels";

export function Logo({ size = 30, href = "/", light = true }: { size?: number; href?: string | null; light?: boolean }) {
  const inner = (
    <span className="flex items-baseline gap-1.5 font-serif font-semibold leading-none" style={{ fontSize: size }}>
      <span className={light ? "text-ivory" : "text-text"}>Burkina</span>
      <span className="gold-text">Or</span>
    </span>
  );
  if (!href) return inner;
  return (
    <Link href={href} aria-label="Burkina Or · accueil" className="flex-none">
      {inner}
    </Link>
  );
}

export function Pill({ tone = "mute", children, className = "", dot = false }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={`inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold ${TONE_CLASSES[tone]} ${className}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** Étiquette carrée (6px) des fiches produit. */
export function Tag({ tone = "mute", icon, children, className = "" }: { tone?: Tone; icon?: IconName; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-semibold ${TONE_CLASSES[tone]} ${className}`}>
      {icon && <Icon name={icon} size={12} stroke={2} />}
      {children}
    </span>
  );
}

export function VerifiedTag({ verified, children }: { verified: boolean; children: ReactNode }) {
  return verified ? (
    <Tag tone="ok" icon="shield">{children}</Tag>
  ) : (
    <Tag tone="mute" icon="info">{children}</Tag>
  );
}

/**
 * Visuel produit : photo réelle si disponible, sinon le motif rayé des
 * maquettes avec la légende « photo · … ».
 */
export function Visual({
  src,
  label,
  tone = "ink",
  className = "",
  labelClass = "",
  children,
  sizes = "(max-width: 900px) 50vw, 25vw",
  center = true,
  priority = false,
}: {
  src?: string | null;
  label?: string | null;
  tone?: "ink" | "ink2" | "sand";
  className?: string;
  labelClass?: string;
  children?: ReactNode;
  sizes?: string;
  center?: boolean;
  priority?: boolean;
}) {
  const bg = tone === "sand" ? "stripes-sand" : tone === "ink2" ? "stripes-ink-2" : "stripes-ink";
  return (
    <div className={`relative overflow-hidden ${bg} ${center ? "flex items-center justify-center p-3 text-center" : ""} ${className}`}>
      {src ? (
        <Image src={src} alt={label ?? ""} fill sizes={sizes} className="object-cover" priority={priority} />
      ) : (
        label && (
          <span className={`font-mono text-[11px] ${tone === "sand" ? "text-muted" : "text-muted-2"} ${labelClass}`}>photo · {label}</span>
        )
      )}
      {children}
    </div>
  );
}

export function Stars({ rating, reviews, size = 14 }: { rating: number; reviews?: number; size?: number }) {
  return (
    <span className="flex items-center gap-1.5 text-[13px]">
      <StarIcon size={size} />
      <b className="tnum">{String(Number(rating).toFixed(1)).replace(".", ",")}</b>
      {reviews != null && <span className="text-muted">· {reviews} avis</span>}
    </span>
  );
}

export function SectionHead({ eyebrow, title, link, className = "" }: { eyebrow: string; title: string; link?: { href: string; label: string }; className?: string }) {
  return (
    <div className={`mb-7 flex flex-wrap items-end justify-between gap-4 ${className}`}>
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2 className="h-section">{title}</h2>
      </div>
      {link && (
        <Link href={link.href} className="flex items-center gap-1.5 text-sm font-semibold">
          {link.label}
          <Icon name="arrow-right" size={16} stroke={1.75} />
        </Link>
      )}
    </div>
  );
}

export function Breadcrumb({ items, dark = false }: { items: { href?: string; label: string }[]; dark?: boolean }) {
  return (
    <nav aria-label="Fil d'Ariane" className={`flex flex-wrap gap-2 text-[13px] ${dark ? "text-muted-2" : "text-muted"}`}>
      {items.map((it, i) => (
        <span key={i} className="flex gap-2">
          {i > 0 && <span>/</span>}
          {it.href ? (
            <Link href={it.href} className={dark ? "text-stone" : "text-muted"}>
              {it.label}
            </Link>
          ) : (
            <span className={dark ? "" : "text-text"}>{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageHero({ crumbs, title, text, children }: { crumbs: { href?: string; label: string }[]; title: ReactNode; text?: ReactNode; children?: ReactNode }) {
  return (
    <section className="border-b border-gold/40 bg-ink text-ivory">
      <div className="wrap flex flex-wrap items-end justify-between gap-6 py-[clamp(28px,4vw,48px)]">
        <div>
          <Breadcrumb items={crumbs} dark />
          <h1 className="mt-3.5 font-serif text-[clamp(38px,4.6vw,60px)] font-semibold leading-none">{title}</h1>
          {text && <p className="mt-3 max-w-[560px] text-[15px] leading-relaxed text-stone">{text}</p>}
        </div>
        {children && <div className="flex flex-wrap gap-2.5">{children}</div>}
      </div>
    </section>
  );
}

export function EmptyState({ icon = "search", title, text, children }: { icon?: IconName; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-white px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sand text-gold-dark">
        <Icon name={icon} size={28} />
      </div>
      <h3 className="mt-2 font-serif text-[28px] font-semibold">{title}</h3>
      {text && <p className="max-w-[420px] text-sm leading-relaxed text-muted">{text}</p>}
      {children && <div className="mt-2 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}

export function Mono({ text, className = "" }: { text: string | null | undefined; className?: string }) {
  return (
    <span className={`flex items-center justify-center font-serif font-bold text-gold-dark ${className}`}>{text ?? "BO"}</span>
  );
}

export function Field({ label, hint, children, className = "" }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-2 ${className}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Notice({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return <div className={`rounded-[10px] px-4 py-3 text-[13px] leading-relaxed ${TONE_CLASSES[tone]}`}>{children}</div>;
}
