-- =========================================================
-- Мэдээллийн сан — Supabase schema
-- Run this whole file once in the Supabase SQL editor
-- (Project -> SQL Editor -> New query -> paste -> Run).
-- Safe to re-run: every statement is idempotent and the seed
-- data is only inserted when it does not already exist.
-- =========================================================

create extension if not exists pgcrypto;

-- =========================================================
-- 1. Tables
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

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  color text not null default '#c67139',
  icon text not null default 'Info',
  group_id uuid references public.category_groups(id) on delete set null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Databases created before groups existed:
alter table public.categories
  add column if not exists group_id uuid references public.category_groups(id) on delete set null;

create table if not exists public.information_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  message text not null,
  additional_info text,
  keywords text,
  display_order integer not null default 0,
  is_popular boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.information_usage (
  id uuid primary key default gen_random_uuid(),
  information_id uuid references public.information_items(id) on delete cascade,
  action text not null check (action in ('view', 'copy', 'copy_additional')),
  created_at timestamptz not null default now()
);

-- Admin announcements ("posts") shown at the top of the public page.
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
create index if not exists idx_information_items_category on public.information_items(category_id);
create index if not exists idx_information_items_active_order on public.information_items(is_active, display_order);
create index if not exists idx_information_items_popular on public.information_items(is_popular) where is_popular = true;
create index if not exists idx_information_usage_information on public.information_usage(information_id);
create index if not exists idx_information_usage_action on public.information_usage(action);
create index if not exists idx_categories_active_order on public.categories(is_active, display_order);
create index if not exists idx_announcements_active on public.announcements(is_active, is_pinned, created_at desc);

-- =========================================================
-- 2. updated_at triggers
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_information_items_updated_at on public.information_items;
create trigger trg_information_items_updated_at
before update on public.information_items
for each row execute function public.set_updated_at();

drop trigger if exists trg_category_groups_updated_at on public.category_groups;
create trigger trg_category_groups_updated_at
before update on public.category_groups
for each row execute function public.set_updated_at();

drop trigger if exists trg_useful_links_updated_at on public.useful_links;
create trigger trg_useful_links_updated_at
before update on public.useful_links
for each row execute function public.set_updated_at();

drop trigger if exists trg_announcements_updated_at on public.announcements;
create trigger trg_announcements_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

-- =========================================================
-- 3. Popularity view (copy / view counts per item)
-- security_invoker makes the view respect the RLS of the
-- querying role instead of the view owner's privileges.
-- =========================================================

create or replace view public.information_popularity
with (security_invoker = true) as
select
  information_id,
  count(*) filter (where action = 'copy') as copy_count,
  count(*) filter (where action = 'copy_additional') as copy_additional_count,
  count(*) filter (where action = 'view') as view_count
from public.information_usage
group by information_id;

grant select on public.information_popularity to authenticated, anon;

-- =========================================================
-- 4. Row Level Security
-- =========================================================

alter table public.categories enable row level security;
alter table public.information_items enable row level security;
alter table public.information_usage enable row level security;
alter table public.announcements enable row level security;
alter table public.category_groups enable row level security;
alter table public.useful_links enable row level security;

-- Categories -------------------------------------------------

drop policy if exists categories_select_public on public.categories;
create policy categories_select_public
on public.categories for select
to anon
using (is_active = true);

drop policy if exists categories_select_admin on public.categories;
create policy categories_select_admin
on public.categories for select
to authenticated
using (true);

drop policy if exists categories_insert_admin on public.categories;
create policy categories_insert_admin
on public.categories for insert
to authenticated
with check (true);

drop policy if exists categories_update_admin on public.categories;
create policy categories_update_admin
on public.categories for update
to authenticated
using (true)
with check (true);

drop policy if exists categories_delete_admin on public.categories;
create policy categories_delete_admin
on public.categories for delete
to authenticated
using (true);

-- Information items -------------------------------------------

drop policy if exists information_items_select_public on public.information_items;
create policy information_items_select_public
on public.information_items for select
to anon
using (is_active = true);

drop policy if exists information_items_select_admin on public.information_items;
create policy information_items_select_admin
on public.information_items for select
to authenticated
using (true);

drop policy if exists information_items_insert_admin on public.information_items;
create policy information_items_insert_admin
on public.information_items for insert
to authenticated
with check (true);

drop policy if exists information_items_update_admin on public.information_items;
create policy information_items_update_admin
on public.information_items for update
to authenticated
using (true)
with check (true);

drop policy if exists information_items_delete_admin on public.information_items;
create policy information_items_delete_admin
on public.information_items for delete
to authenticated
using (true);

-- Usage log ------------------------------------------------------
-- Anyone (including anonymous public users) may record a view/copy
-- event. The log holds no PII (just an item id, action, timestamp),
-- so it is also safe to read back publicly -- the public site shows
-- a "copied N times" hint on each card using the aggregated view.

