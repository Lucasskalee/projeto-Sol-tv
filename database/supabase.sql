create extension if not exists pgcrypto;

create table if not exists public.sol_tv_offers (
  id uuid primary key default gen_random_uuid(),
  sector text not null default 'acougue',
  name text not null,
  normal_price numeric(10,2),
  offer_price numeric(10,2) not null,
  unit text not null default 'kg',
  image_url text,
  video_url text,
  media_type text not null default 'image',
  duration_seconds integer not null default 8 check (duration_seconds between 3 and 60),
  display_order integer not null default 0,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  layout text not null default 'single' check (layout in ('single', 'pair', 'grid')),
  image_scale numeric(4,2) default 1.0,
  store_id uuid,
  screen_id uuid,
  playlist_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migração segura para bases já existentes:
alter table public.sol_tv_offers add column if not exists image_scale numeric(4,2) default 1.0;

create index if not exists sol_tv_offers_sector_order_idx
  on public.sol_tv_offers (sector, display_order, created_at);

create or replace function public.set_sol_tv_offers_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sol_tv_offers_updated_at on public.sol_tv_offers;
create trigger sol_tv_offers_updated_at
before update on public.sol_tv_offers
for each row execute function public.set_sol_tv_offers_updated_at();

alter table public.sol_tv_offers enable row level security;

-- TVs can read only the current sector. Admin writes are temporarily scoped to
-- the MVP sector until Supabase Auth is added to the administrative panel.
drop policy if exists "SOL TV public read" on public.sol_tv_offers;
create policy "SOL TV public read"
  on public.sol_tv_offers for select
  to anon, authenticated
  using (sector = 'acougue');

drop policy if exists "SOL TV MVP insert" on public.sol_tv_offers;
create policy "SOL TV MVP insert"
  on public.sol_tv_offers for insert
  to anon, authenticated
  with check (sector = 'acougue');

drop policy if exists "SOL TV MVP update" on public.sol_tv_offers;
create policy "SOL TV MVP update"
  on public.sol_tv_offers for update
  to anon, authenticated
  using (sector = 'acougue')
  with check (sector = 'acougue');

drop policy if exists "SOL TV MVP delete" on public.sol_tv_offers;
create policy "SOL TV MVP delete"
  on public.sol_tv_offers for delete
  to anon, authenticated
  using (sector = 'acougue');

alter table public.sol_tv_offers replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sol_tv_offers'
  ) then
    alter publication supabase_realtime add table public.sol_tv_offers;
  end if;
end;
$$;

-- Future Storage buckets (create manually when upload is implemented):
-- insert into storage.buckets (id, name, public)
-- values ('sol-tv-images', 'sol-tv-images', true), ('sol-tv-videos', 'sol-tv-videos', true)
-- on conflict (id) do nothing;
