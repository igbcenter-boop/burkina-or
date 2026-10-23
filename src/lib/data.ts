import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "./supabase/public";
import { publicPrice } from "./pricing";
import type {
  Agency, Category, Commissions, CompanySettings, Faq, GoldQuote, PaymentsSettings, PricingSettings,
  ProductKind, ProductWithShop, Review, Shop, ShippingSettings, ShopType,
} from "./types";

export const PRODUCT_SELECT =
  "*, shop:shops!inner(id,name,slug,mono,city,type,rating,reviews_count,status), category:categories(slug,name)";

// ─── Paramètres ─────────────────────────────────────────────────────
export async function getSettings() {
  "use cache";
  cacheTag("settings");
  cacheLife("hours");
  const db = createPublicClient();
  const { data } = await db.from("settings").select("key,value");
  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  return {
    pricing: map.pricing as PricingSettings,
    commissions: map.commissions as Commissions,
    payments: map.payments as PaymentsSettings,
    shipping: map.shipping as ShippingSettings,
    homeStats: (map.home_stats ?? []) as [string, string][],
    company: map.company as CompanySettings,
    locales: (map.locales ?? []) as [string, string, string][],
  };
}

// ─── Cours de l'or ──────────────────────────────────────────────────
export async function getGoldQuote(): Promise<GoldQuote> {
  "use cache";
  cacheTag("gold", "settings");
  cacheLife("minutes");
  const db = createPublicClient();
  const [{ data: rows }, settings] = await Promise.all([
    db.from("gold_prices").select("price_raw_per_g,created_at").order("created_at", { ascending: false }).limit(60),
    getSettings(),
  ]);
  const margin = Number(settings.pricing?.margin_pct ?? 0);
  const list = (rows ?? []).map((r) => ({ raw: Number(r.price_raw_per_g), at: r.created_at as string }));
  const latest = list[0] ?? { raw: 0, at: new Date(0).toISOString() };
  const dayStart = new Date(latest.at);
  dayStart.setUTCHours(0, 0, 0, 0);
  const prev = list.find((r) => new Date(r.at) < dayStart) ?? list[list.length - 1] ?? latest;
  const p24 = publicPrice(latest.raw, margin);
  const ref24 = publicPrice(prev.raw, margin);
  // Une valeur par jour (la dernière), du plus ancien au plus récent, pour la sparkline.
  const byDay = new Map<string, number>();
  for (const r of list) {
    const k = r.at.slice(0, 10);
    if (!byDay.has(k)) byDay.set(k, publicPrice(r.raw, margin));
  }
  const history = [...byDay.values()].slice(0, 7).reverse();
  return {
    raw: latest.raw,
    margin,
    p24,
    p22: p24 * 0.9167,
    p18: p24 * 0.75,
    ref24,
    changePct: ref24 ? ((p24 - ref24) / ref24) * 100 : 0,
    updatedAt: latest.at,
    history,
  };
}

// ─── Catalogue ──────────────────────────────────────────────────────
export async function getCategories(kind?: ProductKind): Promise<(Category & { count: number })[]> {
  "use cache";
  cacheTag("products", "categories");
  cacheLife("hours");
  const db = createPublicClient();
  let q = db.from("categories").select("*").eq("active", true).order("sort");
  if (kind) q = q.eq("kind", kind);
  const [{ data: cats }, { data: counts }] = await Promise.all([q, db.rpc("category_counts")]);
  const byId = new Map<string, number>((counts ?? []).map((c: { category_id: string; n: number }) => [c.category_id, Number(c.n)]));
  return ((cats ?? []) as Category[]).map((c) => ({ ...c, count: byId.get(c.id) ?? 0 }));
}

export async function getProducts(opts: {
  kind?: ProductKind;
  shopId?: string;
  shopSlug?: string;
  categorySlug?: string;
  featured?: boolean;
  limit?: number;
  order?: "recent" | "popular" | "weight";
} = {}): Promise<ProductWithShop[]> {
  "use cache";
  cacheTag("products");
  cacheLife("minutes");
  const db = createPublicClient();
  let q = db.from("products").select(PRODUCT_SELECT).eq("status", "published").eq("shop.status", "verified");
  if (opts.kind) q = q.eq("kind", opts.kind);
  if (opts.shopId) q = q.eq("shop_id", opts.shopId);
  if (opts.shopSlug) q = q.eq("shop.slug", opts.shopSlug);
  if (opts.featured) q = q.eq("featured", true);
  if (opts.categorySlug) {
    const { data: cat } = await db.from("categories").select("id").eq("slug", opts.categorySlug).maybeSingle();
    if (!cat) return [];
    q = q.eq("category_id", cat.id);
  }
  if (opts.order === "popular") q = q.order("sales_count", { ascending: false });
  else if (opts.order === "weight") q = q.order("weight_g", { ascending: true });
  else q = q.order("created_at", { ascending: false });
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) console.error("getProducts", error.message);
  return (data ?? []) as unknown as ProductWithShop[];
}

