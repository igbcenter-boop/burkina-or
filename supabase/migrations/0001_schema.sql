-- ════════════════════════════════════════════════════════════════════
-- Burkina Or · 0001 · Schéma principal
-- Place de marché de l'or : boutique officielle, bijoutiers, comptoirs,
-- fondeurs, logistique, conseil, espace client et administration.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─── Types énumérés ─────────────────────────────────────────────────
do $$ begin
  create type public.user_role as enum ('client','bijoutier','grossiste','fondeur','livreur','conseiller','moderateur','finance','admin','super_admin');
  create type public.shop_type as enum ('officielle','bijoutier','comptoir','fondeur','livreur');
  create type public.shop_status as enum ('pending','more_info','verified','refused','suspended');
  create type public.kyc_doc_status as enum ('pending','ok','ko');
  create type public.product_kind as enum ('lingot','bijou','gros','service');
  create type public.product_status as enum ('draft','pending','published','suspended','removed');
  create type public.stock_status as enum ('in','low','out');
  create type public.order_status as enum ('pending_payment','paid','confirmed','preparing','collected','shipped','at_hub','delivered','incident','cancelled','refunded');
  create type public.payment_method as enum ('om','moov','wave','card','vir','agence');
  create type public.payment_status as enum ('pending','awaiting','paid','failed','refunded');
  create type public.delivery_mode as enum ('domicile','retrait');
  create type public.shipment_status as enum ('pending','assigned','accepted','preparing','collected','shipped','at_hub','delivered','incident');
  create type public.quote_status as enum ('new','answered','negotiating','accepted','refused','closed');
  create type public.advice_status as enum ('new','assigned','in_progress','done','cancelled');
  create type public.complaint_status as enum ('open','assigned','in_progress','resolved','closed');
  create type public.report_status as enum ('open','dismissed','asked','removed');
  create type public.verif_status as enum ('pending','verified','suspended');
exception when duplicate_object then null; end $$;

