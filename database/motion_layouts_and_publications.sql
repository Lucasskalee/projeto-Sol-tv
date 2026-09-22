-- ==============================================================================
-- SOL TV - Módulo de Biblioteca de Layouts e Publicações
-- Desacoplamento estrito: SALVAR ≠ PUBLICAR
-- ==============================================================================

-- 1. TABELA DE LAYOUTS (Biblioteca / Rascunhos / Modelos)
create table if not exists public.motion_layouts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  category text not null default 'custom', -- 'canonico', 'promocional', 'sazonal', 'custom'
  config_json jsonb not null default '{}'::jsonb,
  thumbnail_url text default '',
  is_system boolean not null default false,
  created_by text default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices para busca rápida
create index if not exists idx_motion_layouts_category on public.motion_layouts(category);
create index if not exists idx_motion_layouts_updated_at on public.motion_layouts(updated_at desc);

-- 2. TABELA DE PUBLICAÇÕES (Produção Ativa com Snapshot Imutável)
create table if not exists public.motion_publications (
  id uuid primary key default gen_random_uuid(),
  store_id text not null default 'default',
  sector text not null, -- ex: 'acougue', 'padaria', 'frios', 'hortifruti'
  layout_id uuid references public.motion_layouts(id) on delete set null,
  layout_name text not null default '',
  published_config jsonb not null default '{}'::jsonb, -- Snapshot imutável no momento da publicação
  published_version integer not null default 1,
  published_at timestamptz not null default now(),
  published_by text default 'admin',
  constraint unique_store_sector_publication unique (store_id, sector)
);

-- Índices
create index if not exists idx_motion_publications_sector on public.motion_publications(sector);

-- 3. Habilitar Row Level Security (RLS)
alter table public.motion_layouts enable row level security;
alter table public.motion_publications enable row level security;

-- Políticas para motion_layouts
drop policy if exists "motion_layouts_public_read" on public.motion_layouts;
create policy "motion_layouts_public_read"
  on public.motion_layouts for select
  to anon, authenticated
  using (true);

drop policy if exists "motion_layouts_public_write" on public.motion_layouts;
create policy "motion_layouts_public_write"
  on public.motion_layouts for insert
  to anon, authenticated
  with check (true);

drop policy if exists "motion_layouts_public_update" on public.motion_layouts;
create policy "motion_layouts_public_update"
  on public.motion_layouts for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "motion_layouts_public_delete" on public.motion_layouts;
create policy "motion_layouts_public_delete"
  on public.motion_layouts for delete
  to anon, authenticated
  using (not is_system);

-- Políticas para motion_publications
drop policy if exists "motion_publications_public_read" on public.motion_publications;
create policy "motion_publications_public_read"
  on public.motion_publications for select
  to anon, authenticated
  using (true);

drop policy if exists "motion_publications_public_write" on public.motion_publications;
create policy "motion_publications_public_write"
  on public.motion_publications for insert
  to anon, authenticated
  with check (true);

drop policy if exists "motion_publications_public_update" on public.motion_publications;
create policy "motion_publications_public_update"
  on public.motion_publications for update
  to anon, authenticated
  using (true)
  with check (true);

-- 4. Habilitar Realtime APENAS para motion_publications (a TV só escuta publicações!)
alter table public.motion_publications replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'motion_publications'
  ) then
    alter publication supabase_realtime add table public.motion_publications;
  end if;
end;
$$;

