import type { AuthorClawClient } from '../client/authorclaw.js';

export const audioTools = [
  {
    name: 'authorclaw_audio_voices',
    description:
      'List all available TTS voices. Returns Edge TTS presets (always available) plus ElevenLabs voices when an ElevenLabs API key is configured.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'authorclaw_audio_generate',
    description:
      'Generate text-to-speech audio from text using Edge TTS (free) or ElevenLabs (requires API key). Returns a filename and playback URL.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text to convert to speech (max 50,000 characters)',
        },
        voice: {
          type: 'string',
          description: 'Voice ID or preset name, e.g. "narrator_female", "en-US-AriaNeural"',
        },
        provider: {
          type: 'string',
          enum: ['edge', 'elevenlabs'],
          description: 'TTS provider. Defaults to active provider.',
        },
        persona_id: {
          type: 'string',
          description: "If provided, uses the persona's configured TTS voice",
        },
        project_id: {
          type: 'string',
          description: "If provided, resolves voice from project's linked persona",
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'authorclaw_audio_get',
    description: 'Get the URL for a previously generated audio file.',
    inputSchema: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: 'Audio filename returned by authorclaw_audio_generate',
        },
      },
      required: ['filename'],
    },
  },
] as const;

type TextResult = { content: Array<{ type: 'text'; text: string }> };

export async function dispatchAudioTool(
  name: string,
  args: Record<string, unknown>,
  client: AuthorClawClient,
): Promise<TextResult> {
  if (name === 'authorclaw_audio_voices') {
    const result = await client.listVoices();
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
  if (name === 'authorclaw_audio_generate') {
    const text = args.text;
    if (typeof text !== 'string') throw new Error('text is required');
    const opts = {
      voice: typeof args.voice === 'string' ? args.voice : undefined,
      provider: typeof args.provider === 'string' ? args.provider : undefined,
      personaId: typeof args.persona_id === 'string' ? args.persona_id : undefined,
      projectId: typeof args.project_id === 'string' ? args.project_id : undefined,
    };
    const result = await client.generateAudio(text, opts);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
  if (name === 'authorclaw_audio_get') {
    const filename = args.filename;
    if (typeof filename !== 'string') throw new Error('filename is required');
    const url = await client.getAudioFile(filename);
    return { content: [{ type: 'text', text: JSON.stringify({ url }) }] };
  }
  throw new Error(`unknown audio tool: ${name}`);
}
