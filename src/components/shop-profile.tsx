import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, StarIcon } from "./icons";
import { Breadcrumb, Mono, Visual } from "./ui";
import { dateShort } from "@/lib/format";
import { SHOP_TYPES } from "@/lib/labels";
import type { Review, Shop } from "@/lib/types";

/** En-tête de page d'une structure vérifiée (bijoutier, comptoir, fondeur, livreur). */
export function ShopHeader({ shop, crumbs, actions }: { shop: Shop; crumbs: { href?: string; label: string }[]; actions?: ReactNode }) {
  return (
    <>
      <div className="wrap pt-[clamp(16px,2.5vw,28px)]">
        <Breadcrumb items={crumbs} />
      </div>
      <section className="wrap mt-5">
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <Visual src={shop.cover_url} label={null} tone="ink2" center={false} className="flex h-[clamp(140px,18vw,220px)] items-start justify-end px-4 py-3">
            {!shop.cover_url && <span className="font-mono text-[11px] text-muted-2">photo · atelier {shop.name}</span>}
          </Visual>
          <div className="flex flex-wrap items-end gap-5 px-[clamp(18px,3vw,32px)] pb-6">
            {shop.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shop.logo_url} alt={shop.name} className="-mt-12 h-24 w-24 rounded-2xl border-4 border-white bg-ivory object-cover shadow" />
            ) : (
              <Mono text={shop.mono} className="-mt-12 h-24 w-24 rounded-2xl border-4 border-white bg-ivory text-[32px] shadow-[0_1px_3px_rgba(26,24,20,.1)]" />
            )}
            <div className="min-w-[220px] flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="m-0 font-serif text-[clamp(32px,3.6vw,46px)] font-semibold leading-tight">{shop.name}</h1>
                <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-ok-bg px-2.5 text-xs font-semibold text-ok">
                  <Icon name="shield-check" size={14} stroke={1.75} />
                  {shop.type === "officielle" ? "Officiel" : "Vérifié"}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
                <span>{SHOP_TYPES[shop.type]}</span>
                <span className="flex items-center gap-1">
                  <Icon name="pin" size={13} />
                  {shop.city}
                </span>
                {shop.specialty && <span>{shop.specialty}</span>}
                {shop.reviews_count > 0 && (
                  <span className="flex items-center gap-1">
                    <StarIcon size={13} />
                    <b className="text-text">{String(shop.rating).replace(".", ",")}</b> · {shop.reviews_count} avis
                  </span>
                )}
              </div>
            </div>
            {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
          </div>
        </div>
      </section>
    </>
  );
}

export function ShopFacts({ shop, extra = [] }: { shop: Shop; extra?: [string, string | null | undefined][] }) {
  const rows: [string, string | null | undefined][] = [
    ["Responsable", shop.responsible_name],
    ["Adresse", shop.address],
    ["Téléphone", shop.phone],
    ["E-mail", shop.email],
    ["Zones desservies", shop.zones?.join(", ")],
    ["RCCM", shop.rccm],
    ...extra,
    ["Vérifié depuis", shop.verified_at ? dateShort(shop.verified_at) : null],
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="border-b border-sand px-5 py-4 text-[15px] font-semibold">Informations professionnelles</div>
      {rows
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k} className="grid grid-cols-[minmax(110px,.7fr)_minmax(0,1.3fr)] gap-3 border-t border-sand-2 px-5 py-3 text-sm">
            <span className="text-muted">{k}</span>
            <span className="font-medium [overflow-wrap:anywhere]">{v}</span>
          </div>
        ))}
      <div className="flex items-start gap-2.5 bg-ivory px-5 py-3.5 text-xs leading-relaxed text-muted">
        <Icon name="shield-check" size={16} className="flex-none text-ok" />
        Registre de commerce, identifiant fiscal et autorisations contrôlés par l&apos;équipe conformité Burkina Or.
      </div>
    </div>
  );
}

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (!reviews.length) return <p className="text-sm text-muted">Pas encore d&apos;avis publiés.</p>;
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-4">
      {reviews.map((r) => (
        <figure key={r.id} className="m-0 flex flex-col gap-3 rounded-xl border border-line bg-white p-5">
          <div className="flex gap-0.5">
            {Array.from({ length: r.rating }).map((_, i) => (
              <StarIcon key={i} size={14} />
            ))}
          </div>
          <blockquote className="m-0 font-serif text-xl leading-snug">« {r.body} »</blockquote>
          <figcaption className="mt-auto text-xs text-muted">
            <b className="text-text">{r.author_name}</b> · {r.author_meta}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export function ShopCard({ shop, href }: { shop: Shop; href: string }) {
  return (
    <Link href={href} className="overflow-hidden rounded-xl border border-line bg-white text-text hover:text-text hover:shadow-[0_10px_28px_-12px_rgba(26,24,20,.18)]">
      <Visual src={shop.cover_url} label={null} tone="ink2" center={false} className="flex h-[120px] items-start justify-end px-3 py-2.5">
        {!shop.cover_url && <span className="font-mono text-[10px] text-muted-2">photo · atelier</span>}
      </Visual>
      <div className="px-[18px] pb-[18px]">
        <Mono text={shop.mono} className="-mt-8 h-16 w-16 rounded-xl border-[3px] border-white bg-ivory text-[22px] shadow-[0_1px_3px_rgba(26,24,20,.1)]" />
        <div className="mt-3 flex items-center gap-1.5 text-[15px] font-semibold">
          {shop.name}
          <Icon name="shield-check" size={15} stroke={1.75} className="text-ok" />
        </div>
        <div className="mt-0.5 text-[13px] text-muted">
          {shop.city} · {shop.specialty}
        </div>
        {shop.tagline && <p className="mb-0 mt-2 line-clamp-2 text-[13px] leading-relaxed text-body">{shop.tagline}</p>}
        <div className="mt-3 flex items-center gap-1.5 text-[13px]">
          {shop.reviews_count > 0 ? (
            <>
              <StarIcon />
              <b className="tnum">{String(shop.rating).replace(".", ",")}</b>
              <span className="text-muted">· {shop.reviews_count} avis</span>
            </>
          ) : (
            <span className="text-muted">Nouveau sur Burkina Or</span>
          )}
        </div>
      </div>
    </Link>
  );
}
