import { describe, it, expect, vi } from 'vitest';
import { researchAdvancedTools, dispatchResearchAdvancedTool } from '../../tools/research-advanced.js';

describe('research-advanced tools registration', () => {
  it('exposes the six research-advanced tools', () => {
    const names = researchAdvancedTools.map(t => t.name);
    expect(names).toEqual([
      'authorclaw_research_lookup',
      'authorclaw_research_comp_authors',
      'authorclaw_research_agents',
      'authorclaw_research_newsletters',
      'authorclaw_research_podcasts',
      'authorclaw_research_reviewers',
    ]);
  });

  it('research_lookup schema requires query string', () => {
    const t = researchAdvancedTools.find(t => t.name === 'authorclaw_research_lookup')!;
    expect(t.inputSchema.required).toContain('query');
    expect((t.inputSchema.properties as any).query.type).toBe('string');
  });

  it('research_comp_authors schema requires genre string', () => {
    const t = researchAdvancedTools.find(t => t.name === 'authorclaw_research_comp_authors')!;
    expect(t.inputSchema.required).toContain('genre');
    expect((t.inputSchema.properties as any).genre.type).toBe('string');
  });

  it('research_agents schema requires genre string', () => {
    const t = researchAdvancedTools.find(t => t.name === 'authorclaw_research_agents')!;
    expect(t.inputSchema.required).toContain('genre');
    expect((t.inputSchema.properties as any).genre.type).toBe('string');
  });

  it('research_newsletters schema requires genre string', () => {
    const t = researchAdvancedTools.find(t => t.name === 'authorclaw_research_newsletters')!;
    expect(t.inputSchema.required).toContain('genre');
    expect((t.inputSchema.properties as any).genre.type).toBe('string');
  });

  it('research_podcasts schema requires genre string', () => {
    const t = researchAdvancedTools.find(t => t.name === 'authorclaw_research_podcasts')!;
    expect(t.inputSchema.required).toContain('genre');
    expect((t.inputSchema.properties as any).genre.type).toBe('string');
  });

  it('research_reviewers schema requires genre string', () => {
    const t = researchAdvancedTools.find(t => t.name === 'authorclaw_research_reviewers')!;
    expect(t.inputSchema.required).toContain('genre');
    expect((t.inputSchema.properties as any).genre.type).toBe('string');
  });
});

