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
    it('POSTs message to /api/chat and returns reply', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ reply: 'hello' }),
      });

      const client = new AuthorClawClient('http://authorclaw:3847', '');
      const result = await client.chat('hi');

      expect(result).toEqual({ reply: 'hello' });
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
        json: () => Promise.resolve({ reply: 'ok' }),
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
        json: () => Promise.resolve({ reply: 'ok' }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.chat('x');

      const [, init] = fetchSpy.mock.calls[0];
      expect((init?.headers as Record<string, string>).Authorization).toBeUndefined();
    });
  });

  describe('AuthorClawClient projects', () => {
    it('createProject POSTs task to /api/projects and returns id+steps', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 'p1', steps: 5 }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      const result = await client.createProject('write a story');

      expect(result).toEqual({ id: 'p1', steps: 5 });
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/projects');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify({ task: 'write a story' }));
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

    it('listProjects GETs /api/projects', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      const result = await client.listProjects();

      expect(result).toEqual([]);
      expect(fetchSpy.mock.calls[0][0]).toBe('http://h:3847/api/projects');
    });

    it('stopProject POSTs to /api/projects/:id/stop', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.stopProject('p1');

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/projects/p1/stop');
      expect(init?.method).toBe('POST');
    });
  });
});
