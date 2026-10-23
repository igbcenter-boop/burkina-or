-- ════════════════════════════════════════════════════════════════════
-- Burkina Or · 0002 · Fonctions de sécurité, triggers et RLS
-- ════════════════════════════════════════════════════════════════════

-- ─── Helpers de rôle (security definer : évite la récursion RLS) ────
create or replace function public.current_role_name() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin') and status = 'active')
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role in ('conseiller','moderateur','finance','admin','super_admin') and status = 'active')
$$;

create or replace function public.owns_shop(p_shop uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.shops where id = p_shop and owner_id = auth.uid())
$$;

create or replace function public.my_shop_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from public.shops where owner_id = auth.uid()
$$;

create or replace function public.can_see_order(p_order uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.orders o where o.id = p_order and o.user_id = auth.uid())
      or exists(select 1 from public.order_items i join public.shops s on s.id = i.shop_id where i.order_id = p_order and s.owner_id = auth.uid())
      or exists(select 1 from public.shipments sh join public.shops s on s.id = sh.carrier_id where sh.order_id = p_order and s.owner_id = auth.uid())
      or public.is_staff()
$$;

-- ─── Création automatique du profil à l'inscription ─────────────────
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  requested text := coalesce(new.raw_user_meta_data->>'role', 'client');
  final_role public.user_role;
