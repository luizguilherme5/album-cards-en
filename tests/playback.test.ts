import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { albumSchema, configSchema } from '../shared/schema.js';
import { Store } from '../server/store.js';
import { Playback } from '../server/playback.js';
import { selectReader, EvdevDecoder } from '../server/reader.js';
import { Spotify } from '../server/spotify.js';

test('mixed cards route independently, hand off audio first and never play during assignment', async () => {
  const s = await new Store(await mkdtemp(path.join(os.tmpdir(), 'mixed-cards-'))).open();
  s.data.config.provider = 'plex';
  s.data.albums = [
    albumSchema.parse({
      id: 'local',
      title: 'Local',
      artist: 'Artist',
      plexKey: '123',
      tracks: [],
    }),
    albumSchema.parse({
      id: 'stream',
      title: 'Stream',
      artist: 'Artist',
      spotifyId: 'a'.repeat(22),
      tracks: [],
    }),
  ];
  const calls: string[] = [];
  const p = new Playback(
    s,
    {
      play: async () => {
        calls.push('spotify');
      },
      pause: async () => {},
    },
    {
      play: async () => {
        calls.push('plex');
      },
      pause: async () => {},
    },
    async (provider) => {
      calls.push('audio:' + provider);
    },
  );
  await p.play('local', 0);
  await p.play('stream', 0);
  await p.play('local', 0);
  assert.deepEqual(calls, ['audio:plex', 'plex', 'audio:spotify', 'spotify', 'audio:plex', 'plex']);
  s.data.albums[1].playbackProvider = 'plex';
  await assert.rejects(p.play('stream', 0), /Plex album/);
});
test('audio handoff failure does not issue play and permits a later retry', async () => {
  const s = await new Store(await mkdtemp(path.join(os.tmpdir(), 'handoff-'))).open();
  s.data.albums = [
    albumSchema.parse({ id: 'one', title: 'One', artist: 'Artist', plexKey: '1', tracks: [] }),
  ];
  let fail = true,
    played = 0;
  const player = {
    play: async () => {
      played++;
    },
    pause: async () => {},
  };
  const p = new Playback(s, player, player, async () => {
    if (fail) throw new Error('USB busy');
  });
  await assert.rejects(p.play('one', 0), /USB busy/);
  assert.equal(played, 0);
  fail = false;
  await p.play('one', 0);
  assert.equal(played, 1);
});
test('USB reader reconnects to its identity and never follows a reused event number to a keyboard', () => {
  const cfg = configSchema.parse({
    readerPath: '/dev/input/event2',
    readerVendorId: '1a86',
    readerProductId: '2366',
    readerName: 'RFID',
  });
  const keyboard = {
    path: '/dev/input/event2',
    vendorId: 'abcd',
    productId: 'abcd',
    name: 'Keyboard',
  };
  const reader = { path: '/dev/input/event5', vendorId: '1a86', productId: '2366', name: 'RFID' };
  assert.equal(selectReader([keyboard, reader], cfg), reader);
  assert.equal(selectReader([keyboard], cfg), undefined);
  assert.equal(selectReader([reader, { ...reader, path: '/dev/input/event6' }], cfg), undefined);
});
test('keypad events work; invalid and stale partial IDs never combine into a card', () => {
  let now = 2000;
  const old = Date.now;
  Date.now = () => now;
  try {
    const found: string[] = [];
    const d = new EvdevDecoder((id) => found.push(id));
    const key = (code: number) => {
      const b = Buffer.alloc(24);
      b.writeUInt16LE(1, 16);
      b.writeUInt16LE(code, 18);
      b.writeInt32LE(1, 20);
      return b;
    };
    d.push(Buffer.concat([key(79), key(80), key(82), key(96)]));
    d.push(Buffer.concat([key(2), key(30), key(3), key(28)]));
    d.push(key(2));
    now += 2000;
    d.push(Buffer.concat([key(3), key(4), key(28)]));
    assert.deepEqual(found, ['120', '23']);
  } finally {
    Date.now = old;
  }
});
test('Spotify reconnects only to a unique saved receiver, never another active device', async () => {
  const s = await new Store(await mkdtemp(path.join(os.tmpdir(), 'spotify-device-'))).open();
  s.data.config.spotifyDeviceId = 'expired';
  s.data.config.spotifyDeviceName = 'My speaker';
  const spotify = new Spotify(s, 'http://127.0.0.1:3850/auth/spotify/callback');
  const calls: string[] = [];
  spotify.api = async (route) => {
    calls.push(route);
    return {
      devices: [
        { id: 'phone', name: 'Phone', is_active: true },
        { id: 'new-id', name: 'My speaker' },
      ],
    };
  };
  await spotify.play('a'.repeat(22), 0);
  assert.equal(s.data.config.spotifyDeviceId, 'new-id');
  assert.equal(calls.at(-1), '/me/player/play?device_id=new-id');
  spotify.api = async () => ({ devices: [{ id: 'phone', name: 'Phone', is_active: true }] });
  await assert.rejects(spotify.play('a'.repeat(22), 0), /selected device/);
});
