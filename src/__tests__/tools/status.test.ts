import { describe, it, expect, vi } from 'vitest';
import { statusTools, dispatchStatusTool } from '../../tools/status.js';

describe('status tool', () => {
  it('exposes authorclaw_status', () => {
    expect(statusTools.map(t => t.name)).toEqual(['authorclaw_status']);
  });

  it('returns OK when health returns ok', async () => {
    const client = { health: vi.fn().mockResolvedValue({ status: 'ok' }) } as any;
    const out = await dispatchStatusTool('authorclaw_status', {}, client);
    expect(out.content[0].text).toMatch(/ok/i);
  });

  it('returns degraded text when health throws', async () => {
    const client = { health: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) } as any;
    const out = await dispatchStatusTool('authorclaw_status', {}, client);
    expect(out.content[0].text).toMatch(/unreachable|ECONNREFUSED/);
  });
});
