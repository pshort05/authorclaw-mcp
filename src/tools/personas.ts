import type { AuthorClawClient } from '../client/authorclaw.js';

export const personaTools = [
  {
    name: 'authorclaw_personas_list',
    description: 'List all author personas (pen names) configured in AuthorClaw.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'authorclaw_personas_create',
    description: 'Create a new author persona (pen name) manually.',
    inputSchema: {
      type: 'object',
      properties: {
        pen_name: {
          type: 'string',
          description: 'Pen name for this persona, e.g. "J.K. Rowling"',
        },
        genre: {
          type: 'string',
          description: 'Primary genre',
        },
        sub_genre: {
          type: 'string',
          description: 'Subgenre, e.g. "cozy mystery"',
        },
        voice_description: {
          type: 'string',
          description: '1-2 sentence description of writing voice',
        },
        style_markers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Style descriptor tags, e.g. ["witty dialogue", "slow burn"]',
        },
        bio: {
          type: 'string',
          description: 'Author bio in third person (2-3 sentences)',
        },
      },
      required: ['pen_name'],
    },
  },
  {
    name: 'authorclaw_personas_generate',
    description:
      'Use AI to generate a complete author persona for a genre. Creates and saves the persona automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        genre: {
          type: 'string',
          description: 'Genre to generate a persona for, e.g. "romantic suspense"',
        },
        description: {
          type: 'string',
          description: 'Optional additional guidance, e.g. "gritty, Southern Gothic feel"',
        },
      },
      required: ['genre'],
    },
  },
  {
    name: 'authorclaw_personas_get',
    description: 'Get full details for a specific author persona.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Persona ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'authorclaw_personas_update',
    description: 'Update fields on an existing author persona.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Persona ID',
        },
        pen_name: {
          type: 'string',
        },
        genre: {
          type: 'string',
        },
        sub_genre: {
          type: 'string',
        },
        voice_description: {
          type: 'string',
        },
        style_markers: {
          type: 'array',
          items: { type: 'string' },
        },
        bio: {
          type: 'string',
        },
        tts_voice: {
          type: 'string',
          description: 'TTS voice ID for audiobook narration, e.g. "en-US-AriaNeural"',
        },
        also_by: {
          type: 'string',
          description: 'Also-by backmatter text for EPUB/DOCX exports',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'authorclaw_personas_delete',
    description: 'Delete an author persona permanently.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Persona ID',
        },
      },
      required: ['id'],
    },
  },
] as const;

type TextResult = { content: Array<{ type: 'text'; text: string }> };

export async function dispatchPersonaTool(
  name: string,
  args: Record<string, unknown>,
  client: AuthorClawClient,
): Promise<TextResult> {
  if (name === 'authorclaw_personas_list') {
    const result = await client.listPersonas();
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_personas_create') {
    const penName = args.pen_name;
    if (typeof penName !== 'string') throw new Error('pen_name is required');
    const data: Record<string, unknown> = { penName };
    if (args.genre) data.genre = args.genre;
    if (args.sub_genre) data.subGenre = args.sub_genre;
    if (args.voice_description) data.voiceDescription = args.voice_description;
    if (args.style_markers) data.styleMarkers = args.style_markers;
    if (args.bio) data.bio = args.bio;
    const result = await client.createPersona(data as { penName: string; [key: string]: unknown });
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_personas_generate') {
    const genre = args.genre;
    if (typeof genre !== 'string') throw new Error('genre is required');
    const description = typeof args.description === 'string' ? args.description : undefined;
    const result = await client.generatePersona(genre, description);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_personas_get') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const result = await client.getPersona(id);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_personas_update') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const data: Record<string, unknown> = {};
    if (args.pen_name) data.penName = args.pen_name;
    if (args.genre) data.genre = args.genre;
    if (args.sub_genre) data.subGenre = args.sub_genre;
    if (args.voice_description) data.voiceDescription = args.voice_description;
    if (args.style_markers) data.styleMarkers = args.style_markers;
    if (args.bio) data.bio = args.bio;
    if (args.tts_voice) data.ttsVoice = args.tts_voice;
    if (args.also_by) data.alsoBy = args.also_by;
    const result = await client.updatePersona(id, data);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  if (name === 'authorclaw_personas_delete') {
    const id = args.id;
    if (typeof id !== 'string') throw new Error('id is required');
    const result = await client.deletePersona(id);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }

  throw new Error(`unknown persona tool: ${name}`);
}
