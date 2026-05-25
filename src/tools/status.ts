import type { AuthorClawClient } from '../client/authorclaw.js';

export const statusTools = [
  {
    name: 'authorclaw_status',
    description: 'Health check: confirm the AuthorClaw gateway is reachable and responsive.',
    inputSchema: { type: 'object', properties: {} },
  },
] as const;

export async function dispatchStatusTool(
  name: string,
  _args: Record<string, unknown>,
  client: AuthorClawClient,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  if (name !== 'authorclaw_status') throw new Error(`unknown status tool: ${name}`);
  try {
    const { status } = await client.health();
    return { content: [{ type: 'text', text: `AuthorClaw status: ${status}` }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `AuthorClaw unreachable: ${message}` }] };
  }
}
