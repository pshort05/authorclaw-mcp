import type { AuthorClawClient } from '../client/authorclaw.js';

export const projectTools = [
  {
    name: 'authorclaw_project_create',
    description:
      'Create a writing project (e.g. full novel, revision pass, book launch). AuthorClaw plans the steps autonomously and begins executing immediately.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Project title, e.g. "Rogue Signal"',
        },
        description: {
          type: 'string',
          description: 'Project description, e.g. "Write a sci-fi thriller about rogue AI in aviation"',
        },
      },
      required: ['title', 'description'],
    },
  },
  {
    name: 'authorclaw_project_status',
    description: 'Get step-by-step progress for a running project.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Project ID' } },
      required: ['id'],
    },
  },
  {
    name: 'authorclaw_project_list',
    description: 'List all projects, optionally filtered by status.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['running', 'complete', 'paused'], description: 'Filter by status' },
      },
    },
  },
  {
    name: 'authorclaw_project_stop',
    description: 'Pause a running project cleanly.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Project ID' } },
      required: ['id'],
    },
  },
] as const;

type TextResult = { content: Array<{ type: 'text'; text: string }> };

export async function dispatchProjectTool(
  name: string,
  args: Record<string, unknown>,
  client: AuthorClawClient,
): Promise<TextResult> {
  if (name === 'authorclaw_project_create') {
    const title = args.title;
    const description = args.description;
    if (typeof title !== 'string') throw new Error('title is required');
    if (typeof description !== 'string') throw new Error('description is required');
    const result = await client.createProject(title, description);
    return { content: [{ type: 'text', text: JSON.stringify(result.project) }] };
  }
  if (name === 'authorclaw_project_status') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const status = await client.getProjectStatus(id);
    return { content: [{ type: 'text', text: JSON.stringify(status) }] };
  }
  if (name === 'authorclaw_project_list') {
    const list = await client.listProjects();
    // Status filter is applied client-side until AuthorClaw supports server-side filtering.
    const status = args.status;
    const filtered =
      typeof status === 'string'
        ? (list as Array<Record<string, unknown>>).filter(p => p.status === status)
        : list;
    return { content: [{ type: 'text', text: JSON.stringify(filtered) }] };
  }
  if (name === 'authorclaw_project_stop') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    await client.stopProject(id);
    return { content: [{ type: 'text', text: `Project ${id} stopped.` }] };
  }
  throw new Error(`unknown project tool: ${name}`);
}
