import { supabase, loadTvContent } from '../supabase';
import type { Catalog, CatalogItem, CatalogSnapshot, CatalogVisual } from '../catalogs';
import type { MotionConfig } from '../motion/types';
import type { OfferComposition } from '../offers/compositions';
import { sanitizeMotionConfigForStorage } from '../motion/storage';
import { deserializeProgram, getScopeKey } from './programService';

function client() {
  if (!supabase) throw new Error('Supabase não configurado. Nenhuma alteração foi salva.');
  return supabase;
}
function check(error: unknown) { if (error) throw error; }

export async function fetchCatalogs(store: string, sector: string): Promise<Catalog[]> {
  const { data, error } = await client().from('sol_tv_folders').select('*').eq('scope_key', getScopeKey(store, sector)).order('name');
  check(error); return data || [];
}
export async function saveCatalog(catalog: Partial<Catalog> & Pick<Catalog, 'store' | 'sector' | 'name'>): Promise<Catalog> {
  // Never send generated scope_key or server-owned audit fields back to Postgres.
  const payload = {
    ...(catalog.id ? { id: catalog.id } : {}),
    store: catalog.store.trim(), sector: catalog.sector.trim().toLowerCase(),
    name: catalog.name.trim(), description: catalog.description || '',
    active: catalog.active ?? true, is_default: catalog.is_default ?? false,
    schedule_type: 'always',
  };
  const { data, error } = await client().from('sol_tv_folders').upsert(payload).select().single();
  check(error); return data as Catalog;
}
export async function setDefaultCatalog(id: string): Promise<void> {
  const { error } = await client().rpc('sol_tv_set_default_catalog', { target_id: id }); check(error);
}
export async function fetchCatalogItems(catalogId: string): Promise<CatalogItem[]> {
  const { data, error } = await client().from('sol_tv_catalog_items').select('*').eq('catalog_id', catalogId).order('position');
  check(error); return data || [];
}
export async function saveCatalogItem(item: Omit<CatalogItem, 'id'> & { id?: string }): Promise<void> {
  const { error } = await client().from('sol_tv_catalog_items').upsert(item); check(error);
}
export async function removeCatalogItem(id: string): Promise<void> {
  const { error } = await client().from('sol_tv_catalog_items').delete().eq('id', id); check(error);
}
export async function saveCatalogComposition(catalogId: string, comp: OfferComposition): Promise<void> {
  const { error } = await client().rpc('sol_tv_save_catalog_composition', {
    target_catalog: catalogId, target_composition: comp.id, screen_layout: comp.layout,
    screen_duration: comp.duration, screen_position: comp.position, screen_active: comp.active,
    product_ids: comp.offers.map(o => o.id),
  }); check(error);
}
export async function fetchCatalogVisual(catalogId: string): Promise<CatalogVisual | null> {
  const { data, error } = await client().from('sol_tv_visual_configs').select('*').eq('catalog_id', catalogId).maybeSingle();
  check(error); return data;
}
export async function saveCatalogVisual(catalogId: string, sector: string, config: MotionConfig, publish: boolean): Promise<void> {
  const { error } = await client().rpc('sol_tv_save_catalog_visual', {
    target_catalog: catalogId, target_sector: sector, config: sanitizeMotionConfigForStorage(config), publish,
  }); check(error);
}
export async function fetchCatalogSnapshot(store: string, sector: string): Promise<CatalogSnapshot> {
  const catalogs = await fetchCatalogs(store, sector);
  if (!catalogs.length) return { catalogs, items: [], programs: [], visuals: [] };
  const ids = catalogs.map(c => c.id);
  const [items, programs, visuals] = await Promise.all([
    client().from('sol_tv_catalog_items').select('*').in('catalog_id', ids),
    client().from('sol_tv_programs').select('*').eq('scope_key', getScopeKey(store, sector)),
    client().from('sol_tv_visual_configs').select('catalog_id,sector,published_config,published_version').in('catalog_id', ids),
  ]);
  check(items.error); check(programs.error); check(visuals.error);
  return { catalogs, items: items.data || [], programs: (programs.data || []).flatMap(p => { const result = deserializeProgram(p); return result ? [result] : []; }), visuals: (visuals.data || []) as CatalogVisual[] };
}

export const loadCatalogLibrary = (sector: string) => loadTvContent(sector, false, true);

/** One channel per consumer. Unfiltered deletes and old-scope updates invalidate too. */
export function subscribeCatalogChanges(reload: () => void, includeLibrary = false): () => void {
  if (!supabase) return () => {};
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const invalidate = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { if (!disposed) reload(); }, 150);
  };
  const channel = supabase.channel(`catalogs:${crypto.randomUUID()}`);
  const tables = ['sol_tv_folders', 'sol_tv_catalog_items', 'sol_tv_programs', 'sol_tv_visual_configs'];
  if (includeLibrary) tables.push('sol_tv_offers', 'sol_tv_media', 'sol_tv_compositions', 'sol_tv_composition_items', 'sol_tv_themes');
  for (const table of tables) channel.on('postgres_changes', { event: '*', schema: 'public', table }, invalidate);
  channel.subscribe(status => { if (status === 'SUBSCRIBED') invalidate(); });
  window.addEventListener('online', invalidate);
  return () => { disposed = true; clearTimeout(timer); window.removeEventListener('online', invalidate); void supabase!.removeChannel(channel); };
}

export async function fetchCatalog(id: string): Promise<Catalog> {
  const { data, error } = await client().from('sol_tv_folders').select('*').eq('id', id).single();
  check(error); return data as Catalog;
}