begin
  -- Seuls les rôles publics peuvent être demandés à l'inscription.
  if requested in ('client','bijoutier','grossiste','fondeur','livreur') then
    final_role := requested::public.user_role;
  else
    final_role := 'client';
  end if;
  insert into public.profiles (id, full_name, email, phone, city, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'city',
    final_role
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Garde-fous : champs réservés au personnel ──────────────────────
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.status := old.status;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles for each row execute function public.guard_profile_update();

create or replace function public.guard_shop_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    if tg_op = 'INSERT' then
      new.status := 'pending';
      new.featured := false;
      new.rating := 0;
      new.reviews_count := 0;
      new.sales_count := 0;
      new.verified_at := null;
      new.verified_by := null;
      new.owner_id := auth.uid();
      if new.type = 'officielle' then
        raise exception 'Type de boutique réservé';
      end if;
    else
      new.status := old.status;
      new.featured := old.featured;
      new.rating := old.rating;
      new.reviews_count := old.reviews_count;
      new.sales_count := old.sales_count;
      new.verified_at := old.verified_at;
      new.verified_by := old.verified_by;
      new.owner_id := old.owner_id;
      new.type := old.type;
      new.refusal_reason := old.refusal_reason;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists shops_guard on public.shops;
create trigger shops_guard before insert or update on public.shops for each row execute function public.guard_shop_write();

create or replace function public.guard_product_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    -- Les mentions « Vérifié par Burkina Or » ne peuvent être posées que par l'équipe.
    if tg_op = 'INSERT' then
      new.weight_verified := false;
      new.purity_verified := false;
      new.origin_verified := false;
      new.featured := false;
      new.rating := 0;
      new.reviews_count := 0;
      new.sales_count := 0;
      new.views_count := 0;
      if new.status not in ('draft','published') then new.status := 'published'; end if;
      if not exists(select 1 from public.shops where id = new.shop_id and status = 'verified') then
        new.status := 'draft';
      end if;
    else
      new.weight_verified := old.weight_verified;
      new.purity_verified := old.purity_verified;
      new.origin_verified := old.origin_verified;
      new.featured := old.featured;
      new.rating := old.rating;
      new.reviews_count := old.reviews_count;
      new.sales_count := old.sales_count;
      new.views_count := old.views_count;
      new.shop_id := old.shop_id;
      -- Un produit suspendu/retiré par la modération ne peut être republié par le vendeur.
      if old.status in ('suspended','removed') then new.status := old.status; end if;
      if new.status not in ('draft','published', old.status) then new.status := old.status; end if;
      -- Toute modification d'une caractéristique vérifiée la repasse en « déclaré ».
      if new.weight_g is distinct from old.weight_g then new.weight_verified := false; end if;
      if new.purity is distinct from old.purity then new.purity_verified := false; end if;
      if new.origin is distinct from old.origin then new.origin_verified := false; end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists products_guard on public.products;
create trigger products_guard before insert or update on public.products for each row execute function public.guard_product_write();

create or replace function public.guard_kyc_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    if tg_op = 'INSERT' then
      new.status := 'pending';
      new.reviewed_by := null;
      new.reviewed_at := null;
    else
      -- Le titulaire peut remplacer le fichier : la pièce repasse « à vérifier ».
      new.status := 'pending';
      new.reviewed_by := null;
      new.reviewed_at := null;
      new.shop_id := old.shop_id;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists kyc_guard on public.kyc_documents;
create trigger kyc_guard before insert or update on public.kyc_documents for each row execute function public.guard_kyc_write();

-- ─── Journal d'audit : écriture via fonction uniquement ─────────────
create or replace function public.log_audit(p_action text, p_target text, p_sensitive boolean default false, p_ip text default null, p_metadata jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_name text; v_role text;
begin
  if not public.is_staff() then
    raise exception 'Accès refusé';
  end if;
  select coalesce(full_name, email), case role
      when 'super_admin' then 'Super-admin' when 'admin' then 'Administration'
      when 'moderateur' then 'Modération' when 'finance' then 'Finance'
      when 'conseiller' then 'Conseil' else role::text end
    into v_name, v_role from public.profiles where id = auth.uid();
  insert into public.audit_logs(actor_id, actor_name, actor_role, action, target, ip, sensitive, metadata)
  values (auth.uid(), v_name, v_role, p_action, p_target, p_ip, coalesce(p_sensitive,false), coalesce(p_metadata,'{}'::jsonb));
end $$;

-- ─── Code de remise : vérification par le livreur ───────────────────
create or replace function public.verify_delivery_code(p_shipment uuid, p_code text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_ok boolean;
  v_order uuid;
begin
  if not exists(select 1 from public.shipments sh join public.shops s on s.id = sh.carrier_id
                where sh.id = p_shipment and s.owner_id = auth.uid()) and not public.is_staff() then
    raise exception 'Accès refusé';
  end if;
  select o.otp_code = p_code, o.id into v_ok, v_order
    from public.shipments sh join public.orders o on o.id = sh.order_id where sh.id = p_shipment;
  return coalesce(v_ok, false);
end $$;

-- ─── Statistiques publiques (compteurs de catégories) ───────────────
create or replace function public.category_counts()
returns table(category_id uuid, n bigint) language sql stable security definer set search_path = public as $$
  select p.category_id, count(*) from public.products p
    join public.shops s on s.id = p.shop_id
   where p.status = 'published' and s.status = 'verified' and p.category_id is not null
   group by p.category_id
$$;

create or replace function public.increment_product_views(p_product uuid)
returns void language sql security definer set search_path = public as $$
  update public.products set views_count = views_count + 1 where id = p_product and status = 'published'
$$;

-- ════════════════════════════════════════════════════════════════════
-- Privilèges & RLS
-- ════════════════════════════════════════════════════════════════════
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated, anon;
grant select on all tables in schema public to anon;
grant insert on public.advice_requests, public.price_alerts, public.contact_messages, public.product_reports to anon;
grant execute on all functions in schema public to anon, authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.kyc_documents enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.gold_prices enable row level security;
alter table public.settings enable row level security;
alter table public.agencies enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_events enable row level security;
alter table public.order_events enable row level security;
alter table public.quote_requests enable row level security;
alter table public.quote_messages enable row level security;
alter table public.advice_requests enable row level security;
alter table public.complaints enable row level security;
alter table public.complaint_messages enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.product_reports enable row level security;
alter table public.verification_requests enable row level security;
alter table public.audit_logs enable row level security;
alter table public.price_alerts enable row level security;
alter table public.favorites enable row level security;
alter table public.reviews enable row level security;
alter table public.faqs enable row level security;
alter table public.contact_messages enable row level security;

-- profiles
create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy profiles_update_self on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- shops
create policy shops_public on public.shops for select using (status = 'verified' or owner_id = auth.uid() or public.is_staff());
create policy shops_insert on public.shops for insert to authenticated with check (owner_id = auth.uid() or public.is_staff());
create policy shops_update on public.shops for update using (owner_id = auth.uid() or public.is_staff()) with check (owner_id = auth.uid() or public.is_staff());
create policy shops_delete on public.shops for delete using (public.is_admin());

-- kyc_documents
create policy kyc_select on public.kyc_documents for select using (public.owns_shop(shop_id) or public.is_staff());
create policy kyc_insert on public.kyc_documents for insert to authenticated with check (public.owns_shop(shop_id) or public.is_staff());
create policy kyc_update on public.kyc_documents for update using (public.owns_shop(shop_id) or public.is_staff());
create policy kyc_delete on public.kyc_documents for delete using (public.is_staff());

-- categories / agencies / faqs / settings / gold_prices : lecture publique
create policy categories_read on public.categories for select using (true);
create policy categories_write on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy agencies_read on public.agencies for select using (true);
create policy agencies_write on public.agencies for all using (public.is_admin()) with check (public.is_admin());
create policy faqs_read on public.faqs for select using (true);
create policy faqs_write on public.faqs for all using (public.is_admin()) with check (public.is_admin());
create policy settings_read on public.settings for select using (true);
create policy settings_write on public.settings for all using (public.is_admin()) with check (public.is_admin());
create policy gold_read on public.gold_prices for select using (true);
create policy gold_write on public.gold_prices for insert with check (public.is_admin());

-- products
create policy products_public on public.products for select using (
  (status = 'published' and exists(select 1 from public.shops s where s.id = shop_id and s.status = 'verified'))
  or public.owns_shop(shop_id) or public.is_staff()
);
create policy products_insert on public.products for insert to authenticated with check (public.owns_shop(shop_id) or public.is_staff());
create policy products_update on public.products for update using (public.owns_shop(shop_id) or public.is_staff()) with check (public.owns_shop(shop_id) or public.is_staff());
create policy products_delete on public.products for delete using (public.owns_shop(shop_id) or public.is_admin());

-- orders & co. (création via serveur, service_role)
create policy orders_select on public.orders for select using (public.can_see_order(id));
create policy orders_staff on public.orders for update using (public.is_staff()) with check (public.is_staff());
create policy order_items_select on public.order_items for select using (public.can_see_order(order_id));
create policy order_items_seller on public.order_items for update using (shop_id in (select public.my_shop_ids()) or public.is_staff());
create policy payment_tx_select on public.payment_transactions for select using (public.can_see_order(order_id));
create policy shipments_select on public.shipments for select using (public.can_see_order(order_id));
create policy shipments_update on public.shipments for update using (
  carrier_id in (select public.my_shop_ids()) or shop_id in (select public.my_shop_ids()) or public.is_staff()
);
create policy shipment_events_select on public.shipment_events for select using (
  exists(select 1 from public.shipments sh where sh.id = shipment_id and public.can_see_order(sh.order_id))
);
create policy shipment_events_insert on public.shipment_events for insert to authenticated with check (
  exists(select 1 from public.shipments sh where sh.id = shipment_id and
    (sh.carrier_id in (select public.my_shop_ids()) or sh.shop_id in (select public.my_shop_ids()) or public.is_staff()))
);
create policy order_events_select on public.order_events for select using (public.can_see_order(order_id));

-- devis
create policy quotes_select on public.quote_requests for select using (buyer_id = auth.uid() or public.owns_shop(shop_id) or public.is_staff());
create policy quotes_insert on public.quote_requests for insert to authenticated with check (buyer_id = auth.uid());
create policy quotes_update on public.quote_requests for update using (buyer_id = auth.uid() or public.owns_shop(shop_id) or public.is_staff());
create policy quote_msgs_select on public.quote_messages for select using (
  exists(select 1 from public.quote_requests q where q.id = quote_id and (q.buyer_id = auth.uid() or public.owns_shop(q.shop_id) or public.is_staff()))
);
create policy quote_msgs_insert on public.quote_messages for insert to authenticated with check (
  sender_id = auth.uid() and exists(select 1 from public.quote_requests q where q.id = quote_id and (q.buyer_id = auth.uid() or public.owns_shop(q.shop_id) or public.is_staff()))
);

-- conseil
create policy advice_insert on public.advice_requests for insert with check (user_id is null or user_id = auth.uid());
create policy advice_select on public.advice_requests for select using (user_id = auth.uid() or public.is_staff());
create policy advice_update on public.advice_requests for update using (public.is_staff());

-- réclamations
create policy complaints_insert on public.complaints for insert to authenticated with check (user_id = auth.uid());
create policy complaints_select on public.complaints for select using (user_id = auth.uid() or public.is_staff() or (shop_id is not null and public.owns_shop(shop_id)));
create policy complaints_update on public.complaints for update using (public.is_staff());
create policy complaint_msgs_select on public.complaint_messages for select using (
  exists(select 1 from public.complaints c where c.id = complaint_id and (c.user_id = auth.uid() or public.is_staff()))
);
create policy complaint_msgs_insert on public.complaint_messages for insert to authenticated with check (
  sender_id = auth.uid() and exists(select 1 from public.complaints c where c.id = complaint_id and (c.user_id = auth.uid() or public.is_staff()))
);

-- messagerie
create policy conv_select on public.conversations for select using (client_id = auth.uid() or public.owns_shop(shop_id) or public.is_staff());
create policy conv_insert on public.conversations for insert to authenticated with check (client_id = auth.uid());
create policy conv_update on public.conversations for update using (client_id = auth.uid() or public.owns_shop(shop_id) or public.is_staff());
create policy msg_select on public.messages for select using (
  exists(select 1 from public.conversations c where c.id = conversation_id and (c.client_id = auth.uid() or public.owns_shop(c.shop_id) or public.is_staff()))
);
create policy msg_insert on public.messages for insert to authenticated with check (
  sender_id = auth.uid() and exists(select 1 from public.conversations c where c.id = conversation_id and (c.client_id = auth.uid() or public.owns_shop(c.shop_id) or public.is_staff()))
);

-- notifications
create policy notif_select on public.notifications for select using (user_id = auth.uid());
create policy notif_update on public.notifications for update using (user_id = auth.uid());
create policy notif_staff on public.notifications for insert with check (public.is_staff());

-- modération
create policy reports_insert on public.product_reports for insert with check (reporter_id is null or reporter_id = auth.uid());
create policy reports_staff on public.product_reports for select using (public.is_staff());
create policy reports_update on public.product_reports for update using (public.is_staff());
create policy verif_select on public.verification_requests for select using (
  public.is_staff() or exists(select 1 from public.products p where p.id = product_id and public.owns_shop(p.shop_id))
);
create policy verif_write on public.verification_requests for all using (public.is_staff()) with check (public.is_staff());

-- audit (lecture personnel uniquement ; écriture via log_audit)
create policy audit_select on public.audit_logs for select using (public.is_staff());

-- engagement
create policy alerts_insert on public.price_alerts for insert with check (user_id is null or user_id = auth.uid());
create policy alerts_select on public.price_alerts for select using (user_id = auth.uid() or public.is_staff());
create policy fav_all on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy reviews_read on public.reviews for select using (true);
create policy reviews_insert on public.reviews for insert to authenticated with check (user_id = auth.uid());
create policy reviews_admin on public.reviews for update using (public.is_admin());
create policy reviews_delete on public.reviews for delete using (public.is_admin());
create policy contact_insert on public.contact_messages for insert with check (true);
create policy contact_staff on public.contact_messages for select using (public.is_staff());
create policy contact_update on public.contact_messages for update using (public.is_staff());
