-- =========================================================
-- Migration: admin announcements ("posts") on the public page.
-- For projects that already ran an earlier supabase-schema.sql.
-- Paste into Supabase -> SQL Editor -> Run. Safe to re-run.
-- (Fresh projects don't need this: supabase-schema.sql includes it.)
-- =========================================================

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  level text not null default 'info' check (level in ('info', 'warning', 'urgent')),
  is_pinned boolean not null default false,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_announcements_active on public.announcements(is_active, is_pinned, created_at desc);

drop trigger if exists trg_announcements_updated_at on public.announcements;
create trigger trg_announcements_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

alter table public.announcements enable row level security;

drop policy if exists announcements_select_public on public.announcements;
create policy announcements_select_public
on public.announcements for select
to anon
using (is_active = true and (expires_at is null or expires_at > now()));

drop policy if exists announcements_select_admin on public.announcements;
create policy announcements_select_admin
on public.announcements for select
to authenticated
using (true);

drop policy if exists announcements_insert_admin on public.announcements;
create policy announcements_insert_admin
on public.announcements for insert
to authenticated
with check (true);

drop policy if exists announcements_update_admin on public.announcements;
create policy announcements_update_admin
on public.announcements for update
to authenticated
using (true)
with check (true);

drop policy if exists announcements_delete_admin on public.announcements;
create policy announcements_delete_admin
on public.announcements for delete
to authenticated
using (true);

-- Public copy-count hint on cards (added in the same release).
drop policy if exists information_usage_select_public on public.information_usage;
create policy information_usage_select_public
on public.information_usage for select
to anon
using (true);

grant select on public.information_popularity to anon;

-- One welcome post so the board isn't empty (delete it from /admin/announcements).
insert into public.announcements (title, body, level, is_pinned)
select
  'Мэдээллийн сан ажиллаж эхэллээ',
  E'Excel файлын оронд энэ сайтаас мэдээллээ хайж, «Хуулах» товч эсвэл мессежийн хайрцаг дээр дараад шууд хуулна.\nСанал, засвар байвал админд мэдэгдээрэй.',
  'info',
  true
where not exists (select 1 from public.announcements);
