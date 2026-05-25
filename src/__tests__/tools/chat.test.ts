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
    const client = { chat: vi.fn().mockResolvedValue({ reply: 'world' }) } as any;
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
    const client = { chat: vi.fn().mockResolvedValue({ reply: 'done' }) } as any;
    const out = await dispatchChatTool('authorclaw_chat_async', { message: 'go' }, client);
    // Response should contain a task id immediately
    expect(out.content[0].text).toMatch(/^Task queued: task_[A-Za-z0-9_]{4,}/);
    const taskId = out.content[0].text.replace('Task queued: ', '');
    // Let microtasks (the background promise) drain
    await new Promise<void>((r) => setImmediate(r));
    expect(client.chat).toHaveBeenCalledWith('go');
    // Task should now be completed with the result stored
    const task = taskManager.get(taskId);
    expect(task?.status).toBe('completed');
    expect(task?.result).toBe('done');
  });

  it('validates message is required for chat_async', async () => {
    const client = { chat: vi.fn() } as any;
    await expect(dispatchChatTool('authorclaw_chat_async', {}, client)).rejects.toThrow(/message/);
    expect(client.chat).not.toHaveBeenCalled();
  });
});