drop policy if exists information_usage_insert_all on public.information_usage;
create policy information_usage_insert_all
on public.information_usage for insert
to anon, authenticated
with check (true);

drop policy if exists information_usage_select_public on public.information_usage;
create policy information_usage_select_public
on public.information_usage for select
to anon
using (true);

drop policy if exists information_usage_select_admin on public.information_usage;
create policy information_usage_select_admin
on public.information_usage for select
to authenticated
using (true);

-- Announcements ---------------------------------------------------
-- Public sees only active, not-yet-expired posts. Admins manage all.

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

-- =========================================================
-- 5. Seed data (only inserted if missing; edit/delete freely
--    from the admin dashboard afterwards)
-- =========================================================

insert into public.announcements (title, body, level, is_pinned)
select
  'Мэдээллийн сан ажиллаж эхэллээ',
  E'Excel файлын оронд энэ сайтаас мэдээллээ хайж, «Хуулах» товч эсвэл мессежийн хайрцаг дээр дараад шууд хуулна.\nСанал, засвар байвал админд мэдэгдээрэй.',
  'info',
  true
where not exists (select 1 from public.announcements);

insert into public.category_groups (name, slug, icon, display_order) values
  ('Сунгалт хийх заавар', 'sungalt-zaavar', 'RefreshCw', 1),
  ('SMS заавар', 'sms-zaavar', 'MessageSquare', 2)
on conflict (slug) do nothing;

insert into public.useful_links (title, url, description, display_order)
select 'DDISH албан ёсны сайт', 'https://ddishtv.mn', 'Багц, үнэ, сувгийн жагсаалт, мэдээ', 1
where not exists (select 1 from public.useful_links where url = 'https://ddishtv.mn');

insert into public.categories (name, slug, color, icon, display_order) values
  ('Сунгалттай холбоотой', 'sungalt', '#f6a06b', 'RefreshCw', 1),
  ('Данс, цэнэглэлт', 'dans', '#aebf92', 'Wallet', 2),
  ('Админ дугаарын бүртгэл', 'admin', '#c0b6a5', 'UserCog', 3),
  ('Кино ба контент', 'kino', '#d67f48', 'Film', 4),
  ('Коллектив үйлчилгээ', 'kollektiv', '#8fa073', 'Users', 5),
  ('Upoint үйлчилгээ', 'upoint', '#ffc6a5', 'Star', 6),
  ('Гэр дүүрэн үйлчилгээ', 'ger', '#ccdbb2', 'Home', 7),
  ('Алдаатай гүйлгээ залруулах', 'zalruulga', '#b2622d', 'RotateCcw', 8),
  ('НӨАТ бүртгэл', 'noat', '#a19786', 'Receipt', 9),
  ('Идэвхжүүлэлт ба бусад', 'busad', '#dcd3c4', 'CircleEllipsis', 10)
on conflict (slug) do nothing;

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Админ дугаараа солих',
  E'Shinechleh zai awaad shineer burtguuleh utasni dugaaraa bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  1,
  false,
  true
from public.categories c
where c.slug = 'admin'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Админ дугаараа солих' and i.message = E'Shinechleh zai awaad shineer burtguuleh utasni dugaaraa bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Админ бүртгэлээс устгах бол',
  E'USTGAH gej bicheed 139898 dugaart ilgeene uu.\nDDISH',
  null,
  null,
  2,
  false,
  true
from public.categories c
where c.slug = 'admin'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Админ бүртгэлээс устгах бол' and i.message = E'USTGAH gej bicheed 139898 dugaart ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Нууц код авах',
  E'KOD gej bicheed 139898-d ilgeene uu.\nDDISH',
  E'хэрэглэгч ярьж дуусаад ая яваад таслаагүй тул таслав',
  null,
  3,
  false,
  true
from public.categories c
where c.slug = 'admin'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Нууц код авах' and i.message = E'KOD gej bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Нууц код солих',
  E'Solih zai awaad shine nuuts kod bicheed 139898-d ilgeene uu.\nDDISH',
  E'хэрэглэгч ярьж дуусаад таслаагүй тул таслав',
  null,
  4,
  false,
  true
from public.categories c
where c.slug = 'admin'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Нууц код солих' and i.message = E'Solih zai awaad shine nuuts kod bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Гишүүн харах',
  E'Admin dugaaraasaa HARAH gej bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  5,
  false,
  true
from public.categories c
where c.slug = 'admin'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Гишүүн харах' and i.message = E'Admin dugaaraasaa HARAH gej bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Гишүүн дугаараа хасах',
  E'Admin dugaaraasaa -******** /hasah gej bui dugaar/-aa bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  6,
  false,
  true
from public.categories c
where c.slug = 'admin'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Гишүүн дугаараа хасах' and i.message = E'Admin dugaaraasaa -******** /hasah gej bui dugaar/-aa bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Гишүүн дугаараа нэмэх',
  E'Admin dugaaraasaa +******** /nemeh gej bui dugaar/-aa bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  7,
  false,
  true
