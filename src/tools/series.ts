import type { AuthorClawClient } from '../client/authorclaw.js';

export const seriesTools = [
  {
    name: 'authorclaw_series_list',
    description: 'List all book series configured in AuthorClaw.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'authorclaw_series_create',
    description: 'Create a new book series and optionally link existing projects to it.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Series title, e.g. "The Stormlight Archive"',
        },
        description: {
          type: 'string',
          description: 'Series description',
        },
        project_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of project IDs to include in the series',
        },
        reading_order: {
          type: 'array',
          items: { type: 'string' },
          description: 'Project IDs in reading order (can be a subset of project_ids)',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'authorclaw_series_delete',
    description: 'Delete a book series (does not delete the linked projects).',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Series ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'authorclaw_series_report',
    description:
      "Build a series bible report: aggregates entity data (characters, locations, world facts) from all linked projects' context engines, cross-referencing continuity across books.",
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Series ID',
        },
      },
      required: ['id'],
    },
  },
] as const;

type TextResult = { content: Array<{ type: 'text'; text: string }> };

export async function dispatchSeriesTool(
  name: string,
  args: Record<string, unknown>,
  client: AuthorClawClient,
): Promise<TextResult> {
  if (name === 'authorclaw_series_list') {
    const result = await client.listSeries();
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
  if (name === 'authorclaw_series_create') {
    const title = args.title;
    if (typeof title !== 'string') throw new Error('title is required');
    const data = {
      title,
      description: typeof args.description === 'string' ? args.description : undefined,
      projectIds: Array.isArray(args.project_ids) ? (args.project_ids as string[]) : undefined,
      readingOrder: Array.isArray(args.reading_order) ? (args.reading_order as string[]) : undefined,
    };
    const result = await client.createSeries(data);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
  if (name === 'authorclaw_series_delete') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const result = await client.deleteSeries(id);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
  if (name === 'authorclaw_series_report') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const result = await client.getSeriesReport(id);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
  throw new Error(`unknown series tool: ${name}`);
}
