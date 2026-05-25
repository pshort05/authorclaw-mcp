import { describe, it, expect, vi } from 'vitest';
import { researchTools, dispatchResearchTool } from '../../tools/research.js';

describe('research tool', () => {
  it('exposes authorclaw_research', () => {
    expect(researchTools.map(t => t.name)).toEqual(['authorclaw_research']);
  });

  it('calls client.research and returns summary text', async () => {
    const client = {
      research: vi.fn().mockResolvedValue({ summary: 'A short brief.' }),
    } as any;
    const out = await dispatchResearchTool(
      'authorclaw_research',
      { topic: 'aviation history' },
      client,
    );
    expect(client.research).toHaveBeenCalledWith('aviation history');
    expect(out.content[0].text).toBe('A short brief.');
  });

  it('validates topic', async () => {
    const client = { research: vi.fn() } as any;
    await expect(
      dispatchResearchTool('authorclaw_research', {}, client),
    ).rejects.toThrow(/topic/);
  });
});
