-- ==============================================================================
-- SOL TV - Módulo de Temas Globais por Setor
-- Execute este script no SQL Editor do Supabase para criar a tabela de temas,
-- habilitar RLS, configurar políticas e realtime.
-- ==============================================================================

create table if not exists public.sol_tv_themes (
  sector text primary key default 'acougue',
  active_theme text not null default 'normal' check (active_theme in ('normal', 'black-friday')),
  updated_at timestamptz not null default now()
);

-- Inserir valor padrão para o setor MVP açougue
insert into public.sol_tv_themes (sector, active_theme)
values ('acougue', 'normal')
on conflict (sector) do nothing;

-- Habilitar Row Level Security (RLS)
alter table public.sol_tv_themes enable row level security;

-- Políticas de RLS
drop policy if exists "SOL TV public themes read" on public.sol_tv_themes;
create policy "SOL TV public themes read"
  on public.sol_tv_themes for select
  to anon, authenticated
  using (true);

drop policy if exists "SOL TV public themes insert" on public.sol_tv_themes;
create policy "SOL TV public themes insert"
  on public.sol_tv_themes for insert
  to anon, authenticated
  with check (true);

drop policy if exists "SOL TV public themes update" on public.sol_tv_themes;
create policy "SOL TV public themes update"
  on public.sol_tv_themes for update
  to anon, authenticated
  using (true)
  with check (true);

-- Habilitar Realtime para sol_tv_themes
alter publication supabase_realtime add table public.sol_tv_themes;

