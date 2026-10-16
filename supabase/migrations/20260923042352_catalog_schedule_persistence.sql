-- Requires the existing database/*.sql baseline. PostgreSQL 15+.
-- Review/apply in staging first. No existing content is deleted or auto-published.
begin;

-- Reuse the existing folders entity as catalogs; retain legacy JSON snapshots.
alter table public.sol_tv_folders
  add column if not exists store text not null default 'Loja 01',
  add column if not exists scope_key text generated always as (lower(trim(store)) || ':' || lower(trim(sector))) stored,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;
-- Fail rather than silently demote existing conflicting defaults; see preflight guide.
create unique index if not exists sol_tv_catalog_one_default on public.sol_tv_folders(scope_key) where is_default;
create unique index if not exists sol_tv_catalog_id_scope on public.sol_tv_folders(id, scope_key);
create unique index if not exists sol_tv_catalog_id_sector on public.sol_tv_folders(id, sector);

alter table public.sol_tv_compositions add column if not exists catalog_id uuid references public.sol_tv_folders(id) on delete cascade;
alter table public.sol_tv_compositions drop constraint if exists sol_tv_compositions_layout_check;
alter table public.sol_tv_compositions add constraint sol_tv_compositions_layout_check check (layout in ('hero','duo','trio','grid4','grid8'));
create index if not exists sol_tv_compositions_catalog on public.sol_tv_compositions(catalog_id);

create table if not exists public.sol_tv_catalog_items (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.sol_tv_folders(id) on delete cascade,
  composition_id uuid references public.sol_tv_compositions(id) on delete cascade,
  offer_id uuid references public.sol_tv_offers(id) on delete cascade,
  media_id uuid references public.sol_tv_media(id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(composition_id, offer_id, media_id) = 1),
  unique(catalog_id, composition_id), unique(catalog_id, offer_id), unique(catalog_id, media_id)
);
create index if not exists sol_tv_catalog_items_order on public.sol_tv_catalog_items(catalog_id, position, id);
create index if not exists sol_tv_catalog_items_offer on public.sol_tv_catalog_items(offer_id);
create index if not exists sol_tv_catalog_items_media on public.sol_tv_catalog_items(media_id);
create index if not exists sol_tv_catalog_items_composition on public.sol_tv_catalog_items(composition_id);

alter table public.sol_tv_programs
  add column if not exists catalog_id uuid,
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'sol_tv_program_catalog_scope_fk') then
    alter table public.sol_tv_programs add constraint sol_tv_program_catalog_scope_fk
      foreign key(catalog_id, scope_key) references public.sol_tv_folders(id, scope_key) on delete restrict;
    alter table public.sol_tv_programs add constraint sol_tv_program_catalog_period
      check(catalog_id is null or (starts_at is not null and ends_at is not null and ends_at > starts_at and recurrence = 'date_range'));
  end if;
end $$;
create index if not exists sol_tv_program_catalog_period_idx on public.sol_tv_programs(scope_key, starts_at, ends_at) where catalog_id is not null and editorial_status = 'published';
create index if not exists sol_tv_program_catalog_id_idx on public.sol_tv_programs(catalog_id);

-- Preserve sector defaults (catalog_id NULL), allow one independent snapshot per catalog.
alter table public.sol_tv_visual_configs
  add column if not exists id uuid not null default gen_random_uuid(),
  add column if not exists catalog_id uuid,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'sol_tv_visual_catalog_fk') then
    alter table public.sol_tv_visual_configs drop constraint sol_tv_visual_configs_pkey;
    alter table public.sol_tv_visual_configs add primary key(id);
    alter table public.sol_tv_visual_configs add constraint sol_tv_visual_catalog_fk
      foreign key(catalog_id, sector) references public.sol_tv_folders(id, sector) on delete cascade;
    alter table public.sol_tv_visual_configs add constraint sol_tv_visual_scope_unique unique nulls not distinct(sector, catalog_id);
    alter table public.sol_tv_visual_configs add constraint sol_tv_visual_catalog_unique unique(catalog_id);
  end if;
end $$;

create or replace function public.sol_tv_catalog_audit() returns trigger language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then new.created_by := auth.uid();
  else new.created_by := old.created_by; new.created_at := old.created_at; end if;
  if TG_TABLE_NAME = 'sol_tv_folders' and TG_OP = 'UPDATE' then
    if new.store is distinct from old.store or new.sector is distinct from old.sector then
      raise exception 'Catalog store and sector cannot be changed';
    end if;
  end if;
  new.updated_by := auth.uid(); new.updated_at := now(); return new;
end $$;
drop trigger if exists sol_tv_catalog_audit on public.sol_tv_folders;
create trigger sol_tv_catalog_audit before insert or update on public.sol_tv_folders for each row execute function public.sol_tv_catalog_audit();
drop trigger if exists sol_tv_visual_audit on public.sol_tv_visual_configs;
create trigger sol_tv_visual_audit before insert or update on public.sol_tv_visual_configs for each row execute function public.sol_tv_catalog_audit();
drop trigger if exists sol_tv_catalog_items_updated on public.sol_tv_catalog_items;
create trigger sol_tv_catalog_items_updated before update on public.sol_tv_catalog_items for each row execute function public.set_sol_tv_folders_updated_at();

-- Prevent cross-sector content and editing another catalog's private composition.
create or replace function public.sol_tv_check_catalog_item() returns trigger language plpgsql set search_path = '' as $$
declare target_sector text; content_sector text; owner_catalog uuid;
begin
  select sector into target_sector from public.sol_tv_folders where id = new.catalog_id;
  if new.offer_id is not null then select sector into content_sector from public.sol_tv_offers where id = new.offer_id;
  elsif new.media_id is not null then select sector into content_sector from public.sol_tv_media where id = new.media_id;
  else
    select sector, catalog_id into content_sector, owner_catalog from public.sol_tv_compositions where id = new.composition_id;
    if owner_catalog is not null and owner_catalog <> new.catalog_id then raise exception 'Composition belongs to another catalog'; end if;
  end if;
  if target_sector is distinct from content_sector then raise exception 'Content and catalog sectors differ'; end if;
  return new;
end $$;
drop trigger if exists sol_tv_catalog_item_scope on public.sol_tv_catalog_items;
create trigger sol_tv_catalog_item_scope before insert or update on public.sol_tv_catalog_items for each row execute function public.sol_tv_check_catalog_item();

-- Reuse Supabase Auth: the existing Admin admits authenticated users, without RBAC.
-- Explicitly exclude anonymous sign-ins. Do not use user-editable user_metadata.
create or replace function public.sol_tv_is_operator() returns boolean language sql stable security invoker set search_path = '' as $$
  select auth.uid() is not null and coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
$$;
revoke all on function public.sol_tv_is_operator() from public;
grant execute on function public.sol_tv_is_operator() to anon, authenticated;

-- Remove permissive legacy policies on the tables used by this flow.
-- This deliberately makes all anonymous database access read-only.
do $$ declare t text; p record; begin
  foreach t in array array['sol_tv_folders','sol_tv_catalog_items','sol_tv_programs','sol_tv_visual_configs',
    'sol_tv_offers','sol_tv_media','sol_tv_compositions','sol_tv_composition_items','sol_tv_themes','motion_layouts','motion_publications'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table public.%I enable row level security', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format('revoke all on public.%I from anon, public', t);
    execute format('grant select on public.%I to anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy operator_access on public.%I for all to authenticated using ((select public.sol_tv_is_operator())) with check ((select public.sol_tv_is_operator()))', t);
    -- Read inactive metadata as well so Realtime delivers deactivation events.
    -- Playback filters active rows; authoring drafts are excluded below.
    if t = 'sol_tv_programs' then
      execute format('create policy tv_read on public.%I for select to anon using (editorial_status <> ''draft'')', t);
    elsif t = 'motion_layouts' then
      execute format('revoke select on public.%I from anon', t);
    else
      execute format('create policy tv_read on public.%I for select to anon using (true)', t);
    end if;
    if t <> 'motion_layouts' then
      -- FULL cannot include unpublished generated scope_key columns (PostgreSQL 18).
      -- Consumers invalidate on DELETE using the primary key, so DEFAULT is sufficient.
      execute format('alter table public.%I replica identity default', t);
      if exists(select 1 from pg_publication where pubname = 'supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end if;
  end loop;
end $$;
-- Public TV reads published fields, never authoring draft JSON.
revoke select on public.sol_tv_visual_configs from anon;
grant select(id, sector, catalog_id, published_config, published_version, published_at, updated_at) on public.sol_tv_visual_configs to anon;

-- Atomic operations run with caller privileges/RLS, never SECURITY DEFINER.
create or replace function public.sol_tv_set_default_catalog(target_id uuid) returns void language plpgsql security invoker set search_path = '' as $$
declare target_scope text;
begin
  select scope_key into strict target_scope from public.sol_tv_folders where id = target_id and active;
  perform pg_advisory_xact_lock(hashtextextended(target_scope, 0));
  update public.sol_tv_folders set is_default = false where scope_key = target_scope and is_default and id <> target_id;
  update public.sol_tv_folders set is_default = true where id = target_id;
end $$;

create or replace function public.sol_tv_save_catalog_composition(target_catalog uuid, target_composition uuid, screen_layout text,
  screen_duration integer, screen_position integer, screen_active boolean, product_ids uuid[]) returns void
language plpgsql security invoker set search_path = '' as $$
declare target_sector text;
begin
  select sector into strict target_sector from public.sol_tv_folders where id = target_catalog;
  if exists(select 1 from public.sol_tv_compositions where id = target_composition and catalog_id is distinct from target_catalog) then
    raise exception 'Cannot edit a shared or foreign composition; create a copy';
  end if;
  if exists(select 1 from unnest(product_ids) p(id) left join public.sol_tv_offers o on o.id = p.id where o.id is null or o.sector <> target_sector) then
    raise exception 'Offer missing or belongs to another sector';
  end if;
  insert into public.sol_tv_compositions(id,sector,catalog_id,layout,duration_seconds,position,active)
    values(target_composition,target_sector,target_catalog,screen_layout,screen_duration,screen_position,screen_active)
    on conflict(id) do update set layout=excluded.layout,duration_seconds=excluded.duration_seconds,position=excluded.position,active=excluded.active;
  delete from public.sol_tv_composition_items where composition_id = target_composition;
  insert into public.sol_tv_composition_items(composition_id,offer_id,slot_index)
    select target_composition,id,(ordinality-1)::integer from unnest(product_ids) with ordinality p(id,ordinality);
  insert into public.sol_tv_catalog_items(catalog_id,composition_id,position,active)
    values(target_catalog,target_composition,screen_position,screen_active)
    on conflict(catalog_id,composition_id) do update set position=excluded.position,active=excluded.active;
end $$;

create or replace function public.sol_tv_save_catalog_visual(target_catalog uuid, target_sector text, config jsonb, publish boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if jsonb_typeof(config) <> 'object' then raise exception 'Visual configuration must be an object'; end if;
  insert into public.sol_tv_visual_configs(sector,catalog_id,draft_config,published_config,published_version)
    values(target_sector,target_catalog,config,case when publish then config else '{}'::jsonb end,1)
    on conflict(sector,catalog_id) do update set draft_config=excluded.draft_config,
      published_config=case when publish then excluded.draft_config else public.sol_tv_visual_configs.published_config end,
      published_version=public.sol_tv_visual_configs.published_version + case when publish then 1 else 0 end,
      published_at=case when publish then now() else public.sol_tv_visual_configs.published_at end;
end $$;
revoke all on function public.sol_tv_set_default_catalog(uuid) from public;
revoke all on function public.sol_tv_save_catalog_composition(uuid,uuid,text,integer,integer,boolean,uuid[]) from public;
revoke all on function public.sol_tv_save_catalog_visual(uuid,text,jsonb,boolean) from public;
grant execute on function public.sol_tv_set_default_catalog(uuid) to authenticated;
grant execute on function public.sol_tv_save_catalog_composition(uuid,uuid,text,integer,integer,boolean,uuid[]) to authenticated;
grant execute on function public.sol_tv_save_catalog_visual(uuid,text,jsonb,boolean) to authenticated;

-- Scope only the known TV bucket policies; other applications' buckets are untouched.
do $$ begin
  if to_regclass('storage.objects') is not null then
    drop policy if exists "SOL TV - upload publico" on storage.objects;
    drop policy if exists "SOL TV - atualizar publico" on storage.objects;
    drop policy if exists "SOL TV - excluir publico" on storage.objects;
    drop policy if exists "SOL TV - upload autenticado" on storage.objects;
    drop policy if exists "SOL TV - atualizar autenticado" on storage.objects;
    drop policy if exists "SOL TV - excluir autenticado" on storage.objects;
    create policy "SOL TV - upload autenticado" on storage.objects for insert to authenticated with check(bucket_id = 'tv-media' and (select public.sol_tv_is_operator()));
    create policy "SOL TV - atualizar autenticado" on storage.objects for update to authenticated using(bucket_id = 'tv-media' and (select public.sol_tv_is_operator())) with check(bucket_id = 'tv-media' and (select public.sol_tv_is_operator()));
    create policy "SOL TV - excluir autenticado" on storage.objects for delete to authenticated using(bucket_id = 'tv-media' and (select public.sol_tv_is_operator()));
  end if;
end $$;
notify pgrst, 'reload schema';
commit;
