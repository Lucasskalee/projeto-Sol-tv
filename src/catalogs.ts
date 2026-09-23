import type { MotionConfig } from './motion/types';
import type { TvContent, TvPlaylistItem } from './types';
import type { TvProgram } from './offers/programs';
import { getScopeKey } from './services/programService';

export type Catalog = {
  id: string; name: string; description: string; store: string; sector: string;
  active: boolean; is_default: boolean; created_at: string; updated_at: string;
  created_by?: string | null; updated_by?: string | null;
};
export type CatalogItem = {
  id: string; catalog_id: string; position: number; active: boolean;
  composition_id: string | null; offer_id: string | null; media_id: string | null;
};
export type CatalogVisual = {
  catalog_id: string; sector: string; published_config: MotionConfig;
  draft_config?: MotionConfig; published_version: number;
};
export type CatalogSnapshot = {
  catalogs: Catalog[]; items: CatalogItem[]; programs: TvProgram[]; visuals: CatalogVisual[];
};

/** Half-open UTC intervals: start inclusive, end exclusive. Stable overlap winner. */
export function resolveCatalog(snapshot: CatalogSnapshot, store: string, sector: string, now: number): Catalog | null {
  const scope = getScopeKey(store, sector);
  const catalogs = snapshot.catalogs.filter(c => c.active && getScopeKey(c.store, c.sector) === scope);
  const byId = new Map(catalogs.map(c => [c.id, c]));
  const winner = snapshot.programs.filter(p =>
    p.status === 'published' && p.catalogId && byId.has(p.catalogId) &&
    getScopeKey(p.store, p.sector) === scope &&
    now >= Date.parse(p.startsAt || '') && now < Date.parse(p.endsAt || ''),
  ).sort((a, b) => (b.priority ?? 50) - (a.priority ?? 50) ||
    b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id))[0];
  return (winner?.catalogId ? byId.get(winner.catalogId) : undefined) || catalogs.find(c => c.is_default) || null;
}

/** Resolve current library records; never use copied product snapshots or unrelated content. */
export function catalogToContent(catalog: Catalog, items: CatalogItem[], library: TvContent): TvContent {
  const playlist: TvPlaylistItem[] = [];
  const offers = new Map(library.offers.map(o => [o.id, o]));
  const media = new Map(library.media.map(m => [m.id, m]));
  const compositions = new Map(library.compositions.map(c => [c.id, c]));
  for (const item of items.filter(i => i.catalog_id === catalog.id && i.active).sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))) {
    const base = { position: item.position, active: true };
    const comp = item.composition_id ? compositions.get(item.composition_id) : undefined;
    const offer = item.offer_id ? offers.get(item.offer_id) : undefined;
    const asset = item.media_id ? media.get(item.media_id) : undefined;
    if (comp?.active) {
      const resolved = { ...comp, offers: comp.offers.flatMap(o => offers.get(o.id) ? [offers.get(o.id)!] : []) };
      playlist.push({ ...base, id: comp.id, kind: 'composition', composition: resolved, duration: comp.duration });
    } else if (offer?.active) {
      playlist.push({ ...base, id: offer.id, kind: 'offer', offer, duration: offer.duration });
    } else if (asset?.active) {
      playlist.push({ ...base, id: asset.id, kind: asset.type, title: asset.title, src: asset.mediaUrl, duration: asset.duration });
    }
  }
  const selectedOffers = new Set(playlist.flatMap(p => p.kind === 'offer' ? [p.offer.id] : p.kind === 'composition' ? p.composition.offers.map(o => o.id) : []));
  return {
    sector: catalog.sector, playlist,
    offers: library.offers.filter(o => selectedOffers.has(o.id)),
    media: library.media.filter(m => playlist.some(p => (p.kind === 'image' || p.kind === 'video') && p.id === m.id)),
    compositions: playlist.flatMap(p => p.kind === 'composition' ? [p.composition] : []),
    publishedAt: catalog.updated_at,
  };
}
