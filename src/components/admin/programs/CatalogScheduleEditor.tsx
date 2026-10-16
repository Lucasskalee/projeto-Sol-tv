import { useEffect, useState, type FormEvent } from 'react';
import type { TvProgram } from '../../../offers/programs';
import type { Catalog } from '../../../catalogs';
import { fetchCatalogs, subscribeCatalogChanges } from '../../../services/catalogService';
import { getErrorMessage } from '../../../supabase';

export function localDateTime(iso?: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,16);
}
export function CatalogScheduleEditor({ initialProgram, onSave, onCancel, concurrencyConflict, onReloadLatest }: {
  initialProgram: TvProgram; onSave: (program: TvProgram) => Promise<void>;
  onCancel: () => void; concurrencyConflict?: string | null; onReloadLatest: () => void;
}) {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [catalogId, setCatalogId] = useState(initialProgram.catalogId || '');
  const [name, setName] = useState(initialProgram.name);
  const [start, setStart] = useState(localDateTime(initialProgram.startsAt));
  const [end, setEnd] = useState(localDateTime(initialProgram.endsAt));
  const [priority, setPriority] = useState(initialProgram.priority || 50);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let disposed = false;
    const reload = () => fetchCatalogs(initialProgram.store, initialProgram.sector)
      .then(data => { if (!disposed) setCatalogs(data); })
      .catch(err => { if (!disposed) setError(getErrorMessage(err)); });
    void reload(); const unsubscribe = subscribeCatalogChanges(() => { void reload(); });
    return () => { disposed = true; unsubscribe(); };
  }, [initialProgram.store, initialProgram.sector]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const chosen = catalogs.find(c => c.id === catalogId && c.active);
    if (!chosen) { setError('Selecione um catálogo ativo desta loja e setor.'); return; }
    const startsAt = new Date(start); const endsAt = new Date(end);
    if (!Number.isFinite(startsAt.getTime()) || !(endsAt > startsAt)) { setError('O fim deve ser posterior ao início.'); return; }
    const action = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value');
    setBusy(true);
    try {
      await onSave({ ...initialProgram, name: name.trim(), catalogId, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(),
        screens: [], priority, status: action === 'draft' ? 'draft' : 'published',
        schedule: { recurrence: 'date_range', startDate: start.slice(0,10), endDate: end.slice(0,10), startTime: start.slice(11), endTime: end.slice(11) } });
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  }
  return <div className="admin-program-drawer-overlay"><section className="admin-program-drawer" role="dialog" aria-modal="true" aria-label="Programar catálogo">
    <form className="catalog-form" onSubmit={submit}><h2>Programar catálogo</h2><p>{initialProgram.store} · {initialProgram.sector}</p>
      {error && <p role="alert">{error}</p>}
      {concurrencyConflict && <p role="alert">{concurrencyConflict} <button type="button" onClick={onReloadLatest}>Recarregar versão</button></p>}
      <label>Nome da programação<input className="admin-input" required minLength={2} value={name} onChange={e => setName(e.target.value)} /></label>
      <label>Catálogo<select className="admin-input" required value={catalogId} onChange={e => setCatalogId(e.target.value)}><option value="">Selecione</option>{catalogs.filter(c => c.active || c.id === catalogId).map(c => <option key={c.id} value={c.id} disabled={!c.active}>{c.name}{c.active ? '' : ' (inativo)'}</option>)}</select></label>
      <label>Início<input className="admin-input" type="datetime-local" required value={start} onChange={e => setStart(e.target.value)} /></label>
      <label>Fim<input className="admin-input" type="datetime-local" required value={end} onChange={e => setEnd(e.target.value)} /></label>
      <p>Horários em {Intl.DateTimeFormat().resolvedOptions().timeZone}. O catálogo padrão retorna no horário de fim.</p>
      <label>Prioridade (maior vence em sobreposições)<input className="admin-input" type="number" min={1} max={100} required value={priority} onChange={e => setPriority(Number(e.target.value))} /></label>
      <p>Conteúdo e visual serão carregados do catálogo escolhido. Alterações publicadas no catálogo refletem na TV.</p>
      <div className="catalog-actions"><button className="admin-btn-primary" value="published" disabled={busy || !!concurrencyConflict}>Programar</button>
        <button className="admin-btn-secondary" value="draft" disabled={busy || !!concurrencyConflict}>Salvar rascunho</button>
        <button className="admin-btn-secondary" type="button" onClick={onCancel} disabled={busy}>Cancelar</button></div>
    </form></section></div>;
}
