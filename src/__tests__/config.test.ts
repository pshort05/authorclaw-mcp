import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('config.authorclaw', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    // Clear AuthorClaw-related env vars
    delete process.env.AUTHORCLAW_URL;
    delete process.env.AUTHORCLAW_API_TOKEN;
    delete process.env.AUTHORCLAW_TIMEOUT_MS;
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  async function loadConfig() {
    return await import('../config.js');
  }

  it('defaults url to http://authorclaw:3847', async () => {
    const { config } = await loadConfig();
    expect(config.authorclaw.url).toBe('http://authorclaw:3847');
  });

  it('defaults token to empty string', async () => {
    const { config } = await loadConfig();
    expect(config.authorclaw.token).toBe('');
  });

  it('defaults timeoutMs to 300000', async () => {
    const { config } = await loadConfig();
    expect(config.authorclaw.timeoutMs).toBe(300_000);
  });

  it('reads overrides from environment', async () => {
    process.env.AUTHORCLAW_URL = 'http://example:9999';
    process.env.AUTHORCLAW_API_TOKEN = 'tok_secret123';
    process.env.AUTHORCLAW_TIMEOUT_MS = '60000';

    const { config } = await loadConfig();
    expect(config.authorclaw.url).toBe('http://example:9999');
    expect(config.authorclaw.token).toBe('tok_secret123');
    expect(config.authorclaw.timeoutMs).toBe(60_000);
  });
});
