import type { AuthorClawClient } from '../client/authorclaw.js';
import { taskManager } from '../mcp/tasks/manager.js';

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
    const { response } = await client.chat(message);
    return { content: [{ type: 'text', text: response }] };
  }
  if (name === 'authorclaw_chat_async') {
    const message = args.message;
    if (typeof message !== 'string') throw new Error('message is required');
    const task = taskManager.create({ type: 'chat', input: { message } });
    // Run the chat in the background and store the result on the task.
    Promise.resolve().then(async () => {
      taskManager.updateStatus(task.id, 'running');
      try {
        const result = await client.chat(message);
        taskManager.updateStatus(task.id, 'completed', result.response);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        taskManager.updateStatus(task.id, 'failed', undefined, errorMsg);
      }
    });
    return { content: [{ type: 'text', text: `Task queued: ${task.id}` }] };
  }
  throw new Error(`unknown chat tool: ${name}`);
}
