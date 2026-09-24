import express from 'express';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import locale from '../locale.json';
import { z } from 'zod';
import { Store } from './store.js';
import { browse, scan, saveImage } from './library.js';
import { Spotify } from './spotify.js';
import { Plex } from './plex.js';
import { Reader, discoverReaders } from './reader.js';
import { makePdf } from './pdf.js';
import { albumSchema, configSchema } from '../shared/schema.js';

const port = Number(process.env.PORT || 3850);
const host = process.env.BIND_ADDRESS || '127.0.0.1';
const origin = process.env.APP_ORIGIN || `http://127.0.0.1:${port}`;
// Local-first: do not expose file browsing and playback controls to an untrusted network.
if (!['127.0.0.1', '::1', 'localhost'].includes(host))
  throw new Error(
    'This release supports loopback only. Use an authenticated tunnel for remote access.',
  );
const store = await new Store(path.resolve(process.env.DATA_DIR || 'data')).open();
const spotify = new Spotify(store, origin + '/auth/spotify/callback');
const plex = new Plex(store);
const play = async (id: string, position: number) => {
  const album = store.data.albums.find((a) => a.id === id);
  if (!album) throw new Error('Album not found.');
  if (store.data.config.provider === 'spotify') {
    if (!album.spotifyId) throw new Error('Add the Spotify album ID in album details.');
    await spotify.play(album.spotifyId, position);
  } else {
    if (!album.plexKey) throw new Error('Add the Plex album rating key in album details.');
    await plex.play(album.plexKey, position);
  }
};
const reader = new Reader(store, play);
setInterval(() => void reader.reconnect(), 2000).unref();
const app = express();
const server = createServer(app);
const csrf = randomBytes(24).toString('hex');
app.disable('x-powered-by');
app.use((req, res, next) => {
  const hostname = req.hostname;
  if (hostname === 'localhost' && req.method === 'GET' && req.path === '/')
    return res.redirect(origin + req.originalUrl);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(hostname))
    return res.status(403).json({ error: 'Invalid host' });
  if (req.headers.origin && ![origin, `http://localhost:${port}`].includes(req.headers.origin))
    return res.status(403).json({ error: 'Cross-origin request denied' });
  if (req.path.startsWith('/api') && req.method !== 'GET' && req.headers['x-album-cards'] !== csrf)
    return res.status(403).json({ error: 'Reload the application before saving.' });
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
app.use(express.json({ limit: '16mb' }));
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/state', (_req, res) =>
  res.json({
    csrf,
    locale: process.env.DEFAULT_LOCALE || locale.defaultLocale,
    albums: store.data.albums,
    cards: store.data.cards,
    config: store.publicConfig(),
    reader: reader.state,
    callback: spotify.callback,
  }),
);
app.get('/api/folders', async (req, res) =>
  res.json(await browse(String(req.query.path || os.homedir()))),
);
let scanning = false;
app.post('/api/scan', async (req, res) => {
  if (scanning) return res.status(409).json({ error: 'A scan is already running.' });
  const directory = z.string().min(1).parse(req.body.path);
  scanning = true;
  try {
    res.json(await scan(directory, store));
  } finally {
    scanning = false;
  }
});
app.post('/api/albums', async (req, res) => {
  const album = albumSchema.parse(req.body);
  album.tracks.sort((a, b) => a.disc - b.disc || a.number - b.number);
  const old = store.data.albums.find((a) => a.id === album.id);
  if (old) Object.assign(old, album);
  else store.data.albums.push(album);
  await store.save();
  res.json({ ok: true });
});
app.get('/api/albums/:id/export', (req, res) => {
  const album = store.data.albums.find((a) => a.id === req.params.id);
  if (!album) return res.sendStatus(404);
  res.attachment(`${album.id}.json`).json(albumSchema.parse(album));
});
app.post('/api/albums/:id/image', async (req, res) => {
  const album = store.data.albums.find((a) => a.id === req.params.id);
  if (!album) return res.sendStatus(404);
  const input = z
    .object({ kind: z.enum(['original', 'vertical']), data: z.string().startsWith('data:image/') })
    .parse(req.body);
  const encoded = input.data.split(',')[1];
  if (!encoded) throw new Error('Missing image data.');
  album[input.kind] = await saveImage(store, Buffer.from(encoded, 'base64'), album.id, input.kind);
  await store.save();
  res.json({ ok: true });
});
app.use(
  '/images',
  express.static(path.join(store.directory, 'images'), {
    immutable: true,
    maxAge: '1y',
    dotfiles: 'deny',
  }),
);
app.post('/api/config', async (req, res) => {
  const input = configSchema.partial().parse(req.body);
  if (input.readerPath && !(await discoverReaders()).some((r) => r.path === input.readerPath))
    throw new Error('Choose an input device from the list.');
  if (
    input.spotifyClientId !== undefined &&
    input.spotifyClientId !== store.data.config.spotifyClientId
  )
    delete store.data.spotify;
  store.data.config = configSchema.parse({ ...store.data.config, ...input });
  await store.save();
  res.json({ ok: true });
});
app.get('/api/readers', async (_req, res) => res.json(await discoverReaders()));
app.post('/api/reader/mode', (req, res) => {
  const data = z
    .object({
      mode: z.enum(['play', 'assign']),
      queue: z.array(z.string()).max(50).default([]),
      overwrite: z.boolean().default(false),
    })
    .parse(req.body);
  if (data.queue.some((id) => !store.data.albums.some((a) => a.id === id)))
    throw new Error('Unknown album in assignment queue.');
  reader.mode(data.mode, data.queue, data.overwrite);
  res.json({ ok: true });
});
app.post('/api/reader/scan', async (req, res) => {
  if (reader.state.source === 'linux')
    throw new Error('Linux reader active; browser scans are disabled to prevent double playback.');
  await reader.scan(z.string().parse(req.body.id));
  res.json({ ok: true });
});
app.post('/api/play', async (req, res) => {
  await play(z.string().parse(req.body.id), 0);
  res.json({ ok: true });
});
app.post('/api/spotify/connect', (req, res) => {
  const browser = randomBytes(24).toString('hex');
  const url = spotify.authorize(browser);
  res.cookie('album_oauth', browser, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 600000,
    secure: origin.startsWith('https:'),
  });
  res.json({ url });
});
app.get('/auth/spotify/callback', async (req, res) => {
  const browser =
    req.headers.cookie
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('album_oauth='))
      ?.split('=')[1] || '';
  if (req.query.error)
    return res
      .status(400)
      .send('Spotify authorization cancelled. Return to the application and try again.');
  await spotify.callbackCode(
    z.string().parse(req.query.code),
    z.string().parse(req.query.state),
    browser,
  );
  res.clearCookie('album_oauth');
  res.redirect('/?connected=spotify');
});
app.post('/api/spotify/disconnect', async (_req, res) => {
  delete store.data.spotify;
  await store.save();
  res.json({ ok: true });
});
app.get('/api/spotify/devices', async (_req, res) =>
  res.json(await spotify.api('/me/player/devices')),
);
app.post('/api/spotify/import', async (req, res) => {
  const id = z
    .string()
    .regex(/^[a-zA-Z0-9]{22}$/)
    .parse(req.body.id);
  const remote = await spotify.api('/albums/' + id);
  const tracks = [...remote.tracks.items];
  let offset = tracks.length;
  while (offset < remote.tracks.total) {
    const batch = await spotify.api(`/albums/${id}/tracks?limit=50&offset=${offset}`);
    if (!batch.items.length) break;
    tracks.push(...batch.items);
    offset = tracks.length;
  }
  const album = albumSchema.parse({
    id: 'spotify-' + id,
    spotifyId: id,
    title: remote.name,
    artist: remote.artists.map((a: any) => a.name).join(', '),
    year: remote.release_date?.slice(0, 4) || '',
    label: remote.label || '',
    tracks: tracks.map((t: any) => ({
      title: t.name,
      disc: t.disc_number,
      number: t.track_number,
      seconds: t.duration_ms / 1000,
    })),
  });
  const old = store.data.albums.find((a) => a.id === album.id);
  if (old) Object.assign(old, album);
  else store.data.albums.push(album);
  await store.save();
  res.json({ ok: true });
});
app.post('/api/plex/import', async (_req, res) => {
  const albums = await plex.albums();
  for (const album of albums) {
    const tracks = await plex.tracks(album.plexKey);
    const parsed = albumSchema.parse({
      ...album,
      tracks: tracks.map((t) => ({
        title: t.title,
        disc: Number(t.parentIndex || 1),
        number: Number(t.index),
        seconds: Number(t.duration || 0) / 1000,
      })),
    });
    const old = store.data.albums.find((a) => a.id === parsed.id);
    if (old) Object.assign(old, parsed);
    else store.data.albums.push(parsed);
  }
  await store.save();
  res.json({ albums: albums.length });
});
let printing = false;
app.post('/api/pdf', async (req, res) => {
  const input = z
    .object({
      ids: z.array(z.string()).min(1).max(50),
      kind: z.enum(['front', 'back']),
      single: z.boolean().default(false),
      mirror: z.boolean().default(false),
    })
    .parse(req.body);
  if (printing) return res.status(409).json({ error: 'A PDF is already being prepared.' });
  const albums = input.ids.map((id) => {
    const a = store.data.albums.find((a) => a.id === id);
    if (!a) throw new Error('Album not found.');
    return a;
  });
  printing = true;
  try {
    const pdf = await makePdf(
      albums,
      input.kind,
      path.join(store.directory, 'images'),
      input.single,
      input.mirror,
    );
    res
      .type('pdf')
      .set('Content-Disposition', `inline; filename="album-cards-${input.kind}.pdf"`)
      .send(Buffer.from(pdf));
  } finally {
    printing = false;
  }
});
app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown API route' }));
if (process.argv.includes('--production')) app.use(express.static('dist'));
else {
  const { createServer: createVite } = await import('vite');
  const vite = await createVite({
    server: { middlewareMode: true, hmr: { server } },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(400).json({
    error:
      error instanceof z.ZodError
        ? error.issues.map((i) => i.path.join('.') + ': ' + i.message).join('; ')
        : error.message || 'Request failed',
  });
});
server.listen(port, host, () => console.log(`Album Cards: ${origin}`));
