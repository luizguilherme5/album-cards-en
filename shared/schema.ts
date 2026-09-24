import { z } from 'zod';

// One portable album file. Paths and credentials never belong in this format.
export const trackSchema = z.object({
  title: z.string().trim().min(1).max(300),
  disc: z.number().int().min(1).max(99).default(1),
  number: z.number().int().min(1).max(999),
  seconds: z.number().nonnegative().max(86400).optional(),
});
export const albumSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  title: z.string().trim().min(1).max(300),
  artist: z.string().trim().min(1).max(300),
  year: z.string().max(20).default(''),
  label: z.string().max(300).default(''),
  tracks: z.array(trackSchema).max(300),
  spotifyId: z
    .string()
    .regex(/^[a-zA-Z0-9]{22}$/)
    .optional()
    .or(z.literal('')),
  plexKey: z.string().regex(/^\d+$/).optional().or(z.literal('')),
});
export type Album = z.infer<typeof albumSchema>;
export type LibraryAlbum = Album & {
  original?: string;
  vertical?: string;
  artSource?: string;
  source?: string;
};
export const CARD = { widthMm: 54, heightMm: 85.6, widthPx: 1080, heightPx: 1712 };
export const configSchema = z.object({
  provider: z.enum(['spotify', 'plex']).default('spotify'),
  spotifyClientId: z.string().max(80).default(''),
  spotifyDeviceId: z.string().max(200).default(''),
  plexUrl: z.string().max(300).default(''),
  plexToken: z.string().max(300).default(''),
  calderaUrl: z.string().max(300).default(''),
  calderaClientId: z.string().max(200).default(''),
  readerPath: z.string().max(300).default(''),
});
export type Config = z.infer<typeof configSchema>;
export type ReaderState = {
  source: 'keyboard' | 'linux';
  connected: boolean;
  message: string;
  lastId?: string;
  lastAt?: number;
  busy: boolean;
  mode: 'play' | 'assign';
  queue: string[];
  overwrite: boolean;
};
