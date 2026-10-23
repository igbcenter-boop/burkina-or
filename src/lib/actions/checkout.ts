"use server";

import { headers } from "next/headers";
import { updateTag } from "next/cache";
import { createClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin";
import { getAgencies, getGoldQuote, getSettings, PRODUCT_SELECT } from "../data";
import { commissionKey, priceOf, publicPrice, zoneFor, PURITIES } from "../pricing";
import { n0 } from "../format";
import { PAYMENT_METHODS, MOBILE_MONEY } from "../labels";
import type { PaymentMethod, ProductWithShop, ShippingOption } from "../types";

export type CartInputLine = { key: string; productId: string; qty: number; options?: { size?: string; engraving?: string } };

export type QuotedLine = {
  key: string;
  productId: string;
  slug: string;
  kind: ProductWithShop["kind"];
  name: string;
  meta: string;
  badge: string;
  verified: boolean;
  imageLabel: string;
  image: string | null;
  qty: number;
  max: number;
  unitGold: number;
  unitFab: number;
  unit: number;
  total: number;
  weight: number | null;
  options?: CartInputLine["options"];
};

export type QuotedGroup = {
  shopId: string;
  shopSlug: string;
  official: boolean;
  mono: string;
  name: string;
  sub: string;
  city: string;
  badge: string;
  lines: QuotedLine[];
  subtotal: number;
};

export type CartQuote = {
  p24: number;
  lockUntil: number | null;
  groups: QuotedGroup[];
  removed: string[];
  subtotal: number;
  goldGrams: number;
  goldValue: number;
  fabrication: number;
  jewels: number;
};

/** Vérifie que le cours garanti correspond bien au cours publié au moment de l'ajout. */
async function resolveLock(lockedAt: number | null, lockedPrice: number | null) {
  const [quote, settings] = await Promise.all([getGoldQuote(), getSettings()]);
  const lockMs = (settings.pricing.lock_minutes ?? 15) * 60_000;
  const now = Date.now();
  if (lockedAt && lockedPrice && lockedAt <= now + 5000 && now - lockedAt < lockMs) {
    // Cours actuellement publié (affiché au client) : garantie acceptée.
    if (Math.abs(quote.p24 - lockedPrice) < 1) return { p24: lockedPrice, lockUntil: lockedAt + lockMs, settings };
    const db = createAdminClient();
    const { data } = await db
      .from("gold_prices")
      .select("price_raw_per_g")
      .lte("created_at", new Date(lockedAt).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      const pub = publicPrice(Number(data.price_raw_per_g), settings.pricing.margin_pct);
      if (Math.abs(pub - lockedPrice) < 1) return { p24: lockedPrice, lockUntil: lockedAt + lockMs, settings };
    }
  }
  return { p24: quote.p24, lockUntil: null as number | null, settings };
}

function describe(p: ProductWithShop, unitGold: number, unitFab: number, o?: CartInputLine["options"]) {
  const pur = PURITIES[p.purity ?? ""];
  if (p.kind === "lingot") {
    return {
      meta: `Or ${n0(unitGold)} + façon ${n0(unitFab)} FCFA / unité`,
      badge: `${p.purity} · ${p.weight_verified ? "poids vérifiés" : "poids déclarés"}`,
      verified: p.purity_verified && p.weight_verified,
    };
  }
  const bits = [o?.size ? `Taille ${o.size}` : null, o?.engraving ? `Gravure « ${o.engraving} »` : null, p.lead_time_days ? `fabrication ${p.lead_time_days} jours` : null].filter(Boolean);
  return {
    meta: bits.join(" · ") || p.form || "",
    badge: p.weight_verified
      ? `${p.karat ?? pur?.ct ?? ""} · ${String(p.weight_g ?? "").replace(".", ",")} g vérifiés`
      : `${p.karat ?? pur?.ct ?? ""}${p.weight_g ? ` · ${String(p.weight_g).replace(".", ",")} g` : ""} déclarés par le vendeur`,
    verified: p.weight_verified,
  };
}

async function buildQuote(lines: CartInputLine[], p24: number): Promise<CartQuote> {
  const ids = [...new Set(lines.map((l) => l.productId))].slice(0, 50);
  const db = createAdminClient();
  const { data } = ids.length
    ? await db.from("products").select(PRODUCT_SELECT).in("id", ids).eq("status", "published").eq("shop.status", "verified")
    : { data: [] };
  const products = new Map(((data ?? []) as unknown as ProductWithShop[]).map((p) => [p.id, p]));
  const groups = new Map<string, QuotedGroup>();
  const removed: string[] = [];
  let goldGrams = 0, goldValue = 0, fabrication = 0, jewels = 0;
  for (const l of lines) {
    const p = products.get(l.productId);
    if (!p || p.stock_status === "out" || p.pricing_mode === "quote") {
      removed.push(l.key);
      continue;
    }
    const pr = priceOf(p, p24);
    const max = Math.max(1, Math.min(p.max_per_order || 20, p.stock_qty ?? 999));
    const qty = Math.max(1, Math.min(max, Math.floor(l.qty)));
    const d = describe(p, pr.gold, pr.fabrication, l.options);
    const line: QuotedLine = {
      key: l.key,
      productId: p.id,
      slug: p.slug,
      kind: p.kind,
      name: p.kind === "bijou" && l.options?.size ? `${p.name} · taille ${l.options.size}` : p.name,
      meta: d.meta,
      badge: d.badge,
      verified: d.verified,
      imageLabel: p.image_label ?? p.name,
      image: p.images[0] ?? null,
      qty,
      max,
      unitGold: Math.round(pr.gold),
      unitFab: Math.round(pr.fabrication),
      unit: Math.round(pr.total),
      total: Math.round(pr.total) * qty,
      weight: p.weight_g ? Number(p.weight_g) : null,
      options: l.options,
    };
    if (p.kind === "lingot") {
      goldGrams += Number(p.weight_g ?? 0) * qty;
      goldValue += line.unitGold * qty;
      fabrication += line.unitFab * qty;
    } else jewels += line.total;
    const official = p.shop.type === "officielle";
    const g = groups.get(p.shop_id) ?? {
      shopId: p.shop_id,
      shopSlug: p.shop.slug,
      official,
      mono: p.shop.mono ?? "BO",
      name: p.shop.name,
      sub: official ? `${p.shop.city} · expédié sous scellé` : `${p.shop.city} · note ${String(p.shop.rating).replace(".", ",")} (${p.shop.reviews_count} avis)`,
      city: p.shop.city ?? "Ouagadougou",
      badge: official ? "Officiel" : "Vendeur vérifié",
      lines: [],
      subtotal: 0,
    };
    g.lines.push(line);
    g.subtotal += line.total;
    groups.set(p.shop_id, g);
  }
  const list = [...groups.values()].sort((a, b) => Number(b.official) - Number(a.official));
  return { p24, lockUntil: null, groups: list, removed, subtotal: list.reduce((s, g) => s + g.subtotal, 0), goldGrams, goldValue, fabrication, jewels };
}

/** Chiffrage du panier côté serveur (prix au cours garanti ou au cours actuel). */
export async function quoteCart(lines: CartInputLine[], lockedAt: number | null, lockedPrice: number | null): Promise<CartQuote> {
  const lock = await resolveLock(lockedAt, lockedPrice);
  const q = await buildQuote(lines, lock.p24);
  return { ...q, lockUntil: lock.lockUntil };
}

export type CheckoutContext = {
  user: { name: string; phone: string; email: string; city: string; address: string } | null;
  shipping: Awaited<ReturnType<typeof getSettings>>["shipping"];
  payments: { id: PaymentMethod; enabled: boolean }[];
  agencies: Awaited<ReturnType<typeof getAgencies>>;
  bank: { beneficiary: string; bank: string; iban: string };
  lockMinutes: number;
};

export async function getCheckoutContext(): Promise<CheckoutContext> {
  const supabase = await createClient();
  const [{ data: auth }, settings, agencies] = await Promise.all([supabase.auth.getUser(), getSettings(), getAgencies()]);
  let user: CheckoutContext["user"] = null;
  if (auth.user) {
    const { data: p } = await supabase.from("profiles").select("full_name,phone,email,city,address").eq("id", auth.user.id).maybeSingle();
    user = { name: p?.full_name ?? "", phone: p?.phone ?? "", email: p?.email ?? auth.user.email ?? "", city: p?.city ?? "Ouagadougou", address: p?.address ?? "" };
  }
  return {
    user,
    shipping: settings.shipping,
    payments: (Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((id) => ({ id, enabled: settings.payments?.[id]?.enabled !== false })),
    agencies,
    bank: settings.company.bank,
    lockMinutes: settings.pricing.lock_minutes,
  };
}

export type PlaceOrderInput = {
  lines: CartInputLine[];
  lockedAt: number | null;
  lockedPrice: number | null;
  mode: "domicile" | "retrait";
  recipient: { name: string; phone: string; city: string; district: string; instructions: string };
  agencyId: string | null;
  shipping: Record<string, string>; // shopId → optionId
  payment: PaymentMethod;
  mmPhone?: string;
  cgv: boolean;
};

const CARRIERS: Record<string, string> = { fse: "faso-secur-express", sce: "sahel-convoyage" };

export async function placeOrder(input: PlaceOrderInput): Promise<{ ok: true; orderId: string; number: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Connectez-vous pour finaliser votre commande." };
  if (!input.cgv) return { ok: false, error: "Veuillez accepter les conditions pour continuer." };
  const { data: profile } = await supabase.from("profiles").select("full_name,email,status").eq("id", auth.user.id).single();
  if (profile?.status === "suspended") return { ok: false, error: "Votre compte est suspendu." };

  const lock = await resolveLock(input.lockedAt, input.lockedPrice);
  const settings = lock.settings;
  if (settings.payments?.[input.payment]?.enabled === false) return { ok: false, error: "Ce moyen de paiement est momentanément indisponible." };
  const quote = await buildQuote(input.lines, lock.p24);
  if (!quote.groups.length) return { ok: false, error: "Votre panier est vide ou les articles ne sont plus disponibles." };

  const agencies = await getAgencies();
  const agency = input.mode === "retrait" ? agencies.find((a) => a.id === input.agencyId) ?? agencies[0] : null;
  const destCity = input.mode === "retrait" ? agency?.city ?? "Ouagadougou" : input.recipient.city;
  const r = input.recipient;
  if (input.mode === "domicile" && (r.name.trim().length < 2 || r.phone.replace(/\D/g, "").length < 8 || !r.city)) {
    return { ok: false, error: "Renseignez le nom, le téléphone et la ville du destinataire." };
  }

  const opts: ShippingOption[] = input.mode === "domicile" ? settings.shipping.domicile : settings.shipping.retrait;
  const shipments = quote.groups.map((g) => {
    const opt = opts.find((o) => o.id === input.shipping[g.shopId]) ?? opts[0];
    const zone = zoneFor(g.city, destCity, settings.shipping);
    return { g, opt, zone, price: opt.prices[zone], delay: opt.delays[zone] };
  });
  const deliveryTotal = shipments.reduce((s, x) => s + x.price, 0);
  const total = quote.subtotal + deliveryTotal;

  const db = createAdminClient();
  const { data: cats } = await db.from("products").select("id, category:categories(slug)").in("id", quote.groups.flatMap((g) => g.lines.map((l) => l.productId)));
  const catOf = new Map((cats ?? []).map((c) => [c.id as string, (c.category as unknown as { slug: string } | null)?.slug ?? null]));
  const { data: carrierShops } = await db.from("shops").select("id,slug").in("slug", Object.values(CARRIERS));
  const carrierId = (optId: string) => carrierShops?.find((s) => s.slug === CARRIERS[optId])?.id ?? null;

  const offline = input.payment === "vir" || input.payment === "agence";
  const { data: order, error } = await db
    .from("orders")
    .insert({
      user_id: auth.user.id,
      customer_name: profile?.full_name ?? r.name,
      customer_email: profile?.email ?? auth.user.email,
      status: "pending_payment",
      payment_method: input.payment,
      payment_status: offline ? "awaiting" : "pending",
      gold_price_applied: Math.round(lock.p24 * 100) / 100,
      price_locked_until: lock.lockUntil ? new Date(lock.lockUntil).toISOString() : null,
      subtotal: quote.subtotal,
      delivery_total: deliveryTotal,
      total,
      delivery_mode: input.mode,
      recipient_name: input.mode === "domicile" ? r.name.trim() : profile?.full_name ?? r.name,
      recipient_phone: r.phone.trim() || null,
      city: destCity,
      district: input.mode === "domicile" ? r.district.trim() || null : null,
      instructions: input.mode === "domicile" ? r.instructions.trim() || null : null,
      agency_id: agency?.id ?? null,
      mm_phone: MOBILE_MONEY.includes(input.payment) ? input.mmPhone ?? null : null,
    })
    .select("id, number")
    .single();
  if (error || !order) return { ok: false, error: "La commande n'a pas pu être créée. Réessayez." };

  const items = quote.groups.flatMap((g) =>
    g.lines.map((l) => {
      const rate = Number(settings.commissions[commissionKey(l.kind, catOf.get(l.productId))] ?? 0);
      return {
        order_id: order.id,
        product_id: l.productId,
        shop_id: g.shopId,
        kind: l.kind,
        name: l.name,
        meta: l.meta,
        image_label: l.imageLabel,
        image_url: l.image,
        qty: l.qty,
        unit_gold_value: l.unitGold,
        unit_fabrication: l.unitFab,
        unit_price: l.unit,
        line_total: l.total,
        weight_g: l.weight,
        commission_rate: rate,
        commission_amount: Math.round((l.total * rate) / 100),
        verified_badge: l.badge,
        is_verified: l.verified,
        options: l.options ?? {},
      };
    }),
  );
  await db.from("order_items").insert(items);
  await db.from("shipments").insert(
    shipments.map((s) => ({
      order_id: order.id,
      shop_id: s.g.shopId,
      carrier_id: s.opt.id in CARRIERS ? carrierId(s.opt.id) : null,
      option_name: s.opt.name,
      delay: s.delay,
      price: s.price,
      status: "pending",
      from_city: s.g.city,
      to_city: destCity,
      insured_value: s.g.subtotal,
    })),
  );
  await db.from("order_events").insert({ order_id: order.id, status: "pending_payment", label: "Commande créée", note: `${PAYMENT_METHODS[input.payment][0]} · ${n0(total)} FCFA` });

  // Réservation du stock
  for (const g of quote.groups)
    for (const l of g.lines) {
      const { data: prod } = await db.from("products").select("stock_qty").eq("id", l.productId).single();
      if (prod?.stock_qty != null) {
        const left = Math.max(0, prod.stock_qty - l.qty);
        await db.from("products").update({ stock_qty: left, stock_status: left === 0 ? "out" : left <= 3 ? "low" : "in" }).eq("id", l.productId);
      }
    }
  updateTag("products");

  await db.from("notifications").insert({
    user_id: auth.user.id,
    title: `Commande ${order.number} enregistrée`,
    body: offline ? "En attente de votre paiement." : "Validez le paiement pour confirmer la commande.",
    link: `/compte/commandes/${order.number}`,
  });
  return { ok: true, orderId: order.id, number: order.number };
}

async function ownOrder(orderId: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const db = createAdminClient();
  const { data } = await db.from("orders").select("*").eq("id", orderId).eq("user_id", auth.user.id).maybeSingle();
  return data;
}

async function markPaid(orderId: string, method: PaymentMethod, ref: string) {
  const db = createAdminClient();
  const { data: order } = await db.from("orders").update({ status: "paid", payment_status: "paid", payment_ref: ref, paid_at: new Date().toISOString() }).eq("id", orderId).select("number,total,user_id").single();
  if (!order) return;
  await db.from("order_events").insert({ order_id: orderId, status: "paid", label: "Payée", note: `${PAYMENT_METHODS[method][0]} · ${n0(order.total)} FCFA` });
  const { data: shops } = await db.from("order_items").select("shop:shops(owner_id,name)").eq("order_id", orderId);
  const owners = [...new Set((shops ?? []).map((s) => (s.shop as unknown as { owner_id: string | null })?.owner_id).filter(Boolean))] as string[];
  const notifs = owners.map((uid) => ({ user_id: uid, title: `Nouvelle commande ${order.number}`, body: "Confirmez la disponibilité des articles.", link: "/pro/commandes" }));
  if (order.user_id) notifs.push({ user_id: order.user_id, title: "Paiement reçu", body: `${PAYMENT_METHODS[method][0]} · ${n0(order.total)} FCFA pour la commande ${order.number}.`, link: `/compte/commandes/${order.number}` });
  if (notifs.length) await db.from("notifications").insert(notifs);
}

const SANDBOX = (process.env.PAYMENT_MODE ?? "sandbox") === "sandbox";

/** Envoie la demande de paiement Mobile Money (push USSD chez l'opérateur). */
export async function startMobilePayment(orderId: string, phone: string): Promise<{ ok: boolean; txId?: string; error?: string }> {
  const order = await ownOrder(orderId);
  if (!order) return { ok: false, error: "Commande introuvable." };
  if (order.payment_status === "paid") return { ok: true };
  if (!MOBILE_MONEY.includes(order.payment_method)) return { ok: false, error: "Moyen de paiement incompatible." };
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return { ok: false, error: "Numéro invalide." };
  const db = createAdminClient();
  await db.from("payment_transactions").update({ status: "failed" }).eq("order_id", orderId).eq("status", "awaiting");
  const { data: tx, error } = await db
    .from("payment_transactions")
    .insert({ order_id: orderId, method: order.payment_method, phone: digits, amount: order.total, status: "awaiting", expires_at: new Date(Date.now() + 90_000).toISOString() })
    .select("id")
    .single();
  if (error || !tx) return { ok: false, error: "La demande n'a pas pu être envoyée." };
  await db.from("orders").update({ mm_phone: digits }).eq("id", orderId);
  return { ok: true, txId: tx.id };
}

/** État d'une transaction (interrogé toutes les 2 s pendant la validation). */
export async function checkPayment(txId: string): Promise<{ status: "awaiting" | "paid" | "failed"; ref?: string }> {
  const db = createAdminClient();
  const { data: tx } = await db.from("payment_transactions").select("*").eq("id", txId).maybeSingle();
  if (!tx) return { status: "failed" };
  const order = await ownOrder(tx.order_id);
  if (!order) return { status: "failed" };
  if (tx.status === "paid") return { status: "paid", ref: tx.provider_ref };
  if (tx.status === "failed") return { status: "failed" };
  if (new Date(tx.expires_at).getTime() < Date.now()) {
    await db.from("payment_transactions").update({ status: "failed" }).eq("id", txId);
    return { status: "failed" };
  }
  // Bac à sable : l'opérateur confirme automatiquement après ~6 s.
  if (SANDBOX && Date.now() - new Date(tx.created_at).getTime() > 6000) {
    const d = new Date();
    const ref = `MP${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}.${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}.${tx.id.slice(0, 6).toUpperCase()}`;
    await db.from("payment_transactions").update({ status: "paid", provider_ref: ref }).eq("id", txId);
    await markPaid(tx.order_id, tx.method, ref);
    updateTag("orders");
    return { status: "paid", ref };
  }
  return { status: "awaiting" };
}

function luhn(num: string) {
  let sum = 0;
  for (let i = 0; i < num.length; i++) {
    let d = Number(num[num.length - 1 - i]);
    if (i % 2) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/** Paiement carte (3-D Secure). En bac à sable, la carte est validée localement. */
export async function payByCard(orderId: string, card: { number: string; exp: string; cvc: string }): Promise<{ ok: boolean; error?: string }> {
  const order = await ownOrder(orderId);
  if (!order) return { ok: false, error: "Commande introuvable." };
  if (order.payment_status === "paid") return { ok: true };
  const num = card.number.replace(/\D/g, "");
  const m = card.exp.match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (num.length < 13 || !luhn(num)) return { ok: false, error: "Numéro de carte invalide." };
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12 || new Date(2000 + Number(m[2]), Number(m[1])) < new Date()) return { ok: false, error: "Date d'expiration invalide." };
  if (!/^\d{3,4}$/.test(card.cvc)) return { ok: false, error: "Cryptogramme invalide." };
  if (!SANDBOX) return { ok: false, error: "Le paiement par carte n'est pas encore activé." };
  const db = createAdminClient();
  const ref = `VS-3DS-${Date.now().toString().slice(-6)}`;
  await db.from("payment_transactions").insert({ order_id: orderId, method: "card", amount: order.total, status: "paid", provider_ref: ref });
  await markPaid(orderId, "card", ref);
  updateTag("orders");
  return { ok: true };
}

/** Adresse IP de l'appelant (journalisation). */
export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "—";
}
