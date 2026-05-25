import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

export interface CliArgs {
  transport: 'stdio' | 'sse';
  port: number;
  host: string;
  timeout: number;
  debug: boolean;
  authEnabled: boolean;
  clientId: string | undefined;
  clientSecret: string | undefined;
  issuerUrl: string | undefined;
  redirectUris: string[] | undefined;
  allowDcr: boolean;
  trustProxy: string | undefined;
}

export function parseArguments(version: string): CliArgs {
  const argv = yargs(hideBin(process.argv))
    .version(version)
    .option('transport', {
      alias: 't',
      type: 'string',
      choices: ['stdio', 'sse'] as const,
      description: 'Transport mode (stdio for local, sse for remote)',
      default: 'stdio',
    })
    .option('port', {
      alias: 'p',
      type: 'number',
      description: 'Port for SSE server',
      default: parseInt(process.env.PORT || '3000', 10),
    })
    .option('host', {
      type: 'string',
      description: 'Host for SSE server',
      default: process.env.HOST || '0.0.0.0',
    })
    .option('timeout', {
      type: 'number',
      description: 'Request timeout in milliseconds',
      default: parseInt(process.env.AUTHORCLAW_TIMEOUT_MS || '120000', 10),
    })
    .option('debug', {
      type: 'boolean',
      description: 'Enable debug logging',
      default: process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development',
    })
    .option('auth', {
      type: 'boolean',
      description: 'Enable OAuth authentication (SSE mode)',
      default: process.env.AUTH_ENABLED === 'true' || process.env.OAUTH_ENABLED === 'true',
    })
    .option('client-id', {
      type: 'string',
      description: 'MCP OAuth client ID',
      default: process.env.MCP_CLIENT_ID || undefined,
    })
    .option('client-secret', {
      type: 'string',
      description: 'MCP OAuth client secret',
      default: process.env.MCP_CLIENT_SECRET || undefined,
    })
    .option('issuer-url', {
      type: 'string',
      description: 'OAuth issuer URL (for HTTPS behind reverse proxy)',
      default: process.env.MCP_ISSUER_URL || undefined,
    })
    .option('redirect-uris', {
      type: 'string',
      description: 'Allowed OAuth redirect URIs (comma-separated)',
      default: process.env.MCP_REDIRECT_URIS || undefined,
    })
    .option('allow-dcr', {
      type: 'boolean',
      description:
        'Allow OAuth Dynamic Client Registration (Cursor/Windsurf compatibility, dev-only)',
      default: process.env.MCP_DANGEROUSLY_ALLOW_DCR === 'true',
    })
    .option('trust-proxy', {
      type: 'string',
      description:
        'Express trust proxy setting when behind a reverse proxy (e.g. "1", "true", or a CIDR)',
      default: process.env.TRUST_PROXY || undefined,
    })
    .help()
    .parseSync();

  return {
    transport: argv.transport as 'stdio' | 'sse',
    port: argv.port,
    host: argv.host,
    timeout: argv.timeout,
    debug: argv.debug,
    authEnabled: argv.auth,
    clientId: argv['client-id'] as string | undefined,
    clientSecret: argv['client-secret'] as string | undefined,
    issuerUrl: argv['issuer-url'] as string | undefined,
    redirectUris: argv['redirect-uris']
      ? (argv['redirect-uris'] as string)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined,
    allowDcr: argv['allow-dcr'] as boolean,
    trustProxy: argv['trust-proxy'] as string | undefined,
  };
}
