import { describe, it, expect, vi } from 'vitest';
import { personaTools, dispatchPersonaTool } from '../../tools/personas.js';

describe('persona tools registration', () => {
  it('exposes the six persona tools', () => {
    const names = personaTools.map(t => t.name);
    expect(names).toEqual([
      'authorclaw_personas_list',
      'authorclaw_personas_create',
      'authorclaw_personas_generate',
      'authorclaw_personas_get',
      'authorclaw_personas_update',
      'authorclaw_personas_delete',
    ]);
  });

  it('personas_list schema has no required fields', () => {
    const t = personaTools.find(t => t.name === 'authorclaw_personas_list')!;
    expect(t.inputSchema.required || []).toHaveLength(0);
  });

  it('personas_create schema requires pen_name string', () => {
    const t = personaTools.find(t => t.name === 'authorclaw_personas_create')!;
    expect(t.inputSchema.required).toContain('pen_name');
    expect((t.inputSchema.properties as any).pen_name.type).toBe('string');
  });

  it('personas_generate schema requires genre string', () => {
    const t = personaTools.find(t => t.name === 'authorclaw_personas_generate')!;
    expect(t.inputSchema.required).toContain('genre');
    expect((t.inputSchema.properties as any).genre.type).toBe('string');
  });

  it('personas_get schema requires id string', () => {
    const t = personaTools.find(t => t.name === 'authorclaw_personas_get')!;
    expect(t.inputSchema.required).toContain('id');
    expect((t.inputSchema.properties as any).id.type).toBe('string');
  });

  it('personas_update schema requires id string', () => {
    const t = personaTools.find(t => t.name === 'authorclaw_personas_update')!;
    expect(t.inputSchema.required).toContain('id');
    expect((t.inputSchema.properties as any).id.type).toBe('string');
  });

  it('personas_delete schema requires id string', () => {
    const t = personaTools.find(t => t.name === 'authorclaw_personas_delete')!;
    expect(t.inputSchema.required).toContain('id');
    expect((t.inputSchema.properties as any).id.type).toBe('string');
  });
});

describe('dispatchPersonaTool', () => {
  it('personas_list calls client.listPersonas and returns JSON text', async () => {
    const client = { listPersonas: vi.fn().mockResolvedValue({ personas: [{ id: 'p1' }] }) } as any;
    const out = await dispatchPersonaTool('authorclaw_personas_list', {}, client);
    expect(client.listPersonas).toHaveBeenCalled();
    expect(JSON.parse(out.content[0].text)).toEqual({ personas: [{ id: 'p1' }] });
  });

  it('personas_create calls client.createPersona with pen_name and returns JSON', async () => {
    const client = {
      createPersona: vi.fn().mockResolvedValue({ id: 'per1', penName: 'Jane Doe' }),
    } as any;
    const out = await dispatchPersonaTool(
      'authorclaw_personas_create',
      { pen_name: 'Jane Doe', genre: 'romance' },
      client,
    );
    expect(client.createPersona).toHaveBeenCalledWith(expect.objectContaining({ penName: 'Jane Doe', genre: 'romance' }));
    expect(JSON.parse(out.content[0].text)).toEqual({ id: 'per1', penName: 'Jane Doe' });
  });

  it('personas_create validates pen_name is required', async () => {
    const client = { createPersona: vi.fn() } as any;
    await expect(
      dispatchPersonaTool('authorclaw_personas_create', { genre: 'romance' }, client),
    ).rejects.toThrow(/pen_name/);
    expect(client.createPersona).not.toHaveBeenCalled();
  });

  it('personas_generate calls client.generatePersona with genre and description', async () => {
    const client = {
      generatePersona: vi.fn().mockResolvedValue({ id: 'per2', penName: 'Generated Author' }),
    } as any;
    const out = await dispatchPersonaTool(
      'authorclaw_personas_generate',
      { genre: 'sci-fi', description: 'gritty future noir' },
      client,
    );
    expect(client.generatePersona).toHaveBeenCalledWith('sci-fi', 'gritty future noir');
    expect(JSON.parse(out.content[0].text)).toEqual({ id: 'per2', penName: 'Generated Author' });
  });

  it('personas_generate validates genre is required', async () => {
    const client = { generatePersona: vi.fn() } as any;
    await expect(
      dispatchPersonaTool('authorclaw_personas_generate', { description: 'some text' }, client),
    ).rejects.toThrow(/genre/);
    expect(client.generatePersona).not.toHaveBeenCalled();
  });

  it('personas_get calls client.getPersona and returns JSON', async () => {
    const client = {
      getPersona: vi.fn().mockResolvedValue({ id: 'per1', penName: 'Jane Doe' }),
    } as any;
    const out = await dispatchPersonaTool('authorclaw_personas_get', { id: 'per1' }, client);
    expect(client.getPersona).toHaveBeenCalledWith('per1');
    expect(JSON.parse(out.content[0].text)).toEqual({ id: 'per1', penName: 'Jane Doe' });
  });

  it('personas_get validates id is required', async () => {
    const client = { getPersona: vi.fn() } as any;
    await expect(
      dispatchPersonaTool('authorclaw_personas_get', {}, client),
    ).rejects.toThrow(/id/);
    expect(client.getPersona).not.toHaveBeenCalled();
  });

  it('personas_update calls client.updatePersona with id and update data', async () => {
    const client = {
      updatePersona: vi.fn().mockResolvedValue({ id: 'per1', penName: 'Jane Doe Updated' }),
    } as any;
    const out = await dispatchPersonaTool(
      'authorclaw_personas_update',
      { id: 'per1', pen_name: 'Jane Doe Updated', tts_voice: 'en-US-AriaNeural' },
      client,
    );
    expect(client.updatePersona).toHaveBeenCalledWith(
      'per1',
      expect.objectContaining({ penName: 'Jane Doe Updated', ttsVoice: 'en-US-AriaNeural' }),
    );
    expect(JSON.parse(out.content[0].text)).toEqual({ id: 'per1', penName: 'Jane Doe Updated' });
  });

  it('personas_update validates id is required', async () => {
    const client = { updatePersona: vi.fn() } as any;
    await expect(
      dispatchPersonaTool('authorclaw_personas_update', { pen_name: 'New Name' }, client),
    ).rejects.toThrow(/id/);
    expect(client.updatePersona).not.toHaveBeenCalled();
  });

  it('personas_delete calls client.deletePersona and returns JSON', async () => {
    const client = {
      deletePersona: vi.fn().mockResolvedValue({ success: true }),
    } as any;
    const out = await dispatchPersonaTool('authorclaw_personas_delete', { id: 'per1' }, client);
    expect(client.deletePersona).toHaveBeenCalledWith('per1');
    expect(JSON.parse(out.content[0].text)).toEqual({ success: true });
  });

  it('personas_delete validates id is required', async () => {
    const client = { deletePersona: vi.fn() } as any;
    await expect(
      dispatchPersonaTool('authorclaw_personas_delete', {}, client),
    ).rejects.toThrow(/id/);
    expect(client.deletePersona).not.toHaveBeenCalled();
  });

  it('throws on unknown tool name', async () => {
    const client = {} as any;
    await expect(dispatchPersonaTool('nope', {}, client)).rejects.toThrow(/unknown/i);
  });
});
