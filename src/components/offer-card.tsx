import Link from "next/link";
import { Icon } from "./icons";
import { Visual } from "./ui";
import type { ProductWithShop } from "@/lib/types";

/** Carte « offre de gros » ou « prestation » (pureté déclarée/vérifiée, minimum, tarification). */
export function OfferCard({ p }: { p: ProductWithShop }) {
  const href = p.kind === "service" ? `/fondeurs/services/${p.slug}` : `/grossistes/offres/${p.slug}`;
  return (
    <Link href={href} className="flex flex-col overflow-hidden rounded-xl border border-line bg-white text-text hover:text-text hover:shadow-[0_10px_28px_-12px_rgba(26,24,20,.18)]">
      <Visual src={p.images[0]} label={p.image_label} tone="ink" className="aspect-[16/9]">
        {p.stock_status === "low" && <span className="absolute left-3 top-3 inline-flex h-6 items-center rounded-md bg-warn-bg px-2 text-[11px] font-semibold text-warn">Disponibilité limitée</span>}
      </Visual>
      <div className="flex flex-1 flex-col gap-3 p-[18px]">
        <div className="flex flex-wrap gap-1.5">
          {p.purity && (
            <span
              className="inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-semibold"
              style={{ background: p.purity_verified ? "#E5F0EA" : "#EFECE6", color: p.purity_verified ? "#1E6B4A" : "#55524C" }}
            >
              <Icon name={p.purity_verified ? "shield" : "info"} size={12} stroke={2} />
              {p.purity} {p.purity_verified ? "vérifié" : "déclaré"}
            </span>
          )}
          {p.category && <span className="inline-flex h-6 items-center rounded-md border border-line bg-ivory px-2 text-[11px] font-medium text-body">{p.category.name}</span>}
        </div>
        <h3 className="m-0 font-serif text-[22px] font-semibold leading-tight">{p.name}</h3>
        <div className="text-[13px] text-muted">
          {p.shop.name} · {p.shop.city}
        </div>
        <dl className="m-0 mt-auto grid grid-cols-2 gap-x-4 gap-y-2 border-t border-sand pt-3 text-[13px]">
          <dt className="text-muted">{p.kind === "service" ? "Minimum" : "Commande min."}</dt>
          <dd className="m-0 text-right font-semibold">{p.min_order_qty ?? "—"}</dd>
          <dt className="text-muted">{p.kind === "service" ? "Capacité" : "Disponible"}</dt>
          <dd className="m-0 text-right font-semibold">{p.available_qty ?? "—"}</dd>
          <dt className="text-muted">Tarification</dt>
          <dd className="m-0 text-right font-semibold text-gold-dark">{p.price_terms ?? "Sur devis"}</dd>
        </dl>
      </div>
    </Link>
  );
}