from public.categories c
where c.slug = 'admin'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Гишүүн дугаараа нэмэх' and i.message = E'Admin dugaaraasaa +******** /nemeh gej bui dugaar/-aa bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'НӨАТ бүртгүүлэх',
  E'Admin dugaaraasaa T zai awaad E-barimtiin 8 orontoi kodoo bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  8,
  false,
  true
from public.categories c
where c.slug = 'noat'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'НӨАТ бүртгүүлэх' and i.message = E'Admin dugaaraasaa T zai awaad E-barimtiin 8 orontoi kodoo bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'НӨАТ-ийн бүртгэлээ солих',
  E'Admin dugaaraasaa T zai awaad Solih zai awaad E-barimtiin 8 orontoi kodoo bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  9,
  false,
  true
from public.categories c
where c.slug = 'noat'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'НӨАТ-ийн бүртгэлээ солих' and i.message = E'Admin dugaaraasaa T zai awaad Solih zai awaad E-barimtiin 8 orontoi kodoo bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'NVOD кино захиалахад',
  E'800 zai awaad kinoni kodoo bicheed 139898-d ilgeene uu.\nDDISH',
  E'Админ болон гишүүн дугаараас',
  null,
  10,
  false,
  true
from public.categories c
where c.slug = 'kino'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'NVOD кино захиалахад' and i.message = E'800 zai awaad kinoni kodoo bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'RVOD кино захиалахад',
  E'Kino sangaas zahilahdaa KINO zai awaad kinoni kodoo bicheed 139898-d ilgeene uu.\nDDISH',
  E'Админ болон гишүүн дугаараас',
  null,
  11,
  false,
  true
from public.categories c
where c.slug = 'kino'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'RVOD кино захиалахад' and i.message = E'Kino sangaas zahilahdaa KINO zai awaad kinoni kodoo bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Админ дугаараасаа хөтөлбөр харах',
  E'Suvgiin dugaar zai awaad hutulbur gej bicheed 139898-d ilgeene uu.\nDDISH',
  E'Дурын дугаараас шалгаж болно',
  null,
  12,
  false,
  true
from public.categories c
where c.slug = 'kino'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Админ дугаараасаа хөтөлбөр харах' and i.message = E'Suvgiin dugaar zai awaad hutulbur gej bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Зурагтнаасаа сувагийн хөтөлбөр харах',
  E'Suvagan deeree taviad udirdlaganii EPG tovchiig daraad harah bolomjtoi.\nDDISH',
  null,
  null,
  13,
  false,
  true
from public.categories c
where c.slug = 'kino'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Зурагтнаасаа сувагийн хөтөлбөр харах' and i.message = E'Suvagan deeree taviad udirdlaganii EPG tovchiig daraad harah bolomjtoi.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Дансны үлдэгдэл шалгах',
  E'Dans gej bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  14,
  false,
  true
from public.categories c
where c.slug = 'kino'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Дансны үлдэгдэл шалгах' and i.message = E'Dans gej bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Үндсэн багц сунгалт хийх заавар',
  E'Khan dans -76 000 500 5059050128\nhuleen awagch - DDISHTV\nmongon dun - 40000\nguilgeni utga - admin dugaraa biched zai awad L1 gej bicheed hiine uu.\nDDISH',
  null,
  null,
  15,
  true,
  true
from public.categories c
where c.slug = 'sungalt'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Үндсэн багц сунгалт хийх заавар' and i.message = E'Khan dans -76 000 500 5059050128\nhuleen awagch - DDISHTV\nmongon dun - 40000\nguilgeni utga - admin dugaraa biched zai awad L1 gej bicheed hiine uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Лизин картны сунгалт',
  E'Khan dans - 76 000 500 5059050128\nhuleen awagch - DDISHTV\nmongon dun - 35000\nguilgeni utga - admin dugaraa biched zai awad M1 gej bicheed hiine uu.\nDDISH',
  null,
  null,
  16,
  false,
  true
from public.categories c
where c.slug = 'sungalt'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Лизин картны сунгалт' and i.message = E'Khan dans - 76 000 500 5059050128\nhuleen awagch - DDISHTV\nmongon dun - 35000\nguilgeni utga - admin dugaraa biched zai awad M1 gej bicheed hiine uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Нэмэлт багц сунгалт',
  E'Khan dans -76 000 500 5059050128\nhuleen awagch - DDISHTV\nmongon dun - 10000\nguilgeni utga - admin dugaraa biched zai awad C1 gej bicheed hiine uu.\nDDISH',
  E'Khan dans -76 000 500 5059050128\nhuleen awagch - DDISHTV\nmongon dun - 10000\nguilgeni utga - admin dugaraa biched zai awad K1 gej bicheed hiine uu.\nDDISH',
  null,
  17,
  true,
  true
