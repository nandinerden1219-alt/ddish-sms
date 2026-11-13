-- =========================================================
-- Migration: DDish CKB articles for Nandia AI.
-- Each row is one retrievable piece (article × part/device). Nandia picks the
-- few rows relevant to a question instead of reading the whole CKB.
-- Paste into Supabase -> SQL Editor -> Run. Safe to re-run.
-- =========================================================

create table if not exists public.ckb_docs (
  id uuid primary key default gen_random_uuid(),
  chunk_key text not null unique,
  short_id text not null,
  category text not null,
  article_title text not null,
  part text not null default '',
  content text not null,
  url text,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ckb_docs_short_id on public.ckb_docs(short_id);

drop trigger if exists trg_ckb_docs_updated_at on public.ckb_docs;
create trigger trg_ckb_docs_updated_at
before update on public.ckb_docs
for each row execute function public.set_updated_at();

alter table public.ckb_docs enable row level security;

-- The assistant's server route reads with the public key, like the home page.
drop policy if exists ckb_docs_select_public on public.ckb_docs;
create policy ckb_docs_select_public
on public.ckb_docs for select
to anon
using (true);

drop policy if exists ckb_docs_select_admin on public.ckb_docs;
create policy ckb_docs_select_admin
on public.ckb_docs for select
to authenticated
using (true);

drop policy if exists ckb_docs_insert_admin on public.ckb_docs;
create policy ckb_docs_insert_admin
on public.ckb_docs for insert
to authenticated
with check (true);

drop policy if exists ckb_docs_update_admin on public.ckb_docs;
create policy ckb_docs_update_admin
on public.ckb_docs for update
to authenticated
using (true)
with check (true);

drop policy if exists ckb_docs_delete_admin on public.ckb_docs;
create policy ckb_docs_delete_admin
on public.ckb_docs for delete
to authenticated
using (true);
