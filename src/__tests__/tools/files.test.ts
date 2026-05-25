import { describe, it, expect, vi } from 'vitest';
import { fileTools, dispatchFileTool } from '../../tools/files.js';

describe('file tools registration', () => {
  it('exposes list/read/export', () => {
    const names = fileTools.map(t => t.name);
    expect(names).toEqual([
      'authorclaw_files_list',
      'authorclaw_files_read',
      'authorclaw_files_export',
    ]);
  });
});

describe('dispatchFileTool', () => {
  it('files_list calls client.listFiles with optional folder', async () => {
    const client = { listFiles: vi.fn().mockResolvedValue([]) } as any;
    await dispatchFileTool('authorclaw_files_list', { folder: 'projects' }, client);
    expect(client.listFiles).toHaveBeenCalledWith('projects');
  });

  it('files_list with no folder calls listFiles()', async () => {
    const client = { listFiles: vi.fn().mockResolvedValue([]) } as any;
    await dispatchFileTool('authorclaw_files_list', {}, client);
    expect(client.listFiles).toHaveBeenCalledWith(undefined);
  });

  it('files_read calls client.readFile and returns content', async () => {
    const client = { readFile: vi.fn().mockResolvedValue({ content: 'body' }) } as any;
    const out = await dispatchFileTool('authorclaw_files_read', { name: 'a.md' }, client);
    expect(client.readFile).toHaveBeenCalledWith('a.md');
    expect(out.content[0].text).toBe('body');
  });

  it('files_export validates format enum', async () => {
    const client = { exportFile: vi.fn() } as any;
    await expect(
      dispatchFileTool('authorclaw_files_export', { name: 'a', format: 'pdf' }, client),
    ).rejects.toThrow(/format/);
  });

  it('files_export calls client.exportFile and returns the URL', async () => {
    const client = {
      exportFile: vi.fn().mockResolvedValue({ url: '/d/a.docx' }),
    } as any;
    const out = await dispatchFileTool(
      'authorclaw_files_export',
      { name: 'a', format: 'docx' },
      client,
    );
    expect(client.exportFile).toHaveBeenCalledWith('a', 'docx');
    expect(out.content[0].text).toContain('/d/a.docx');
  });
});