from public.categories c
where c.slug = 'sungalt'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Нэмэлт багц сунгалт' and i.message = E'Khan dans -76 000 500 5059050128\nhuleen awagch - DDISHTV\nmongon dun - 10000\nguilgeni utga - admin dugaraa biched zai awad C1 gej bicheed hiine uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'6 сарын лизин төлбөр',
  E'Khan dans - 76 000 500 5059050128\nhuleen awagch - DDISHTV\nmongon dun - 60000\nguilgeni utga - admin dugaraa biched zai awad TULBUR gej bicheed hiine uu.\nDDISH',
  E'Khan dans -76 000 500 5059050128\nhuleen awagch - DDISHTV\nmongon dun - 50000\nguilgeni utga - admin dugaraa biched zai awad TULBUR gej bicheed hiine uu.\nDDISH',
  null,
  18,
  true,
  true
from public.categories c
where c.slug = 'sungalt'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'6 сарын лизин төлбөр' and i.message = E'Khan dans - 76 000 500 5059050128\nhuleen awagch - DDISHTV\nmongon dun - 60000\nguilgeni utga - admin dugaraa biched zai awad TULBUR gej bicheed hiine uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Khanbank internet bank',
  E'Tulbur-Busad tulbur-Kabeliin tolbor- DDISH-ru orj sungaltaa hiine uu.\nDDISH',
  null,
  null,
  19,
  true,
  true
from public.categories c
where c.slug = 'sungalt'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Khanbank internet bank' and i.message = E'Tulbur-Busad tulbur-Kabeliin tolbor- DDISH-ru orj sungaltaa hiine uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Toki application',
  E'TV, Internet-Ddishtv-admin eswel kartni dugaaraa bicheed-bagtsaa songood-sungaltaa hiine uu.\nDDISH',
  null,
  null,
  20,
  false,
  true
from public.categories c
where c.slug = 'sungalt'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Toki application' and i.message = E'TV, Internet-Ddishtv-admin eswel kartni dugaaraa bicheed-bagtsaa songood-sungaltaa hiine uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Хоногийн зээлийн үйлчилгээ авах',
  E'Admin dugaaraasaa Zeel gej bicheed 139898-d ilgeene uu.\nDDISH',
  E'Сунгалт дууссан өдрөөс 3 хоногийн дотор 24 цагийн зээл авах боломжтой.',
  null,
  21,
  false,
  true
from public.categories c
where c.slug = 'sungalt'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Хоногийн зээлийн үйлчилгээ авах' and i.message = E'Admin dugaaraasaa Zeel gej bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Дансны дугаар авах мөн виртуал данс цэнэглэх заавар авахдаа',
  E'Zaavar gej bicheed 139898-d ilgeegeed sungalt hiih dansnii dugaaruud awah bolomjtoi.\nDDISH',
  E'Khan bank:76 000 500 5059050128 - DDISHTV\nTuriin bank: 26 00 34 106600004668 - DDISHTV\nGolomt bank: 2300 1500 1102987935 - DDISHTV\nKhas bank dans- 3700 3200 5000232657 - DDISHTV\nTDB- 52 000 4000 499135803 huleen awagch - DDISHTV',
  null,
  22,
  true,
  true
from public.categories c
where c.slug = 'dans'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Дансны дугаар авах мөн виртуал данс цэнэглэх заавар авахдаа' and i.message = E'Zaavar gej bicheed 139898-d ilgeegeed sungalt hiih dansnii dugaaruud awah bolomjtoi.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Банкны үйлчилгээ ашиглан ДАНС цэнэглэх',
  E'Tulbur-Busad tulbur-Kabeliin tolbor- DDISH-Dans tsenegleh-ru orj dansaa tseneglene uu.\nDDISH',
  null,
  null,
  23,
  false,
  true
from public.categories c
where c.slug = 'dans'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Банкны үйлчилгээ ашиглан ДАНС цэнэглэх' and i.message = E'Tulbur-Busad tulbur-Kabeliin tolbor- DDISH-Dans tsenegleh-ru orj dansaa tseneglene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Төгс картаар ДАНС цэнэглэх заавар',
  E'Negjni 12 oron buhii kodiig bichin zai awaad smart kartin buh dugaariig bichin 139898-d ilgeene uu.\nDDISH',
  E'Дурын юнител дугаараас мсж илгээж болно',
  null,
  24,
  false,
  true
from public.categories c
where c.slug = 'dans'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Төгс картаар ДАНС цэнэглэх заавар' and i.message = E'Negjni 12 oron buhii kodiig bichin zai awaad smart kartin buh dugaariig bichin 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Нэгжийн бэлэг үйлчилгээ ашиглан ДАНС цэнэглэх',
  E'Tseneglelt hiih smart kartiin dugaariin buh orong bicheed zai avaad tsenegleh\nmungun dungee bicheed 1444 ruu ilgeene uu.\nDDISH',
  E'1000, 1500, 2000, 3000, 5000, 6000, 8000, 10''000, 15''000, 20''000, 25''000 байна. Сард цэнэглэх нэгжийн дээд хязгаар: 50,000төг',
  null,
  25,
  false,
  true
