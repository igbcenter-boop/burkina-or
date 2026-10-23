"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon, StarIcon, WhatsAppIcon } from "@/components/icons";
import { useGold } from "@/components/gold";
import { useAddToCart } from "@/components/products";
import { toast } from "@/components/toast";
import { dateShort, fcfa, n0 } from "@/lib/format";
import { PURITIES, priceOf } from "@/lib/pricing";
import type { SpecRow } from "@/lib/specs";
import type { ProductWithShop } from "@/lib/types";

type W = { g: number; slug: string; out: boolean };
type Ship = { name: string; delay: string; price: number };

const THUMBS = ["face gravée (poids, pureté, n°)", "revers", "écrin scellé + certificat", "à la main, échelle"];

export function LingotDetail({
  p,
  specs,
  weights,
  similar,
  ship,
  retractionHours,
}: {
  p: ProductWithShop;
  specs: SpecRow[];
  weights: W[];
  similar: ProductWithShop[];
  ship: Ship[];
  retractionHours: number;
}) {
  const router = useRouter();
  const { quote, open } = useGold();
  const add = useAddToCart();
  const [img, setImg] = useState(0);
  const [zoom, setZoom] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [shipSel, setShipSel] = useState(0);

  const g = Number(p.weight_g);
  const P = PURITIES[p.purity ?? ""] ?? PURITIES["999,9 ‰"];
  const pr = priceOf(p, quote.p24);
  const out = p.stock_status === "out";
  const low = p.stock_status === "low";
  const maxQty = Math.min(p.max_per_order || 20, p.stock_qty ?? 99);
  const priceNote = open ? "Cours en direct · garanti 15 min au panier" : "Cours de clôture vendredi";
  const stock = out
    ? ["Rupture" + (p.restock_date ? " · réassort " + dateShort(p.restock_date).replace(/ \d{4}$/, "") : ""), "#F6E4E2", "#A8322D"]
    : low
      ? [`Stock limité · ${p.stock_qty ?? 3} restants`, "#F8EEDC", "#8A5A12"]
      : ["En stock", "#E5F0EA", "#1E6B4A"];
  const photos = p.images.length ? p.images : [];
  const thumbs = photos.length ? photos.map((_, i) => `photo ${i + 1}`) : THUMBS;
  const addLabel = out ? "Me prévenir du réassort" : "Ajouter au panier";

  const doAdd = () => {
    if (out) return toast("Nous vous préviendrons du réassort");
    add(p, qty, undefined, `${qty} × lingotin ${n0(g)} g ajouté`);
  };

  return (
    <>
      <div className="mt-5 grid items-start gap-[clamp(24px,4vw,56px)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Galerie */}
        <div className="flex flex-col-reverse gap-3 lg:sticky lg:top-6 lg:flex-row">
          <div className="flex flex-none flex-row gap-2.5 lg:flex-col">
            {thumbs.map((t, i) => (
              <button
                key={i}
                onClick={() => setImg(i)}
                aria-label={t}
                className="relative flex h-[72px] w-[72px] items-end overflow-hidden rounded-lg p-1.5"
                style={{ border: img === i ? "1.5px solid #B8923A" : "1px solid #E6DFCF", background: i === 2 && !photos.length ? "#F1EBDD" : "#1C1C1F" }}
              >
                {photos[i] ? (
                  <Image src={photos[i]} alt="" fill sizes="72px" className="object-cover" />
                ) : (
                  <span className="text-left font-mono text-[9px] leading-tight text-muted-2">{t.split(" ")[0]}</span>
                )}
              </button>
            ))}
          </div>
          <div
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setZoom(`${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}% ${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
            }}
            onMouseLeave={() => setZoom(null)}
            className="relative aspect-square flex-1 cursor-zoom-in overflow-hidden rounded-xl bg-ink"
          >
            <div
              className={`absolute inset-0 flex items-center justify-center p-6 text-center transition-transform duration-[250ms] ${img === 2 && !photos.length ? "stripes-sand" : "stripes-ink"}`}
              style={{ transform: `scale(${zoom ? 1.8 : 1})`, transformOrigin: zoom ?? "center" }}
            >
              {photos[img] ? (
                <Image src={photos[img]} alt={p.name} fill sizes="(max-width: 900px) 100vw, 50vw" className="object-cover" priority />
              ) : (
                <span className="font-mono text-xs text-muted-2">
                  photo · lingotin {n0(g)} g {P.ct} · {THUMBS[img]}
                </span>
              )}
            </div>
            <span className="gold-bg absolute left-4 top-4 inline-flex h-7 items-center rounded-md px-3 text-xs font-semibold text-ink">Boutique officielle</span>
            <span className="absolute bottom-4 right-4 inline-flex h-8 items-center gap-1.5 rounded-full bg-ink/70 px-3 text-xs text-cream">
              <Icon name="zoom-in" size={14} />
              Survolez pour zoomer
            </span>
          </div>
        </div>

        {/* Informations */}
        <div className="flex min-w-0 flex-col gap-[22px]">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-ok-bg px-2.5 text-xs font-semibold text-ok">
                <Icon name="shield-check" size={14} stroke={1.75} />
                {p.purity_verified ? "Pureté vérifiée par analyse" : "Pureté déclarée"}
              </span>
              {p.certificate_number && (
                <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-info-bg px-2.5 text-xs font-semibold text-info">
                  <Icon name="file" size={14} stroke={1.75} />
                  Certificat disponible
                </span>
              )}
              <span className="inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold" style={{ background: stock[1], color: stock[2] }}>
                {stock[0]}
              </span>
            </div>
            <h1 className="mt-3.5 font-serif text-[clamp(36px,4vw,52px)] font-semibold leading-[1.02]">{p.name}</h1>
            <div className="mt-2 flex flex-wrap gap-4 text-[13px] text-muted">
              <span>Réf. {p.serial_prefix ?? p.slug.toUpperCase()}</span>
              {p.reviews_count > 0 && (
                <span className="flex items-center gap-1">
                  <StarIcon />
                  <b className="text-text">{String(p.rating).replace(".", ",")}</b> · {n0(p.reviews_count)} avis
                </span>
              )}
              {p.sales_count > 0 && <span>{n0(p.sales_count)} vendus</span>}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-white p-[22px]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[clamp(30px,3vw,38px)] font-semibold leading-none tracking-[-.01em] tnum">{fcfa(pr.total * qty)}</div>
                <div className="mt-1.5 text-[13px] text-muted">
                  {n0(pr.total / g)} FCFA / g tout compris{qty > 1 ? ` · ${qty} × ${n0(pr.total)}` : ""}
                </div>
              </div>
              <span className="inline-flex h-[30px] items-center gap-2 rounded-full bg-sand px-3 text-xs font-semibold text-body">
                <span className="h-[7px] w-[7px] rounded-full" style={{ background: open ? "#1E6B4A" : "#8A857C" }} />
                {priceNote}
              </span>
            </div>
            <div className="my-[18px] h-px bg-sand" />
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2.5 text-sm tnum">
              <span className="text-muted">
                Or · {n0(quote.p24)} × {n0(g)} g{P.factor < 1 ? ` × ${p.purity}` : ""}
              </span>
              <span>{fcfa(pr.gold * qty)}</span>
              <span className="text-muted">Façon · frappe, numérotation, écrin scellé</span>
              <span>{fcfa(pr.fabrication * qty)}</span>
              <span className="text-muted">Certificat d&apos;analyse</span>
              <span className="font-semibold text-ok">Inclus</span>
              <span className="text-muted">Livraison sécurisée</span>
              <span className="text-muted">Calculée au checkout</span>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-sm font-semibold">Poids</span>
              <span className="text-[13px] text-muted">
                {p.purity} · {P.carats}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {weights.map((w) => {
                const on = w.slug === p.slug;
                return (
                  <Link
                    key={w.slug}
                    href={`/boutique-officielle/${w.slug}`}
                    scroll={false}
                    className="flex h-12 min-w-[60px] items-center justify-center rounded-lg px-3.5 text-sm font-semibold tnum"
                    style={{
                      border: on ? "1.5px solid #1A1814" : "1px solid #E6DFCF",
                      background: on ? "#1A1814" : "#FFFFFF",
                      color: on ? "#FAF7F0" : w.out ? "#8A857C" : "#1A1814",
                      textDecoration: w.out && !on ? "line-through" : "none",
                    }}
                  >
                    {n0(w.g)} g
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-stretch gap-3">
            <div className="inline-flex h-[52px] items-center rounded-lg border border-line bg-white">
              <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Diminuer" className="h-[50px] w-12 border-0 bg-transparent text-xl text-text">
                −
              </button>
              <span className="w-10 text-center font-semibold tnum">{qty}</span>
              <button onClick={() => setQty(Math.min(maxQty || 1, qty + 1))} aria-label="Augmenter" className="h-[50px] w-12 border-0 bg-transparent text-xl text-text">
                +
              </button>
            </div>
            <button
              onClick={doAdd}
              className="h-[52px] flex-[1_1_180px] rounded-lg border-0 text-[15px] font-semibold"
              style={{ background: out ? "#F1EBDD" : "#B8923A", color: out ? "#55524C" : "#0E0E10" }}
            >
              {addLabel}
            </button>
            <button
              disabled={out}
              onClick={() => {
                add(p, qty, undefined, `${qty} × lingotin ${n0(g)} g ajouté`);
                router.push("/commande");
              }}
              className="h-[52px] flex-[1_1_160px] rounded-lg border border-text bg-text text-[15px] font-semibold text-ivory disabled:opacity-50"
            >
              Acheter maintenant
            </button>
          </div>
          <Link href="/conseil?produit=lingotin" className="flex min-h-11 items-center gap-2.5 self-start text-sm font-semibold text-ok hover:text-ok-dark">
            <WhatsAppIcon size={20} />
            Parler à un conseiller avant d&apos;acheter
          </Link>

          <div className="overflow-hidden rounded-xl border border-line bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand px-[22px] py-[18px]">
              <span className="text-[15px] font-semibold">Caractéristiques &amp; origine</span>
              <span className="flex gap-3.5 text-xs text-muted">
                <span className="flex items-center gap-1 text-ok">
                  <Icon name="shield" size={13} stroke={2} />
                  Vérifié
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="info" size={13} stroke={2} />
                  Déclaré
                </span>
              </span>
            </div>
            {specs.map((r) => (
              <div key={r.k} className="grid grid-cols-[minmax(110px,.8fr)_minmax(0,1.4fr)_auto] items-center gap-3 border-t border-sand-2 px-[22px] py-[13px] text-sm">
                <span className="text-muted">{r.k}</span>
                <span className="font-semibold tnum">{r.v}</span>
                <span
                  title={r.tip}
                  className="inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-semibold"
                  style={{ background: r.verified ? "#E5F0EA" : "#EFECE6", color: r.verified ? "#1E6B4A" : "#55524C" }}
                >
                  {r.verified ? "Vérifié par Burkina Or" : "Déclaré par le fournisseur"}
                </span>
              </div>
            ))}
            {p.certificate_number && (
              <div className="flex flex-wrap items-center gap-3.5 bg-ivory px-[22px] py-4">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border border-line bg-white text-gold-dark">
                  <Icon name="file-check" size={20} />
                </span>
                <div className="min-w-[160px] flex-1">
                  <div className="text-sm font-semibold">Certificat d&apos;analyse n° {p.certificate_number}</div>
                  <div className="text-xs text-muted">
                    PDF · {p.certificate_lab} · {dateShort(p.certificate_date)}
                  </div>
                </div>
                <a
                  href={`/certificat/${p.slug}`}
                  target="_blank"
                  className="flex h-11 items-center gap-2 rounded-lg border border-gold-dark bg-white px-4 text-[13px] font-semibold text-gold-dark"
                >
                  <Icon name="download" size={16} stroke={1.75} />
                  Télécharger
                </a>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-line bg-white p-[22px]">
            <div className="mb-3.5 flex items-center justify-between">
              <span className="text-[15px] font-semibold">Livraison sécurisée</span>
              <span className="text-xs font-semibold text-ok">Assurée 100 % de la valeur</span>
            </div>
            <div className="flex flex-col gap-2">
              {ship.map((o, i) => {
                const on = shipSel === i;
                return (
                  <button
                    key={o.name}
                    onClick={() => setShipSel(i)}
                    className="grid min-h-14 grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-text"
                    style={{ border: on ? "1.5px solid #B8923A" : "1px solid #E6DFCF", background: on ? "#FAF7F0" : "#FFFFFF" }}
                  >
                    <span className="h-5 w-5 rounded-full bg-white" style={{ border: on ? "6px solid #B8923A" : "1.5px solid #8A857C" }} />
                    <span>
                      <span className="block text-sm font-semibold">{o.name}</span>
                      <span className="mt-0.5 block text-xs text-muted">{o.delay}</span>
                    </span>
                    <span className="text-sm font-semibold tnum">{o.price ? fcfa(o.price) : "Gratuit"}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3.5 text-xs leading-relaxed text-muted">
              Colis scellé et photographié à la collecte. Remis uniquement contre votre code sécurisé à 4 chiffres. Rétractation possible sous {retractionHours} h avant expédition.
            </p>
          </div>
        </div>
      </div>

      <section className="pt-[clamp(56px,7vw,88px)]">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <h2 className="m-0 font-serif text-[clamp(30px,3.2vw,42px)] font-semibold">Produits similaires</h2>
          <Link href="/boutique-officielle" className="text-sm font-semibold">
            Toute la boutique →
          </Link>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,160px),1fr))] gap-[clamp(12px,1.6vw,20px)] lg:grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))]">
          {similar.map((s) => (
            <Link
              key={s.id}
              href={`/boutique-officielle/${s.slug}`}
              className="flex flex-col overflow-hidden rounded-xl border border-line bg-white text-text hover:text-text hover:shadow-[0_10px_28px_-12px_rgba(26,24,20,.18)]"
            >
              <div className="stripes-ink relative flex aspect-[4/3] items-center justify-center">
                {s.images[0] ? <Image src={s.images[0]} alt={s.name} fill sizes="25vw" className="object-cover" /> : <span className="font-mono text-[11px] text-muted-2">photo · {s.image_label}</span>}
              </div>
              <div className="p-4">
                <div className="font-serif text-[21px] font-semibold">{s.name.replace(" · 24 carats", " · 24 ct")}</div>
                <div className="mt-2 text-[17px] font-semibold tnum">{fcfa(priceOf(s, quote.p24).total)}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <div className="h-24" />

      {/* Barre d'achat mobile */}
      <div className="fixed bottom-[68px] left-0 right-0 z-[37] flex items-center gap-3 border-t border-line bg-white px-4 py-2.5 shadow-[0_-8px_24px_-12px_rgba(26,24,20,.15)] lg:hidden">
        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-semibold tnum">{fcfa(pr.total * qty)}</div>
          <div className="text-[11px] text-muted">{priceNote}</div>
        </div>
        <button
          onClick={doAdd}
          className="h-12 rounded-lg border-0 px-5 text-sm font-semibold"
          style={{ background: out ? "#F1EBDD" : "#B8923A", color: out ? "#55524C" : "#0E0E10" }}
        >
          {addLabel}
        </button>
      </div>
    </>
  );
}
