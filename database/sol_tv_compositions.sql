-- ==============================================================================
-- SOL TV - Módulo de Telas de Ofertas (Composições)
-- Execute este script no SQL Editor do Supabase para criar as tabelas de
-- composições e itens/slots, habilitar RLS, configurar políticas e realtime.
-- ==============================================================================

-- 1. Criação da tabela sol_tv_compositions (Metadados da Tela)
create table if not exists public.sol_tv_compositions (
  id uuid primary key default gen_random_uuid(),
  sector text not null default 'acougue',
  layout text not null check (layout in ('hero', 'duo', 'grid4', 'grid8')),
  duration_seconds integer not null default 8 check (duration_seconds between 3 and 60),
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Criação da tabela sol_tv_composition_items (Produtos / Slots na Tela)
create table if not exists public.sol_tv_composition_items (
  id uuid primary key default gen_random_uuid(),
  composition_id uuid not null references public.sol_tv_compositions(id) on delete cascade,
  offer_id uuid not null references public.sol_tv_offers(id) on delete cascade,
  slot_index integer not null check (slot_index >= 0),
  created_at timestamptz not null default now(),
  unique (composition_id, slot_index)
);

-- 3. Índices para performance de ordenação e busca por setor
create index if not exists sol_tv_compositions_sector_pos_idx
  on public.sol_tv_compositions (sector, position, created_at);

create index if not exists sol_tv_composition_items_comp_slot_idx
  on public.sol_tv_composition_items (composition_id, slot_index);

-- 4. Trigger para atualização automática do updated_at em sol_tv_compositions
create or replace function public.set_sol_tv_compositions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sol_tv_compositions_updated_at on public.sol_tv_compositions;
create trigger sol_tv_compositions_updated_at
before update on public.sol_tv_compositions
for each row execute function public.set_sol_tv_compositions_updated_at();

-- 5. Habilitar Row Level Security (RLS)
alter table public.sol_tv_compositions enable row level security;
alter table public.sol_tv_composition_items enable row level security;

-- Políticas para sol_tv_compositions
drop policy if exists "SOL TV public compositions read" on public.sol_tv_compositions;
drop policy if exists "SOL TV admin compositions insert" on public.sol_tv_compositions;
drop policy if exists "SOL TV admin compositions update" on public.sol_tv_compositions;
drop policy if exists "SOL TV admin compositions delete" on public.sol_tv_compositions;

create policy "SOL TV public compositions read"
  on public.sol_tv_compositions for select
  to anon, authenticated
  using (true);

create policy "SOL TV admin compositions insert"
  on public.sol_tv_compositions for insert
  to authenticated
  with check (true);

create policy "SOL TV admin compositions update"
  on public.sol_tv_compositions for update
  to authenticated
  using (true)
  with check (true);

create policy "SOL TV admin compositions delete"
  on public.sol_tv_compositions for delete
  to authenticated
  using (true);

-- Políticas para sol_tv_composition_items
drop policy if exists "SOL TV public composition items read" on public.sol_tv_composition_items;
drop policy if exists "SOL TV admin composition items insert" on public.sol_tv_composition_items;
drop policy if exists "SOL TV admin composition items update" on public.sol_tv_composition_items;
drop policy if exists "SOL TV admin composition items delete" on public.sol_tv_composition_items;

create policy "SOL TV public composition items read"
  on public.sol_tv_composition_items for select
  to anon, authenticated
  using (true);

create policy "SOL TV admin composition items insert"
  on public.sol_tv_composition_items for insert
  to authenticated
  with check (true);

create policy "SOL TV admin composition items update"
  on public.sol_tv_composition_items for update
  to authenticated
  using (true)
  with check (true);

create policy "SOL TV admin composition items delete"
  on public.sol_tv_composition_items for delete
  to authenticated
  using (true);

-- 6. Habilitar Realtime para as tabelas de composições
alter table public.sol_tv_compositions replica identity full;
alter table public.sol_tv_composition_items replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sol_tv_compositions'
  ) then
    alter publication supabase_realtime add table public.sol_tv_compositions;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sol_tv_composition_items'
  ) then
    alter publication supabase_realtime add table public.sol_tv_composition_items;
  end if;
end;
$$;

