import type { AuthorClawClient } from '../client/authorclaw.js';

export const imageTools = [
  {
    name: 'authorclaw_images_generate',
    description:
      'Generate an image from a text prompt using the configured image provider (Together AI or OpenAI DALL-E). Returns filename and URL.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Image generation prompt',
        },
        provider: {
          type: 'string',
          description: 'Image provider override, e.g. "together", "openai"',
        },
        width: {
          type: 'number',
          description: 'Image width in pixels',
        },
        height: {
          type: 'number',
          description: 'Image height in pixels',
        },
        style: {
          type: 'string',
          description: 'Style modifier, e.g. "photorealistic", "painterly"',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'authorclaw_images_book_cover',
    description:
      'Generate a single book cover image. Provide a visual brief and optionally title/author/genre for context.',
    inputSchema: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description:
            'Visual brief for the cover, e.g. "A dark forest at dusk with a lantern glowing in the distance"',
        },
        title: {
          type: 'string',
          description: 'Book title (used for context, not necessarily rendered on image)',
        },
        author: {
          type: 'string',
          description: 'Author name',
        },
        genre: {
          type: 'string',
          description: 'Genre, e.g. "dark fantasy"',
        },
        style: {
          type: 'string',
          description: 'Art style',
        },
        mood: {
          type: 'string',
          description: 'Mood/tone',
        },
        era: {
          type: 'string',
          description: 'Time period setting',
        },
        palette: {
          type: 'string',
          description: 'Color palette guidance, e.g. "muted earth tones"',
        },
        avoid_imagery: {
          type: 'string',
          description: 'Elements to exclude from the image',
        },
        quality: {
          type: 'string',
          enum: ['standard', 'hd'],
          description: 'Quality level (where supported)',
        },
        provider: {
          type: 'string',
          description: 'Image provider override',
        },
      },
      required: ['description'],
    },
  },
  {
    name: 'authorclaw_images_cover_set',
    description:
      'Generate the full set of standard cover sizes (ebook 1600x2560, print 2100x2800, audiobook 3000x3000, social 1080x1080) in one call. All variants use the same visual brief for a cohesive look.',
    inputSchema: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'Visual brief for all covers',
        },
        title: {
          type: 'string',
          description: 'Book title',
        },
        author: {
          type: 'string',
          description: 'Author name',
        },
        genre: {
          type: 'string',
          description: 'Genre',
        },
        style: {
          type: 'string',
          description: 'Art style',
        },
        mood: {
          type: 'string',
          description: 'Mood/tone',
        },
        palette: {
          type: 'string',
          description: 'Color palette',
        },
        avoid_imagery: {
          type: 'string',
          description: 'Elements to exclude',
        },
        quality: {
          type: 'string',
          enum: ['standard', 'hd'],
        },
        provider: {
          type: 'string',
          description: 'Image provider override',
        },
      },
      required: ['description'],
    },
  },
] as const;

type TextResult = { content: Array<{ type: 'text'; text: string }> };

export async function dispatchImageTool(
  name: string,
  args: Record<string, unknown>,
  client: AuthorClawClient,
): Promise<TextResult> {
  if (name === 'authorclaw_images_generate') {
    const prompt = args.prompt;
    if (typeof prompt !== 'string') throw new Error('prompt is required');
    const opts = {
      provider: typeof args.provider === 'string' ? args.provider : undefined,
      width: typeof args.width === 'number' ? args.width : undefined,
      height: typeof args.height === 'number' ? args.height : undefined,
      style: typeof args.style === 'string' ? args.style : undefined,
    };
    const result = await client.generateImage(prompt, opts);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
  if (name === 'authorclaw_images_book_cover') {
    const description = args.description;
    if (typeof description !== 'string') throw new Error('description is required');
    const opts = {
      title: typeof args.title === 'string' ? args.title : undefined,
      author: typeof args.author === 'string' ? args.author : undefined,
      genre: typeof args.genre === 'string' ? args.genre : undefined,
      style: typeof args.style === 'string' ? args.style : undefined,
      subgenre: typeof args.subgenre === 'string' ? args.subgenre : undefined,
      mood: typeof args.mood === 'string' ? args.mood : undefined,
      era: typeof args.era === 'string' ? args.era : undefined,
      setting: typeof args.setting === 'string' ? args.setting : undefined,
      keyImagery: typeof args.keyImagery === 'string' ? args.keyImagery : undefined,
      palette: typeof args.palette === 'string' ? args.palette : undefined,
      avoidImagery: typeof args.avoid_imagery === 'string' ? args.avoid_imagery : undefined,
      includeText: typeof args.includeText === 'boolean' ? args.includeText : undefined,
      typographyNote: typeof args.typographyNote === 'string' ? args.typographyNote : undefined,
      quality: typeof args.quality === 'string' ? args.quality : undefined,
      provider: typeof args.provider === 'string' ? args.provider : undefined,
    };
    const result = await client.generateBookCover(description, opts);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
  if (name === 'authorclaw_images_cover_set') {
    const description = args.description;
    if (typeof description !== 'string') throw new Error('description is required');
    const opts: Record<string, unknown> = {
      title: typeof args.title === 'string' ? args.title : undefined,
      author: typeof args.author === 'string' ? args.author : undefined,
      genre: typeof args.genre === 'string' ? args.genre : undefined,
      style: typeof args.style === 'string' ? args.style : undefined,
      mood: typeof args.mood === 'string' ? args.mood : undefined,
      palette: typeof args.palette === 'string' ? args.palette : undefined,
      avoidImagery: typeof args.avoid_imagery === 'string' ? args.avoid_imagery : undefined,
      quality: typeof args.quality === 'string' ? args.quality : undefined,
      provider: typeof args.provider === 'string' ? args.provider : undefined,
    };
    const result = await client.generateCoverSet(description, opts);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
  throw new Error(`unknown images tool: ${name}`);
}
