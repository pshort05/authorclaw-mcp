import { describe, it, expect, vi } from 'vitest';
import { audioTools, dispatchAudioTool } from '../../tools/audio.js';

describe('audio tools registration', () => {
  it('exposes the three audio tools', () => {
    const names = audioTools.map(t => t.name);
    expect(names).toEqual(['authorclaw_audio_voices', 'authorclaw_audio_generate', 'authorclaw_audio_get']);
  });

  it('voices schema has no required properties', () => {
    const t = audioTools.find(t => t.name === 'authorclaw_audio_voices')!;
    expect(t.inputSchema.required || []).toHaveLength(0);
  });

  it('generate schema requires text string', () => {
    const t = audioTools.find(t => t.name === 'authorclaw_audio_generate')!;
    expect(t.inputSchema.required).toContain('text');
    expect((t.inputSchema.properties as any).text.type).toBe('string');
  });

  it('generate schema has provider enum', () => {
    const t = audioTools.find(t => t.name === 'authorclaw_audio_generate')!;
    const provider = (t.inputSchema.properties as any).provider;
    expect(provider.enum).toEqual(['edge', 'elevenlabs']);
  });

  it('get schema requires filename string', () => {
    const t = audioTools.find(t => t.name === 'authorclaw_audio_get')!;
    expect(t.inputSchema.required).toContain('filename');
    expect((t.inputSchema.properties as any).filename.type).toBe('string');
  });
});

describe('dispatchAudioTool', () => {
  it('voices calls client.listVoices and returns JSON', async () => {
    const client = {
      listVoices: vi.fn().mockResolvedValue({ activeProvider: 'edge', presets: [] }),
    } as any;
    const out = await dispatchAudioTool('authorclaw_audio_voices', {}, client);
    expect(client.listVoices).toHaveBeenCalled();
    expect(JSON.parse(out.content[0].text)).toEqual({ activeProvider: 'edge', presets: [] });
  });

  it('generate calls client.generateAudio with text and options and returns JSON', async () => {
    const client = {
      generateAudio: vi
        .fn()
        .mockResolvedValue({ success: true, filename: 'audio.mp3', duration: 30 }),
    } as any;
    const out = await dispatchAudioTool(
      'authorclaw_audio_generate',
      { text: 'Hello world', voice: 'narrator_male' },
      client,
    );
    expect(client.generateAudio).toHaveBeenCalledWith('Hello world', {
      voice: 'narrator_male',
      provider: undefined,
      personaId: undefined,
      projectId: undefined,
    });
    expect(JSON.parse(out.content[0].text)).toEqual({
      success: true,
      filename: 'audio.mp3',
      duration: 30,
    });
  });

  it('get calls client.getAudioFile and returns URL', async () => {
    const client = {
      getAudioFile: vi.fn().mockResolvedValue('http://localhost:3847/api/audio/file/audio.mp3'),
    } as any;
    const out = await dispatchAudioTool('authorclaw_audio_get', { filename: 'audio.mp3' }, client);
    expect(client.getAudioFile).toHaveBeenCalledWith('audio.mp3');
    expect(JSON.parse(out.content[0].text)).toEqual({
      url: 'http://localhost:3847/api/audio/file/audio.mp3',
    });
  });

  it('validates text is required for generate', async () => {
    const client = { generateAudio: vi.fn() } as any;
    await expect(
      dispatchAudioTool('authorclaw_audio_generate', { voice: 'narrator_male' }, client),
    ).rejects.toThrow(/text/);
    expect(client.generateAudio).not.toHaveBeenCalled();
  });

  it('validates filename is required for get', async () => {
    const client = { getAudioFile: vi.fn() } as any;
    await expect(dispatchAudioTool('authorclaw_audio_get', {}, client)).rejects.toThrow(/filename/);
    expect(client.getAudioFile).not.toHaveBeenCalled();
  });

  it('throws on unknown tool name', async () => {
    const client = {} as any;
    await expect(dispatchAudioTool('nope', {}, client)).rejects.toThrow(/unknown/i);
  });
});