from public.categories c
where c.slug = 'dans'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Нэгжийн бэлэг үйлчилгээ ашиглан ДАНС цэнэглэх' and i.message = E'Tseneglelt hiih smart kartiin dugaariin buh orong bicheed zai avaad tsenegleh\nmungun dungee bicheed 1444 ruu ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Мөнгөн дүнгээ буцаан авах хүсэлт илгээхэд',
  E'call@ddishtv.mn haygaar mungu tushaasan bankni tamgatai barimt, kart ezemshigchiin bichig barimtni huulbar, garaar bichsen huseltee ilgeene uu.\nDDISH',
  E'Facebook-Ddish\nБанкны баримтны аль нэг зайнд зөв картын дугаар бичих, хүсэлтээ дэлгэрэнгүй илгээх заавар өгнө.',
  null,
  26,
  false,
  true
from public.categories c
where c.slug = 'zalruulga'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Мөнгөн дүнгээ буцаан авах хүсэлт илгээхэд' and i.message = E'call@ddishtv.mn haygaar mungu tushaasan bankni tamgatai barimt, kart ezemshigchiin bichig barimtni huulbar, garaar bichsen huseltee ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Смарт картаа сунгуулах залруулга мейлээр илгээхэд',
  E'call@ddishtv.mn haygaar mungu tushaasan bankni tamgatai barimt, kart ezemshigchiin bichig barimtni huulbar, garaar bichsen huseltee ilgeene uu.\nDDISH',
  E'mail- call@ddishtv.mn',
  null,
  27,
  false,
  true
from public.categories c
where c.slug = 'zalruulga'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Смарт картаа сунгуулах залруулга мейлээр илгээхэд' and i.message = E'call@ddishtv.mn haygaar mungu tushaasan bankni tamgatai barimt, kart ezemshigchiin bichig barimtni huulbar, garaar bichsen huseltee ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Смарт картаа сунгуулах залруулга фейсбүүк чатаар илгээхэд',
  E'DDISH page chataar mungu tushaasan bankni tamgatai barimt, kart ezemshigchiin bichig barimtni huulbar, garaar bichsen huseltee ilgeene uu.\nDDISH',
  null,
  null,
  28,
  false,
  true
from public.categories c
where c.slug = 'zalruulga'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Смарт картаа сунгуулах залруулга фейсбүүк чатаар илгээхэд' and i.message = E'DDISH page chataar mungu tushaasan bankni tamgatai barimt, kart ezemshigchiin bichig barimtni huulbar, garaar bichsen huseltee ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Төгс картын залруулга хийхдээ',
  E'Ta negjnii husaj arilgasan heseg bolon DDISH smart kartiin zurag, garaar bichsen huseltee DDISH chat esvel call@ddishtv.mn haygaar ilgeen zasuulah bolomjtoi.',
  null,
  null,
  29,
  false,
  true
from public.categories c
where c.slug = 'zalruulga'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Төгс картын залруулга хийхдээ' and i.message = E'Ta negjnii husaj arilgasan heseg bolon DDISH smart kartiin zurag, garaar bichsen huseltee DDISH chat esvel call@ddishtv.mn haygaar ilgeen zasuulah bolomjtoi.'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Гэр дүүрэн сунгалт хийх заавар',
  E'Haan dans - 503 803 5092\nhuleen awagch - UNITEL\nmungun dun - *****\nguilgeni utga - ger internet-n dugaaraa bicheed hiine uu.',
  E'Khan bank: 503 803 5092\nTuriin bank: 1060 0002 4579\nGolomt bank: 8115 006 438\nHHbank: 490009704\nKhas bank dans 5000 420 765',
  null,
  30,
  false,
  true
from public.categories c
where c.slug = 'ger'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Гэр дүүрэн сунгалт хийх заавар' and i.message = E'Haan dans - 503 803 5092\nhuleen awagch - UNITEL\nmungun dun - *****\nguilgeni utga - ger internet-n dugaaraa bicheed hiine uu.'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Гэр дүүрэн төлбөр шалгах',
  E'Admin dugaaraasaa Tulbur gej bicheed 1401/131401 dugaart ilgeene uu.\nDDISH',
  null,
  null,
  31,
  false,
  true
from public.categories c
where c.slug = 'ger'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Гэр дүүрэн төлбөр шалгах' and i.message = E'Admin dugaaraasaa Tulbur gej bicheed 1401/131401 dugaart ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'NVOD сувгаас кино захиалахад',
  E'800 zai awaad kinoni kodoo bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  32,
  false,
  true
