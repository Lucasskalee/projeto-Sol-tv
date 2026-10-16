import { useEffect, useState, type FormEvent } from 'react';
import type { Offer, SolTvMedia, TvContent } from '../../../types';
import type { OfferComposition } from '../../../offers/compositions';
import { CatalogEditor } from './CatalogEditor';
import { CatalogPreviewModal } from './CatalogPreviewModal';
import { catalogToContent, type Catalog, type CatalogItem, type CatalogVisual } from '../../../catalogs';
import { fetchCatalogs, fetchCatalogItems, fetchCatalogVisual, saveCatalog, setDefaultCatalog,
  saveCatalogItem, removeCatalogItem, saveCatalogComposition, saveCatalogVisual,
  loadCatalogLibrary, subscribeCatalogChanges } from '../../../services/catalogService';
import { getErrorMessage, loadVisualConfig } from '../../../supabase';
import { DEFAULT_PRESETS } from '../../../motion/presets';
import { cloneMotionConfig, DEFAULT_MOTION_CONFIG } from '../../../motion/defaults';

export interface CatalogManagerProps {
  store?: string; sector: string; sectorLabel?: string;
  offers: readonly Offer[]; media: readonly SolTvMedia[]; compositions?: readonly OfferComposition[];
  hidePreview?: boolean;
  onSaveComposition?: (comp: OfferComposition) => Promise<void> | void;
  onDeleteComposition?: (id: string) => Promise<void> | void;
  onReorderCompositions?: (compositions: OfferComposition[]) => Promise<void> | void;
}
export function CatalogManager({ store = 'Loja 01', sector, sectorLabel = sector }: CatalogManagerProps) {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [library, setLibrary] = useState<TvContent | null>(null);
  const [visual, setVisual] = useState<CatalogVisual | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const [revision, setRevision] = useState(0);
  const catalog = catalogs.find(c => c.id === selected);

  useEffect(() => {
    let disposed = false;
    let sequence = 0;
    const reload = async () => {
      const request = ++sequence;
      try {
        const [list, content, links, config] = await Promise.all([
          fetchCatalogs(store, sector), loadCatalogLibrary(sector),
          selected ? fetchCatalogItems(selected) : Promise.resolve([]),
          selected ? fetchCatalogVisual(selected) : Promise.resolve(null),
        ]);
        if (disposed || request !== sequence) return;
        setCatalogs(list); setLibrary(content); setItems(links); setVisual(config);
      } catch (err) { if (!disposed) setError(getErrorMessage(err)); }
    };
    void reload();
    const unsubscribe = subscribeCatalogChanges(() => { void reload(); }, true);
    return () => { disposed = true; unsubscribe(); };
  }, [store, sector, selected, revision]);

  async function run(action: () => Promise<void>) {
    setBusy(true); setError('');
    try { await action(); setRevision(r => r + 1); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  }
  async function create(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const created = await saveCatalog({ store, sector, name, description, active: true, is_default: false });
      setCatalogs(prev => [...prev, created]); setSelected(created.id); setCreating(false);
      // Capture the published sector visual, not an editor's localStorage draft.
      const initial = await loadVisualConfig(sector);
      await saveCatalogVisual(created.id, sector, initial.publishedConfig, true);
    });
  }
  async function saveScreen(comp: OfferComposition) {
    if (!catalog) return;
    const existing = items.find(i => i.composition_id === comp.id);
    await saveCatalogComposition(catalog.id, { ...comp, position: existing?.position ?? items.length });
    setRevision(r => r + 1);
  }
  const selectedContent = catalog && library ? catalogToContent(catalog, items.map(i => ({ ...i, active: true })), library) : null;
  const screens = (library?.compositions || []).filter(c => items.some(i => i.composition_id === c.id))
    .map(c => ({ ...c, position: items.find(i => i.composition_id === c.id)!.position }))
    .sort((a,b) => a.position - b.position);

  return <div className="catalog-workspace">
    {error && <div role="alert" className="toast-inline error">{error}</div>}
    <fieldset disabled={busy} className="catalog-fieldset">
      {!catalog ? <>
        <div className="admin-page-header"><div><h1 className="admin-page-title">CATÁLOGOS</h1>
          <p>{store} · {sectorLabel}</p></div>
          <button className="admin-btn-primary" onClick={() => { setName(''); setDescription(''); setCreating(true); }}>+ Novo Catálogo</button></div>
        {creating && <form onSubmit={create} className="admin-card catalog-form">
          <label>Nome<input className="admin-input" value={name} onChange={e => setName(e.target.value)} required maxLength={120} /></label>
          <label>Descrição<textarea className="admin-input" value={description} onChange={e => setDescription(e.target.value)} /></label>
          <button className="admin-btn-primary" type="submit">Criar catálogo</button>
          <button className="admin-btn-secondary" type="button" onClick={() => setCreating(false)}>Cancelar</button>
        </form>}
        <div className="admin-catalog-grid">{catalogs.map(c => <article className="admin-card catalog-form" key={c.id}>
          <h2>{c.name}</h2><p>{c.description}</p><p>{c.active ? 'Ativo' : 'Inativo'}{c.is_default ? ' · Padrão da TV' : ''}</p>
          <button className="admin-btn-primary" onClick={() => { setSelected(c.id); setItems([]); setVisual(null); }}>Editar catálogo</button>
        </article>)}</div>
        {!catalogs.length && !error && <p>Nenhum catálogo cadastrado. A TV continua usando o conteúdo atual do setor.</p>}
      </> : <>
        <div className="admin-card catalog-form">
          <form onSubmit={e => { e.preventDefault(); const values = new FormData(e.currentTarget); void run(async () => { await saveCatalog({ ...catalog, name: String(values.get('name')), description: String(values.get('description')) }); }); }} key={catalog.id + catalog.updated_at}>
            <label>Nome<input className="admin-input" name="name" defaultValue={catalog.name} required /></label>
            <label>Descrição<textarea className="admin-input" name="description" defaultValue={catalog.description} /></label>
            <button className="admin-btn-secondary">Salvar nome e descrição</button>
          </form>
          <div className="catalog-actions">
            <button className="admin-btn-secondary" disabled={!catalog.active || catalog.is_default} onClick={() => void run(() => setDefaultCatalog(catalog.id))}>{catalog.is_default ? 'Catálogo padrão' : 'Definir como padrão'}</button>
            <button className="admin-btn-secondary" onClick={() => void run(async () => { await saveCatalog({ ...catalog, active: !catalog.active, is_default: catalog.active ? false : catalog.is_default }); })}>{catalog.active ? 'Inativar catálogo' : 'Ativar catálogo'}</button>
            <button className="admin-btn-secondary" onClick={() => setPreview(true)}>Prévia completa</button>
          </div>
          <label>Tema / preset<select className="admin-input" defaultValue="" onChange={e => {
            const preset = DEFAULT_PRESETS.find(p => p.id === e.target.value);
            if (preset) void run(() => saveCatalogVisual(catalog.id, sector, preset.config, true));
          }}><option value="" disabled>Selecionar preset para este catálogo</option>{DEFAULT_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <p>Visual publicado: {visual?.published_config?.themeSlug || 'herdado do setor'} · versão {visual?.published_version || 0}</p>
          <a className="admin-btn-secondary" href={`/studio/motion?catalog=${catalog.id}`}>Editar cores, animações e layout no Motion Studio</a>
        </div>
        <CatalogEditor catalogId={catalog.id} catalogTitle={catalog.name} sector={sector} sectorLabel={sectorLabel}
          offers={library?.offers || []} media={[]} compositions={screens} onBackToList={() => setSelected(null)}
          onSaveComposition={saveScreen}
          onDeleteComposition={async id => { const item = items.find(i => i.composition_id === id); if (item) await removeCatalogItem(item.id); setRevision(r => r + 1); }}
          onReorderCompositions={async reordered => {
            const positions = screens.map(c => c.position).sort((a,b) => a-b);
            for (const [index, c] of reordered.entries()) { const item = items.find(i => i.composition_id === c.id); if (item) await saveCatalogItem({ ...item, position: positions[index] }); }
            setRevision(r => r + 1);
          }} />
        <section className="admin-card catalog-form"><h2>Sequência completa</h2>
          <label>Adicionar produto ou mídia<select className="admin-input" value="" onChange={e => {
            const [kind,id] = e.target.value.split(':');
            void run(() => saveCatalogItem({ catalog_id: catalog.id, composition_id: null, offer_id: kind === 'offer' ? id : null, media_id: kind === 'media' ? id : null, active: true, position: items.length }));
          }}><option value="">Selecione um item</option>
            {(library?.offers || []).filter(o => !items.some(i => i.offer_id === o.id)).map(o => <option key={o.id} value={`offer:${o.id}`}>{o.name}</option>)}
            {(library?.media || []).filter(m => !items.some(i => i.media_id === m.id)).map(m => <option key={m.id} value={`media:${m.id}`}>{m.title || m.type}</option>)}
          </select></label>
          {items.map((item,index) => <div className="catalog-actions" key={item.id}>
            <span>{index + 1}. {library?.offers.find(o => o.id === item.offer_id)?.name || library?.media.find(m => m.id === item.media_id)?.title || 'Tela de produtos'}</span>
            <button className="admin-btn-secondary" disabled={!index} onClick={() => void run(async () => {
              const reordered = [...items]; [reordered[index-1],reordered[index]] = [reordered[index],reordered[index-1]];
              for (const [position, entry] of reordered.entries()) await saveCatalogItem({ ...entry, position });
            })}>Subir</button>
            <button className="admin-btn-secondary" onClick={() => void run(() => saveCatalogItem({ ...item, active: !item.active }))}>{item.active ? 'Ocultar' : 'Mostrar'}</button>
            <button className="admin-btn-secondary" onClick={() => void run(() => removeCatalogItem(item.id))}>Remover</button>
          </div>)}
        </section>
        {preview && selectedContent && <CatalogPreviewModal isOpen catalogTitle={catalog.name} sector={sector} sectorLabel={sectorLabel}
          compositions={selectedContent.compositions} offers={selectedContent.offers} media={selectedContent.media}
          contentOverride={catalogToContent(catalog, items, library!)} motionConfig={cloneMotionConfig(visual?.published_config || DEFAULT_MOTION_CONFIG)} onClose={() => setPreview(false)} />}
      </>}
    </fieldset>
  </div>;
}
