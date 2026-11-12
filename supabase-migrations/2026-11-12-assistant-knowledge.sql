-- =========================================================
-- Migration: knowledge base for the "Nandia AI" assistant.
-- Admins add DDish device/support knowledge in sections;
-- active sections are given to the assistant with every question.
-- Paste into Supabase -> SQL Editor -> Run. Safe to re-run.
-- =========================================================

create table if not exists public.assistant_knowledge (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assistant_knowledge_active_order
  on public.assistant_knowledge(is_active, display_order);

drop trigger if exists trg_assistant_knowledge_updated_at on public.assistant_knowledge;
create trigger trg_assistant_knowledge_updated_at
before update on public.assistant_knowledge
for each row execute function public.set_updated_at();

alter table public.assistant_knowledge enable row level security;

-- The assistant's server route reads with the public key, like the home page.
drop policy if exists assistant_knowledge_select_public on public.assistant_knowledge;
create policy assistant_knowledge_select_public
on public.assistant_knowledge for select
to anon
using (is_active = true);

drop policy if exists assistant_knowledge_select_admin on public.assistant_knowledge;
create policy assistant_knowledge_select_admin
on public.assistant_knowledge for select
to authenticated
using (true);

drop policy if exists assistant_knowledge_insert_admin on public.assistant_knowledge;
create policy assistant_knowledge_insert_admin
on public.assistant_knowledge for insert
to authenticated
with check (true);

drop policy if exists assistant_knowledge_update_admin on public.assistant_knowledge;
create policy assistant_knowledge_update_admin
on public.assistant_knowledge for update
to authenticated
using (true)
with check (true);

drop policy if exists assistant_knowledge_delete_admin on public.assistant_knowledge;
create policy assistant_knowledge_delete_admin
on public.assistant_knowledge for delete
to authenticated
using (true);
