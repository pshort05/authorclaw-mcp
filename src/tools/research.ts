import type { AuthorClawClient } from '../client/authorclaw.js';

export const researchTools = [
  {
    name: 'authorclaw_research',
    description: "Trigger a deep research task on a topic using AuthorClaw's allowlisted web search.",
    inputSchema: {
      type: 'object',
      properties: { topic: { type: 'string' } },
      required: ['topic'],
    },
  },
] as const;

export async function dispatchResearchTool(
  name: string,
  args: Record<string, unknown>,
  client: AuthorClawClient,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  if (name !== 'authorclaw_research') throw new Error(`unknown research tool: ${name}`);
  const topic = args.topic;
  if (typeof topic !== 'string') throw new Error('topic is required');
  const { summary } = await client.research(topic);
  return { content: [{ type: 'text', text: summary }] };
}
