-- ==============================================================================
-- SOL TV - Módulo de Mídia (Imagens e Vídeos) e Storage
-- Execute este script no SQL Editor do Supabase para criar a tabela de mídia,
-- habilitar RLS, configurar políticas de segurança e publicação realtime.
-- ==============================================================================

-- 1. Criação da tabela sol_tv_media
create table if not exists public.sol_tv_media (
  id uuid primary key default gen_random_uuid(),
  title text,
  type text not null check (type in ('image', 'video')),
  media_url text not null,
  storage_path text,
  sector text not null default 'acougue',
  duration_seconds integer not null default 10 check (duration_seconds between 3 and 120),
  position integer not null default 0,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Índice para consultas rápidas de playlist por setor e posição
create index if not exists sol_tv_media_sector_pos_idx
  on public.sol_tv_media (sector, position, created_at);

-- 3. Trigger para atualização automática do updated_at
create or replace function public.set_sol_tv_media_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sol_tv_media_updated_at on public.sol_tv_media;
create trigger sol_tv_media_updated_at
before update on public.sol_tv_media
for each row execute function public.set_sol_tv_media_updated_at();

-- 4. Habilitar Row Level Security (RLS)
alter table public.sol_tv_media enable row level security;

-- 5. Políticas de Segurança (RLS)
-- TV e Usuários Anônimos: somente leitura de mídias ativas
drop policy if exists "SOL TV public media read" on public.sol_tv_media;
create policy "SOL TV public media read"
  on public.sol_tv_media for select
  to anon, authenticated
  using (active = true);

-- Administradores autenticados: permissão completa de gravação
drop policy if exists "SOL TV admin media insert" on public.sol_tv_media;
create policy "SOL TV admin media insert"
  on public.sol_tv_media for insert
  to authenticated
  with check (true);

drop policy if exists "SOL TV admin media update" on public.sol_tv_media;
create policy "SOL TV admin media update"
  on public.sol_tv_media for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "SOL TV admin media delete" on public.sol_tv_media;
create policy "SOL TV admin media delete"
  on public.sol_tv_media for delete
  to authenticated
  using (true);

-- 6. Habilitar Realtime para a tabela sol_tv_media
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sol_tv_media'
  ) then
    alter publication supabase_realtime add table public.sol_tv_media;
  end if;
end;
$$;

-- 7. Storage (tambem disponivel em database/tv_media_storage.sql)
-- SOL TV: execute no SQL Editor do projeto usado pelo frontend.
-- Escrita permitida a TODOS os usuarios autenticados; nao verifica papel admin.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tv-media', 'tv-media', true, 104857600,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "SOL TV - leitura publica" on storage.objects;
create policy "SOL TV - leitura publica"
on storage.objects for select
to public
using (bucket_id = 'tv-media');

drop policy if exists "SOL TV - upload autenticado" on storage.objects;
create policy "SOL TV - upload autenticado"
on storage.objects for insert
to authenticated
with check (bucket_id = 'tv-media');

drop policy if exists "SOL TV - atualizar autenticado" on storage.objects;
create policy "SOL TV - atualizar autenticado"
on storage.objects for update
to authenticated
using (bucket_id = 'tv-media')
with check (bucket_id = 'tv-media');

drop policy if exists "SOL TV - excluir autenticado" on storage.objects;
create policy "SOL TV - excluir autenticado"
on storage.objects for delete
to authenticated
using (bucket_id = 'tv-media');

commit;

-- Verificacao da configuracao aplicada.
select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'tv-media';

select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects';
