"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { Icon, StarIcon, WhatsAppIcon } from "@/components/icons";
import { FavButton, useAddToCart, usePrice } from "@/components/products";
import { toast } from "@/components/toast";
import { fcfa, n0 } from "@/lib/format";
import { PURITIES } from "@/lib/pricing";
import { reportProduct, type FormState } from "@/lib/actions/public";
import { startConversation } from "@/lib/actions/account";
import type { SpecRow } from "@/lib/specs";
import type { ProductWithShop } from "@/lib/types";

const VIEWS = ["vue de face", "porté", "détail du travail", "écrin"];

export function JewelDetail({ p, specs }: { p: ProductWithShop; specs: SpecRow[] }) {
  const router = useRouter();
  const add = useAddToCart();
  const pr = usePrice(p);
  const [img, setImg] = useState(0);
  const [zoom, setZoom] = useState<string | null>(null);
  const [size, setSize] = useState(p.sizes[0] ?? "");
  const [engraving, setEngraving] = useState("");
  const [qty, setQty] = useState(1);
  const [modal, setModal] = useState<"report" | "contact" | null>(null);
  const out = p.stock_status === "out";
  const pur = PURITIES[p.purity ?? ""];
  const photos = p.images;
  const thumbs = photos.length ? photos : VIEWS;
  const maxQty = Math.min(p.max_per_order || 5, p.stock_qty ?? 99);
  const options = { size: size || undefined, engraving: engraving.trim() || undefined };

  const doAdd = (thenCheckout = false) => {
    if (out) return toast("Nous vous préviendrons dès que ce bijou sera de nouveau disponible");
    if (p.sizes.length && !size) return toast("Choisissez une taille");
    add(p, qty, options, `${p.name} ajouté au panier`);
    if (thenCheckout) router.push("/commande");
  };

  return (
    <>
      <div className="mt-5 grid items-start gap-[clamp(24px,4vw,56px)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex flex-col-reverse gap-3 lg:sticky lg:top-6 lg:flex-row">
          <div className="flex flex-none flex-row gap-2.5 lg:flex-col">
            {thumbs.map((t, i) => (
              <button
                key={i}
                onClick={() => setImg(i)}
                aria-label={photos.length ? `Photo ${i + 1}` : t}
                className="stripes-sand relative flex h-[72px] w-[72px] items-end overflow-hidden rounded-lg p-1.5"
                style={{ border: img === i ? "1.5px solid #B8923A" : "1px solid #E6DFCF" }}
              >
                {photos[i] ? <Image src={photos[i]} alt="" fill sizes="72px" className="object-cover" /> : <span className="text-left font-mono text-[9px] leading-tight text-muted">{t.split(" ")[0]}</span>}
              </button>
            ))}
          </div>
          <div
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setZoom(`${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}% ${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
            }}
            onMouseLeave={() => setZoom(null)}
            className="relative aspect-square flex-1 cursor-zoom-in overflow-hidden rounded-xl bg-sand"
          >
            <div className="stripes-sand absolute inset-0 flex items-center justify-center p-6 text-center transition-transform duration-[250ms]" style={{ transform: `scale(${zoom ? 1.8 : 1})`, transformOrigin: zoom ?? "center" }}>
              {photos[img] ? (
                <Image src={photos[img]} alt={p.name} fill sizes="(max-width: 900px) 100vw, 50vw" className="object-cover" priority />
              ) : (
                <span className="font-mono text-xs text-muted">
                  photo · {p.image_label} · {VIEWS[img]}
                </span>
              )}
            </div>
            {p.badge === "new" && <span className="absolute left-4 top-4 inline-flex h-7 items-center rounded-md bg-ink px-3 text-xs font-semibold text-gold-light">Nouveau</span>}
            <FavButton productId={p.id} className="absolute right-3 top-3" />
            {p.video_url && (
              <a href={p.video_url} target="_blank" rel="noreferrer" className="absolute bottom-4 left-4 inline-flex h-8 items-center gap-1.5 rounded-full bg-ink/70 px-3 text-xs text-cream hover:text-ivory">
                ▶ Vidéo de présentation
              </a>
            )}
            <span className="absolute bottom-4 right-4 inline-flex h-8 items-center gap-1.5 rounded-full bg-ink/70 px-3 text-xs text-cream">
              <Icon name="zoom-in" size={14} />
              Survolez pour zoomer
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-[22px]">
          <div>
            <div className="flex flex-wrap gap-2">
              <span
                className="inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold"
                style={{ background: p.purity_verified ? "#E5F0EA" : "#EFECE6", color: p.purity_verified ? "#1E6B4A" : "#55524C" }}
              >
                <Icon name={p.purity_verified ? "shield-check" : "info"} size={14} stroke={1.75} />
                {p.karat ?? pur?.ct} · titre {p.purity_verified ? "vérifié" : "déclaré par le vendeur"}
              </span>
              {p.weight_g && (
                <span
                  className="inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold"
                  style={{ background: p.weight_verified ? "#E5F0EA" : "#EFECE6", color: p.weight_verified ? "#1E6B4A" : "#55524C" }}
                >
                  {String(p.weight_g).replace(".", ",")} g {p.weight_verified ? "vérifiés" : "déclarés"}
                </span>
              )}
              {p.customizable && <span className="inline-flex h-7 items-center rounded-md bg-sand px-2.5 text-xs font-semibold text-gold-dark">Personnalisable</span>}
            </div>
            <h1 className="mt-3.5 font-serif text-[clamp(36px,4vw,52px)] font-semibold leading-[1.02]">{p.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-[13px] text-muted">
              <Link href={`/bijoutiers/${p.shop.slug}`} className="flex items-center gap-1.5 font-semibold text-text">
                {p.shop.name}
                <Icon name="shield-check" size={14} stroke={1.75} className="text-ok" />
              </Link>
              {p.reviews_count > 0 && (
                <span className="flex items-center gap-1">
                  <StarIcon />
                  <b className="text-text">{String(p.rating).replace(".", ",")}</b> · {p.reviews_count} avis
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
                  Prix tout compris · or, façon{p.customizable ? ", gravure" : ""}
                  {qty > 1 ? ` · ${qty} × ${n0(pr.total)}` : ""}
                </div>
              </div>
              {p.lead_time_days ? (
                <span className="inline-flex h-[30px] items-center gap-2 rounded-full bg-sand px-3 text-xs font-semibold text-body">
                  <Icon name="clock" size={14} />
                  Fabrication {p.lead_time_days} jours
                </span>
              ) : (
                <span className="inline-flex h-[30px] items-center gap-2 rounded-full bg-ok-bg px-3 text-xs font-semibold text-ok">Expédié sous 48 h</span>
              )}
            </div>
            {p.description && <p className="mb-0 mt-4 text-sm leading-relaxed text-body">{p.description}</p>}
          </div>

          {p.sizes.length > 0 && (
            <div>
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-sm font-semibold">Taille</span>
                <Link href="/faq" className="text-[13px] text-muted">
                  Guide des tailles
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {p.sizes.map((s) => {
                  const on = size === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className="h-12 min-w-[56px] rounded-lg px-3.5 text-sm font-semibold tnum"
                      style={{ border: on ? "1.5px solid #1A1814" : "1px solid #E6DFCF", background: on ? "#1A1814" : "#FFFFFF", color: on ? "#FAF7F0" : "#1A1814" }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {p.customizable && (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold">
                Personnalisation <span className="font-normal text-muted">(facultatif)</span>
              </span>
              <input value={engraving} onChange={(e) => setEngraving(e.target.value.slice(0, 30))} placeholder={p.personalization ?? "Texte à graver"} className="field" />
              <span className="text-xs text-muted">{p.personalization}</span>
            </label>
          )}

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
              onClick={() => doAdd()}
              className="h-[52px] flex-[1_1_180px] rounded-lg border-0 text-[15px] font-semibold"
              style={{ background: out ? "#F1EBDD" : "#B8923A", color: out ? "#55524C" : "#0E0E10" }}
            >
              {out ? "Me prévenir" : "Ajouter au panier"}
            </button>
            <button disabled={out} onClick={() => doAdd(true)} className="h-[52px] flex-[1_1_160px] rounded-lg border border-text bg-text text-[15px] font-semibold text-ivory disabled:opacity-50">
              Acheter maintenant
            </button>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <button onClick={() => setModal("contact")} className="flex min-h-11 items-center gap-2.5 border-0 bg-transparent p-0 text-sm font-semibold text-gold-dark">
              <Icon name="chat" size={18} />
              Poser une question au bijoutier
            </button>
            <Link href="/conseil?besoin=bijou" className="flex min-h-11 items-center gap-2.5 text-sm font-semibold text-ok hover:text-ok-dark">
              <WhatsAppIcon size={18} />
              Conseil Burkina Or
            </Link>
          </div>

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
                <span title={r.tip} className="inline-flex h-6 items-center rounded-md px-2 text-[11px] font-semibold" style={{ background: r.verified ? "#E5F0EA" : "#EFECE6", color: r.verified ? "#1E6B4A" : "#55524C" }}>
                  {r.verified ? "Vérifié par Burkina Or" : "Déclaré par le vendeur"}
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-line bg-white p-[22px] text-sm leading-relaxed text-body">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[15px] font-semibold text-text">Livraison &amp; garanties</span>
              <span className="text-xs font-semibold text-ok">Assurée 100 % de la valeur</span>
            </div>
            {p.delivery_info ?? "Expédition sécurisée sous scellé"} depuis {p.shop.city}. Colis remis uniquement contre votre code à 4 chiffres. Frais calculés au checkout selon votre ville.
            <button onClick={() => setModal("report")} className="mt-3 flex items-center gap-1.5 border-0 bg-transparent p-0 text-xs text-muted underline underline-offset-2">
              <Icon name="flag" size={13} />
              Signaler cette annonce
            </button>
          </div>
        </div>
      </div>

      <div className="fixed bottom-[68px] left-0 right-0 z-[37] flex items-center gap-3 border-t border-line bg-white px-4 py-2.5 shadow-[0_-8px_24px_-12px_rgba(26,24,20,.15)] lg:hidden">
        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-semibold tnum">{fcfa(pr.total * qty)}</div>
          <div className="text-[11px] text-muted">{p.shop.name}</div>
        </div>
        <button onClick={() => doAdd()} className="h-12 rounded-lg border-0 bg-gold px-5 text-sm font-semibold text-ink">
          Ajouter au panier
        </button>
      </div>

      {modal && (
        <div onClick={() => setModal(null)} className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[520px] rounded-[20px] bg-white p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,.5)]">
            {modal === "report" ? <ReportForm productId={p.id} onDone={() => setModal(null)} /> : <ContactForm p={p} />}
          </div>
        </div>
      )}
    </>
  );
}

function ReportForm({ productId, onDone }: { productId: string; onDone: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(reportProduct, null);
  if (state?.ok)
    return (
      <div className="flex flex-col gap-4">
        <h3 className="m-0 font-serif text-[28px] font-semibold">Merci</h3>
        <p className="m-0 text-sm text-body">{state.message}</p>
        <button onClick={onDone} className="btn-dark">
          Fermer
        </button>
      </div>
    );
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="text-[11px] uppercase tracking-[.14em] text-gold-dark">Modération</div>
      <h3 className="m-0 font-serif text-[28px] font-semibold">Signaler cette annonce</h3>
      <input type="hidden" name="product_id" value={productId} />
      <select name="preset" className="field" onChange={(e) => ((e.currentTarget.form!.elements.namedItem("reason") as HTMLTextAreaElement).value = e.target.value)}>
        <option value="">Choisir un motif…</option>
        <option>Prix anormalement bas par rapport au cours du jour</option>
        <option>Photos reprises d&apos;un autre site</option>
        <option>Caractéristiques (titre, poids) douteuses</option>
        <option>Origine de l&apos;or non documentée</option>
      </select>
      <textarea name="reason" rows={4} className="field" placeholder="Décrivez ce qui vous semble anormal" required />
      {state?.error && <span className="text-sm text-err">{state.error}</span>}
      <button disabled={pending} className="btn-dark">
        {pending ? "Envoi…" : "Envoyer le signalement"}
      </button>
    </form>
  );
}

function ContactForm({ p }: { p: ProductWithShop }) {
  const [state, action, pending] = useActionState<FormState, FormData>(startConversation, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="text-[11px] uppercase tracking-[.14em] text-gold-dark">Message au vendeur</div>
      <h3 className="m-0 font-serif text-[28px] font-semibold">{p.shop.name}</h3>
      <input type="hidden" name="shop_id" value={p.shop_id} />
      <input type="hidden" name="subject" value={p.name} />
      <input type="hidden" name="back" value={`/bijoux/${p.slug}`} />
      <textarea name="message" rows={5} className="field" defaultValue={`Bonjour, au sujet de « ${p.name} » : `} required />
      <p className="m-0 text-xs text-muted">Pour votre sécurité, ne communiquez jamais de code de paiement ni de code de remise. Les échanges restent sur Burkina Or.</p>
      {state?.error && <span className="text-sm text-err">{state.error}</span>}
      <button disabled={pending} className="btn-gold">
        {pending ? "Envoi…" : "Envoyer"}
      </button>
    </form>
  );
}
