/**
 * Centralized configuration for authorclaw-mcp.
 *
 * Loads settings from environment variables with sensible defaults:
 * - AuthorClaw connection details (URL, API token, timeout)
 * - OAuth configuration (delegated to CLI args in main entry points)
 * - MCP server metadata (re-exported from constants)
 */

import {
  DEFAULT_OPENCLAW_URL,
  DEFAULT_MODEL,
  SERVER_NAME,
  SERVER_VERSION,
  SERVER_ICON_SVG_BASE64,
} from './config/constants.js';

export interface AuthorClawConfig {
  url: string;
  token: string;
  timeoutMs: number;
}

export interface OpenClawConfig {
  url: string;
  model: string;
}

export interface ServerInfo {
  name: string;
  version: string;
  iconSvgBase64: string;
}

export interface Config {
  authorclaw: AuthorClawConfig;
  openclaw: OpenClawConfig;
  server: ServerInfo;
}

export const config: Config = {
  authorclaw: {
    url: process.env.AUTHORCLAW_URL ?? 'http://authorclaw:3847',
    token: process.env.AUTHORCLAW_API_TOKEN ?? '',
    timeoutMs: Number(process.env.AUTHORCLAW_TIMEOUT_MS ?? 300_000),
  },
  openclaw: {
    url: DEFAULT_OPENCLAW_URL,
    model: DEFAULT_MODEL,
  },
  server: {
    name: SERVER_NAME,
    version: SERVER_VERSION,
    iconSvgBase64: SERVER_ICON_SVG_BASE64,
  },
};