-- ─── Utilitaires ────────────────────────────────────────────────────
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ─── Profils (1-1 avec auth.users) ──────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  city text,
  address text,
  role public.user_role not null default 'client',
  status text not null default 'active' check (status in ('active','suspended')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

-- ─── Boutiques / structures professionnelles ────────────────────────
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  type public.shop_type not null,
  name text not null,
  slug text not null unique,
  mono text,
  specialty text,
  tagline text,
  description text,
  savoir_faire text,
  city text,
  address text,
  phone text,
  email text,
  whatsapp text,
  website text,
  logo_url text,
  cover_url text,
  zones text[] not null default '{}',
  responsible_name text,
  rccm text,
  ifu text,
  authorization_number text,
  authorization_expires date,
  commercial_terms text,
  capacities text,
  min_order text,
  insurance text,
  tariffs jsonb not null default '[]'::jsonb,
  status public.shop_status not null default 'pending',
  featured boolean not null default false,
  rating numeric(2,1) not null default 0,
  reviews_count integer not null default 0,
  sales_count integer not null default 0,
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  refusal_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shops_owner_idx on public.shops(owner_id);
create index if not exists shops_type_status_idx on public.shops(type, status);
create trigger shops_updated before update on public.shops for each row execute function public.set_updated_at();

-- ─── Pièces justificatives (KYC) ────────────────────────────────────
create table if not exists public.kyc_documents (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  label text not null,
  issuer text,
  file_path text,
  doc_number text,
  issued_at date,
  expires_at date,
  status public.kyc_doc_status not null default 'pending',
  note text,
  sort integer not null default 0,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists kyc_shop_idx on public.kyc_documents(shop_id);

-- ─── Catégories ─────────────────────────────────────────────────────
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind public.product_kind not null,
  image_label text,
  image_url text,
  description text,
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── Produits (lingotins, bijoux, offres de gros, services) ─────────
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  kind public.product_kind not null,
  name text not null,
  slug text not null unique,
  description text,
  images text[] not null default '{}',
  video_url text,
  image_label text,
  weight_g numeric(12,3),
  purity text,
  purity_factor numeric(6,4) not null default 1,
  karat text,
  form text,
  dimensions text,
  pricing_mode text not null default 'fixed' check (pricing_mode in ('indexed','fixed','quote')),
  fabrication_fee numeric(14,0) not null default 0,
  fixed_price numeric(14,0),
  stock_status public.stock_status not null default 'in',
  stock_qty integer,
  max_per_order integer not null default 20,
  restock_date date,
  badge text check (badge in ('top','new','limited')),
  sizes text[] not null default '{}',
  stones text,
  lead_time_days integer,
  customizable boolean not null default false,
  personalization text,
  delivery_info text,
  occasions text[] not null default '{}',
  collection text,
  style text,
  origin text,
  refining text,
  serial_prefix text,
  certificate_number text,
  certificate_lab text,
  certificate_date date,
  certificate_path text,
  weight_verified boolean not null default false,
  purity_verified boolean not null default false,
  origin_verified boolean not null default false,
  specs jsonb not null default '[]'::jsonb,
  min_order_qty text,
  available_qty text,
  price_terms text,
  sale_conditions text,
  status public.product_status not null default 'published',
  featured boolean not null default false,
  rating numeric(2,1) not null default 0,
  reviews_count integer not null default 0,
  sales_count integer not null default 0,
  views_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_shop_idx on public.products(shop_id);
create index if not exists products_kind_status_idx on public.products(kind, status);
create index if not exists products_category_idx on public.products(category_id);
create trigger products_updated before update on public.products for each row execute function public.set_updated_at();

-- ─── Cours de l'or ──────────────────────────────────────────────────
create table if not exists public.gold_prices (
  id bigserial primary key,
  price_raw_per_g numeric(12,2) not null,      -- 24 ct, FCFA/g, avant marge
  usd_per_oz numeric(12,2),
  usd_xof numeric(10,4),
  source text not null default 'manuel',
  created_at timestamptz not null default now()
);
create index if not exists gold_prices_created_idx on public.gold_prices(created_at desc);

-- ─── Paramètres de la plateforme ────────────────────────────────────
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

-- ─── Agences physiques ──────────────────────────────────────────────
create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  city text not null,
  hours text,
  phone text,
  sort integer not null default 0
);

-- ─── Commandes ──────────────────────────────────────────────────────
create sequence if not exists public.order_number_seq start 104900;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('BO-' || nextval('public.order_number_seq')::text),
  user_id uuid references public.profiles(id) on delete set null,
  customer_name text,
  customer_email text,
  status public.order_status not null default 'pending_payment',
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'pending',
  payment_ref text,
  gold_price_applied numeric(12,2),
  price_locked_until timestamptz,
  subtotal numeric(14,0) not null default 0,
  delivery_total numeric(14,0) not null default 0,
  service_fee numeric(14,0) not null default 0,
  total numeric(14,0) not null default 0,
  delivery_mode public.delivery_mode not null default 'domicile',
  recipient_name text,
  recipient_phone text,
  city text,
  district text,
  instructions text,
  agency_id uuid references public.agencies(id) on delete set null,
  otp_code text not null default lpad((floor(random()*10000))::int::text, 4, '0'),
  mm_phone text,
  notes text,
  paid_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);
create trigger orders_updated before update on public.orders for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  shop_id uuid references public.shops(id) on delete set null,
  kind public.product_kind not null,
  name text not null,
  meta text,
  image_label text,
  image_url text,
  qty integer not null check (qty > 0),
  unit_gold_value numeric(14,0) not null default 0,
  unit_fabrication numeric(14,0) not null default 0,
  unit_price numeric(14,0) not null,
  line_total numeric(14,0) not null,
  weight_g numeric(12,3),
  commission_rate numeric(5,2) not null default 0,
  commission_amount numeric(14,0) not null default 0,
  verified_badge text,
  is_verified boolean not null default false,
  options jsonb not null default '{}'::jsonb,
  seller_status text not null default 'pending' check (seller_status in ('pending','confirmed','unavailable','preparing','ready')),
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists order_items_shop_idx on public.order_items(shop_id);

-- Transactions de paiement (Mobile Money, carte, virement…)
create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method public.payment_method not null,
  phone text,
  amount numeric(14,0) not null,
  status public.payment_status not null default 'awaiting',
  provider_ref text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payment_tx_order_idx on public.payment_transactions(order_id);
create trigger payment_tx_updated before update on public.payment_transactions for each row execute function public.set_updated_at();

