-- =========================================================
-- Migration: sidebar groups (branching nav) + useful links.
-- For projects that already ran an earlier supabase-schema.sql.
-- Paste into Supabase -> SQL Editor -> Run. Safe to re-run.
-- =========================================================

-- Sidebar sections ("Сунгалт хийх заавар", "SMS заавар", …) that categories branch from.
create table if not exists public.category_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text not null default 'Folder',
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.categories
  add column if not exists group_id uuid references public.category_groups(id) on delete set null;

-- Handy URLs for staff (internal systems, bank pages, social channels).
create table if not exists public.useful_links (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  description text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_categories_group on public.categories(group_id);
create index if not exists idx_category_groups_active_order on public.category_groups(is_active, display_order);
create index if not exists idx_useful_links_active_order on public.useful_links(is_active, display_order);

drop trigger if exists trg_category_groups_updated_at on public.category_groups;
create trigger trg_category_groups_updated_at
before update on public.category_groups
for each row execute function public.set_updated_at();

drop trigger if exists trg_useful_links_updated_at on public.useful_links;
create trigger trg_useful_links_updated_at
before update on public.useful_links
for each row execute function public.set_updated_at();

alter table public.category_groups enable row level security;
alter table public.useful_links enable row level security;

-- category_groups ---------------------------------------------------

drop policy if exists category_groups_select_public on public.category_groups;
create policy category_groups_select_public
on public.category_groups for select
to anon
using (is_active = true);

drop policy if exists category_groups_select_admin on public.category_groups;
create policy category_groups_select_admin
on public.category_groups for select
to authenticated
using (true);

drop policy if exists category_groups_insert_admin on public.category_groups;
create policy category_groups_insert_admin
on public.category_groups for insert
to authenticated
with check (true);

drop policy if exists category_groups_update_admin on public.category_groups;
create policy category_groups_update_admin
on public.category_groups for update
to authenticated
using (true)
with check (true);

drop policy if exists category_groups_delete_admin on public.category_groups;
create policy category_groups_delete_admin
on public.category_groups for delete
to authenticated
using (true);

-- useful_links ---------------------------------------------------

drop policy if exists useful_links_select_public on public.useful_links;
create policy useful_links_select_public
on public.useful_links for select
to anon
using (is_active = true);

drop policy if exists useful_links_select_admin on public.useful_links;
create policy useful_links_select_admin
on public.useful_links for select
to authenticated
using (true);

drop policy if exists useful_links_insert_admin on public.useful_links;
create policy useful_links_insert_admin
on public.useful_links for insert
to authenticated
with check (true);

drop policy if exists useful_links_update_admin on public.useful_links;
create policy useful_links_update_admin
on public.useful_links for update
to authenticated
using (true)
with check (true);

drop policy if exists useful_links_delete_admin on public.useful_links;
create policy useful_links_delete_admin
on public.useful_links for delete
to authenticated
using (true);

-- Seed: two groups, one link, and file the existing categories under the groups.

insert into public.category_groups (name, slug, icon, display_order) values
  ('Сунгалт хийх заавар', 'sungalt-zaavar', 'RefreshCw', 1),
  ('SMS заавар', 'sms-zaavar', 'MessageSquare', 2)
on conflict (slug) do nothing;

insert into public.useful_links (title, url, description, display_order)
select 'DDISH албан ёсны сайт', 'https://ddishtv.mn', 'Багц, үнэ, сувгийн жагсаалт, мэдээ', 1
where not exists (select 1 from public.useful_links where url = 'https://ddishtv.mn');

update public.categories
set group_id = (select id from public.category_groups where slug = 'sungalt-zaavar')
where group_id is null and slug in ('sungalt', 'dans', 'ger', 'zalruulga');

update public.categories
set group_id = (select id from public.category_groups where slug = 'sms-zaavar')
where group_id is null and slug in ('admin', 'kino', 'kollektiv', 'upoint', 'noat', 'busad');
