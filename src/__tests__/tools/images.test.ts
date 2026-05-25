import { describe, it, expect, vi } from 'vitest';
import { imageTools, dispatchImageTool } from '../../tools/images.js';

describe('image tools registration', () => {
  it('exposes the three image tools', () => {
    const names = imageTools.map(t => t.name);
    expect(names).toEqual([
      'authorclaw_images_generate',
      'authorclaw_images_book_cover',
      'authorclaw_images_cover_set',
    ]);
  });

  it('generate schema requires prompt string', () => {
    const t = imageTools.find(t => t.name === 'authorclaw_images_generate')!;
    expect(t.inputSchema.required).toContain('prompt');
    expect((t.inputSchema.properties as any).prompt.type).toBe('string');
  });

  it('book_cover schema requires description string', () => {
    const t = imageTools.find(t => t.name === 'authorclaw_images_book_cover')!;
    expect(t.inputSchema.required).toContain('description');
    expect((t.inputSchema.properties as any).description.type).toBe('string');
  });

  it('cover_set schema requires description string', () => {
    const t = imageTools.find(t => t.name === 'authorclaw_images_cover_set')!;
    expect(t.inputSchema.required).toContain('description');
    expect((t.inputSchema.properties as any).description.type).toBe('string');
  });

  it('book_cover has quality enum', () => {
    const t = imageTools.find(t => t.name === 'authorclaw_images_book_cover')!;
    const quality = (t.inputSchema.properties as any).quality;
    expect(quality.enum).toEqual(['standard', 'hd']);
  });
});

describe('dispatchImageTool', () => {
  it('generate calls client.generateImage with prompt and options and returns JSON', async () => {
    const client = {
      generateImage: vi
        .fn()
        .mockResolvedValue({ filename: 'image.png', url: 'http://example.com/image.png' }),
    } as any;
    const out = await dispatchImageTool(
      'authorclaw_images_generate',
      { prompt: 'a beautiful sunset', style: 'photorealistic' },
      client,
    );
    expect(client.generateImage).toHaveBeenCalledWith('a beautiful sunset', {
      provider: undefined,
      width: undefined,
      height: undefined,
      style: 'photorealistic',
    });
    expect(JSON.parse(out.content[0].text)).toEqual({
      filename: 'image.png',
      url: 'http://example.com/image.png',
    });
  });

  it('book_cover calls client.generateBookCover with description and options and returns JSON', async () => {
    const client = {
      generateBookCover: vi
        .fn()
        .mockResolvedValue({ filename: 'cover.png', url: 'http://example.com/cover.png' }),
    } as any;
    const out = await dispatchImageTool(
      'authorclaw_images_book_cover',
      { description: 'dark forest at night', title: 'The Dark Path', genre: 'dark fantasy' },
      client,
    );
    expect(client.generateBookCover).toHaveBeenCalledWith('dark forest at night', expect.any(Object));
    expect(JSON.parse(out.content[0].text)).toEqual({
      filename: 'cover.png',
      url: 'http://example.com/cover.png',
    });
  });

  it('cover_set calls client.generateCoverSet with description and options and returns JSON', async () => {
    const client = {
      generateCoverSet: vi
        .fn()
        .mockResolvedValue({ variants: [{ size: 'ebook', filename: 'cover_ebook.png' }] }),
    } as any;
    const out = await dispatchImageTool(
      'authorclaw_images_cover_set',
      { description: 'dark forest at night', title: 'The Dark Path' },
      client,
    );
    expect(client.generateCoverSet).toHaveBeenCalledWith('dark forest at night', expect.any(Object));
    expect(JSON.parse(out.content[0].text)).toEqual({
      variants: [{ size: 'ebook', filename: 'cover_ebook.png' }],
    });
  });

  it('validates prompt is required for generate', async () => {
    const client = { generateImage: vi.fn() } as any;
    await expect(
      dispatchImageTool('authorclaw_images_generate', { style: 'photorealistic' }, client),
    ).rejects.toThrow(/prompt/);
    expect(client.generateImage).not.toHaveBeenCalled();
  });

  it('validates description is required for book_cover', async () => {
    const client = { generateBookCover: vi.fn() } as any;
    await expect(
      dispatchImageTool('authorclaw_images_book_cover', { title: 'Test' }, client),
    ).rejects.toThrow(/description/);
    expect(client.generateBookCover).not.toHaveBeenCalled();
  });

  it('validates description is required for cover_set', async () => {
    const client = { generateCoverSet: vi.fn() } as any;
    await expect(
      dispatchImageTool('authorclaw_images_cover_set', { title: 'Test' }, client),
    ).rejects.toThrow(/description/);
    expect(client.generateCoverSet).not.toHaveBeenCalled();
  });

  it('throws on unknown tool name', async () => {
    const client = {} as any;
    await expect(dispatchImageTool('nope', {}, client)).rejects.toThrow(/unknown/i);
  });
});