describe('dispatchResearchAdvancedTool', () => {
  it('research_lookup calls client.researchLookup with query and maxWords', async () => {
    const client = {
      researchLookup: vi.fn().mockResolvedValue({ answer: 'Some research', provider: 'perplexity' }),
    } as any;
    const out = await dispatchResearchAdvancedTool(
      'authorclaw_research_lookup',
      { query: 'What are dark academia tropes?', max_words: 500 },
      client,
    );
    expect(client.researchLookup).toHaveBeenCalledWith('What are dark academia tropes?', 500);
    expect(JSON.parse(out.content[0].text)).toEqual({ answer: 'Some research', provider: 'perplexity' });
  });

  it('research_lookup validates query is required', async () => {
    const client = { researchLookup: vi.fn() } as any;
    await expect(
      dispatchResearchAdvancedTool('authorclaw_research_lookup', { max_words: 500 }, client),
    ).rejects.toThrow(/query/);
    expect(client.researchLookup).not.toHaveBeenCalled();
  });

  it('research_comp_authors calls client.researchCompAuthors with genre, subgenre, and tone', async () => {
    const client = {
      researchCompAuthors: vi.fn().mockResolvedValue({ authors: [{ name: 'Author A' }] }),
    } as any;
    const out = await dispatchResearchAdvancedTool(
      'authorclaw_research_comp_authors',
      { genre: 'cozy mystery', subgenre: 'cozy', tone: 'humorous' },
      client,
    );
    expect(client.researchCompAuthors).toHaveBeenCalledWith('cozy mystery', 'cozy', 'humorous');
    expect(JSON.parse(out.content[0].text)).toEqual({ authors: [{ name: 'Author A' }] });
  });

  it('research_comp_authors validates genre is required', async () => {
    const client = { researchCompAuthors: vi.fn() } as any;
    await expect(
      dispatchResearchAdvancedTool('authorclaw_research_comp_authors', { tone: 'humorous' }, client),
    ).rejects.toThrow(/genre/);
    expect(client.researchCompAuthors).not.toHaveBeenCalled();
  });

  it('research_agents calls client.researchAgents with genre and positioning', async () => {
    const client = {
      researchAgents: vi.fn().mockResolvedValue({ agents: [{ name: 'Agent X' }] }),
    } as any;
    const out = await dispatchResearchAdvancedTool(
      'authorclaw_research_agents',
      { genre: 'literary fiction', title_age_positioning: 'adult' },
      client,
    );
    expect(client.researchAgents).toHaveBeenCalledWith('literary fiction', undefined, 'adult');
    expect(JSON.parse(out.content[0].text)).toEqual({ agents: [{ name: 'Agent X' }] });
  });

  it('research_agents validates genre is required', async () => {
    const client = { researchAgents: vi.fn() } as any;
    await expect(
      dispatchResearchAdvancedTool('authorclaw_research_agents', { title_age_positioning: 'YA' }, client),
    ).rejects.toThrow(/genre/);
    expect(client.researchAgents).not.toHaveBeenCalled();
  });

  it('research_newsletters calls client.researchNewsletters with genre and subgenre', async () => {
    const client = {
      researchNewsletters: vi.fn().mockResolvedValue({ newsletters: [{ name: 'Newsletter X' }] }),
    } as any;
    const out = await dispatchResearchAdvancedTool(
      'authorclaw_research_newsletters',
      { genre: 'romance', subgenre: 'paranormal' },
      client,
    );
    expect(client.researchNewsletters).toHaveBeenCalledWith('romance', 'paranormal');
    expect(JSON.parse(out.content[0].text)).toEqual({ newsletters: [{ name: 'Newsletter X' }] });
  });

  it('research_newsletters validates genre is required', async () => {
    const client = { researchNewsletters: vi.fn() } as any;
    await expect(
      dispatchResearchAdvancedTool('authorclaw_research_newsletters', { subgenre: 'paranormal' }, client),
    ).rejects.toThrow(/genre/);
    expect(client.researchNewsletters).not.toHaveBeenCalled();
  });

  it('research_podcasts calls client.researchPodcasts with genre and subgenre', async () => {
    const client = {
      researchPodcasts: vi.fn().mockResolvedValue({ podcasts: [{ name: 'Podcast X' }] }),
    } as any;
    const out = await dispatchResearchAdvancedTool(
      'authorclaw_research_podcasts',
      { genre: 'sci-fi', subgenre: 'cyberpunk' },
      client,
    );
    expect(client.researchPodcasts).toHaveBeenCalledWith('sci-fi', 'cyberpunk');
    expect(JSON.parse(out.content[0].text)).toEqual({ podcasts: [{ name: 'Podcast X' }] });
  });

  it('research_podcasts validates genre is required', async () => {
    const client = { researchPodcasts: vi.fn() } as any;
    await expect(
      dispatchResearchAdvancedTool('authorclaw_research_podcasts', { subgenre: 'cyberpunk' }, client),
    ).rejects.toThrow(/genre/);
    expect(client.researchPodcasts).not.toHaveBeenCalled();
  });

  it('research_reviewers calls client.researchReviewers with genre, subgenre, and indieFriendly', async () => {
    const client = {
      researchReviewers: vi.fn().mockResolvedValue({ reviewers: [{ name: 'Reviewer X' }] }),
    } as any;
    const out = await dispatchResearchAdvancedTool(
      'authorclaw_research_reviewers',
      { genre: 'fantasy', subgenre: 'epic', indie_friendly: true },
      client,
    );
    expect(client.researchReviewers).toHaveBeenCalledWith('fantasy', 'epic', true);
    expect(JSON.parse(out.content[0].text)).toEqual({ reviewers: [{ name: 'Reviewer X' }] });
  });

  it('research_reviewers validates genre is required', async () => {
    const client = { researchReviewers: vi.fn() } as any;
    await expect(
      dispatchResearchAdvancedTool('authorclaw_research_reviewers', { indie_friendly: true }, client),
    ).rejects.toThrow(/genre/);
    expect(client.researchReviewers).not.toHaveBeenCalled();
  });

  it('throws on unknown tool name', async () => {
    const client = {} as any;
    await expect(dispatchResearchAdvancedTool('nope', {}, client)).rejects.toThrow(/unknown/i);
  });
});
