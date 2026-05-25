import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthorClawClient } from '../../client/authorclaw.js';

describe('AuthorClawClient', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('strips trailing slash from base URL', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ reply: 'test' }),
      });

      const client = new AuthorClawClient('http://h:3847/', '');
      await client.chat('x');

      expect(fetchSpy.mock.calls[0][0]).toBe('http://h:3847/api/chat');
    });
  });

  describe('chat', () => {
    it('POSTs message to /api/chat and returns response', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ response: 'hello' }),
      });

      const client = new AuthorClawClient('http://authorclaw:3847', '');
      const result = await client.chat('hi');

      expect(result).toEqual({ response: 'hello' });
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://authorclaw:3847/api/chat');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify({ message: 'hi' }));
      expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });

    it('sends bearer token when configured', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ response: 'ok' }),
      });

      const client = new AuthorClawClient('http://h:3847', 'secret');
      await client.chat('x');

      const [, init] = fetchSpy.mock.calls[0];
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer secret');
    });

    it('throws on non-OK response with status code in message', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await expect(client.chat('x')).rejects.toThrow(/500/);
    });

    it('does not send Authorization header when no token', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ response: 'ok' }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.chat('x');

      const [, init] = fetchSpy.mock.calls[0];
      expect((init?.headers as Record<string, string>).Authorization).toBeUndefined();
    });
  });

  describe('AuthorClawClient projects', () => {
    it('createProject POSTs title+description to /api/projects/create and returns project', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ project: { id: 'p1', title: 'Test' } }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      const result = await client.createProject('My Story', 'write a story about dragons');

      expect(result).toEqual({ project: { id: 'p1', title: 'Test' } });
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/projects/create');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify({ title: 'My Story', description: 'write a story about dragons' }));
    });

    it('getProjectStatus GETs /api/projects/:id', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'running' }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      const result = await client.getProjectStatus('p1');

      expect(result).toEqual({ status: 'running' });
      expect(fetchSpy.mock.calls[0][0]).toBe('http://h:3847/api/projects/p1');
    });

    it('listProjects GETs /api/projects/list and unwraps the projects array', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ projects: [{ id: 'p1' }] }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      const result = await client.listProjects();

      expect(result).toEqual([{ id: 'p1' }]);
      expect(fetchSpy.mock.calls[0][0]).toBe('http://h:3847/api/projects/list');
    });

    it('stopProject POSTs to /api/projects/:id/pause', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.stopProject('p1');

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/projects/p1/pause');
      expect(init?.method).toBe('POST');
    });
  });

  describe('AuthorClawClient files', () => {
    it('listFiles GETs /api/documents and unwraps the documents array', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ documents: [{ filename: 'a.md' }] }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      const result = await client.listFiles();

      expect(result).toEqual([{ filename: 'a.md' }]);
      expect(fetchSpy.mock.calls[0][0]).toBe('http://h:3847/api/documents');
    });

    it('readFile GETs /api/projects/:id/download/:filename with URL-encoded parts', async () => {
      const mockBody = { [Symbol.asyncIterator]: async function* () { yield Buffer.from('hello'); } };
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: mockBody,
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.readFile('proj-1', 'a b.md');

      expect(fetchSpy.mock.calls[0][0]).toBe('http://h:3847/api/projects/proj-1/download/a%20b.md');
    });

    it('exportDocx POSTs to /api/projects/:id/export-docx with filename', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ downloadUrl: '/api/projects/p1/download/x.docx' }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      const out = await client.exportDocx('p1', 'x.md');

      expect(out).toEqual({ downloadUrl: '/api/projects/p1/download/x.docx' });
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/projects/p1/export-docx');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify({ filename: 'x.md' }));
    });
  });

  describe('AuthorClawClient research + health', () => {
    it('research POSTs query to /api/research and returns results', async () => {
      const mockResponse = { results: [{ title: 'Vintage Aircraft', url: 'http://example.com' }], totalFound: 1 };
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      const result = await client.research('vintage aircraft');

      expect(result).toEqual(mockResponse);
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/research');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify({ query: 'vintage aircraft' }));
    });

    it('health GETs /api/health and returns status', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'ok' }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      const result = await client.health();

      expect(result).toEqual({ status: 'ok' });
      expect(fetchSpy.mock.calls[0][0]).toBe('http://h:3847/api/health');
    });
  });
});
