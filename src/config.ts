/**
 * Centralized configuration for authorclaw-mcp.
 *
 * Loads settings from environment variables with sensible defaults:
 * - AuthorClaw connection details (URL, API token, timeout)
 * - OAuth configuration (delegated to CLI args in main entry points)
 * - MCP server metadata
 */

export interface AuthorClawConfig {
  url: string;
  token: string;
  timeoutMs: number;
}

export interface Config {
  authorclaw: AuthorClawConfig;
}

export const config: Config = {
  authorclaw: {
    url: process.env.AUTHORCLAW_URL ?? 'http://authorclaw:3847',
    token: process.env.AUTHORCLAW_API_TOKEN ?? '',
    timeoutMs: Number(process.env.AUTHORCLAW_TIMEOUT_MS ?? 300_000),
  },
};
