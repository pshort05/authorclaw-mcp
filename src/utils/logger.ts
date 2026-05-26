let debugEnabled = false;

/**
 * Patterns that may indicate sensitive data in log messages.
 * These are redacted to prevent credential leaks in logs.
 */
const SENSITIVE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /api[_-]?key["\s:=]+[A-Za-z0-9\-._~+/]{8,}/gi,
  /token["\s:=]+[A-Za-z0-9\-._~+/]{8,}/gi,
  /secret["\s:=]+[A-Za-z0-9\-._~+/]{8,}/gi,
  /password["\s:=]+\S+/gi,
  // Bare provider-format keys. These appear without a keyword prefix when a
  // user pastes a key directly into chat content (SI-10, AU-12).
  /\bsk-[A-Za-z0-9_-]{20,}/g, // OpenAI, Anthropic, OpenRouter, Perplexity, etc.
  /\bxai-[A-Za-z0-9_-]{20,}/g, // xAI
  /\bAIza[A-Za-z0-9_-]{20,}/g, // Google AI / Gemini
  /\bghp_[A-Za-z0-9]{20,}/g, // GitHub personal access tokens
  /\bgho_[A-Za-z0-9]{20,}/g, // GitHub OAuth tokens
  /\bghs_[A-Za-z0-9]{20,}/g, // GitHub App server tokens
  /\bghr_[A-Za-z0-9]{20,}/g, // GitHub refresh tokens
  /\bglpat-[A-Za-z0-9_-]{20,}/g, // GitLab personal access tokens
  /\bAKIA[0-9A-Z]{16}/g, // AWS access key ID
];

function sanitizeLogMessage(message: string): string {
  let sanitized = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}

export function log(message: string): void {
  console.error(`[authorclaw-mcp] ${sanitizeLogMessage(message)}`);
}

export function setDebugEnabled(enabled: boolean): void {
  debugEnabled = enabled;
}

export function isDebugEnabled(): boolean {
  return debugEnabled;
}

export function logDebug(messageOrFactory: string | (() => string)): void {
  if (!debugEnabled) {
    return;
  }
  const message = typeof messageOrFactory === 'function' ? messageOrFactory() : messageOrFactory;
  console.error(`[authorclaw-mcp] DEBUG: ${sanitizeLogMessage(message)}`);
}

export function logError(message: string, error?: unknown): void {
  console.error(`[authorclaw-mcp] ERROR: ${sanitizeLogMessage(message)}`);
  if (error) {
    // Only log the error message, not the full object (which may contain request/response bodies)
    if (error instanceof Error) {
      console.error(`[authorclaw-mcp] ${sanitizeLogMessage(error.message)}`);
    } else {
      console.error('[authorclaw-mcp] (non-Error object thrown)');
    }
  }
}
