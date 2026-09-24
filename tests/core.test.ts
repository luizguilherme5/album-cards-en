import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, realpath } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { albumSchema } from '../shared/schema.js';
import { Store } from '../server/store.js';
import { Reader, EvdevDecoder } from '../server/reader.js';
import { createPkce, Spotify } from '../server/spotify.js';
import { makePdf } from '../server/pdf.js';

const album = (id = 'one', count = 12) =>
  albumSchema.parse({
    id,
    title: 'Example record',
    artist: 'Example artist',
    year: '2026',
    label: 'Independent',
    tracks: Array.from({ length: count }, (_, i) => ({
      title: `Track ${i + 1}`,
      number: (i % 23) + 1,
      disc: Math.floor(i / 23) + 1,
    })),
  });
async function store() {
  const s = await new Store(await mkdtemp(path.join(os.tmpdir(), 'cards-test-'))).open();
  s.data.albums = [album(), album('two')];
  return s;
}

test('portable albums reject invalid metadata and strip private paths', () => {
  assert.equal(
    (albumSchema.parse({ ...album(), source: '/private/music' }) as any).source,
    undefined,
  );
  assert.throws(() => albumSchema.parse({ ...album(), id: '../../secrets' }));
  assert.throws(() => albumSchema.parse({ ...album(), tracks: [{ title: 'Missing number' }] }));
});
test('atomic storage survives concurrent saves and omits secrets from public config', async () => {
  const s = await store();
  s.data.config.plexToken = 'secret';
  await Promise.all([s.save(), s.save()]);
  const reloaded = await new Store(s.directory).open();
  assert.equal(reloaded.data.albums.length, 2);
  assert.equal((s.publicConfig() as any).plexToken, undefined);
  assert.equal(s.publicConfig().hasPlexToken, true);
});
test('assignment never plays, does not overwrite without permission, and cannot reuse one card within a batch', async () => {
  const s = await store();
  let played = 0;
  const r = new Reader(s, async () => {
    played++;
  });
  r.mode('assign', ['one', 'two'], false);
  await r.scan('001234');
  assert.equal(s.data.cards['001234'], 'one');
  assert.equal(played, 0);
  await r.scan('009999');
  assert.equal(s.data.cards['009999'], 'two');
  assert.deepEqual(r.state.queue, []);
  r.mode('assign', ['two'], false);
  await assert.rejects(r.scan('001234'), /already assigned/);
  r.mode('assign', ['two', 'one'], true);
  await r.scan('008888');
  await r.scan('007777');
  assert.equal(played, 0);
});
test('playback errors do not become success state and reader recovers', async () => {
  const s = await store();
  s.data.cards['1234'] = 'one';
  s.data.cards['9876'] = 'two';
  let fail = true;
  const r = new Reader(s, async () => {
    if (fail) throw new Error('Unavailable media');
  });
  await assert.rejects(r.scan('1234'), /Unavailable/);
  assert.equal(r.state.busy, false);
  fail = false;
  await r.scan('9876');
  assert.match(r.state.message, /Playing/);
});
test('fragmented Linux keyboard events decode exactly one ID', () => {
  const found: string[] = [];
  const decoder = new EvdevDecoder((id) => found.push(id));
  const packet = (code: number, value = 1) => {
    const b = Buffer.alloc(24);
    b.writeUInt16LE(1, 16);
    b.writeUInt16LE(code, 18);
    b.writeInt32LE(value, 20);
    return b;
  };
  const data = Buffer.concat([packet(2), packet(2, 0), packet(11), packet(3), packet(28)]);
  decoder.push(data.subarray(0, 17));
  decoder.push(data.subarray(17, 70));
  decoder.push(data.subarray(70));
  assert.deepEqual(found, ['102']);
});
test('PKCE challenge matches S256 and OAuth rejects mismatched browser', async () => {
  const proof = createPkce();
  assert.equal(proof.challenge, createHash('sha256').update(proof.verifier).digest('base64url'));
  const s = await store();
  s.data.config.spotifyClientId = 'a'.repeat(32);
  const spotify = new Spotify(s, 'http://127.0.0.1:3850/auth/spotify/callback');
  const url = new URL(spotify.authorize('browser-a'));
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.has('client_secret'), false);
  await assert.rejects(
    spotify.callbackCode('code', url.searchParams.get('state')!, 'browser-b'),
    /invalid/,
  );
});
test('PDF uses actual A4 dimensions, supports multi-disc facts, refuses missing covers and overflow', async () => {
  const bytes = await makePdf([album('one', 46)], 'back', '/unused');
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 1);
  assert.ok(Math.abs(pdf.getPage(0).getWidth() - (297 * 72) / 25.4) < 0.01);
  const single = await PDFDocument.load(await makePdf([album()], 'back', '/unused', true));
  assert.ok(Math.abs(single.getPage(0).getWidth() - (54 * 72) / 25.4) < 0.01);
  await assert.rejects(makePdf([album()], 'front', '/unused'), /Missing/);
  await assert.rejects(makePdf([album('dense', 300)], 'back', '/unused'), /does not fit/);
});

