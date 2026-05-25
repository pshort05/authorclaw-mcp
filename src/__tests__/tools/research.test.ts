import { describe, it, expect, vi } from 'vitest';
import { researchTools, dispatchResearchTool } from '../../tools/research.js';

describe('research tool', () => {
  it('exposes authorclaw_research', () => {
    expect(researchTools.map(t => t.name)).toEqual(['authorclaw_research']);
  });

  it('schema uses query field (not topic)', () => {
    const tool = researchTools[0];
    expect(tool.inputSchema.required).toContain('query');
    expect(tool.inputSchema.properties).toHaveProperty('query');
  });

  it('calls client.research with query and returns JSON results', async () => {
    const mockResult = { results: [{ title: 'Test', url: 'http://ex.com' }], totalFound: 1 };
    const client = {
      research: vi.fn().mockResolvedValue(mockResult),
    } as any;
    const out = await dispatchResearchTool(
      'authorclaw_research',
      { query: 'aviation history' },
      client,
    );
    expect(client.research).toHaveBeenCalledWith('aviation history');
    expect(JSON.parse(out.content[0].text)).toEqual(mockResult);
  });

  it('validates query is required', async () => {
    const client = { research: vi.fn() } as any;
    await expect(
      dispatchResearchTool('authorclaw_research', {}, client),
    ).rejects.toThrow(/query/);
  });
});
