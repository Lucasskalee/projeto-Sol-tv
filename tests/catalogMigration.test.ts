import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const db = new PGlite();
const migration = readFileSync('supabase/migrations/20260923042352_catalog_schedule_persistence.sql', 'utf8');
const user = '10000000-0000-4000-8000-000000000001';
const catalog = '20000000-0000-4000-8000-000000000001';
const other = '20000000-0000-4000-8000-000000000002';
const offer = '30000000-0000-4000-8000-000000000001';
const screen = '40000000-0000-4000-8000-000000000001';

beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    grant usage on schema public,auth to anon,authenticated;
    create publication supabase_realtime;
    insert into auth.users values('${user}');
    create schema storage; create table storage.objects(id uuid, bucket_id text); alter table storage.objects enable row level security;`);
  for (const file of ['supabase','sol_tv_media','sol_tv_compositions','sol_tv_folders','sol_tv_programs','sol_tv_visual_configs','sol_tv_themes','motion_layouts_and_publications']) {
    const baseline = readFileSync(`database/${file}.sql`,'utf8').split('-- 7. Storage')[0].replace(/create extension if not exists pgcrypto;/gi,'');
    await db.exec(baseline);
  }
  await db.exec(`insert into public.sol_tv_offers(id,sector,name,offer_price) values('${offer}','acougue','Existing product',9.9);
    insert into public.sol_tv_visual_configs(sector,published_config) values('acougue','{"themeSlug":"normal"}');`);
  await db.exec(migration);
  await db.exec(migration); // Idempotence on an already migrated schema.
  await db.exec(`select set_config('request.jwt.claim.sub','${user}',false); set role authenticated;
    insert into public.sol_tv_folders(id,name,store,sector) values('${catalog}','Default','Loja 03','acougue'),('${other}','Campaign','Loja 03','acougue');`);
}, 30000);
afterAll(async () => { await db.close(); });

describe('catalog migration on isolated PostgreSQL', () => {
  it('preserves old offers and legacy visual configuration', async () => {
    expect((await db.query('select name from sol_tv_offers')).rows).toEqual([{ name: 'Existing product' }]);
    expect((await db.query('select published_config from sol_tv_visual_configs where catalog_id is null')).rows).toEqual([{ published_config: { themeSlug: 'normal' } }]);
  });
  it('enforces one default and switches it atomically', async () => {
    await db.exec(`select sol_tv_set_default_catalog('${catalog}'); select sol_tv_set_default_catalog('${other}');`);
    expect((await db.query('select id from sol_tv_folders where is_default')).rows).toEqual([{ id: other }]);
    await expect(db.exec(`update sol_tv_folders set is_default=true where id='${catalog}'`)).rejects.toThrow();
  });
  it('rejects missing catalogs, cross-store schedules and invalid periods', async () => {
    const insert = (id: string, store: string, end: string) => `insert into sol_tv_programs(name,store,sector,catalog_id,recurrence,starts_at,ends_at) values('Campaign','${store}','acougue','${id}','date_range','2026-11-27T03:00Z','${end}')`;
    await expect(db.exec(insert('99999999-0000-4000-8000-000000000000','Loja 03','2026-12-01T03:00Z'))).rejects.toThrow();
    await expect(db.exec(insert(catalog,'Loja 02','2026-12-01T03:00Z'))).rejects.toThrow();
    await expect(db.exec(insert(catalog,'Loja 03','2026-11-26T03:00Z'))).rejects.toThrow();
    await db.exec(insert(catalog,'Loja 03','2026-12-01T03:00Z'));
  });
  it('saves screens and product relationships transactionally without duplicating offers', async () => {
    await db.exec(`select sol_tv_save_catalog_composition('${catalog}','${screen}','hero',8,0,true,array['${offer}'::uuid]);`);
    expect((await db.query('select count(*)::int n from sol_tv_offers')).rows).toEqual([{ n: 1 }]);
    await expect(db.exec(`select sol_tv_save_catalog_composition('${other}','${screen}','hero',8,0,true,array['${offer}'::uuid])`)).rejects.toThrow();
    await expect(db.exec(`select sol_tv_save_catalog_composition('${catalog}','${screen}','hero',8,0,true,array['99999999-0000-4000-8000-000000000000'::uuid])`)).rejects.toThrow();
    expect((await db.query('select offer_id from sol_tv_composition_items')).rows).toEqual([{ offer_id: offer }]);
  });
  it('keeps drafts out of published snapshots and isolates catalogs', async () => {
    await db.exec(`select sol_tv_save_catalog_visual('${catalog}','acougue','{"themeSlug":"normal"}',true);
      select sol_tv_save_catalog_visual('${catalog}','acougue','{"themeSlug":"black-friday"}',false);
      select sol_tv_save_catalog_visual('${other}','acougue','{"themeSlug":"black-friday"}',true);`);
    expect((await db.query(`select published_config from sol_tv_visual_configs where catalog_id='${catalog}'`)).rows).toEqual([{ published_config: { themeSlug: 'normal' } }]);
    await db.exec(`select sol_tv_save_catalog_visual('${catalog}','acougue','{"themeSlug":"black-friday"}',true);`);
    expect((await db.query(`select published_version from sol_tv_visual_configs where catalog_id='${catalog}'`)).rows).toEqual([{ published_version: 2 }]);
  });
  it('allows public published reads and denies anonymous CRUD, RPC and draft reads', async () => {
    await db.exec('reset role; set role anon');
    try {
      expect((await db.query('select published_config from sol_tv_visual_configs')).rows.length).toBe(3);
      await expect(db.exec('select draft_config from sol_tv_visual_configs')).rejects.toThrow();
      await expect(db.exec(`insert into sol_tv_folders(name) values('attack')`)).rejects.toThrow();
      await expect(db.exec(`update sol_tv_visual_configs set published_config='{}'`)).rejects.toThrow();
      await expect(db.exec('delete from sol_tv_catalog_items')).rejects.toThrow();
      await expect(db.exec(`select sol_tv_set_default_catalog('${catalog}')`)).rejects.toThrow();
    } finally { await db.exec('reset role; set role authenticated'); }
  });
  it('denies anonymous Supabase sign-ins even with authenticated database role', async () => {
    await db.exec(`select set_config('request.jwt.claims','{"is_anonymous":true}',false)`);
    try { await expect(db.exec(`insert into sol_tv_folders(name) values('attack')`)).rejects.toThrow(); }
    finally { await db.exec(`select set_config('request.jwt.claims','{}',false)`); }
  });
  it('publishes all relevant tables for Realtime', async () => {
    const result = await db.query<{ tablename: string }>(`select tablename from pg_publication_tables where pubname='supabase_realtime'`);
    expect(result.rows.map(r => r.tablename)).toEqual(expect.arrayContaining(['sol_tv_folders','sol_tv_catalog_items','sol_tv_programs','sol_tv_visual_configs']));
  });
});