export async function getProductBySlug(slug: string): Promise<ProductWithShop | null> {
  "use cache";
  cacheTag("products", `product:${slug}`);
  cacheLife("minutes");
  const db = createPublicClient();
  const { data } = await db.from("products").select(PRODUCT_SELECT).eq("slug", slug).eq("status", "published").maybeSingle();
  return (data as unknown as ProductWithShop) ?? null;
}

export async function searchProducts(term: string, kind?: ProductKind): Promise<ProductWithShop[]> {
  "use cache";
  cacheTag("products");
  cacheLife("minutes");
  const db = createPublicClient();
  const t = term.replace(/[%,()]/g, " ").trim();
  let q = db.from("products").select(PRODUCT_SELECT).eq("status", "published").eq("shop.status", "verified");
  if (kind) q = q.eq("kind", kind);
  if (t) q = q.or(`name.ilike.%${t}%,description.ilike.%${t}%,purity.ilike.%${t}%,karat.ilike.%${t}%,form.ilike.%${t}%`);
  const { data } = await q.order("sales_count", { ascending: false }).limit(48);
  return (data ?? []) as unknown as ProductWithShop[];
}

// ─── Boutiques ──────────────────────────────────────────────────────
export async function getShops(type?: ShopType, featured?: boolean): Promise<Shop[]> {
  "use cache";
  cacheTag("shops");
  cacheLife("hours");
  const db = createPublicClient();
  let q = db.from("shops").select("*").eq("status", "verified");
  if (type) q = q.eq("type", type);
  if (featured) q = q.eq("featured", true);
  const { data } = await q.order("rating", { ascending: false });
  return (data ?? []) as Shop[];
}

export async function getShopBySlug(slug: string): Promise<Shop | null> {
  "use cache";
  cacheTag("shops", `shop:${slug}`);
  cacheLife("hours");
  const db = createPublicClient();
  const { data } = await db.from("shops").select("*").eq("slug", slug).eq("status", "verified").maybeSingle();
  return (data as Shop) ?? null;
}

export async function searchShops(term: string): Promise<Shop[]> {
  "use cache";
  cacheTag("shops");
  cacheLife("hours");
  const db = createPublicClient();
  const t = term.replace(/[%,()]/g, " ").trim();
  let q = db.from("shops").select("*").eq("status", "verified").neq("type", "officielle");
  if (t) q = q.or(`name.ilike.%${t}%,city.ilike.%${t}%,specialty.ilike.%${t}%`);
  const { data } = await q.limit(24);
  return (data ?? []) as Shop[];
}

// ─── Contenus ───────────────────────────────────────────────────────
export async function getFaqs(featured?: boolean): Promise<Faq[]> {
  "use cache";
  cacheTag("faqs");
  cacheLife("days");
  const db = createPublicClient();
  let q = db.from("faqs").select("*").order("sort");
  if (featured) q = q.eq("featured", true);
  const { data } = await q;
  return (data ?? []) as Faq[];
}

export async function getReviews(opts: { featured?: boolean; productId?: string; shopId?: string; limit?: number } = {}): Promise<Review[]> {
  "use cache";
  cacheTag("reviews");
  cacheLife("hours");
  const db = createPublicClient();
  let q = db.from("reviews").select("*").order("created_at", { ascending: false });
  if (opts.featured) q = q.eq("featured", true);
  if (opts.productId) q = q.eq("product_id", opts.productId);
  if (opts.shopId) q = q.eq("shop_id", opts.shopId);
  if (opts.limit) q = q.limit(opts.limit);
  const { data } = await q;
  return (data ?? []) as Review[];
}

export async function getAgencies(): Promise<Agency[]> {
  "use cache";
  cacheTag("settings");
  cacheLife("days");
  const db = createPublicClient();
  const { data } = await db.from("agencies").select("*").order("sort");
  return (data ?? []) as Agency[];
}
