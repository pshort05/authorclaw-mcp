import { describe, it, expect, vi } from 'vitest';
import { documentTools, dispatchDocumentTool } from '../../tools/documents.js';

describe('document tools registration', () => {
  it('exposes the two document tools', () => {
    const names = documentTools.map(t => t.name);
    expect(names).toEqual(['authorclaw_documents_upload', 'authorclaw_documents_delete']);
  });

  it('upload schema requires filename and content_base64 strings', () => {
    const t = documentTools.find(t => t.name === 'authorclaw_documents_upload')!;
    expect(t.inputSchema.required).toContain('filename');
    expect(t.inputSchema.required).toContain('content_base64');
    expect((t.inputSchema.properties as any).filename.type).toBe('string');
    expect((t.inputSchema.properties as any).content_base64.type).toBe('string');
  });

  it('delete schema requires filename string', () => {
    const t = documentTools.find(t => t.name === 'authorclaw_documents_delete')!;
    expect(t.inputSchema.required).toContain('filename');
    expect((t.inputSchema.properties as any).filename.type).toBe('string');
  });
});

describe('dispatchDocumentTool', () => {
  it('upload calls client.uploadDocument with buffer and filename and returns JSON', async () => {
    const client = {
      uploadDocument: vi
        .fn()
        .mockResolvedValue({ success: true, filename: 'test.txt', wordCount: 1000 }),
    } as any;
    const content = Buffer.from('hello world').toString('base64');
    const out = await dispatchDocumentTool(
      'authorclaw_documents_upload',
      { filename: 'test.txt', content_base64: content },
      client,
    );
    expect(client.uploadDocument).toHaveBeenCalledWith(Buffer.from('hello world'), 'test.txt');
    expect(JSON.parse(out.content[0].text)).toEqual({
      success: true,
      filename: 'test.txt',
      wordCount: 1000,
    });
  });

  it('delete calls client.deleteDocument with filename and returns JSON', async () => {
    const client = {
      deleteDocument: vi.fn().mockResolvedValue({ success: true }),
    } as any;
    const out = await dispatchDocumentTool('authorclaw_documents_delete', { filename: 'test.txt' }, client);
    expect(client.deleteDocument).toHaveBeenCalledWith('test.txt');
    expect(JSON.parse(out.content[0].text)).toEqual({ success: true });
  });

  it('validates filename is required for upload', async () => {
    const client = { uploadDocument: vi.fn() } as any;
    await expect(
      dispatchDocumentTool('authorclaw_documents_upload', { content_base64: 'abc123' }, client),
    ).rejects.toThrow(/filename/);
    expect(client.uploadDocument).not.toHaveBeenCalled();
  });

  it('validates content_base64 is required for upload', async () => {
    const client = { uploadDocument: vi.fn() } as any;
    await expect(
      dispatchDocumentTool('authorclaw_documents_upload', { filename: 'test.txt' }, client),
    ).rejects.toThrow(/content_base64/);
    expect(client.uploadDocument).not.toHaveBeenCalled();
  });

  it('validates filename is required for delete', async () => {
    const client = { deleteDocument: vi.fn() } as any;
    await expect(dispatchDocumentTool('authorclaw_documents_delete', {}, client)).rejects.toThrow(/filename/);
    expect(client.deleteDocument).not.toHaveBeenCalled();
  });

  it('throws on unknown tool name', async () => {
    const client = {} as any;
    await expect(dispatchDocumentTool('nope', {}, client)).rejects.toThrow(/unknown/i);
  });
});