from public.categories c
where c.slug = 'ger'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'NVOD сувгаас кино захиалахад' and i.message = E'800 zai awaad kinoni kodoo bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'RVOD сувгаас кино захиалахад',
  E'Ta zuvhun kinoni kodoo bicheed 139898-d ilgeene uu.\nDDISH',
  E'Ta 801.802.803 suwgaa sungahdaa K gej bicheed 139898dugaart ilgeene uu.\nDDISH',
  null,
  33,
  false,
  true
from public.categories c
where c.slug = 'ger'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'RVOD сувгаас кино захиалахад' and i.message = E'Ta zuvhun kinoni kodoo bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Happy family — Unitel family tur salgah zaawar',
  E'Off zai awaad Unitel gej bicheed 139898 dugaart ilgeene uu.\nDDISH',
  E'haah',
  null,
  34,
  false,
  true
from public.categories c
where c.slug = 'busad'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Happy family — Unitel family tur salgah zaawar' and i.message = E'Off zai awaad Unitel gej bicheed 139898 dugaart ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Happy family — Neeh zaawar',
  E'ON zai awaad Unitel gej bicheed 139898 dugaart ilgeene uu.\nDDISH',
  E'neeh',
  null,
  35,
  false,
  true
from public.categories c
where c.slug = 'busad'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Happy family — Neeh zaawar' and i.message = E'ON zai awaad Unitel gej bicheed 139898 dugaart ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Админаар Standart багц сунгах заавар',
  E'Admin dugaaraasaa S zai awaad 1 gej bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  36,
  true,
  true
from public.categories c
where c.slug = 'sungalt'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Админаар Standart багц сунгах заавар' and i.message = E'Admin dugaaraasaa S zai awaad 1 gej bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Админаар Happy багц сунгах заавар',
  E'Admin dugaaraasaa M zai awaad 1 gej bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  37,
  false,
  true
from public.categories c
where c.slug = 'sungalt'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Админаар Happy багц сунгах заавар' and i.message = E'Admin dugaaraasaa M zai awaad 1 gej bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Админаар Super багц сунгах заавар',
  E'Admin dugaaraasaa L zai awaaad 1 gej bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  38,
  false,
  true
from public.categories c
where c.slug = 'sungalt'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Админаар Super багц сунгах заавар' and i.message = E'Admin dugaaraasaa L zai awaaad 1 gej bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'6 сарын лизинг төлөх заавар',
  E'Admin dugaaraasaa TULBUR zai awaad 1 gej bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  39,
  true,
  true
from public.categories c
where c.slug = 'sungalt'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'6 сарын лизинг төлөх заавар' and i.message = E'Admin dugaaraasaa TULBUR zai awaad 1 gej bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Фанат багц',
  E'Admin dugaaraasaa C zai awaad 1 gej bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  40,
  false,
  true
from public.categories c
where c.slug = 'sungalt'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Фанат багц' and i.message = E'Admin dugaaraasaa C zai awaad 1 gej bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Киночин багц',
  E'Admin dugaaraasaa K zai awaad 1 gej bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  41,
  false,
  true
from public.categories c
where c.slug = 'sungalt'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Киночин багц' and i.message = E'Admin dugaaraasaa K zai awaad 1 gej bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Standart-s Happy руу багц ахиулах заавар',
  E'Admin dugarasa ahiulah bagtsiin kod M gej bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  42,
  false,
  true
from public.categories c
where c.slug = 'sungalt'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Standart-s Happy руу багц ахиулах заавар' and i.message = E'Admin dugarasa ahiulah bagtsiin kod M gej bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Happy-s Super багц руу багц ахиулах заавар',
  E'Admin dugarasa ahiulah bagtsiin kod L gej bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  43,
  false,
  true
from public.categories c
where c.slug = 'sungalt'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Happy-s Super багц руу багц ахиулах заавар' and i.message = E'Admin dugarasa ahiulah bagtsiin kod L gej bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Live 900 тоглолт захиалах заавар',
  E'Admin dugaaraasaa 900 zai awaad kontentiin kodoo bicheed 139898-d ilgeene uu.\nDDISH',
  E'Банкаар шууд захиалах заавар',
  null,
  44,
  false,
  true
from public.categories c
where c.slug = 'kino'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Live 900 тоглолт захиалах заавар' and i.message = E'Admin dugaaraasaa 900 zai awaad kontentiin kodoo bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'899 суваг',
  E'Admin dugaaraasaa 899 zai awaad kontentiin kodoo bicheed 139898-d ilgeene uu.\nDDISH',
  E'Khan dans - 505 905 0128\nhuleen awagch - DDISHTV\nmongon dun -10000\nguilgeni utga-admin dugaraa biched zai awad 900 zai awad 13 gej bicheed hiine uu.\nDDISH',
  null,
  45,
  false,
  true
