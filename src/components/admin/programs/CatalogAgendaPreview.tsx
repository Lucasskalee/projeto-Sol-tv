import { useEffect, useState } from 'react';
import { catalogToContent, resolveCatalog, type CatalogSnapshot } from '../../../catalogs';
import { fetchCatalogSnapshot, loadCatalogLibrary, subscribeCatalogChanges } from '../../../services/catalogService';
import { loadVisualConfig, getErrorMessage } from '../../../supabase';
import type { TvContent } from '../../../types';
import type { MotionConfig } from '../../../motion/types';
import { cloneMotionConfig, DEFAULT_MOTION_CONFIG } from '../../../motion/defaults';
import { resolveTheme } from '../../../themes/resolveTheme';
import { TvPlayer } from '../../TvPlayer';
import { localDateTime } from './CatalogScheduleEditor';

export function CatalogAgendaPreview({ store, sector, catalogId, onClose }: {
  store: string; sector: string; catalogId?: string; onClose: () => void;
}) {
  const [date, setDate] = useState(localDateTime(new Date().toISOString()));
  const [data, setData] = useState<{ snapshot: CatalogSnapshot; library: TvContent; visual: MotionConfig } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let disposed = false;
    const reload = async () => {
      try {
        const [snapshot, library, visual] = await Promise.all([fetchCatalogSnapshot(store, sector), loadCatalogLibrary(sector), loadVisualConfig(sector)]);
        if (!disposed) setData({ snapshot, library, visual: visual.publishedConfig });
      } catch (err) { if (!disposed) setError(getErrorMessage(err)); }
    };
    void reload(); const unsubscribe = subscribeCatalogChanges(() => { void reload(); }, true);
    return () => { disposed = true; unsubscribe(); };
  }, [store, sector]);
  const catalog = data && (catalogId ? data.snapshot.catalogs.find(c => c.id === catalogId) : resolveCatalog(data.snapshot, store, sector, new Date(date).getTime()));
  const visual = cloneMotionConfig(data?.snapshot.visuals.find(v => v.catalog_id === catalog?.id)?.published_config || data?.visual || DEFAULT_MOTION_CONFIG);
  return <div className="program-tester-modal-overlay"><section className="program-tester-modal" role="dialog" aria-modal="true" aria-label="Simular catálogo">
    <div className="catalog-form"><div className="catalog-actions"><h2>{catalogId ? 'Prévia do catálogo' : 'Simular Agenda'}</h2><button className="admin-btn-secondary" onClick={onClose}>Fechar</button></div>
      <p>{store} · {sector}</p>
      {!catalogId && <label>Data e hora da simulação<input type="datetime-local" className="admin-input" value={date} onChange={e => setDate(e.target.value)} /></label>}
      {error && <p role="alert">{error}</p>}<p>{catalog?.name || 'Nenhum catálogo ativo: a TV usa o conteúdo legado do setor.'}</p>
    </div>
    {data && catalog && <div className="tester-player-body"><div className="tester-player-wrapper"><TvPlayer
      content={catalogToContent(catalog, data.snapshot.items, data.library)} mode="preview" theme={resolveTheme(visual.themeSlug)} motionConfig={visual} /></div></div>}
  </section></div>;
}