-- ─── Expéditions & suivi ────────────────────────────────────────────
create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  shop_id uuid references public.shops(id) on delete set null,
  carrier_id uuid references public.shops(id) on delete set null,
  option_name text,
  delay text,
  price numeric(14,0) not null default 0,
  status public.shipment_status not null default 'pending',
  seal_number text,
  from_city text,
  to_city text,
  eta date,
  insured_value numeric(14,0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shipments_order_idx on public.shipments(order_id);
create index if not exists shipments_carrier_idx on public.shipments(carrier_id);
create trigger shipments_updated before update on public.shipments for each row execute function public.set_updated_at();

create table if not exists public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  status public.shipment_status not null,
  label text not null,
  note text,
  photo_path text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists shipment_events_idx on public.shipment_events(shipment_id, created_at);

-- Événements de commande (journal de statut visible du client)
create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  label text not null,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists order_events_idx on public.order_events(order_id, created_at);

-- ─── Demandes de devis (espace professionnel) ───────────────────────
create sequence if not exists public.quote_number_seq start 2400;
create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('DV-' || nextval('public.quote_number_seq')::text),
  buyer_id uuid references public.profiles(id) on delete set null,
  buyer_name text,
  buyer_company text,
  buyer_phone text,
  buyer_email text,
  shop_id uuid not null references public.shops(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_type text,
  quantity text,
  purity text,
  budget text,
  delivery_city text,
  message text,
  status public.quote_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists quotes_shop_idx on public.quote_requests(shop_id);
create index if not exists quotes_buyer_idx on public.quote_requests(buyer_id);
create trigger quotes_updated before update on public.quote_requests for each row execute function public.set_updated_at();

create table if not exists public.quote_messages (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quote_requests(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  sender_side text not null check (sender_side in ('buyer','seller','admin')),
  body text not null,
  price_offer numeric(16,0),
  conditions text,
  created_at timestamptz not null default now()
);
create index if not exists quote_messages_idx on public.quote_messages(quote_id, created_at);

-- ─── Conseil & accompagnement ───────────────────────────────────────
create table if not exists public.advice_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  phone text,
  email text,
  need text not null,
  product_type text,
  quantity text,
  budget text,
  message text,
  channel text not null default 'telephone',
  preferred_date timestamptz,
  status public.advice_status not null default 'new',
  advisor_id uuid references public.profiles(id) on delete set null,
  advisor_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger advice_updated before update on public.advice_requests for each row execute function public.set_updated_at();

-- ─── Réclamations ───────────────────────────────────────────────────
create sequence if not exists public.complaint_number_seq start 3100;
create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('RC-' || nextval('public.complaint_number_seq')::text),
  user_id uuid references public.profiles(id) on delete set null,
  reporter_name text,
  order_id uuid references public.orders(id) on delete set null,
  shop_id uuid references public.shops(id) on delete set null,
  category text not null default 'autre',
  subject text not null,
  description text not null,
  status public.complaint_status not null default 'open',
  priority text not null default 'normale' check (priority in ('basse','normale','haute','critique')),
  assigned_to uuid references public.profiles(id) on delete set null,
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger complaints_updated before update on public.complaints for each row execute function public.set_updated_at();

create table if not exists public.complaint_messages (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  sender_side text not null check (sender_side in ('client','staff')),
  body text not null,
  created_at timestamptz not null default now()
);

-- ─── Messagerie client ↔ vendeur ────────────────────────────────────
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  subject text,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  sender_side text not null check (sender_side in ('client','seller','staff')),
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_conv_idx on public.messages(conversation_id, created_at);

-- ─── Notifications ──────────────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

-- ─── Modération ─────────────────────────────────────────────────────
create table if not exists public.product_reports (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  status public.report_status not null default 'open',
  handled_by uuid references public.profiles(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  field text not null check (field in ('Poids','Pureté','Titre','Origine')),
  declared text not null,
  measured text not null,
  report_number text,
  lab text,
  within_tolerance boolean not null default true,
  gap text,
  status public.verif_status not null default 'pending',
  handled_by uuid references public.profiles(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─── Journal d'audit (infalsifiable) ────────────────────────────────
create table if not exists public.audit_logs (
  id bigserial primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null,
  actor_role text not null,
  action text not null,
  target text,
  ip text,
  sensitive boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_created_idx on public.audit_logs(created_at desc);

create or replace function public.audit_logs_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'Le journal d''audit est en lecture seule';
end $$;
drop trigger if exists audit_no_update on public.audit_logs;
create trigger audit_no_update before update or delete on public.audit_logs
  for each row execute function public.audit_logs_immutable();

-- ─── Contenus & engagement ──────────────────────────────────────────
create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  contact text not null,
  target_price numeric(12,0),
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  shop_id uuid references public.shops(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  author_name text not null,
  author_meta text,
  initials text,
  rating integer not null check (rating between 1 and 5),
  body text not null,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text not null default 'Général',
  featured boolean not null default false,
  sort integer not null default 0
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  subject text,
  message text not null,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);
