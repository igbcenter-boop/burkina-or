-- ════════════════════════════════════════════════════════════════════
-- Burkina Or · 0003 · Stockage des fichiers
-- products / shops / certificates : publics ; kyc / shipments : privés.
-- Convention de chemin : <shop_id>/<fichier>
-- ════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('products', 'products', true, 10485760, array['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm']),
  ('shops', 'shops', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif','image/svg+xml']),
  ('certificates', 'certificates', true, 10485760, array['application/pdf','image/jpeg','image/png']),
  ('kyc', 'kyc', false, 10485760, array['application/pdf','image/jpeg','image/png','image/webp']),
  ('shipments', 'shipments', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Lecture publique des visuels
drop policy if exists "bo_public_read" on storage.objects;
create policy "bo_public_read" on storage.objects for select
  using (bucket_id in ('products','shops','certificates'));

-- Écriture des visuels par le titulaire de la boutique (dossier = shop_id) ou l'équipe
drop policy if exists "bo_shop_write" on storage.objects;
create policy "bo_shop_write" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('products','shops','certificates')
    and (public.is_staff() or public.owns_shop(((storage.foldername(name))[1])::uuid))
  );
drop policy if exists "bo_shop_update" on storage.objects;
create policy "bo_shop_update" on storage.objects for update to authenticated
  using (
    bucket_id in ('products','shops','certificates')
    and (public.is_staff() or public.owns_shop(((storage.foldername(name))[1])::uuid))
  );
drop policy if exists "bo_shop_delete" on storage.objects;
create policy "bo_shop_delete" on storage.objects for delete to authenticated
  using (
    bucket_id in ('products','shops','certificates')
    and (public.is_staff() or public.owns_shop(((storage.foldername(name))[1])::uuid))
  );

-- Pièces KYC : titulaire et équipe uniquement
drop policy if exists "bo_kyc_read" on storage.objects;
create policy "bo_kyc_read" on storage.objects for select to authenticated
  using (bucket_id = 'kyc' and (public.is_staff() or public.owns_shop(((storage.foldername(name))[1])::uuid)));
drop policy if exists "bo_kyc_write" on storage.objects;
create policy "bo_kyc_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'kyc' and (public.is_staff() or public.owns_shop(((storage.foldername(name))[1])::uuid)));
drop policy if exists "bo_kyc_update" on storage.objects;
create policy "bo_kyc_update" on storage.objects for update to authenticated
  using (bucket_id = 'kyc' and (public.is_staff() or public.owns_shop(((storage.foldername(name))[1])::uuid)));

-- Photos de colis (scellé, remise) : livreur/vendeur auteur et équipe
drop policy if exists "bo_ship_read" on storage.objects;
create policy "bo_ship_read" on storage.objects for select to authenticated
  using (bucket_id = 'shipments' and (public.is_staff() or owner = auth.uid()));
drop policy if exists "bo_ship_write" on storage.objects;
create policy "bo_ship_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'shipments');
