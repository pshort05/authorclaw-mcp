import { describe, it, expect, vi } from 'vitest';
import { seriesTools, dispatchSeriesTool } from '../../tools/series.js';

describe('series tools registration', () => {
  it('exposes the four series tools', () => {
    const names = seriesTools.map(t => t.name);
    expect(names).toEqual([
      'authorclaw_series_list',
      'authorclaw_series_create',
      'authorclaw_series_delete',
      'authorclaw_series_report',
    ]);
  });

  it('list schema has no required properties', () => {
    const t = seriesTools.find(t => t.name === 'authorclaw_series_list')!;
    expect(t.inputSchema.required || []).toHaveLength(0);
  });

  it('create schema requires title string', () => {
    const t = seriesTools.find(t => t.name === 'authorclaw_series_create')!;
    expect(t.inputSchema.required).toContain('title');
    expect((t.inputSchema.properties as any).title.type).toBe('string');
  });

  it('delete schema requires id string', () => {
    const t = seriesTools.find(t => t.name === 'authorclaw_series_delete')!;
    expect(t.inputSchema.required).toContain('id');
    expect((t.inputSchema.properties as any).id.type).toBe('string');
  });

  it('report schema requires id string', () => {
    const t = seriesTools.find(t => t.name === 'authorclaw_series_report')!;
    expect(t.inputSchema.required).toContain('id');
    expect((t.inputSchema.properties as any).id.type).toBe('string');
  });
});

describe('dispatchSeriesTool', () => {
  it('list calls client.listSeries and returns JSON', async () => {
    const client = {
      listSeries: vi.fn().mockResolvedValue({ series: [{ id: 's1', title: 'Test Series' }] }),
    } as any;
    const out = await dispatchSeriesTool('authorclaw_series_list', {}, client);
    expect(client.listSeries).toHaveBeenCalled();
    expect(JSON.parse(out.content[0].text)).toEqual({
      series: [{ id: 's1', title: 'Test Series' }],
    });
  });

  it('create calls client.createSeries with data and returns JSON', async () => {
    const client = {
      createSeries: vi
        .fn()
        .mockResolvedValue({ series: { id: 's1', title: 'New Series' } }),
    } as any;
    const out = await dispatchSeriesTool(
      'authorclaw_series_create',
      { title: 'New Series', description: 'A test series' },
      client,
    );
    expect(client.createSeries).toHaveBeenCalledWith({
      title: 'New Series',
      description: 'A test series',
      projectIds: undefined,
      readingOrder: undefined,
    });
    expect(JSON.parse(out.content[0].text)).toEqual({
      series: { id: 's1', title: 'New Series' },
    });
  });

  it('delete calls client.deleteSeries with id and returns JSON', async () => {
    const client = {
      deleteSeries: vi.fn().mockResolvedValue({ success: true }),
    } as any;
    const out = await dispatchSeriesTool('authorclaw_series_delete', { id: 's1' }, client);
    expect(client.deleteSeries).toHaveBeenCalledWith('s1');
    expect(JSON.parse(out.content[0].text)).toEqual({ success: true });
  });

  it('report calls client.getSeriesReport with id and returns JSON', async () => {
    const client = {
      getSeriesReport: vi.fn().mockResolvedValue({ report: 'Series bible data' }),
    } as any;
    const out = await dispatchSeriesTool('authorclaw_series_report', { id: 's1' }, client);
    expect(client.getSeriesReport).toHaveBeenCalledWith('s1');
    expect(JSON.parse(out.content[0].text)).toEqual({ report: 'Series bible data' });
  });

  it('validates title is required for create', async () => {
    const client = { createSeries: vi.fn() } as any;
    await expect(
      dispatchSeriesTool('authorclaw_series_create', { description: 'test' }, client),
    ).rejects.toThrow(/title/);
    expect(client.createSeries).not.toHaveBeenCalled();
  });

  it('validates id is required for delete', async () => {
    const client = { deleteSeries: vi.fn() } as any;
    await expect(
      dispatchSeriesTool('authorclaw_series_delete', {}, client),
    ).rejects.toThrow(/id/);
    expect(client.deleteSeries).not.toHaveBeenCalled();
  });

  it('validates id is required for report', async () => {
    const client = { getSeriesReport: vi.fn() } as any;
    await expect(
      dispatchSeriesTool('authorclaw_series_report', {}, client),
    ).rejects.toThrow(/id/);
    expect(client.getSeriesReport).not.toHaveBeenCalled();
  });

  it('throws on unknown tool name', async () => {
    const client = {} as any;
    await expect(dispatchSeriesTool('nope', {}, client)).rejects.toThrow(/unknown/i);
  });
});