from public.categories c
where c.slug = 'kino'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'899 суваг' and i.message = E'Admin dugaaraasaa 899 zai awaad kontentiin kodoo bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Playboy сунгах',
  E'Admin dugaaraasaa 41 zai awaad 1 gej bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  46,
  false,
  true
from public.categories c
where c.slug = 'kino'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Playboy сунгах' and i.message = E'Admin dugaaraasaa 41 zai awaad 1 gej bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Суваг нээж, хаах',
  E'Admin dugaaraasaa 901 zai awaad ON gej bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  47,
  false,
  true
from public.categories c
where c.slug = 'kino'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Суваг нээж, хаах' and i.message = E'Admin dugaaraasaa 901 zai awaad ON gej bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Суваг нээж, хаах',
  E'Admin dugaaraasaa 901 zai awaad OFF gej bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  48,
  false,
  true
from public.categories c
where c.slug = 'kino'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Суваг нээж, хаах' and i.message = E'Admin dugaaraasaa 901 zai awaad OFF gej bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'NVOD сувгаас кино бүртгэлтэй дугаараас үзэх бол',
  E'Ta admin dugaaraasaa NEGJ zai awaad 800 zai awaad kinonii kodoo bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  49,
  false,
  true
from public.categories c
where c.slug = 'kino'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'NVOD сувгаас кино бүртгэлтэй дугаараас үзэх бол' and i.message = E'Ta admin dugaaraasaa NEGJ zai awaad 800 zai awaad kinonii kodoo bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'NVOD сувгаас кино бүртгэлгүй дугаараас үзэх бол',
  E'Ta NEGJ zai awaad 800 zai awaad kinonii kod zai awaad smart kartiin buh orong bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  50,
  false,
  true
from public.categories c
where c.slug = 'kino'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'NVOD сувгаас кино бүртгэлгүй дугаараас үзэх бол' and i.message = E'Ta NEGJ zai awaad 800 zai awaad kinonii kod zai awaad smart kartiin buh orong bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'RVOD сувгаас кино бүртгэлтэй дугаараас үзэх бол',
  E'Ta admin dugaaraasaa NEGJ zai awaad KINO zai awaad kinonii kodoo bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  51,
  false,
  true
from public.categories c
where c.slug = 'kino'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'RVOD сувгаас кино бүртгэлтэй дугаараас үзэх бол' and i.message = E'Ta admin dugaaraasaa NEGJ zai awaad KINO zai awaad kinonii kodoo bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'RVOD сувгаас кино бүртгэлгүй дугаараас үзэх бол',
  E'Ta NEGJ zai awaad KINO zai awaad kinonii kod zai awaad smart kartiin buh orong bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  52,
  false,
  true
from public.categories c
where c.slug = 'kino'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'RVOD сувгаас кино бүртгэлгүй дугаараас үзэх бол' and i.message = E'Ta NEGJ zai awaad KINO zai awaad kinonii kod zai awaad smart kartiin buh orong bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'900 LIVE бүртгэлтэй дугаараас үзэх бол',
  E'Ta Admin dugaaraasaa NEGJ zai awaad 900 zai awaad kontentin kodoo bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  53,
  false,
  true
from public.categories c
where c.slug = 'kino'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'900 LIVE бүртгэлтэй дугаараас үзэх бол' and i.message = E'Ta Admin dugaaraasaa NEGJ zai awaad 900 zai awaad kontentin kodoo bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'900 LIVE бүртгэлгүй дугаараас үзэх бол',
  E'Ta NEGJ zai awaad 900 zai awaad kontentin kodoo bicheed zai awaad smart kartiin buh orong bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  54,
  false,
  true
from public.categories c
where c.slug = 'kino'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'900 LIVE бүртгэлгүй дугаараас үзэх бол' and i.message = E'Ta NEGJ zai awaad 900 zai awaad kontentin kodoo bicheed zai awaad smart kartiin buh orong bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Коллектив карт холбох',
  E'Nemeh temdeg /+/ smartiin kartiin dugaaraa bicheed 1415-d ilgeene uu.\nDDISH',
  null,
  null,
  55,
  false,
  true
from public.categories c
where c.slug = 'kollektiv'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Коллектив карт холбох' and i.message = E'Nemeh temdeg /+/ smartiin kartiin dugaaraa bicheed 1415-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Коллектив гишүүн нэмэх',
  E'Nemeh zai awaad utasnii dugaar bicheed 4422 -d ilgeene uu.\nDDISH',
  null,
  null,
  56,
  false,
  true
from public.categories c
where c.slug = 'kollektiv'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Коллектив гишүүн нэмэх' and i.message = E'Nemeh zai awaad utasnii dugaar bicheed 4422 -d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Коллектив гишүүн хасах',
  E'Hasah zai awaad utasnii dugaar bicheed 4422 -d ilgeene uu.\nDDISH',
  null,
  null,
  57,
  false,
  true
