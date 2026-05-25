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

const DEFAULT_TIMEOUT_MS = 300_000;

/**
 * Parse a timeout-millisecond value from an environment variable.
 *
 * Falls back to the default when:
 *   - the variable is unset
 *   - the variable is an empty or whitespace-only string (the `??` operator
 *     does NOT substitute for an empty string, which would otherwise coerce
 *     to 0 and cause every fetch to abort on the first tick)
 *   - the variable is not a finite positive number (e.g. "banana" parses to
 *     NaN, which AbortSignal.timeout rejects with RangeError at request time)
 *
 * Invalid input is logged once to stderr at module load. This is deliberately
 * permissive: a misconfigured timeout should not prevent the bridge from
 * starting; it should fall back to a safe default with a clear warning.
 */
export function parseTimeoutMs(
  raw: string | undefined,
  defaultMs: number = DEFAULT_TIMEOUT_MS,
): number {
  if (raw === undefined || raw.trim() === '') return defaultMs;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    // Use console.error directly to avoid a circular import with utils/logger.
    console.error(
      `[authorclaw-mcp] WARN: AUTHORCLAW_TIMEOUT_MS=${JSON.stringify(raw)} is not a positive number; falling back to ${defaultMs}ms`,
    );
    return defaultMs;
  }
  return n;
}

export const config: Config = {
  authorclaw: {
    url: process.env.AUTHORCLAW_URL ?? 'http://authorclaw:3847',
    token: process.env.AUTHORCLAW_API_TOKEN ?? '',
    timeoutMs: parseTimeoutMs(process.env.AUTHORCLAW_TIMEOUT_MS),
  },
  server: {
    name: SERVER_NAME,
    version: SERVER_VERSION,
    iconSvgBase64: SERVER_ICON_SVG_BASE64,
  },
};
