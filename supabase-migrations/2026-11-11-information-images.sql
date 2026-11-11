-- =========================================================
-- Migration: step-by-step images on information cards
-- ("Ресет хийх заавар" гэх мэт зурагтай заавар).
-- For projects that already ran an earlier supabase-schema.sql.
-- Paste into Supabase -> SQL Editor -> Run. Safe to re-run.
-- =========================================================

-- Ordered step images: [{"path": "<object in information-images>", "name": "<caption>"}, …]
alter table public.information_items
  add column if not exists images jsonb not null default '[]'::jsonb
  check (jsonb_typeof(images) = 'array');

-- Public bucket: anyone can view the files by URL, only admins can change them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'information-images',
  'information-images',
  true,
  10485760, -- 10 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists information_images_select_admin on storage.objects;
create policy information_images_select_admin
on storage.objects for select
to authenticated
using (bucket_id = 'information-images');

drop policy if exists information_images_insert_admin on storage.objects;
create policy information_images_insert_admin
on storage.objects for insert
to authenticated
with check (bucket_id = 'information-images');

drop policy if exists information_images_update_admin on storage.objects;
create policy information_images_update_admin
on storage.objects for update
to authenticated
using (bucket_id = 'information-images')
with check (bucket_id = 'information-images');

drop policy if exists information_images_delete_admin on storage.objects;
create policy information_images_delete_admin
on storage.objects for delete
to authenticated
using (bucket_id = 'information-images');
