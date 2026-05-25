import type { AuthorClawClient } from '../client/authorclaw.js';

export const researchAdvancedTools = [
  {
    name: 'authorclaw_research_lookup',
    description:
      'Sourced research via Perplexity (requires Perplexity API key in vault). Returns an answer with live citations. Results are also persisted to workspace/research/marketing/.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Research question, e.g. "What are the current tropes in dark academia fiction?"',
        },
        max_words: {
          type: 'number',
          description: 'Maximum word count for the answer (optional)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'authorclaw_research_comp_authors',
    description:
      'Find comparable authors (comps) for a genre. Results are persisted to workspace/research/marketing/.',
    inputSchema: {
      type: 'object',
      properties: {
        genre: {
          type: 'string',
          description: 'Genre, e.g. "cozy mystery"',
        },
        subgenre: {
          type: 'string',
          description: 'Subgenre for more specific comps',
        },
        tone: {
          type: 'string',
          description: 'Tone descriptor, e.g. "humorous", "gritty"',
        },
      },
      required: ['genre'],
    },
  },
  {
    name: 'authorclaw_research_agents',
    description:
      'Find literary agents who represent a genre. Results are persisted to workspace/research/marketing/.',
    inputSchema: {
      type: 'object',
      properties: {
        genre: {
          type: 'string',
          description: 'Genre, e.g. "literary fiction"',
        },
        subgenre: {
          type: 'string',
        },
        title_age_positioning: {
          type: 'string',
          description: 'Positioning, e.g. "adult", "YA", "middle grade"',
        },
      },
      required: ['genre'],
    },
  },
  {
    name: 'authorclaw_research_newsletters',
    description:
      'Find genre-appropriate reader newsletters for promotion. Results are persisted to workspace/research/marketing/.',
    inputSchema: {
      type: 'object',
      properties: {
        genre: {
          type: 'string',
          description: 'Genre',
        },
        subgenre: {
          type: 'string',
        },
      },
      required: ['genre'],
    },
  },
  {
    name: 'authorclaw_research_podcasts',
    description:
      'Find author and reader podcasts for a genre. Results are persisted to workspace/research/marketing/.',
    inputSchema: {
      type: 'object',
      properties: {
        genre: {
          type: 'string',
          description: 'Genre',
        },
        subgenre: {
          type: 'string',
        },
      },
      required: ['genre'],
    },
  },
  {
    name: 'authorclaw_research_reviewers',
    description:
      'Find book reviewers and review sites for a genre. Results are persisted to workspace/research/marketing/.',
    inputSchema: {
      type: 'object',
      properties: {
        genre: {
          type: 'string',
          description: 'Genre',
        },
        subgenre: {
          type: 'string',
        },
        indie_friendly: {
          type: 'boolean',
          description: 'Filter to indie/self-pub friendly reviewers only',
        },
      },
      required: ['genre'],
    },
  },
] as const;

type TextResult = { content: Array<{ type: 'text'; text: string }> };

export async function dispatchResearchAdvancedTool(
  name: string,
  args: Record<string, unknown>,
  client: AuthorClawClient,
): Promise<TextResult> {
  if (name === 'authorclaw_research_lookup') {
    const query = args.query;
    if (typeof query !== 'string') throw new Error('query is required');
    const maxWords = typeof args.max_words === 'number' ? args.max_words : undefined;
    const result = await client.researchLookup(query, maxWords);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_research_comp_authors') {
    const genre = args.genre;
    if (typeof genre !== 'string') throw new Error('genre is required');
    const subgenre = typeof args.subgenre === 'string' ? args.subgenre : undefined;
    const tone = typeof args.tone === 'string' ? args.tone : undefined;
    const result = await client.researchCompAuthors(genre, subgenre, tone);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_research_agents') {
    const genre = args.genre;
    if (typeof genre !== 'string') throw new Error('genre is required');
    const subgenre = typeof args.subgenre === 'string' ? args.subgenre : undefined;
    const titleAgePositioning =
      typeof args.title_age_positioning === 'string' ? args.title_age_positioning : undefined;
    const result = await client.researchAgents(genre, subgenre, titleAgePositioning);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_research_newsletters') {
    const genre = args.genre;
    if (typeof genre !== 'string') throw new Error('genre is required');
    const subgenre = typeof args.subgenre === 'string' ? args.subgenre : undefined;
    const result = await client.researchNewsletters(genre, subgenre);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_research_podcasts') {
    const genre = args.genre;
    if (typeof genre !== 'string') throw new Error('genre is required');
    const subgenre = typeof args.subgenre === 'string' ? args.subgenre : undefined;
    const result = await client.researchPodcasts(genre, subgenre);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_research_reviewers') {
    const genre = args.genre;
    if (typeof genre !== 'string') throw new Error('genre is required');
    const subgenre = typeof args.subgenre === 'string' ? args.subgenre : undefined;
    const indieFriendly = typeof args.indie_friendly === 'boolean' ? args.indie_friendly : undefined;
    const result = await client.researchReviewers(genre, subgenre, indieFriendly);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  throw new Error(`unknown research-advanced tool: ${name}`);
}
