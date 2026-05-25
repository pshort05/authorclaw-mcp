/**
 * Centralized configuration for authorclaw-mcp.
 *
 * Loads AuthorClaw connection settings from environment variables with sensible
 * defaults, and re-exports server metadata constants. OAuth configuration is
 * handled separately via CLI args in the entry points.
 */

import {
  SERVER_NAME,
  SERVER_VERSION,
  SERVER_ICON_SVG_BASE64,
} from './config/constants.js';

export interface AuthorClawConfig {
  url: string;
  token: string;
  timeoutMs: number;
}

export interface ServerInfo {
  name: string;
  version: string;
  iconSvgBase64: string;
}

export interface Config {
  authorclaw: AuthorClawConfig;
  server: ServerInfo;
}

export const config: Config = {
  authorclaw: {
    url: process.env.AUTHORCLAW_URL ?? 'http://authorclaw:3847',
    token: process.env.AUTHORCLAW_API_TOKEN ?? '',
    timeoutMs: Number(process.env.AUTHORCLAW_TIMEOUT_MS ?? 300_000),
  },
  server: {
    name: SERVER_NAME,
    version: SERVER_VERSION,
    iconSvgBase64: SERVER_ICON_SVG_BASE64,
  },
};
