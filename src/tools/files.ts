import type { AuthorClawClient } from '../client/authorclaw.js';

const ALLOWED_FORMATS = ['docx', 'html', 'txt'] as const;
type Format = (typeof ALLOWED_FORMATS)[number];

export const fileTools = [
  {
    name: 'authorclaw_files_list',
    description: 'List output files by workspace folder (projects, exports, research).',
    inputSchema: {
      type: 'object',
      properties: { folder: { type: 'string' } },
    },
  },
  {
    name: 'authorclaw_files_read',
    description: 'Read the content of a named output file.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    },
  },
  {
    name: 'authorclaw_files_export',
    description: 'Export a file to docx, html, or txt and return the download URL.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        format: { type: 'string', enum: ['docx', 'html', 'txt'] },
      },
      required: ['name', 'format'],
    },
  },
] as const;

type TextResult = { content: Array<{ type: 'text'; text: string }> };

export async function dispatchFileTool(
  name: string,
  args: Record<string, unknown>,
  client: AuthorClawClient,
): Promise<TextResult> {
  if (name === 'authorclaw_files_list') {
    const folder = typeof args.folder === 'string' ? args.folder : undefined;
    const list = await client.listFiles(folder);
    return { content: [{ type: 'text', text: JSON.stringify(list) }] };
  }
  if (name === 'authorclaw_files_read') {
    const file = args.name;
    if (typeof file !== 'string') throw new Error('name is required');
    const { content } = await client.readFile(file);
    return { content: [{ type: 'text', text: content }] };
  }
  if (name === 'authorclaw_files_export') {
    const file = args.name;
    const format = args.format;
    if (typeof file !== 'string') throw new Error('name is required');
    if (typeof format !== 'string' || !ALLOWED_FORMATS.includes(format as Format)) {
      throw new Error(`format must be one of ${ALLOWED_FORMATS.join(', ')}`);
    }
    const { url } = await client.exportFile(file, format as Format);
    return { content: [{ type: 'text', text: `Export ready: ${url}` }] };
  }
  throw new Error(`unknown file tool: ${name}`);
}
