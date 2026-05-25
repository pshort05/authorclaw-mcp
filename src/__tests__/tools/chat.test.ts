import { describe, it, expect, vi } from 'vitest';
import { chatTools, dispatchChatTool } from '../../tools/chat.js';
import { taskManager } from '../../mcp/tasks/manager.js';

describe('chat tools registration', () => {
  it('exposes authorclaw_chat and authorclaw_chat_async', () => {
    const names = chatTools.map(t => t.name);
    expect(names).toContain('authorclaw_chat');
    expect(names).toContain('authorclaw_chat_async');
  });

  it('authorclaw_chat schema requires a message string', () => {
    const t = chatTools.find(t => t.name === 'authorclaw_chat')!;
    expect(t.inputSchema.required).toContain('message');
    expect((t.inputSchema.properties as any).message.type).toBe('string');
  });
});

describe('dispatchChatTool', () => {
  it('routes authorclaw_chat to client.chat and returns text content', async () => {
    const client = { chat: vi.fn().mockResolvedValue({ response: 'world' }) } as any;
    const result = await dispatchChatTool('authorclaw_chat', { message: 'hi' }, client);
    expect(client.chat).toHaveBeenCalledWith('hi');
    expect(result).toEqual({ content: [{ type: 'text', text: 'world' }] });
  });

  it('throws on unknown tool name', async () => {
    const client = {} as any;
    await expect(dispatchChatTool('nope', {}, client)).rejects.toThrow(/unknown/i);
  });

  it('validates message is present', async () => {
    const client = { chat: vi.fn() } as any;
    await expect(dispatchChatTool('authorclaw_chat', {}, client)).rejects.toThrow(/message/);
    expect(client.chat).not.toHaveBeenCalled();
  });
});

describe('authorclaw_chat_async', () => {
  it('returns a task_id immediately and runs the chat in the background', async () => {
    const client = { chat: vi.fn().mockResolvedValue({ response: 'done' }) } as any;
    const out = await dispatchChatTool('authorclaw_chat_async', { message: 'go' }, client);
    // Response should contain a task id immediately
    expect(out.content[0].text).toMatch(/^Task queued: task_[A-Za-z0-9_]{4,}/);
    const taskId = out.content[0].text.replace('Task queued: ', '');
    // Let microtasks (the background promise) drain
    await new Promise<void>((r) => setImmediate(r));
    // chat is called with the message and an AbortSignal
    expect(client.chat).toHaveBeenCalledWith('go', expect.any(AbortSignal));
    // Task should now be completed with the result stored
    const task = taskManager.get(taskId);
    expect(task?.status).toBe('completed');
    expect(task?.result).toBe('done');
    expect(task?.instanceId).toBe('authorclaw');
  });

  it('validates message is required for chat_async', async () => {
    const client = { chat: vi.fn() } as any;
    await expect(dispatchChatTool('authorclaw_chat_async', {}, client)).rejects.toThrow(/message/);
    expect(client.chat).not.toHaveBeenCalled();
  });

  it('sets task status to cancelled when AbortError is thrown', async () => {
    // Simulate a chat that is cancelled mid-flight
    const client = {
      chat: vi.fn().mockImplementation((_msg: string, signal?: AbortSignal) => {
        return new Promise<{ response: string }>((_resolve, reject) => {
          if (signal) {
            signal.addEventListener('abort', () => {
              const err = new Error('The operation was aborted.');
              err.name = 'AbortError';
              reject(err);
            });
          }
        });
      }),
    } as any;

    const out = await dispatchChatTool('authorclaw_chat_async', { message: 'slow task' }, client);
    const taskId = out.content[0].text.replace('Task queued: ', '');

    // Let the background microtask start (move to running)
    await new Promise<void>((r) => setImmediate(r));

    // Cancel the running task
    taskManager.cancel(taskId);

    // Let the AbortError propagate and be handled
    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setImmediate(r));

    const task = taskManager.get(taskId);
    expect(task?.status).toBe('cancelled');
  });
});
