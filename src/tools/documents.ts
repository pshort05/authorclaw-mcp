import type { AuthorClawClient } from '../client/authorclaw.js';

export const documentTools = [
  {
    name: 'authorclaw_documents_upload',
    description:
      'Upload a manuscript or document file (.txt, .md, or .docx) to the AuthorClaw document library. Returns word count and a preview. Large files (>15K words) are stored in the library for on-demand AI access.',
    inputSchema: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: 'Filename including extension, e.g. "my-novel.docx"',
        },
        content_base64: {
          type: 'string',
          description: 'File content as a base64-encoded string',
        },
      },
      required: ['filename', 'content_base64'],
    },
  },
  {
    name: 'authorclaw_documents_delete',
    description: 'Delete a document from the AuthorClaw document library.',
    inputSchema: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: 'Filename to delete (exact name from documents list)',
        },
      },
      required: ['filename'],
    },
  },
] as const;

type TextResult = { content: Array<{ type: 'text'; text: string }> };

export async function dispatchDocumentTool(
  name: string,
  args: Record<string, unknown>,
  client: AuthorClawClient,
): Promise<TextResult> {
  if (name === 'authorclaw_documents_upload') {
    const filename = args.filename;
    const content_base64 = args.content_base64;
    if (typeof filename !== 'string') throw new Error('filename is required');
    if (typeof content_base64 !== 'string') throw new Error('content_base64 is required');
    const buffer = Buffer.from(content_base64, 'base64');
    const result = await client.uploadDocument(buffer, filename);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
  if (name === 'authorclaw_documents_delete') {
    const filename = args.filename;
    if (typeof filename !== 'string') throw new Error('filename is required');
    const result = await client.deleteDocument(filename);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
  throw new Error(`unknown documents tool: ${name}`);
}
