-- ==============================================================================
-- SOL TV - Módulo de Configuração Visual e Motion das TVs
-- Tabela para persistência de Rascunho (Draft) vs Publicado (Published)
-- Execute este script no SQL Editor do Supabase.
-- ==============================================================================

create table if not exists public.sol_tv_visual_configs (
  sector text primary key default 'acougue',
  draft_config jsonb not null default '{}'::jsonb,
  published_config jsonb not null default '{}'::jsonb,
  published_version integer not null default 1,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Habilitar Row Level Security (RLS)
alter table public.sol_tv_visual_configs enable row level security;

-- Política de leitura pública (para as TVs públicas e o editor)
drop policy if exists "SOL TV visual config public read" on public.sol_tv_visual_configs;
create policy "SOL TV visual config public read"
  on public.sol_tv_visual_configs for select
  to anon, authenticated
  using (true);

-- Política de inserção e atualização
drop policy if exists "SOL TV visual config insert" on public.sol_tv_visual_configs;
create policy "SOL TV visual config insert"
  on public.sol_tv_visual_configs for insert
  to anon, authenticated
  with check (true);

drop policy if exists "SOL TV visual config update" on public.sol_tv_visual_configs;
create policy "SOL TV visual config update"
  on public.sol_tv_visual_configs for update
  to anon, authenticated
  using (true)
  with check (true);

-- Habilitar Realtime
alter table public.sol_tv_visual_configs replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sol_tv_visual_configs'
  ) then
    alter publication supabase_realtime add table public.sol_tv_visual_configs;
  end if;
end;
$$;

