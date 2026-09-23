import { describe, expect, it } from 'vitest';
import { catalogToContent, resolveCatalog, type Catalog, type CatalogSnapshot } from './catalogs';
import { createNewProgram, calculateProgramStatus } from './offers/programs';
import { serializeProgram, deserializeProgram } from './services/programService';
import { newOffer } from './data';
import type { TvContent } from './types';

const base: Catalog = { id: 'default', store: 'Loja 03', sector: 'acougue', name: 'Ofertas', description: '', active: true, is_default: true, created_at: '', updated_at: '' };
const campaign: Catalog = { ...base, id: 'black-friday', is_default: false };
const program = { ...createNewProgram('acougue', 'Loja 03'), catalogId: campaign.id, status: 'published' as const,
  startsAt: '2026-11-27T00:00:00-03:00', endsAt: '2026-12-01T00:00:00-03:00', schedule: { recurrence: 'date_range' as const } };
const snapshot: CatalogSnapshot = { catalogs: [base, campaign], programs: [program], items: [], visuals: [] };

describe('catalog playback resolution', () => {
  it('uses exact UTC start/end boundaries and default outside the continuous period', () => {
    expect(resolveCatalog(snapshot, 'Loja 03', 'acougue', Date.parse(program.startsAt)-1)?.id).toBe(base.id);
    expect(resolveCatalog(snapshot, 'Loja 03', 'acougue', Date.parse(program.startsAt))?.id).toBe(campaign.id);
    expect(resolveCatalog(snapshot, 'Loja 03', 'acougue', Date.parse('2026-11-29T03:30:00Z'))?.id).toBe(campaign.id);
    expect(resolveCatalog(snapshot, 'Loja 03', 'acougue', Date.parse(program.endsAt))?.id).toBe(base.id);
    expect(calculateProgramStatus(program, new Date(program.endsAt))).toBe('ended');
  });
  it('isolates store/sector and ignores disabled, draft, missing and inactive catalogs', () => {
    const now = Date.parse(program.startsAt);
    expect(resolveCatalog(snapshot, 'Loja 02', 'acougue', now)).toBeNull();
    expect(resolveCatalog(snapshot, 'Loja 03', 'padaria', now)).toBeNull();
    for (const status of ['draft', 'disabled'] as const) expect(resolveCatalog({ ...snapshot, programs: [{ ...program, status }] }, 'Loja 03', 'acougue', now)?.id).toBe(base.id);
    expect(resolveCatalog({ ...snapshot, catalogs: [base] }, 'Loja 03', 'acougue', now)?.id).toBe(base.id);
    expect(resolveCatalog({ ...snapshot, catalogs: [base, { ...campaign, active: false }] }, 'Loja 03', 'acougue', now)?.id).toBe(base.id);
  });
  it('breaks overlaps by priority, update timestamp and ID, independently of input ordering', () => {
    const other = { ...campaign, id: 'other' };
    const p2 = { ...program, id: 'aaa', catalogId: other.id, priority: 90 };
    const s = { ...snapshot, catalogs: [...snapshot.catalogs, other], programs: [program,p2] };
    expect(resolveCatalog(s, ' loja 03 ', 'ACOUGUE', Date.parse(program.startsAt))?.id).toBe(other.id);
    expect(resolveCatalog({ ...s, programs: [p2,program] }, 'Loja 03', 'acougue', Date.parse(program.startsAt))?.id).toBe(other.id);
  });
  it('does not synthesize unrelated offers for an empty catalog', () => {
    const offer = { ...newOffer(), id: 'product', name: 'Updated product' };
    const library: TvContent = { sector: 'acougue', offers: [offer], media: [], compositions: [], playlist: [], publishedAt: '' };
    expect(catalogToContent(base, [], library).playlist).toEqual([]);
    const item = { id: 'item', catalog_id: base.id, active: true, position: 0, offer_id: offer.id, composition_id: null, media_id: null };
    const content = catalogToContent(base, [item], library);
    expect(content.offers[0].name).toBe('Updated product');
    expect(catalogToContent(base, [item], { ...library, offers: [] }).playlist).toEqual([]);
    expect(catalogToContent(base, [{ ...item, active: false }], library).playlist).toEqual([]);
  });
  it('round-trips catalog references without copying product screens into Agenda', () => {
    const serialized = serializeProgram({ ...program, screens: [{ id: 's', kind: 'layout', position: 0, duration: 8, active: true, offers: [newOffer()] }] });
    expect(serialized.screens).toEqual([]);
    expect(deserializeProgram(serialized)?.catalogId).toBe(campaign.id);
    expect(deserializeProgram(serialized)?.startsAt).toBe(program.startsAt);
  });
});
