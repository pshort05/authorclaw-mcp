import type { AuthorClawClient } from '../client/authorclaw.js';

export const researchTools = [
  {
    name: 'authorclaw_research',
    description: "Search the web on a topic using AuthorClaw's allowlisted research service. Returns matched pages with extracted text.",
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Research query or topic' },
      },
      required: ['query'],
    },
  },
] as const;

export async function dispatchResearchTool(
  name: string,
  args: Record<string, unknown>,
  client: AuthorClawClient,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  if (name !== 'authorclaw_research') throw new Error(`unknown research tool: ${name}`);
  const query = args.query;
  if (typeof query !== 'string') throw new Error('query is required');
  const result = await client.research(query);
  return { content: [{ type: 'text', text: JSON.stringify(result) }] };
}
