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

  it('files_read requires project_id and filename', () => {
    const readTool = fileTools.find(t => t.name === 'authorclaw_files_read');
    expect(readTool?.inputSchema.required).toContain('project_id');
    expect(readTool?.inputSchema.required).toContain('filename');
  });

  it('files_export requires project_id and filename', () => {
    const exportTool = fileTools.find(t => t.name === 'authorclaw_files_export');
    expect(exportTool?.inputSchema.required).toContain('project_id');
    expect(exportTool?.inputSchema.required).toContain('filename');
  });
});

describe('dispatchFileTool', () => {
  it('files_list calls client.listFiles and returns the list', async () => {
    const client = { listFiles: vi.fn().mockResolvedValue([{ filename: 'a.md' }]) } as any;
    const out = await dispatchFileTool('authorclaw_files_list', {}, client);
    expect(client.listFiles).toHaveBeenCalledWith();
    expect(JSON.parse(out.content[0].text)).toEqual([{ filename: 'a.md' }]);
  });

  it('files_read requires project_id', async () => {
    const client = {} as any;
    await expect(
      dispatchFileTool('authorclaw_files_read', { filename: 'a.md' }, client),
    ).rejects.toThrow(/project_id/);
  });

  it('files_read requires filename', async () => {
    const client = {} as any;
    await expect(
      dispatchFileTool('authorclaw_files_read', { project_id: 'p1' }, client),
    ).rejects.toThrow(/filename/);
  });

  it('files_read calls client.readFile and returns streamed content', async () => {
    async function* mockStream() {
      yield Buffer.from('hello world');
    }
    const client = { readFile: vi.fn().mockResolvedValue(mockStream()) } as any;
    const out = await dispatchFileTool('authorclaw_files_read', { project_id: 'p1', filename: 'a.md' }, client);
    expect(client.readFile).toHaveBeenCalledWith('p1', 'a.md');
    expect(out.content[0].text).toBe('hello world');
  });

  it('files_export requires project_id', async () => {
    const client = {} as any;
    await expect(
      dispatchFileTool('authorclaw_files_export', { filename: 'a.md' }, client),
    ).rejects.toThrow(/project_id/);
  });

  it('files_export calls client.exportDocx and returns the download URL', async () => {
    const client = {
      exportDocx: vi.fn().mockResolvedValue({ downloadUrl: '/api/projects/p1/download/a.docx' }),
    } as any;
    const out = await dispatchFileTool(
      'authorclaw_files_export',
      { project_id: 'p1', filename: 'a.md' },
      client,
    );
    expect(client.exportDocx).toHaveBeenCalledWith('p1', 'a.md');
    expect(out.content[0].text).toContain('/api/projects/p1/download/a.docx');
  });
});
