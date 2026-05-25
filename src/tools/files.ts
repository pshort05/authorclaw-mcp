import type { AuthorClawClient } from '../client/authorclaw.js';

export const fileTools = [
  {
    name: 'authorclaw_files_list',
    description: 'List documents in the AuthorClaw document library.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'authorclaw_files_read',
    description: 'Download and read the content of a project output file.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID the file belongs to' },
        filename: { type: 'string', description: 'Filename within the project (e.g. manuscript.md)' },
      },
      required: ['project_id', 'filename'],
    },
  },
  {
    name: 'authorclaw_files_export',
    description: 'Export a project file as a DOCX document and return the download URL.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID the file belongs to' },
        filename: { type: 'string', description: 'Source filename within the project (e.g. manuscript.md)' },
      },
      required: ['project_id', 'filename'],
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
    const list = await client.listFiles();
    return { content: [{ type: 'text', text: JSON.stringify(list) }] };
  }
  if (name === 'authorclaw_files_read') {
    const projectId = args.project_id;
    const filename = args.filename;
    if (typeof projectId !== 'string') throw new Error('project_id is required');
    if (typeof filename !== 'string') throw new Error('filename is required');
    const stream = await client.readFile(projectId, filename);
    // Collect the stream into a string
    const chunks: Buffer[] = [];
    for await (const chunk of stream as unknown as AsyncIterable<Buffer>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return { content: [{ type: 'text', text: Buffer.concat(chunks).toString('utf-8') }] };
  }
  if (name === 'authorclaw_files_export') {
    const projectId = args.project_id;
    const filename = args.filename;
    if (typeof projectId !== 'string') throw new Error('project_id is required');
    if (typeof filename !== 'string') throw new Error('filename is required');
    const { downloadUrl } = await client.exportDocx(projectId, filename);
    return { content: [{ type: 'text', text: `Export ready: ${downloadUrl}` }] };
  }
  throw new Error(`unknown file tool: ${name}`);
}
