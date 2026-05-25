import { describe, it, expect, vi } from 'vitest';
import { chatTools, dispatchChatTool } from '../../tools/chat.js';

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
