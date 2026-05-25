import type { AuthorClawClient } from '../client/authorclaw.js';

export const chatTools = [
  {
    name: 'authorclaw_chat',
    description:
      'Send a message to AuthorClaw and get a response. Use for short writing tasks, questions, or quick edits.',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'The message or writing request' },
      },
      required: ['message'],
    },
  },
  {
    name: 'authorclaw_chat_async',
    description:
      'Queue a writing task that may take several minutes. Returns a task_id to poll with authorclaw_task_status.',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
      required: ['message'],
    },
  },
] as const;

export async function dispatchChatTool(
  name: string,
  args: Record<string, unknown>,
  client: AuthorClawClient,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  if (name === 'authorclaw_chat') {
    const message = args.message;
    if (typeof message !== 'string') throw new Error('message is required');
    const { reply } = await client.chat(message);
    return { content: [{ type: 'text', text: reply }] };
  }
  if (name === 'authorclaw_chat_async') {
    // Implemented in Task 12 once the task queue is wired in.
    throw new Error('authorclaw_chat_async not yet implemented');
  }
  throw new Error(`unknown chat tool: ${name}`);
}
