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

describe('config.authorclaw.timeoutMs defensive parsing', () => {
  const originalEnv = { ...process.env };
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    delete process.env.AUTHORCLAW_TIMEOUT_MS;
    warnSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    warnSpy.mockRestore();
    vi.resetModules();
  });

  async function loadConfig() {
    return await import('../config.js');
  }

  it('falls back to default when AUTHORCLAW_TIMEOUT_MS is the empty string', async () => {
    process.env.AUTHORCLAW_TIMEOUT_MS = '';
    const { config } = await loadConfig();
    expect(config.authorclaw.timeoutMs).toBe(300_000);
  });

  it('falls back to default when AUTHORCLAW_TIMEOUT_MS is whitespace only', async () => {
    process.env.AUTHORCLAW_TIMEOUT_MS = '   ';
    const { config } = await loadConfig();
    expect(config.authorclaw.timeoutMs).toBe(300_000);
  });

  it('falls back to default and warns when value is non-numeric', async () => {
    process.env.AUTHORCLAW_TIMEOUT_MS = 'banana';
    const { config } = await loadConfig();
    expect(config.authorclaw.timeoutMs).toBe(300_000);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('AUTHORCLAW_TIMEOUT_MS="banana"'),
    );
  });

  it('falls back to default when value is zero', async () => {
    process.env.AUTHORCLAW_TIMEOUT_MS = '0';
    const { config } = await loadConfig();
    expect(config.authorclaw.timeoutMs).toBe(300_000);
  });

  it('falls back to default when value is negative', async () => {
    process.env.AUTHORCLAW_TIMEOUT_MS = '-100';
    const { config } = await loadConfig();
    expect(config.authorclaw.timeoutMs).toBe(300_000);
  });

  it('parseTimeoutMs is exported for reuse', async () => {
    const { parseTimeoutMs } = await loadConfig();
    expect(parseTimeoutMs(undefined)).toBe(300_000);
    expect(parseTimeoutMs('60000')).toBe(60_000);
    expect(parseTimeoutMs('abc')).toBe(300_000);
    expect(parseTimeoutMs('5000', 1000)).toBe(5000);
    expect(parseTimeoutMs('bad', 1000)).toBe(1000);
  });
});

describe('config.server (re-exported from constants)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
  });

  async function loadConfig() {
    return await import('../config.js');
  }

  it('exposes server name and version', async () => {
    const { config } = await loadConfig();
    expect(typeof config.server.name).toBe('string');
    expect(config.server.name).toBe('authorclaw-mcp');
    expect(typeof config.server.version).toBe('string');
  });

  it('exposes server icon SVG base64', async () => {
    const { config } = await loadConfig();
    expect(typeof config.server.iconSvgBase64).toBe('string');
    expect(config.server.iconSvgBase64.length).toBeGreaterThan(0);
  });
});
