-- ==============================================================================
-- SOL TV - Módulo de Pastas de Ofertas Agendadas
-- Execute este script no SQL Editor do Supabase para criar a tabela de
-- pastas de campanhas agendadas, índices, RLS e suporte a Realtime.
-- ==============================================================================

-- 1. Criação da tabela sol_tv_folders (Pastas de Ofertas Agendadas)
create table if not exists public.sol_tv_folders (
  id uuid primary key default gen_random_uuid(),
  sector text not null default 'acougue',
  name text not null,
  description text default '',
  schedule_type text not null default 'weekly' check (schedule_type in ('weekly', 'date_range', 'always')),
  weekdays integer[] default array[1],
  start_time text default '07:00',
  end_time text default '22:00',
  start_date text,
  end_date text,
  active boolean not null default true,
  is_default boolean not null default false,
  priority integer not null default 1,
  offers jsonb not null default '[]'::jsonb,
  compositions jsonb not null default '[]'::jsonb,
  media_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Índices para consultas de performance
create index if not exists sol_tv_folders_sector_active_idx
  on public.sol_tv_folders (sector, active, priority desc, created_at);

-- 3. Trigger para updated_at automático
create or replace function public.set_sol_tv_folders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sol_tv_folders_updated_at on public.sol_tv_folders;
create trigger sol_tv_folders_updated_at
before update on public.sol_tv_folders
for each row execute function public.set_sol_tv_folders_updated_at();

-- 4. Habilitar Row Level Security (RLS)
alter table public.sol_tv_folders enable row level security;

-- Políticas de RLS
drop policy if exists "SOL TV public folders read" on public.sol_tv_folders;
drop policy if exists "SOL TV admin folders insert" on public.sol_tv_folders;
drop policy if exists "SOL TV admin folders update" on public.sol_tv_folders;
drop policy if exists "SOL TV admin folders delete" on public.sol_tv_folders;

create policy "SOL TV public folders read"
  on public.sol_tv_folders for select
  to anon, authenticated
  using (true);

create policy "SOL TV admin folders insert"
  on public.sol_tv_folders for insert
  to authenticated
  with check (true);

create policy "SOL TV admin folders update"
  on public.sol_tv_folders for update
  to authenticated
  using (true)
  with check (true);

create policy "SOL TV admin folders delete"
  on public.sol_tv_folders for delete
  to authenticated
  using (true);

-- 5. Habilitar Realtime para sol_tv_folders
alter table public.sol_tv_folders replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sol_tv_folders'
  ) then
    alter publication supabase_realtime add table public.sol_tv_folders;
  end if;
end;
$$;
