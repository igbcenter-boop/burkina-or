export type UserRole =
  | "client" | "bijoutier" | "grossiste" | "fondeur" | "livreur"
  | "conseiller" | "moderateur" | "finance" | "admin" | "super_admin";
export type ShopType = "officielle" | "bijoutier" | "comptoir" | "fondeur" | "livreur";
export type ShopStatus = "pending" | "more_info" | "verified" | "refused" | "suspended";
export type ProductKind = "lingot" | "bijou" | "gros" | "service";
export type ProductStatus = "draft" | "pending" | "published" | "suspended" | "removed";
export type StockStatus = "in" | "low" | "out";
export type OrderStatus =
  | "pending_payment" | "paid" | "confirmed" | "preparing" | "collected"
  | "shipped" | "at_hub" | "delivered" | "incident" | "cancelled" | "refunded";
export type PaymentMethod = "om" | "moov" | "wave" | "card" | "vir" | "agence";
export type PaymentStatus = "pending" | "awaiting" | "paid" | "failed" | "refunded";
export type ShipmentStatus = "pending" | "assigned" | "accepted" | "preparing" | "collected" | "shipped" | "at_hub" | "delivered" | "incident";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  role: UserRole;
  status: "active" | "suspended";
  avatar_url: string | null;
  created_at: string;
};

export type Shop = {
  id: string;
  owner_id: string | null;
  type: ShopType;
  name: string;
  slug: string;
  mono: string | null;
  specialty: string | null;
  tagline: string | null;
  description: string | null;
  savoir_faire: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  website: string | null;
  logo_url: string | null;
  cover_url: string | null;
  zones: string[];
  responsible_name: string | null;
  rccm: string | null;
  ifu: string | null;
  authorization_number: string | null;
  authorization_expires: string | null;
  commercial_terms: string | null;
  capacities: string | null;
  min_order: string | null;
  insurance: string | null;
  tariffs: { zone: string; price: number; delay: string }[];
  status: ShopStatus;
  featured: boolean;
  rating: number;
  reviews_count: number;
  sales_count: number;
  submitted_at: string;
  verified_at: string | null;
  refusal_reason: string | null;
  created_at: string;
};

export type Spec = { k: string; v: string; verified: boolean };

export type Product = {
  id: string;
  shop_id: string;
  category_id: string | null;
  kind: ProductKind;
  name: string;
  slug: string;
  description: string | null;
  images: string[];
  video_url: string | null;
  image_label: string | null;
  weight_g: number | null;
  purity: string | null;
  purity_factor: number;
  karat: string | null;
  form: string | null;
  dimensions: string | null;
  pricing_mode: "indexed" | "fixed" | "quote";
  fabrication_fee: number;
  fixed_price: number | null;
  stock_status: StockStatus;
  stock_qty: number | null;
  max_per_order: number;
  restock_date: string | null;
  badge: "top" | "new" | "limited" | null;
  sizes: string[];
  stones: string | null;
  lead_time_days: number | null;
  customizable: boolean;
  personalization: string | null;
  delivery_info: string | null;
  occasions: string[];
  collection: string | null;
  style: string | null;
  origin: string | null;
  refining: string | null;
  serial_prefix: string | null;
  certificate_number: string | null;
  certificate_lab: string | null;
  certificate_date: string | null;
  certificate_path: string | null;
  weight_verified: boolean;
  purity_verified: boolean;
  origin_verified: boolean;
  specs: Spec[];
  min_order_qty: string | null;
  available_qty: string | null;
  price_terms: string | null;
  sale_conditions: string | null;
  status: ProductStatus;
  featured: boolean;
  rating: number;
  reviews_count: number;
  sales_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
};

export type ProductWithShop = Product & {
  shop: Pick<Shop, "id" | "name" | "slug" | "mono" | "city" | "type" | "rating" | "reviews_count" | "status">;
  category?: { slug: string; name: string } | null;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  kind: ProductKind;
  image_label: string | null;
  image_url: string | null;
  description: string | null;
  sort: number;
  active: boolean;
};

export type GoldQuote = {
  raw: number;          // FCFA/g 24 ct avant marge
  margin: number;       // %
  p24: number;          // prix public FCFA/g
  p22: number;
  p18: number;
  ref24: number;        // clôture précédente (prix public)
  changePct: number;
  updatedAt: string;
  history: number[];    // derniers prix publics (sparkline)
};

export type ShippingOption = {
  id: string;
  name: string;
  note: string;
  prices: Record<"local" | "burkina" | "international", number>;
  delays: Record<"local" | "burkina" | "international", string>;
};

export type ShippingSettings = {
  zones: Record<string, string>;
  cities: Record<string, string>;
  domicile: ShippingOption[];
  retrait: ShippingOption[];
  retraction_hours: number;
};

export type PricingSettings = {
  margin_pct: number;
  lock_minutes: number;
  breaker_enabled: boolean;
  breaker_pct: number;
  source: string;
  fx: string;
};

export type Commissions = Record<"lingot" | "bijou" | "sur_mesure" | "gros" | "service" | "livraison", number>;

export type PaymentsSettings = Record<PaymentMethod, { enabled: boolean; fee: string }>;

export type CompanySettings = {
  name: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  rccm: string;
  ifu: string;
  agrement: string;
  bank: { beneficiary: string; bank: string; iban: string };
  countries: number;
};

export type Agency = { id: string; name: string; address: string; city: string; hours: string | null; phone: string | null; sort: number };

export type Faq = { id: string; question: string; answer: string; category: string; featured: boolean; sort: number };

export type Review = {
  id: string;
  product_id: string | null;
  shop_id: string | null;
  author_name: string;
  author_meta: string | null;
  initials: string | null;
  rating: number;
  body: string;
  featured: boolean;
  created_at: string;
};

export type Order = {
  id: string;
  number: string;
  user_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_ref: string | null;
  gold_price_applied: number | null;
  price_locked_until: string | null;
  subtotal: number;
  delivery_total: number;
  service_fee: number;
  total: number;
  delivery_mode: "domicile" | "retrait";
  recipient_name: string | null;
  recipient_phone: string | null;
  city: string | null;
  district: string | null;
  instructions: string | null;
  agency_id: string | null;
  otp_code: string;
  mm_phone: string | null;
  paid_at: string | null;
  delivered_at: string | null;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  shop_id: string | null;
  kind: ProductKind;
  name: string;
  meta: string | null;
  image_label: string | null;
  image_url: string | null;
  qty: number;
  unit_gold_value: number;
  unit_fabrication: number;
  unit_price: number;
  line_total: number;
  weight_g: number | null;
  commission_rate: number;
  commission_amount: number;
  verified_badge: string | null;
  is_verified: boolean;
  options: { size?: string; engraving?: string };
  seller_status: "pending" | "confirmed" | "unavailable" | "preparing" | "ready";
};

export type Shipment = {
  id: string;
  order_id: string;
  shop_id: string | null;
  carrier_id: string | null;
  option_name: string | null;
  delay: string | null;
  price: number;
  status: ShipmentStatus;
  seal_number: string | null;
  from_city: string | null;
  to_city: string | null;
  eta: string | null;
  insured_value: number | null;
  created_at: string;
};

export type ShipmentEvent = { id: string; shipment_id: string; status: ShipmentStatus; label: string; note: string | null; photo_path: string | null; created_at: string };
export type OrderEvent = { id: string; order_id: string; status: OrderStatus; label: string; note: string | null; created_at: string };
