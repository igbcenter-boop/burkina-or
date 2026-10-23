"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../icons";
import { toast } from "../toast";
import { useGold } from "../gold";
import { CheckoutHeader } from "./header";
import { cart, useCart, type CartLine } from "@/lib/cart-store";
import { fcfa, n0 } from "@/lib/format";
import { CITIES, MOBILE_MONEY, PAYMENT_METHODS } from "@/lib/labels";
import { zoneFor } from "@/lib/pricing";
import {
  checkPayment, payByCard, placeOrder, quoteCart, startMobilePayment,
  type CartQuote, type CheckoutContext,
} from "@/lib/actions/checkout";
import type { PaymentMethod, ShippingOption } from "@/lib/types";

type Step = 0 | 1 | 2 | 3;

const sel = (on: boolean) => ({
  border: on ? "1.5px solid #B8923A" : "1px solid #E6DFCF",
  background: on ? "#FAF7F0" : "#FFFFFF",
});
const radio = (on: boolean) => ({ border: on ? "6px solid #B8923A" : "1.5px solid #8A857C" });

export function Checkout({ ctx }: { ctx: CheckoutContext }) {
  const router = useRouter();
  const state = useCart();
  const { quote: live } = useGold();
  const [step, setStep] = useState<Step>(0);
  const [q, setQ] = useState<CartQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [lastLines, setLastLines] = useState<CartLine[]>([]);

  // Livraison
  const [mode, setMode] = useState<"domicile" | "retrait">("domicile");
  const [rec, setRec] = useState({
    name: ctx.user?.name ?? "",
    phone: ctx.user?.phone ?? "",
    city: ctx.user?.city && CITIES.includes(ctx.user.city) ? ctx.user.city : "Ouagadougou",
    district: ctx.user?.address ?? "",
    instructions: "",
  });
  const [agencyId, setAgencyId] = useState(ctx.agencies[0]?.id ?? null);
  const [ship, setShip] = useState<Record<string, string>>({});

  // Paiement
  const firstPay = ctx.payments.find((p) => p.enabled)?.id ?? "om";
  const [pay, setPay] = useState<PaymentMethod>(firstPay);
  const [mmPhone, setMmPhone] = useState((ctx.user?.phone ?? "").replace(/^\+?226\s?/, ""));
  const [card, setCard] = useState({ number: "", exp: "", cvc: "" });
  const [cgv, setCgv] = useState(false);
  const [cgvErr, setCgvErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mobile Money
  const [order, setOrder] = useState<{ id: string; number: string } | null>(null);
  const [mm, setMm] = useState<"saisie" | "attente" | "ok">("saisie");
  const [mmStart, setMmStart] = useState(0);
  const [mmRef, setMmRef] = useState("");
  const txRef = useRef<string | null>(null);
  const relockAt = useRef(0);

  const linesKey = JSON.stringify(state.lines.map((l) => [l.key, l.qty]));

  const refresh = useCallback(async () => {
    const lines = state.lines.map((l) => ({ key: l.key, productId: l.productId, qty: l.qty, options: l.options }));
    if (!lines.length) {
      setQ(null);
      setLoading(false);
      return;
    }
    const res = await quoteCart(lines, state.lockedAt, state.lockedPrice);
    // Garantie expirée ou invalide : nouvelle garantie au cours actuel (une fois).
    if (!res.lockUntil && Date.now() - relockAt.current > 5000) {
      relockAt.current = Date.now();
      cart.relock(res.p24);
      return; // le changement de lockedAt relance le chiffrage
    }
    for (const k of res.removed) cart.remove(k);
    if (res.removed.length) toast("Un article indisponible a été retiré du panier");
    setQ(res);
    setLoading(false);
  }, [linesKey, state.lockedAt, state.lockedPrice]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Rechiffrage serveur à chaque modification du panier ou de la garantie.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Interrogation de l'opérateur Mobile Money
  useEffect(() => {
    if (mm !== "attente" || !txRef.current) return;
    const t = setInterval(async () => {
      const r = await checkPayment(txRef.current!);
      if (r.status === "paid") {
        clearInterval(t);
        setMmRef(r.ref ?? "");
        setMm("ok");
        cart.clear();
        setTimeout(() => router.push(`/commande/confirmation/${order!.number}`), 1400);
      } else if (r.status === "failed") {
        clearInterval(t);
        setMm("saisie");
        toast("Délai dépassé : la demande de paiement a expiré. Renvoyez-la.");
      }
    }, 2000);
    return () => clearInterval(t);
  }, [mm, order, router]);

  const groups = q?.groups ?? [];
  const empty = !loading && groups.length === 0;
  const destCity = mode === "retrait" ? ctx.agencies.find((a) => a.id === agencyId)?.city ?? "Ouagadougou" : rec.city;
  const opts: ShippingOption[] = mode === "domicile" ? ctx.shipping.domicile : ctx.shipping.retrait;
  const pick = (shopId: string) => opts.find((o) => o.id === ship[shopId]) ?? opts[0];
  const shipLines = groups.map((g) => {
    const o = pick(g.shopId);
    const zone = zoneFor(g.city, destCity, ctx.shipping);
    return { g, o, zone, price: o.prices[zone], delay: o.delays[zone] };
  });
  const liv = shipLines.reduce((s, x) => s + x.price, 0);
  const sub = q?.subtotal ?? 0;
  const total = sub + liv;
  const lockLeft = q?.lockUntil ? Math.max(0, Math.floor((q.lockUntil - now) / 1000)) : 0;
  const mmss = `${String(Math.floor(lockLeft / 60)).padStart(2, "0")}:${String(lockLeft % 60).padStart(2, "0")}`;
  const isMM = MOBILE_MONEY.includes(pay);
  const P = PAYMENT_METHODS[pay];
  const cnt = groups.reduce((s, g) => s + g.lines.reduce((a, l) => a + l.qty, 0), 0);
  const all24 = groups.every((g) => g.lines.every((l) => l.kind !== "lingot" || l.badge.startsWith("999,9")));

  const go = (s: Step) => {
    setStep(s);
    setError(null);
    window.scrollTo({ top: 0 });
  };

  const next = async () => {
    if (empty || !q) return;
    if (step === 0) {
      if (!ctx.user) {
        router.push("/connexion?suite=/commande");
        return;
      }
      return go(1);
    }
    if (step === 1) {
      if (mode === "domicile" && (rec.name.trim().length < 2 || rec.phone.replace(/\D/g, "").length < 8)) {
        setError("Renseignez le nom complet et un téléphone joignable du destinataire.");
        return;
      }
      return go(2);
    }
    if (step === 2) {
      if (!cgv) return setCgvErr(true);
      setBusy(true);
      setError(null);
      const res = await placeOrder({
        lines: state.lines.map((l) => ({ key: l.key, productId: l.productId, qty: l.qty, options: l.options })),
        lockedAt: state.lockedAt,
        lockedPrice: state.lockedPrice,
        mode,
        recipient: rec,
        agencyId,
        shipping: Object.fromEntries(groups.map((g) => [g.shopId, pick(g.shopId).id])),
        payment: pay,
        mmPhone: isMM ? "226" + mmPhone.replace(/\D/g, "") : undefined,
        cgv,
      });
      if (!res.ok) {
        setBusy(false);
        setError(res.error);
        return;
      }
      setOrder({ id: res.orderId, number: res.number });
      if (isMM) {
        setBusy(false);
        setMm("saisie");
        return go(3);
      }
      if (pay === "card") {
        const r = await payByCard(res.orderId, card);
        if (!r.ok) {
          setBusy(false);
          setError((r.error ?? "Paiement refusé.") + " Votre commande est enregistrée : vous pouvez la régler depuis votre espace client.");
          return;
        }
      }
      cart.clear();
      router.push(`/commande/confirmation/${res.number}`);
    }
  };

  const sendMM = async () => {
    if (!order) return;
    const r = await startMobilePayment(order.id, "226" + mmPhone.replace(/\D/g, ""));
    if (!r.ok) return toast(r.error ?? "Échec de l'envoi");
    if (!r.txId) {
      cart.clear();
      return router.push(`/commande/confirmation/${order.number}`);
    }
    txRef.current = r.txId;
    setMmStart(Date.now());
    setMm("attente");
  };

  const mmLeft = mm === "attente" ? Math.max(0, 90 - Math.floor((now - mmStart) / 1000)) : 90;
  const vstep = step === 3 ? 2 : step;
  const ctaLabel = ["Passer à la livraison", "Continuer vers le paiement", `Payer ${n0(total)} FCFA`][step] ?? "";
  const ctaShort = ["Livraison", "Paiement", "Payer"][step] ?? "";

  const sumLines = (() => {
    if (!q) return [];
    const l: { label: string; sub: string; value: string; color?: string }[] = [];
    if (q.goldGrams > 0) {
      l.push({
        label: all24 ? `Or 24 ct · ${n0(q.goldGrams)} g` : `Or · ${n0(q.goldGrams)} g`,
        sub: all24 ? `${n0(q.p24)} FCFA/g × ${n0(q.goldGrams)} g` : "cours 24 ct × poids × pureté",
        value: fcfa(q.goldValue),
      });
      l.push({ label: "Façon & frappe", sub: "Boutique officielle", value: fcfa(q.fabrication) });
    }
    if (q.jewels > 0) l.push({ label: "Bijoux", sub: "Or, façon et gravure inclus", value: fcfa(q.jewels) });
    l.push({
      label: "Livraison sécurisée",
      sub: step >= 1 ? `${groups.length} expédition${groups.length > 1 ? "s" : ""}` : "estimation, à choisir",
      value: liv === 0 ? "Offerte" : fcfa(liv),
    });
    l.push({ label: "Assurance transport", sub: "Valeur déclarée " + fcfa(sub), value: "Incluse", color: "#1E6B4A" });
    l.push({ label: "Frais de service", sub: "Commission vendeur déjà incluse", value: "0 FCFA" });
    return l;
  })();

  const showSummary = step <= 2 && !empty;

  return (
    <div className={`min-h-screen bg-ivory ${showSummary ? "pb-[84px] lg:pb-0" : ""}`}>
      <CheckoutHeader step={vstep} />
      <main className={`mx-auto grid max-w-[1240px] items-start gap-[clamp(20px,3vw,40px)] px-[clamp(16px,3vw,40px)] pb-24 pt-[clamp(24px,4vw,48px)] ${step <= 2 ? "lg:grid-cols-[minmax(0,1fr)_340px] wide:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
        <div className="flex min-w-0 flex-col gap-5">
          {/* ── ÉTAPE 1 · PANIER ── */}
          {step === 0 && (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <h1 className="m-0 font-serif text-[clamp(34px,4vw,48px)] font-semibold leading-[1.05]">Votre panier</h1>
                <Link href="/boutique-officielle" className="text-sm font-semibold">
                  ← Continuer mes achats
                </Link>
              </div>
              {loading && <div className="h-48 animate-pulse rounded-xl border border-line bg-white" />}
              {empty && (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-white px-6 py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sand text-gold-dark">
                    <Icon name="cart" size={28} />
                  </div>
                  <h2 className="mt-2 font-serif text-[28px] font-semibold">Votre panier est vide</h2>
                  <p className="m-0 max-w-[420px] text-sm leading-relaxed text-muted">Commencez par un lingotin de 1 g, au cours du jour, livré sous scellé avec son certificat.</p>
                  <div className="mt-2 flex flex-wrap justify-center gap-3">
                    <Link href="/boutique-officielle" className="btn-gold">
                      Voir les lingotins
                    </Link>
                    {lastLines.length > 0 && (
                      <button onClick={() => cart.restore(lastLines)} className="btn-outline">
                        Restaurer le panier
                      </button>
                    )}
                  </div>
                </div>
              )}
              {groups.map((g) => (
                <section key={g.shopId} className="overflow-hidden rounded-xl border border-line bg-white">
                  <div className="flex flex-wrap items-center gap-3 border-b border-sand px-5 py-4">
                    <span
                      className="flex h-10 w-10 flex-none items-center justify-center rounded-lg font-serif text-[17px] font-bold"
                      style={{ background: g.official ? "#0E0E10" : "#F1EBDD", color: g.official ? "#D9BC6E" : "#8C6A1F" }}
                    >
                      {g.mono}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold">{g.name}</div>
                      <div className="text-xs text-muted">{g.sub}</div>
                    </div>
                    <span className="inline-flex h-[26px] items-center gap-1.5 rounded-md bg-ok-bg px-2.5 text-xs font-semibold text-ok">
                      <Icon name="check" size={13} stroke={2} />
                      {g.badge}
                    </span>
                  </div>
                  {g.lines.map((it) => (
                    <div key={it.key} className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-5 gap-y-4 p-5 wide:grid-cols-[96px_minmax(0,1fr)_auto]">
                      <div className={`relative flex h-24 w-24 items-end overflow-hidden rounded-[10px] p-2 ${it.kind === "lingot" ? "stripes-ink" : "stripes-sand"}`}>
                        {it.image ? <Image src={it.image} alt="" fill sizes="96px" className="object-cover" /> : <span className="font-mono text-[9px] leading-snug text-muted-2">{it.imageLabel}</span>}
                      </div>
                      <div className="flex min-w-0 flex-col gap-1.5">
                        <div className="font-serif text-[22px] font-semibold leading-tight">{it.name}</div>
                        <div className="text-[13px] text-muted tnum">{it.meta}</div>
                        <span
                          className="inline-flex h-6 items-center gap-1.5 self-start rounded-md px-2 text-[11px] font-semibold"
                          style={{ background: it.verified ? "#E5F0EA" : "#EFECE6", color: it.verified ? "#1E6B4A" : "#55524C" }}
                        >
                          <Icon name={it.verified ? "shield" : "info"} size={12} stroke={2} />
                          {it.badge}
                        </span>
                      </div>
                      <div className="col-span-full flex flex-wrap items-center justify-between gap-4 wide:col-auto">
                        <div className="inline-flex h-11 items-center rounded-lg border border-line">
                          <button onClick={() => cart.setQty(it.key, it.qty - 1)} aria-label="Diminuer" className="h-[42px] w-11 border-0 bg-transparent text-lg text-text">
                            −
                          </button>
                          <span className="w-9 text-center font-semibold tnum">{it.qty}</span>
                          <button onClick={() => cart.setQty(it.key, Math.min(it.max, it.qty + 1))} aria-label="Augmenter" className="h-[42px] w-11 border-0 bg-transparent text-lg text-text">
                            +
                          </button>
                        </div>
                        <div className="text-right">
                          <div className="whitespace-nowrap text-lg font-semibold tnum">{fcfa(it.total)}</div>
                          <button
                            onClick={() => {
                              setLastLines(state.lines);
                              cart.remove(it.key);
                              toast(it.kind === "lingot" ? "Lingotin retiré du panier" : "Article retiré du panier");
                            }}
                            className="mt-0.5 h-7 border-0 bg-transparent p-0 text-[13px] font-medium text-err underline underline-offset-[3px]"
                          >
                            Retirer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-wrap justify-between gap-3 bg-ivory px-5 py-3.5 text-[13px]">
                    <span className="text-muted">{g.official ? "Livraison calculée à l'étape suivante" : `Expédition séparée depuis ${g.city}`}</span>
                    <span className="tnum">
                      Sous-total vendeur <b>{fcfa(g.subtotal)}</b>
                    </span>
                  </div>
                </section>
              ))}
              {!ctx.user && !empty && !loading && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white px-5 py-4 text-sm">
                  <Icon name="user" size={18} className="text-gold-dark" />
                  <span className="flex-1">Un compte est nécessaire pour la traçabilité de votre commande et le suivi de livraison.</span>
                  <Link href="/connexion?suite=/commande" className="font-semibold">
                    Se connecter
                  </Link>
                  <Link href="/inscription?suite=/commande" className="font-semibold">
                    Créer un compte
                  </Link>
                </div>
              )}
            </>
          )}

          {/* ── ÉTAPE 2 · LIVRAISON ── */}
          {step === 1 && (
            <>
              <h1 className="m-0 font-serif text-[clamp(34px,4vw,48px)] font-semibold leading-[1.05]">Livraison sécurisée</h1>
              <section className="flex flex-col gap-[18px] rounded-xl border border-line bg-white p-[clamp(18px,2.5vw,28px)]">
                <h2 className="m-0 text-[17px] font-semibold">Où souhaitez-vous recevoir votre commande ?</h2>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-3">
                  {(
                    [
                      ["domicile", "Livraison à domicile", "Remise en main propre contre code, du lundi au samedi."],
                      ["retrait", "Retrait en agence", `Dans l'une de nos ${ctx.agencies.length} agences sécurisées, sur pièce d'identité.`],
                    ] as const
                  ).map(([id, label, desc]) => (
                    <button key={id} onClick={() => setMode(id)} className="flex items-start gap-3 rounded-[10px] p-4 text-left text-text" style={sel(mode === id)}>
                      <span className="mt-px h-5 w-5 flex-none rounded-full bg-white" style={radio(mode === id)} />
                      <span>
                        <span className="block text-[15px] font-semibold">{label}</span>
                        <span className="mt-[3px] block text-[13px] leading-normal text-muted">{desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
                {mode === "domicile" ? (
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-4">
                    <label className="flex flex-col gap-2">
                      <span className="label">Nom complet du destinataire</span>
                      <input className="field" value={rec.name} onChange={(e) => setRec({ ...rec, name: e.target.value })} autoComplete="name" />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="label">Téléphone (joignable à la livraison)</span>
                      <input className="field tnum" value={rec.phone} onChange={(e) => setRec({ ...rec, phone: e.target.value })} placeholder="+226 70 12 34 56" autoComplete="tel" />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="label">Ville</span>
                      <select className="field" value={rec.city} onChange={(e) => setRec({ ...rec, city: e.target.value })}>
                        {CITIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="label">Quartier / secteur</span>
                      <input className="field" value={rec.district} onChange={(e) => setRec({ ...rec, district: e.target.value })} placeholder="Ouaga 2000, secteur 15" />
                    </label>
                    <label className="col-span-full flex flex-col gap-2">
                      <span className="label">
                        Indications pour le livreur <span className="font-normal text-muted">(facultatif)</span>
                      </span>
                      <input className="field" value={rec.instructions} onChange={(e) => setRec({ ...rec, instructions: e.target.value })} placeholder="Portail vert, à côté de la pharmacie…" />
                    </label>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {ctx.agencies.map((a) => (
                      <button key={a.id} onClick={() => setAgencyId(a.id)} className="flex items-center gap-3 rounded-[10px] px-4 py-3.5 text-left text-text" style={sel(agencyId === a.id)}>
                        <span className="h-5 w-5 flex-none rounded-full bg-white" style={radio(agencyId === a.id)} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{a.name}</span>
                          <span className="mt-0.5 block text-[13px] text-muted">{a.address}</span>
                        </span>
                        <span className="text-right text-xs text-muted">{a.hours}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {shipLines.map(({ g, zone }) => (
                <section key={g.shopId} className="flex flex-col gap-3.5 rounded-xl border border-line bg-white p-[clamp(18px,2.5vw,28px)]">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h2 className="m-0 text-[17px] font-semibold">{g.name}</h2>
                    <span className="text-[13px] text-muted">Expédié depuis {g.city}</span>
                  </div>
                  {opts.map((o) => {
                    const on = pick(g.shopId).id === o.id;
                    const price = o.prices[zone];
                    return (
                      <button
                        key={o.id}
                        onClick={() => setShip({ ...ship, [g.shopId]: o.id })}
                        className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3.5 rounded-[10px] p-4 text-left text-text"
                        style={sel(on)}
                      >
                        <span className="h-5 w-5 rounded-full bg-white" style={radio(on)} />
                        <span className="min-w-0">
                          <span className="block text-[15px] font-semibold">{o.name}</span>
                          <span className="mt-[3px] block text-[13px] text-muted">
                            {o.delays[zone]} · {o.note}
                          </span>
                        </span>
                        <span className="whitespace-nowrap text-[15px] font-semibold tnum">{price === 0 ? "Offert" : fcfa(price)}</span>
                      </button>
                    );
                  })}
                </section>
              ))}

              <div className="flex items-start gap-3.5 rounded-xl bg-ink px-5 py-[18px] text-ivory">
                <Icon name="shield-check" size={22} className="mt-px flex-none text-gold-light" />
                <div className="text-sm leading-relaxed text-cream">
                  Votre colis est scellé et photographié avant le départ, puis assuré à hauteur de <b className="text-ivory tnum">{fcfa(sub)}</b>. Il ne vous sera remis qu&apos;en échange de votre{" "}
                  <b className="text-ivory">code de remise à 4 chiffres</b>.
                </div>
              </div>
            </>
          )}

          {/* ── ÉTAPE 3 · PAIEMENT ── */}
          {step === 2 && (
            <>
              <h1 className="m-0 font-serif text-[clamp(34px,4vw,48px)] font-semibold leading-[1.05]">Paiement</h1>
              <div
                className="flex items-center gap-3 rounded-xl px-[18px] py-3.5"
                style={{ background: lockLeft > 120 ? "#FAF7F0" : "#F8EEDC", border: `1px solid ${lockLeft > 120 ? "#E6DFCF" : "#E9CF9E"}` }}
              >
                <Icon name="clock" size={20} stroke={1.75} className="flex-none" style={{ color: lockLeft > 120 ? "#8C6A1F" : "#8A5A12" }} />
                <span className="text-sm leading-normal text-text">
                  {lockLeft > 0
                    ? `Le prix de l'or est garanti pendant ${mmss}. Passé ce délai, il sera recalculé au cours en vigueur.`
                    : "Le délai de garantie est écoulé : le prix sera recalculé au cours en vigueur au moment du paiement."}
                </span>
              </div>
              <section className="flex flex-col gap-4 rounded-xl border border-line bg-white p-[clamp(18px,2.5vw,28px)]">
                <h2 className="m-0 text-[17px] font-semibold">Choisissez votre moyen de paiement</h2>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-2.5">
                  {ctx.payments
                    .filter((p) => p.enabled)
                    .map(({ id }) => {
                      const M = PAYMENT_METHODS[id];
                      return (
                        <button key={id} onClick={() => setPay(id)} className="flex min-h-[72px] items-center gap-3 rounded-[10px] p-3.5 text-left text-text" style={sel(pay === id)}>
                          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg text-xs font-bold tracking-[.02em]" style={{ background: M[2], color: M[3] }}>
                            {M[1]}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold">{M[0]}</span>
                            <span className="mt-0.5 block text-xs leading-snug text-muted">{M[4]}</span>
                          </span>
                          <span className="h-5 w-5 flex-none rounded-full bg-white" style={radio(pay === id)} />
                        </button>
                      );
                    })}
                </div>
                <div className="h-px bg-sand" />
                {isMM && (
                  <label className="flex max-w-[420px] flex-col gap-2">
                    <span className="label">Numéro {P[0]} à débiter</span>
                    <div className="flex h-12 overflow-hidden rounded-lg border border-line">
                      <span className="flex flex-none items-center border-r border-line bg-ivory px-3.5 text-[15px] text-body">+226</span>
                      <input value={mmPhone} onChange={(e) => setMmPhone(e.target.value)} inputMode="tel" className="min-w-0 flex-1 border-0 px-3.5 text-[15px] text-text outline-none tnum" placeholder="70 12 34 56" />
                    </div>
                    <span className="text-xs text-muted">Vous validerez le paiement avec votre code secret sur votre téléphone. Burkina Or ne vous le demandera jamais.</span>
                  </label>
                )}
                {pay === "card" && (
                  <div className="grid max-w-[560px] grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] gap-3.5">
                    <label className="col-span-full flex flex-col gap-2">
                      <span className="label">Numéro de carte</span>
                      <input className="field tnum" inputMode="numeric" autoComplete="cc-number" placeholder="4970 0000 0000 0000" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="label">Expiration</span>
                      <input className="field" autoComplete="cc-exp" placeholder="MM / AA" value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="label">Cryptogramme</span>
                      <input className="field" inputMode="numeric" autoComplete="cc-csc" placeholder="3 chiffres" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} />
                    </label>
                  </div>
                )}
                {pay === "vir" && (
                  <div className="grid max-w-[560px] grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2 rounded-[10px] border border-line bg-ivory px-[18px] py-4 text-sm">
                    <span className="text-muted">Bénéficiaire</span>
                    <span className="font-semibold">{ctx.bank.beneficiary}</span>
                    <span className="text-muted">Banque</span>
                    <span>{ctx.bank.bank}</span>
                    <span className="text-muted">IBAN</span>
                    <span className="font-mono text-[13px]">{ctx.bank.iban}</span>
                    <span className="text-muted">Référence</span>
                    <span className="font-mono text-[13px] font-semibold">Votre n° de commande</span>
                    <span className="col-span-full mt-1 text-xs text-muted">Votre commande est réservée 48 h. Le prix reste celui du jour de la commande.</span>
                  </div>
                )}
                {pay === "agence" && (
                  <p className="m-0 max-w-[560px] text-sm leading-relaxed text-body">
                    Présentez-vous sous 48 h dans l&apos;une de nos {ctx.agencies.length} agences ({ctx.agencies.map((a) => a.name.replace("Agence ", "")).join(", ")}) avec votre numéro de commande et une pièce d&apos;identité. Paiement en espèces ou par chèque certifié.
                  </p>
                )}
                <button
                  onClick={() => {
                    setCgv(!cgv);
                    setCgvErr(false);
                  }}
                  className="flex min-h-11 items-start gap-3 self-start border-0 bg-transparent py-1 text-left text-sm text-text"
                >
                  <span
                    className="mt-px flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[5px]"
                    style={{ border: cgv ? "0" : cgvErr ? "1.5px solid #A8322D" : "1.5px solid #8A857C", background: cgv ? "#1A1814" : "#FFFFFF" }}
                  >
                    {cgv && <Icon name="check" size={14} stroke={2.5} className="text-ivory" />}
                  </span>
                  <span className="leading-normal">
                    J&apos;ai lu et j&apos;accepte les{" "}
                    <Link href="/cgu-cgv" target="_blank" onClick={(e) => e.stopPropagation()}>
                      CGV
                    </Link>{" "}
                    et la{" "}
                    <Link href="/retours-reclamations" target="_blank" onClick={(e) => e.stopPropagation()}>
                      politique de retours et réclamations
                    </Link>
                    .
                  </span>
                </button>
                {cgvErr && !cgv && <span className="-mt-2 text-[13px] text-err">Veuillez accepter les conditions pour continuer.</span>}
              </section>
            </>
          )}

          {/* ── ÉTAPE 3b · MOBILE MONEY ── */}
          {step === 3 && order && (
            <section className="mx-auto w-full max-w-[560px] overflow-hidden rounded-[20px] border border-line bg-white">
              <div className="flex items-center gap-3.5 border-b border-sand px-7 py-[22px]">
                <span className="flex h-12 w-12 items-center justify-center rounded-[10px] text-sm font-bold" style={{ background: P[2], color: P[3] }}>
                  {P[1]}
                </span>
                <div className="flex-1">
                  <div className="text-[13px] text-muted">Paiement {P[0]}</div>
                  <div className="text-2xl font-semibold tnum">{fcfa(total)}</div>
                </div>
                <span className="text-right text-[13px] text-muted">
                  Commande
                  <br />
                  <b className="text-text tnum">{order.number.replace(/^(BO-)(\d{3})/, "$1$2 ")}</b>
                </span>
              </div>
              {mm === "saisie" && (
                <div className="flex flex-col gap-[18px] p-7">
                  <h1 className="m-0 font-serif text-[32px] font-semibold leading-[1.1]">Confirmez votre numéro</h1>
                  <label className="flex flex-col gap-2">
                    <span className="label">Numéro {P[0]}</span>
                    <div className="flex h-14 overflow-hidden rounded-lg border-[1.5px] border-gold shadow-[0_0_0_4px_rgba(184,146,58,.14)]">
                      <span className="flex flex-none items-center border-r border-line bg-ivory px-4 text-[17px] text-body">+226</span>
                      <input value={mmPhone} onChange={(e) => setMmPhone(e.target.value)} inputMode="tel" className="min-w-0 flex-1 border-0 px-4 text-[19px] font-medium tracking-[.04em] text-text outline-none tnum" />
                    </div>
                  </label>
                  <button onClick={sendMM} className="h-[54px] rounded-lg border-0 bg-gold text-base font-semibold text-ink hover:bg-gold-light">
                    Envoyer la demande de paiement
                  </button>
                  <Link href={`/compte/commandes/${order.number}`} className="flex h-11 items-center justify-center text-sm font-medium text-body">
                    Payer plus tard depuis mon espace client
                  </Link>
                </div>
              )}
              {mm === "attente" && (
                <div className="flex flex-col items-center gap-4 px-7 py-9 text-center">
                  <div className="relative flex h-[88px] w-[88px] animate-bo-pulse items-center justify-center rounded-full bg-sand text-gold-dark">
                    <Icon name="smartphone" size={34} />
                  </div>
                  <h1 className="mt-1 font-serif text-[32px] font-semibold leading-[1.1]">Validez sur votre téléphone</h1>
                  <p className="m-0 max-w-[400px] text-[15px] leading-relaxed text-body">
                    Une demande de <b className="text-text">{fcfa(total)}</b> a été envoyée au <b className="text-text">+226 {mmPhone}</b>. Saisissez votre code secret {P[0]} pour confirmer.
                  </p>
                  <div className="flex w-full flex-col gap-2.5 rounded-[10px] border border-line bg-ivory px-[18px] py-4 text-left text-sm">
                    {[
                      <>Pas de notification ? Composez <b className="font-mono">{P[5]}</b></>,
                      <>Choisissez « Paiements en attente »</>,
                      <>Validez « BURKINA OR · {order.number} »</>,
                    ].map((t, i) => (
                      <div key={i} className="flex gap-2.5">
                        <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-text text-xs font-semibold text-ivory">{i + 1}</span>
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-muted">
                    <span className="h-4 w-4 animate-bo-spin rounded-full border-2 border-line border-t-gold" />
                    En attente de confirmation · <span className="tnum">{Math.floor(mmLeft / 60)}:{String(mmLeft % 60).padStart(2, "0")}</span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2.5">
                    <button onClick={sendMM} className="h-11 rounded-lg border border-line bg-white px-4 text-[13px] font-semibold text-text">
                      Renvoyer la demande
                    </button>
                    <button onClick={() => setMm("saisie")} className="h-11 border-0 bg-transparent px-4 text-[13px] font-medium text-err">
                      Annuler
                    </button>
                  </div>
                </div>
              )}
              {mm === "ok" && (
                <div className="flex flex-col items-center gap-3.5 px-7 py-12 text-center">
                  <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-ok">
                    <Icon name="check" size={40} stroke={2.25} className="text-white" />
                  </div>
                  <h1 className="mt-1 font-serif text-[32px] font-semibold">Paiement reçu</h1>
                  <p className="m-0 text-sm text-muted">
                    Transaction {P[0]} n° {mmRef}
                  </p>
                </div>
              )}
            </section>
          )}

          {error && <div className="rounded-[10px] bg-err-bg px-4 py-3 text-sm text-err">{error}</div>}
        </div>

        {/* ── RÉCAPITULATIF ── */}
        {showSummary && q && (
          <aside className="overflow-hidden rounded-xl border border-line bg-white lg:sticky lg:top-6">
            <div className="border-b border-sand px-6 py-5">
              <h2 className="m-0 font-serif text-[26px] font-semibold">Récapitulatif</h2>
              <div className="mt-0.5 text-[13px] text-muted">
                {cnt} article{cnt > 1 ? "s" : ""} · {groups.length} vendeur{groups.length > 1 ? "s" : ""}
              </div>
            </div>
            <div className="flex flex-col gap-3 px-6 py-[18px]">
              {sumLines.map((l) => (
                <div key={l.label} className="flex justify-between gap-4 text-sm">
                  <span className="text-body">
                    <span className="block">{l.label}</span>
                    <span className="mt-px block text-xs text-muted-2">{l.sub}</span>
                  </span>
                  <span className="whitespace-nowrap font-medium tnum" style={{ color: l.color ?? "#1A1814" }}>
                    {l.value}
                  </span>
                </div>
              ))}
              <div className="my-1 h-px bg-line" />
              <div className="flex items-baseline justify-between">
                <span className="text-[15px] font-semibold">Total TTC</span>
                <span className="text-2xl font-semibold tnum">{fcfa(total)}</span>
              </div>
            </div>
            <div className="mx-6 flex items-center gap-2.5 rounded-lg bg-ink px-3.5 py-3 text-xs leading-normal text-stone">
              <span className="h-[7px] w-[7px] flex-none rounded-full bg-ok-light" />
              <span>
                Cours 24 ct appliqué <b className="text-ivory tnum">{n0(q.p24)} FCFA/g</b> · garanti <b className="text-gold-light tnum">{lockLeft > 0 ? mmss : "expiré"}</b>
                {lockLeft === 0 && <> · cours actuel {n0(live.p24)}</>}
              </span>
            </div>
            <div className="hidden px-6 pb-1 pt-5 lg:block">
              <button onClick={next} disabled={empty || busy} className="h-[54px] w-full rounded-lg border-0 text-[15px] font-semibold text-ink" style={{ background: empty ? "#E6DFCF" : "#B8923A" }}>
                {busy ? "Traitement…" : ctaLabel}
              </button>
            </div>
            {(step === 1 || step === 2) && (
              <div className="px-6 pt-2 text-center">
                <button onClick={() => go((step - 1) as Step)} className="h-11 border-0 bg-transparent text-sm font-medium text-body">
                  ← Étape précédente
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-[18px] px-6 pb-5 pt-4 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <Icon name="lock" size={14} stroke={1.75} className="text-ok" />
                Paiement chiffré
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="shield" size={14} stroke={1.75} className="text-ok" />
                Colis assuré
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="file" size={14} stroke={1.75} className="text-ok" />
                Certificat inclus
              </span>
            </div>
          </aside>
        )}
      </main>

      {showSummary && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-3.5 border-t border-line bg-white px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_-12px_rgba(26,24,20,.15)] lg:hidden">
          <div className="flex-none">
            <div className="text-xs text-muted">Total TTC</div>
            <div className="whitespace-nowrap text-lg font-semibold tnum">{fcfa(total)}</div>
          </div>
          <button onClick={next} disabled={empty || busy} className="h-[52px] flex-1 rounded-lg border-0 text-[15px] font-semibold text-ink" style={{ background: empty ? "#E6DFCF" : "#B8923A" }}>
            {busy ? "…" : ctaShort}
          </button>
        </div>
      )}
    </div>
  );
}
