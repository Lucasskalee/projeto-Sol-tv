import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { cachedContent, loadTvContent, loadVisualConfig, loadCachedVisualConfig } from '../supabase';
import { TvPlayer } from '../components/TvPlayer';
import { resolveTheme } from '../themes/resolveTheme';
import { cloneMotionConfig } from '../motion/defaults';
import { safeLocalStorageSetItem } from '../motion/storage';
import { catalogToContent, resolveCatalog, type CatalogSnapshot } from '../catalogs';
import { fetchCatalogSnapshot, loadCatalogLibrary, subscribeCatalogChanges } from '../services/catalogService';
import type { TvContent } from '../types';
import type { MotionConfig } from '../motion/types';

const emptySnapshot: CatalogSnapshot = { catalogs: [], items: [], programs: [], visuals: [] };
type PlaybackData = { snapshot: CatalogSnapshot; library: TvContent; legacy: TvContent; visual: MotionConfig };
function cacheKey(store: string, sector: string) { return `skalee_catalog_playback_v1:${store.toLowerCase()}:${sector}`; }
function initialData(store: string, sector: string): PlaybackData {
  try {
    const saved = JSON.parse(localStorage.getItem(cacheKey(store, sector)) || 'null');
    if (saved?.snapshot && saved?.library?.playlist && saved?.legacy?.playlist && saved?.visual) return saved;
  } catch { /* best-effort offline cache */ }
  const legacy = cachedContent(sector);
  return { snapshot: emptySnapshot, library: legacy, legacy, visual: loadCachedVisualConfig(sector).publishedConfig };
}

export default function Tv() {
  const { sector: routeSector } = useParams<{ sector?: string }>();
  const [params] = useSearchParams();
  const sector = (routeSector || 'acougue').toLowerCase();
  const store = params.get('store')?.trim() || 'Loja 01';
  const queryTheme = params.get('theme');
  const [data, setData] = useState(() => initialData(store, sector));
  const [now, setNow] = useState(Date.now);
  const [connection, setConnection] = useState<'online' | 'syncing' | 'offline'>('syncing');
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    let disposed = false;
    let loading = false;
    let pending = false;
    setData(initialData(store, sector));
    setConnection('syncing');
    const reload = async () => {
      if (disposed) return;
      if (loading) { pending = true; return; }
      loading = true;
      try {
        const snapshot = await fetchCatalogSnapshot(store, sector).catch(error => {
          // New schema absent: continue the existing TV during the staged migration.
          if (['42703', '42P01', 'PGRST204', 'PGRST205'].includes(error?.code)) return emptySnapshot;
          throw error;
        });
        const [legacy, library, visual] = await Promise.all([
          loadTvContent(sector, true),
          snapshot.catalogs.length ? loadCatalogLibrary(sector) : Promise.resolve(null),
          loadVisualConfig(sector),
        ]);
        if (disposed) return;
        const next = { snapshot, legacy, library: library || legacy, visual: visual.publishedConfig };
        setData(next);
        safeLocalStorageSetItem(cacheKey(store, sector), JSON.stringify(next));
        setConnection('online'); setLastSync(new Date());
      } catch (error) {
        if (!disposed) { console.warn('[TV] Mantendo último conteúdo confirmado:', error); setConnection('offline'); }
      } finally {
        loading = false;
        if (pending && !disposed) { pending = false; void reload(); }
      }
    };
    const unsubscribe = subscribeCatalogChanges(() => { void reload(); }, true);
    void reload();
    // Clock drives schedule boundaries even offline; polling recovers missed/deactivation events.
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    const recovery = window.setInterval(() => { void reload(); }, 30000);
    const resume = () => { setNow(Date.now()); void reload(); };
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      disposed = true; unsubscribe(); clearInterval(clock); clearInterval(recovery);
      window.removeEventListener('focus', resume); document.removeEventListener('visibilitychange', resume);
    };
  }, [store, sector]);

  const catalog = resolveCatalog(data.snapshot, store, sector, now);
  const content = useMemo(() => catalog ? catalogToContent(catalog, data.snapshot.items, data.library) : data.legacy,
    [catalog, data]);
  const published = data.snapshot.visuals.find(v => v.catalog_id === catalog?.id)?.published_config;
  const motion = useMemo(() => {
    const config = cloneMotionConfig(published && Object.keys(published).length ? published : data.visual);
    if (queryTheme) config.themeSlug = queryTheme;
    return config;
  }, [published, data.visual, queryTheme]);
  return <main className="standalone"><TvPlayer content={content} mode="tv" connection={connection}
    lastSync={lastSync} theme={resolveTheme(motion.themeSlug)} motionConfig={motion} /></main>;
}