test('cover images are validated, versioned, and never replaced in place', async () => {
  const { saveImage } = await import('../server/library.js');
  const sharp = (await import('sharp')).default;
  const s = await store();
  const correct = await sharp({
    create: { width: 1080, height: 1712, channels: 3, background: '#345234' },
  })
    .png()
    .toBuffer();
  const first = await saveImage(s, correct, 'one', 'vertical');
  const second = await saveImage(
    s,
    await sharp(correct).negate().png().toBuffer(),
    'one',
    'vertical',
  );
  assert.notEqual(first, second);
  assert.equal((await readFile(path.join(s.directory, 'images', first))).length, correct.length);
  await assert.rejects(
    saveImage(s, await sharp(correct).resize(100, 100).png().toBuffer(), 'one', 'vertical'),
    /1080/,
  );
});
test('repeat cards cannot consume the next assignment when overwrite is allowed', async () => {
  const s = await store();
  const r = new Reader(s, async () => {});
  r.mode('assign', ['one', 'two'], true);
  const realNow = Date.now;
  let now = realNow();
  Date.now = () => now;
  try {
    await r.scan('12345');
    now += 2000;
    await assert.rejects(r.scan('12345'), /different card/);
    assert.deepEqual(r.state.queue, ['two']);
    assert.equal(s.data.cards['12345'], 'one');
  } finally {
    Date.now = realNow;
  }
});

test('folder scanning reads WAV metadata without changing the source file', async () => {
  const { writeFile, mkdir } = await import('node:fs/promises');
  const { scan } = await import('../server/library.js');
  const s = await store();
  const folder = path.join(s.directory, 'fixture-music');
  await mkdir(folder);
  const data = Buffer.alloc(44 + 16000);
  data.write('RIFF');
  data.writeUInt32LE(data.length - 8, 4);
  data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(8000, 24);
  data.writeUInt32LE(16000, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(16000, 40);
  const file = path.join(folder, 'Test track.wav');
  await writeFile(file, data);
  const result = await scan(folder, s);
  assert.equal(result.albums, 1);
  assert.equal(result.files, 1);
  assert.equal(result.warnings.length, 0);
  assert.deepEqual(await readFile(file), data);
  const resolved = await realpath(folder);
  const imported = s.data.albums.find((a) => a.source === resolved)!;
  assert.equal(imported.tracks.length, 1);
  assert.equal(imported.tracks[0].seconds, 1);
});

test('fact sheets embed fonts for Korean and Japanese instead of missing glyphs', async () => {
  const korean = {
    ...album(),
    artist: '방탄소년단',
    tracks: [{ title: '낙원', disc: 1, number: 1 }],
  };
  const japanese = { ...album('jp'), title: '光', tracks: [{ title: '夜', disc: 1, number: 1 }] };
  const result = await PDFDocument.load(await makePdf([korean, japanese], 'back', '/unused'));
  assert.equal(result.getPageCount(), 1);
});

test('Plex decodes international titles and never forwards artwork tokens to another host', async () => {
  const { Plex } = await import('../server/plex.js');
  const s = await store();
  s.data.config.plexUrl = 'http://plex.example:32400';
  s.data.config.plexToken = 'test-token';
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (url: any) => {
    const pathname = new URL(String(url)).pathname;
    calls.push(String(url));
    return new Response(
      pathname === '/library/sections'
        ? '<MediaContainer><Directory key="1" type="artist" /></MediaContainer>'
        : pathname.endsWith('/all')
          ? '<MediaContainer><Directory ratingKey="12" title="In&#233;dito" parentTitle="Jo&#227;o" /></MediaContainer>'
          : '<MediaContainer><Directory thumb="https://elsewhere.example/private.jpg" /></MediaContainer>',
    );
  }) as typeof fetch;
  try {
    const plex = new Plex(s);
    assert.equal((await plex.albums())[0].title, 'Inédito');
    await assert.rejects(plex.cover('12', 'plex-12'), /Invalid Plex artwork path/);
    assert(calls.every((u) => new URL(u).hostname === 'plex.example'));
    assert(calls.every((u) => !u.includes('test-token')));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
