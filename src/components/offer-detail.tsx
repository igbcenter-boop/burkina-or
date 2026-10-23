import Link from "next/link";
import { Icon } from "./icons";
import { Breadcrumb, Mono, Visual } from "./ui";
import { QuoteForm } from "./quote-form";
import { ContactSeller } from "./contact-seller";
import { specRows } from "@/lib/specs";
import type { ProductWithShop, Shop } from "@/lib/types";

/** Fiche d'une offre de gros ou d'une prestation, avec formulaire de devis. */
export function OfferDetail({ p, shop, base }: { p: ProductWithShop; shop: Shop; base: { href: string; label: string; shopHref: string } }) {
  const specs = specRows(p);
  const service = p.kind === "service";
  const back = service ? `/fondeurs/services/${p.slug}` : `/grossistes/offres/${p.slug}`;
  return (
    <main className="wrap pb-24 pt-[clamp(16px,2.5vw,28px)]">
      <Breadcrumb items={[{ href: "/", label: "Accueil" }, { href: base.href, label: base.label }, { href: base.shopHref, label: shop.name }, { label: p.name }]} />
      <div className="mt-5 grid items-start gap-[clamp(24px,4vw,48px)] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Visual src={p.images[0]} label={p.image_label} tone="ink" className="aspect-[16/9] rounded-xl" priority />
          <div>
            <div className="flex flex-wrap gap-2">
              {p.purity && (
                <span
                  className="inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold"
                  style={{ background: p.purity_verified ? "#E5F0EA" : "#EFECE6", color: p.purity_verified ? "#1E6B4A" : "#55524C" }}
                >
                  <Icon name={p.purity_verified ? "shield-check" : "info"} size={14} stroke={1.75} />
                  Pureté {p.purity} · {p.purity_verified ? "vérifiée par Burkina Or" : "déclarée par le vendeur"}
                </span>
              )}
              {p.category && <span className="inline-flex h-7 items-center rounded-md bg-sand px-2.5 text-xs font-semibold text-gold-dark">{p.category.name}</span>}
            </div>
            <h1 className="mt-3.5 font-serif text-[clamp(34px,4vw,50px)] font-semibold leading-[1.04]">{p.name}</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-body">{p.description}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              [service ? "Minimum" : "Commande minimale", p.min_order_qty],
              [service ? "Capacité" : "Quantité disponible", p.available_qty],
              ["Tarification", p.price_terms ?? "Sur devis"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-line bg-white p-4">
                <div className="text-xs text-muted">{k}</div>
                <div className="mt-1 text-lg font-semibold">{v ?? "—"}</div>
              </div>
            ))}
          </div>
          {p.sale_conditions && (
            <div className="rounded-xl bg-sand p-5 text-sm leading-relaxed text-body">
              <b className="text-text">Conditions de vente · </b>
              {p.sale_conditions}
            </div>
          )}
          {specs.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-line bg-white">
              <div className="border-b border-sand px-[22px] py-[18px] text-[15px] font-semibold">Caractéristiques &amp; documents</div>
              {specs.map((r) => (
                <div key={r.k} className="grid grid-cols-[minmax(110px,.8fr)_minmax(0,1.4fr)_auto] items-center gap-3 border-t border-sand-2 px-[22px] py-[13px] text-sm">
                  <span className="text-muted">{r.k}</span>
                  <span className="font-semibold">{r.v}</span>
                  <span className="inline-flex h-6 items-center rounded-md px-2 text-[11px] font-semibold" style={{ background: r.verified ? "#E5F0EA" : "#EFECE6", color: r.verified ? "#1E6B4A" : "#55524C" }}>
                    {r.verified ? "Vérifié" : "Déclaré"}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link href={base.shopHref} className="flex items-center gap-4 rounded-xl border border-line bg-white p-5 text-text hover:text-text">
            <Mono text={shop.mono} className="h-14 w-14 flex-none rounded-xl bg-ivory text-xl" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-semibold">
                {shop.name}
                <Icon name="shield-check" size={15} stroke={1.75} className="text-ok" />
              </div>
              <div className="text-[13px] text-muted">
                {shop.city} · {shop.authorization_number ? `Autorisation ${shop.authorization_number}` : shop.specialty}
              </div>
            </div>
            <Icon name="chevron-right" size={18} className="text-gold-dark" />
          </Link>
        </div>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          <QuoteForm shopId={shop.id} productId={p.id} productType={p.category?.name ?? p.name} purity={p.purity} back={back} service={service} />
          <ContactSeller shopId={shop.id} shopName={shop.name} back={back} label="Poser une question" subject={p.name} />
          <p className="m-0 text-xs leading-relaxed text-muted">
            Les transactions professionnelles d&apos;or sont soumises aux obligations de traçabilité et de lutte contre le blanchiment : une pièce d&apos;identité et, le cas échéant, un justificatif d&apos;activité peuvent vous être demandés.
          </p>
        </aside>
      </div>
    </main>
  );
}