from public.categories c
where c.slug = 'kollektiv'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Коллектив гишүүн хасах' and i.message = E'Hasah zai awaad utasnii dugaar bicheed 4422 -d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Коллектив админаас гишүүн устгах',
  E'Delete gej bicheed 4422 -d ilgeene uu.\nDDISH',
  null,
  null,
  58,
  false,
  true
from public.categories c
where c.slug = 'kollektiv'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Коллектив админаас гишүүн устгах' and i.message = E'Delete gej bicheed 4422 -d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Коллектив админ болон гишүүн дугаар харах',
  E'Gishuun gej bicheed 4422 -d ilgeene uu.\nDDISH',
  null,
  null,
  59,
  false,
  true
from public.categories c
where c.slug = 'kollektiv'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Коллектив админ болон гишүүн дугаар харах' and i.message = E'Gishuun gej bicheed 4422 -d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Upoint-д бүртгүүлэх',
  E'Admin dugaaraasaa UP zai awaad ON gej bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  60,
  false,
  true
from public.categories c
where c.slug = 'upoint'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Upoint-д бүртгүүлэх' and i.message = E'Admin dugaaraasaa UP zai awaad ON gej bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Upoint- ийн үлдэгдлээс виртуал дансаа цэнэглэх',
  E'UP zai awaad DANS zai awaad Tsenegleh dun zai awaad Nuuts kodoo bicheed 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  61,
  false,
  true
from public.categories c
where c.slug = 'upoint'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Upoint- ийн үлдэгдлээс виртуал дансаа цэнэглэх' and i.message = E'UP zai awaad DANS zai awaad Tsenegleh dun zai awaad Nuuts kodoo bicheed 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Upoint-ийн үлдэгдлээ шалгах',
  E'UP gej bicheed 139898 dugaart ilgeene uldegdelee shalgana uu.\nDDISH',
  null,
  null,
  62,
  false,
  true
from public.categories c
where c.slug = 'upoint'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Upoint-ийн үлдэгдлээ шалгах' and i.message = E'UP gej bicheed 139898 dugaart ilgeene uldegdelee shalgana uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Upoint оноогоор NVOD сувгаас кино захиалах',
  E'UP zai awaad Suvgiin dugaar /***/ zai awaad kinoni kod /**/ zai awaad nuuts kod /****/ 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  63,
  false,
  true
from public.categories c
where c.slug = 'upoint'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Upoint оноогоор NVOD сувгаас кино захиалах' and i.message = E'UP zai awaad Suvgiin dugaar /***/ zai awaad kinoni kod /**/ zai awaad nuuts kod /****/ 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'Upoint оноогоор RVOD сувгаас кино захиалах',
  E'UP zai awaad KINO zai awaad kinoni kod zai awaad 4orontoi nuuts kod 139898-d ilgeene uu.\nDDISH',
  null,
  null,
  64,
  false,
  true
from public.categories c
where c.slug = 'upoint'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'Upoint оноогоор RVOD сувгаас кино захиалах' and i.message = E'UP zai awaad KINO zai awaad kinoni kod zai awaad 4orontoi nuuts kod 139898-d ilgeene uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'HELP',
  E'139898 dugaart HELP gej bicheed H1-H4-H2 gesen zamig songon smart kartaa idevhjuulne uu.\nDDISH',
  null,
  null,
  65,
  false,
  true
from public.categories c
where c.slug = 'busad'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'HELP' and i.message = E'139898 dugaart HELP gej bicheed H1-H4-H2 gesen zamig songon smart kartaa idevhjuulne uu.\nDDISH'
  );

insert into public.information_items
  (category_id, title, message, additional_info, keywords, display_order, is_popular, is_active)
select
  c.id,
  E'IVR',
  E'Ta sungaltaa hiisnii daraa huleen avagchaa asaalttai uyd Admin dugaaraasaa 1434 dugaart zalgan 1 deer 2 udaa darj kardaa idevhijuulne uu.\nDDISH',
  null,
  null,
  66,
  false,
  true
from public.categories c
where c.slug = 'busad'
  and not exists (
    select 1 from public.information_items i
    where i.category_id = c.id and i.title = E'IVR' and i.message = E'Ta sungaltaa hiisnii daraa huleen avagchaa asaalttai uyd Admin dugaaraasaa 1434 dugaart zalgan 1 deer 2 udaa darj kardaa idevhijuulne uu.\nDDISH'
  );


-- Put the seeded categories under their sidebar groups (only if not yet grouped).
update public.categories
set group_id = (select id from public.category_groups where slug = 'sungalt-zaavar')
where group_id is null and slug in ('sungalt', 'dans', 'ger', 'zalruulga');

update public.categories
set group_id = (select id from public.category_groups where slug = 'sms-zaavar')
where group_id is null and slug in ('admin', 'kino', 'kollektiv', 'upoint', 'noat', 'busad');
