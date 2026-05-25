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

// ── v0.2 client methods ──────────────────────────────────────────────────────

describe('AuthorClawClient v0.2 methods', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // ── Documents ──────────────────────────────────────────────────────────────

  describe('uploadDocument', () => {
    it('POSTs multipart form to /api/documents/upload and returns result', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ success: true, filename: 'test.md', wordCount: 100 }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      const result = await client.uploadDocument(Buffer.from('hello'), 'test.md');

      expect(result).toEqual({ success: true, filename: 'test.md', wordCount: 100 });
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/documents/upload');
      expect(init?.method).toBe('POST');
    });

    it('throws on non-OK response', async () => {
      fetchSpy.mockResolvedValueOnce({ ok: false, status: 413 });
      const client = new AuthorClawClient('http://h:3847', '');
      await expect(client.uploadDocument(Buffer.from('x'), 'f.md')).rejects.toThrow(/413/);
    });
  });

  describe('deleteDocument', () => {
    it('DELETEs /api/documents/:filename with URL-encoding', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      const result = await client.deleteDocument('my file.md');

      expect(result).toEqual({ success: true });
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/documents/my%20file.md');
      expect(init?.method).toBe('DELETE');
    });
  });

  // ── Project Writing ────────────────────────────────────────────────────────

  describe('executeProjectStep', () => {
    it('POSTs to /api/projects/:id/execute and returns result', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ success: true, completedStep: 'step-1', response: 'done' }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      const result = await client.executeProjectStep('proj-1');

      expect(result).toEqual({ success: true, completedStep: 'step-1', response: 'done' });
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/projects/proj-1/execute');
      expect(init?.method).toBe('POST');
    });

    it('throws on non-OK response', async () => {
      fetchSpy.mockResolvedValueOnce({ ok: false, status: 400 });
      const client = new AuthorClawClient('http://h:3847', '');
      await expect(client.executeProjectStep('p')).rejects.toThrow(/400/);
    });
  });

  describe('runProject', () => {
    it('POSTs to /api/projects/:id/auto-execute', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ success: true, results: [] }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.runProject('p1');

      expect(fetchSpy.mock.calls[0][0]).toBe('http://h:3847/api/projects/p1/auto-execute');
      expect(fetchSpy.mock.calls[0][1]?.method).toBe('POST');
    });
  });

  describe('resumeProject', () => {
    it('POSTs to /api/projects/:id/resume', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ resumed: true }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.resumeProject('p1');

      expect(fetchSpy.mock.calls[0][0]).toBe('http://h:3847/api/projects/p1/resume');
      expect(fetchSpy.mock.calls[0][1]?.method).toBe('POST');
    });
  });

  describe('restartProject', () => {
    it('POSTs to /api/projects/:id/restart with options body', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ restarted: true }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.restartProject('p1', { keepCompleted: true });

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/projects/p1/restart');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify({ keepCompleted: true }));
    });
  });

  describe('compileProject', () => {
    it('POSTs to /api/projects/:id/compile', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ success: true, totalWords: 50000 }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      const result = await client.compileProject('p1');

      expect(result).toEqual({ success: true, totalWords: 50000 });
      expect(fetchSpy.mock.calls[0][0]).toBe('http://h:3847/api/projects/p1/compile');
      expect(fetchSpy.mock.calls[0][1]?.method).toBe('POST');
    });
  });

  describe('startContinuityCheck', () => {
    it('POSTs to /api/projects/:id/continuity-check', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ status: 'started', projectId: 'p1' }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      const result = await client.startContinuityCheck('p1');

      expect(result).toEqual({ status: 'started', projectId: 'p1' });
      expect(fetchSpy.mock.calls[0][0]).toBe('http://h:3847/api/projects/p1/continuity-check');
      expect(fetchSpy.mock.calls[0][1]?.method).toBe('POST');
    });
  });

  describe('getContinuityReport', () => {
    it('GETs /api/projects/:id/continuity-report', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ report: { issues: [] } }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.getContinuityReport('p1');

      expect(fetchSpy.mock.calls[0][0]).toBe('http://h:3847/api/projects/p1/continuity-report');
      expect(fetchSpy.mock.calls[0][1]?.method).toBeUndefined();
    });
  });

  describe('structureCheck', () => {
    it('POSTs to /api/projects/:id/structure-check with options', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ recommendation: 'use-heroes-journey' }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.structureCheck('p1', { genre: 'fantasy' });

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/projects/p1/structure-check');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify({ genre: 'fantasy' }));
    });
  });

  describe('styleClone', () => {
    it('POSTs to /api/projects/:id/style-clone', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ profile: {} }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.styleClone('p1');

      expect(fetchSpy.mock.calls[0][0]).toBe('http://h:3847/api/projects/p1/style-clone');
      expect(fetchSpy.mock.calls[0][1]?.method).toBe('POST');
    });
  });

  describe('pacingHeatmap', () => {
    it('POSTs to /api/projects/:id/pacing-heatmap', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ heatmap: [] }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.pacingHeatmap('p1');

      expect(fetchSpy.mock.calls[0][0]).toBe('http://h:3847/api/projects/p1/pacing-heatmap');
      expect(fetchSpy.mock.calls[0][1]?.method).toBe('POST');
    });
  });

  describe('formatPro', () => {
    it('POSTs to /api/projects/:id/format-pro with options', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ url: '/api/download/out.docx' }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.formatPro('p1', { outputFormat: 'docx', author: 'Jane' });

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/projects/p1/format-pro');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify({ outputFormat: 'docx', author: 'Jane' }));
    });
  });

  describe('craftCritique', () => {
    it('POSTs to /api/projects/:id/craft-critique', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ report: 'good' }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.craftCritique('p1');

      expect(fetchSpy.mock.calls[0][0]).toBe('http://h:3847/api/projects/p1/craft-critique');
      expect(fetchSpy.mock.calls[0][1]?.method).toBe('POST');
    });
  });

  describe('dialogueAudit', () => {
    it('POSTs to /api/projects/:id/dialogue-audit', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ report: {} }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.dialogueAudit('p1');

      expect(fetchSpy.mock.calls[0][0]).toBe('http://h:3847/api/projects/p1/dialogue-audit');
      expect(fetchSpy.mock.calls[0][1]?.method).toBe('POST');
    });
  });

  describe('betaReader', () => {
    it('POSTs to /api/projects/:id/beta-reader with archetypes', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ status: 'started', archetypes: ['romantic'] }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.betaReader('p1', ['romantic', 'thriller-fan']);

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/projects/p1/beta-reader');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify({ archetypes: ['romantic', 'thriller-fan'] }));
    });
  });

  describe('getBetaReaderReport', () => {
    it('GETs /api/projects/:id/beta-reader/report', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ report: {} }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.getBetaReaderReport('p1');

      expect(fetchSpy.mock.calls[0][0]).toBe('http://h:3847/api/projects/p1/beta-reader/report');
    });
  });

  describe('projectCoverSet', () => {
    it('POSTs to /api/projects/:id/cover-set with opts', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ variants: [] }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.projectCoverSet('p1', { genre: 'thriller' });

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/projects/p1/cover-set');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify({ genre: 'thriller' }));
    });
  });

  // ── Plot Promises ──────────────────────────────────────────────────────────

  describe('listPlotPromises', () => {
    it('GETs /api/projects/:id/plot-promises', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ promises: [] }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.listPlotPromises('p1');

      expect(fetchSpy.mock.calls[0][0]).toBe('http://h:3847/api/projects/p1/plot-promises');
      expect(fetchSpy.mock.calls[0][1]?.method).toBeUndefined();
    });
  });

  describe('addPlotPromise', () => {
    it('POSTs to /api/projects/:id/plot-promises with data', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ id: 'pp1', title: 'The locked room' }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.addPlotPromise('p1', { title: 'The locked room', description: 'Why is it locked?' });

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/projects/p1/plot-promises');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify({ title: 'The locked room', description: 'Why is it locked?' }));
    });
  });

  describe('extractPlotPromises', () => {
    it('POSTs to /api/projects/:id/plot-promises/extract', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ extracted: 3 }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.extractPlotPromises('p1', { merge: true });

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/projects/p1/plot-promises/extract');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify({ merge: true }));
    });
  });

  describe('auditPlotPromises', () => {
    it('GETs /api/projects/:id/plot-promises/audit without query params', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ risks: [] }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.auditPlotPromises('p1');

      expect(fetchSpy.mock.calls[0][0]).toBe('http://h:3847/api/projects/p1/plot-promises/audit');
    });

    it('GETs with progress and riskThreshold as query params', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ risks: [] }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.auditPlotPromises('p1', 75, 80);

      expect(fetchSpy.mock.calls[0][0]).toBe(
        'http://h:3847/api/projects/p1/plot-promises/audit?progress=75&riskThreshold=80',
      );
    });
  });

  // ── Personas ───────────────────────────────────────────────────────────────

  describe('listPersonas', () => {
    it('GETs /api/personas and returns result', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ personas: [{ id: 'pa1' }] }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      const result = await client.listPersonas();

      expect(result).toEqual({ personas: [{ id: 'pa1' }] });
      expect(fetchSpy.mock.calls[0][0]).toBe('http://h:3847/api/personas');
    });
  });

  describe('createPersona', () => {
    it('POSTs to /api/personas with data', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 201,
        json: () => Promise.resolve({ id: 'pa1', penName: 'J.K. Rowling' }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.createPersona({ penName: 'J.K. Rowling', genre: 'fantasy' });

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/personas');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify({ penName: 'J.K. Rowling', genre: 'fantasy' }));
    });
  });

  describe('generatePersona', () => {
    it('POSTs to /api/personas/generate with genre and optional description', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 201,
        json: () => Promise.resolve({ id: 'pa2', penName: 'AI Author' }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.generatePersona('fantasy', 'dark and gritty');

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/personas/generate');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify({ genre: 'fantasy', description: 'dark and gritty' }));
    });
  });

  describe('getPersona', () => {
    it('GETs /api/personas/:id with URL-encoding', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ id: 'pa1' }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.getPersona('pa 1');

      expect(fetchSpy.mock.calls[0][0]).toBe('http://h:3847/api/personas/pa%201');
    });
  });

  describe('updatePersona', () => {
    it('PUTs to /api/personas/:id with update data', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ id: 'pa1', genre: 'sci-fi' }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.updatePersona('pa1', { genre: 'sci-fi' });

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/personas/pa1');
      expect(init?.method).toBe('PUT');
      expect(init?.body).toBe(JSON.stringify({ genre: 'sci-fi' }));
    });
  });

  describe('deletePersona', () => {
    it('DELETEs /api/personas/:id', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.deletePersona('pa1');

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/personas/pa1');
      expect(init?.method).toBe('DELETE');
    });
  });

  // ── Research Advanced ──────────────────────────────────────────────────────

  describe('researchLookup', () => {
    it('POSTs to /api/research/lookup with query', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ answer: 'found it' }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.researchLookup('dark academia tropes', 500);

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/research/lookup');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify({ query: 'dark academia tropes', maxWords: 500 }));
    });
  });

  describe('researchCompAuthors', () => {
    it('POSTs to /api/research/comp-authors with genre', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ authors: [] }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.researchCompAuthors('cozy mystery', 'bakery', 'humorous');

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/research/comp-authors');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify({ genre: 'cozy mystery', subgenre: 'bakery', tone: 'humorous' }));
    });
  });

  describe('researchAgents', () => {
    it('POSTs to /api/research/agents with genre', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ agents: [] }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.researchAgents('literary fiction');

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/research/agents');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(init?.body as string)).toMatchObject({ genre: 'literary fiction' });
    });
  });

  describe('researchNewsletters', () => {
    it('POSTs to /api/research/newsletters with genre', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ newsletters: [] }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.researchNewsletters('romance');

      expect(fetchSpy.mock.calls[0][0]).toBe('http://h:3847/api/research/newsletters');
      expect(fetchSpy.mock.calls[0][1]?.method).toBe('POST');
    });
  });

  describe('researchPodcasts', () => {
    it('POSTs to /api/research/podcasts with genre', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ podcasts: [] }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.researchPodcasts('thriller');

      expect(fetchSpy.mock.calls[0][0]).toBe('http://h:3847/api/research/podcasts');
      expect(fetchSpy.mock.calls[0][1]?.method).toBe('POST');
    });
  });

  describe('researchReviewers', () => {
    it('POSTs to /api/research/reviewers with genre and options', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ reviewers: [] }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.researchReviewers('fantasy', 'epic', true);

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/research/reviewers');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify({ genre: 'fantasy', subgenre: 'epic', indieFriendly: true }));
    });
  });

  // ── Audio ──────────────────────────────────────────────────────────────────

  describe('listVoices', () => {
    it('GETs /api/audio/voices', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ activeProvider: 'edge', presets: [] }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.listVoices();

      expect(fetchSpy.mock.calls[0][0]).toBe('http://h:3847/api/audio/voices');
    });
  });

  describe('generateAudio', () => {
    it('POSTs to /api/audio/generate with text and options', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ success: true, filename: 'output.mp3' }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.generateAudio('Hello world', { voice: 'en-US-AriaNeural', provider: 'edge' });

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/audio/generate');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify({ text: 'Hello world', voice: 'en-US-AriaNeural', provider: 'edge' }));
    });

    it('throws on non-OK response', async () => {
      fetchSpy.mockResolvedValueOnce({ ok: false, status: 503 });
      const client = new AuthorClawClient('http://h:3847', '');
      await expect(client.generateAudio('text')).rejects.toThrow(/503/);
    });
  });

  describe('getAudioFile', () => {
    it('returns a URL string for the audio file without making a fetch call', async () => {
      const client = new AuthorClawClient('http://h:3847', '');
      const url = await client.getAudioFile('output.mp3');

      expect(url).toBe('http://h:3847/api/audio/file/output.mp3');
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  // ── Images ─────────────────────────────────────────────────────────────────

  describe('generateImage', () => {
    it('POSTs to /api/images/generate with prompt and options', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ filename: 'img.png', url: '/api/images/img.png' }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.generateImage('a dark forest', { width: 512, height: 512 });

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/images/generate');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify({ prompt: 'a dark forest', width: 512, height: 512 }));
    });
  });

  describe('generateBookCover', () => {
    it('POSTs to /api/images/book-cover with description and options', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ filename: 'cover.png' }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.generateBookCover('dark forest with lantern', { title: 'My Novel', genre: 'fantasy' });

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/images/book-cover');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify({ description: 'dark forest with lantern', title: 'My Novel', genre: 'fantasy' }));
    });
  });

  describe('generateCoverSet', () => {
    it('POSTs to /api/images/cover-set with description', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ variants: [] }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.generateCoverSet('dark forest', { quality: 'hd' });

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/images/cover-set');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify({ description: 'dark forest', quality: 'hd' }));
    });
  });

  // ── Series ─────────────────────────────────────────────────────────────────

  describe('listSeries', () => {
    it('GETs /api/series', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ series: [] }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      const result = await client.listSeries();

      expect(result).toEqual({ series: [] });
      expect(fetchSpy.mock.calls[0][0]).toBe('http://h:3847/api/series');
    });
  });

  describe('createSeries', () => {
    it('POSTs to /api/series with title and optional fields', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ series: { id: 's1', title: 'The Archives' } }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.createSeries({ title: 'The Archives', projectIds: ['p1', 'p2'] });

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/series');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(JSON.stringify({ title: 'The Archives', projectIds: ['p1', 'p2'] }));
    });
  });

  describe('deleteSeries', () => {
    it('DELETEs /api/series/:id', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.deleteSeries('s1');

      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://h:3847/api/series/s1');
      expect(init?.method).toBe('DELETE');
    });
  });

  describe('getSeriesReport', () => {
    it('GETs /api/series/:id/report with URL-encoding', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ report: {} }),
      });

      const client = new AuthorClawClient('http://h:3847', '');
      await client.getSeriesReport('s 1');

      expect(fetchSpy.mock.calls[0][0]).toBe('http://h:3847/api/series/s%201/report');
    });
  });
});
