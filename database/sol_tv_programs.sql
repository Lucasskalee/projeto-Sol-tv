-- ==============================================================================
-- SOL TV - Módulo de Programações e Agendamento Compartilhado (Etapa 4B)
-- 
-- NOTA DE SEGURANÇA:
-- [PENDENTE — Etapa futura de Segurança/RLS]
-- RLS, RBAC, sol_tv_user_scopes e permissões por loja/setor (viewer/operator/admin)
-- serão aplicados em uma etapa posterior dedicada exclusivamente à segurança.
-- 
-- Execute este script no SQL Editor do Supabase para criar a infraestrutura base.
-- ==============================================================================

create extension if not exists pgcrypto;

-- 1. Criação da Tabela sol_tv_programs
create table if not exists public.sol_tv_programs (
  id uuid primary key default gen_random_uuid(),
  store text not null default 'Loja 01',
  sector text not null default 'acougue',
  scope_key text generated always as (lower(trim(store)) || ':' || lower(trim(sector))) stored,
  name text not null check (char_length(trim(name)) >= 2),
  
  -- Estado Editorial Persistido
  editorial_status text not null default 'draft'
    check (editorial_status in ('draft', 'published', 'disabled')),
  
  -- Tipo de Recorrência
  recurrence text not null default 'always'
    check (recurrence in ('always', 'weekly', 'date_range', 'flash_offer')),
  
  -- Prioridade de Desempate (1 a 100)
  priority integer not null default 50
    check (priority between 1 and 100),
  
  -- Regras Temporais e Telas em JSONB
  schedule jsonb not null default '{"recurrence": "always"}'::jsonb,
  screens jsonb not null default '[]'::jsonb,
  
  -- Controle de Concorrência Otimista
  version integer not null default 1 check (version >= 1),
  
  -- Auditoria e Timestamps
  published_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

-- 2. Índices para Consultas por Escopo e Realtime
create index if not exists sol_tv_programs_scope_status_idx
  on public.sol_tv_programs (scope_key, editorial_status, recurrence);

create index if not exists sol_tv_programs_updated_idx
  on public.sol_tv_programs (updated_at desc);

-- 3. Trigger para Auditoria, Timestamps e Estados (INSERT e UPDATE)
create or replace function public.set_sol_tv_programs_audit()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    new.created_at = coalesce(new.created_at, now());
    new.updated_at = coalesce(new.updated_at, now());
    
    if auth.uid() is not null then
      if new.created_by is null then
        new.created_by = auth.uid();
      end if;
      if new.updated_by is null then
        new.updated_by = auth.uid();
      end if;
    end if;

    if new.editorial_status = 'published' and new.published_at is null then
      new.published_at = now();
    elsif new.editorial_status = 'disabled' and new.disabled_at is null then
      new.disabled_at = now();
    end if;

  elsif TG_OP = 'UPDATE' then
    new.updated_at = now();
    
    if auth.uid() is not null then
      new.updated_by = auth.uid();
    end if;

    if (new.editorial_status = 'published' and old.editorial_status is distinct from 'published') then
      new.published_at = now();
    elsif (new.editorial_status = 'disabled' and old.editorial_status is distinct from 'disabled') then
      new.disabled_at = now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sol_tv_programs_audit on public.sol_tv_programs;
create trigger trg_sol_tv_programs_audit
before insert or update on public.sol_tv_programs
for each row execute function public.set_sol_tv_programs_audit();

-- 4. Trigger para Garantir Incremento Físico de Versão (Apenas UPDATE)
create or replace function public.enforce_sol_tv_programs_version()
returns trigger
language plpgsql
as $$
begin
  new.version = old.version + 1;
  return new;
end;
$$;

drop trigger if exists trg_sol_tv_programs_version on public.sol_tv_programs;
create trigger trg_sol_tv_programs_version
before update on public.sol_tv_programs
for each row execute function public.enforce_sol_tv_programs_version();

-- 5. Habilitar Publicação Realtime
alter table public.sol_tv_programs replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sol_tv_programs'
  ) then
    alter publication supabase_realtime add table public.sol_tv_programs;
  end if;
end;
$$;

