import { createReadStream, type ReadStream } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import type { ReaderState } from '../shared/schema.js';
import type { Store } from './store.js';

// USB keyboard readers send a sequence of key presses followed by Enter.
// This decoder handles fragmented Linux input_event packets (64-bit hosts).
export class EvdevDecoder {
  private bytes = Buffer.alloc(0);
  private digits = '';
  constructor(private scanned: (id: string) => void) {}
  push(chunk: Buffer) {
    this.bytes = Buffer.concat([this.bytes, chunk]);
    while (this.bytes.length >= 24) {
      const event = this.bytes.subarray(0, 24);
      this.bytes = this.bytes.subarray(24);
      if (event.readUInt16LE(16) !== 1 || event.readInt32LE(20) !== 1) continue;
      const code = event.readUInt16LE(18);
      if (code >= 2 && code <= 11) this.digits += String((code - 1) % 10);
      if (this.digits.length > 64) this.digits = '';
      if (code === 28 || code === 96) {
        if (this.digits) this.scanned(this.digits);
        this.digits = '';
      }
    }
  }
}
export async function discoverReaders() {
  if (process.platform !== 'linux') return [];
  const paths: { path: string; name: string }[] = [];
  for (const name of await readdir('/sys/class/input').catch(() => [])) {
    if (!/^event\d+$/.test(name)) continue;
    const label = await readFile(`/sys/class/input/${name}/device/name`, 'utf8').catch(
      () => 'Unknown',
    );
    paths.push({ path: `/dev/input/${name}`, name: label.trim() });
  }
  const aliases = await readdir('/dev/input/by-id').catch(() => []);
  for (const name of aliases.filter((n) => n.endsWith('-event-kbd')))
    paths.unshift({ path: '/dev/input/by-id/' + name, name });
  return paths;
}
export class Reader {
  state: ReaderState = {
    source: 'keyboard',
    connected: false,
    message: 'Ready for a keyboard scan',
    busy: false,
    mode: 'play',
    queue: [],
    overwrite: false,
  };
  private stream?: ReadStream;
  private device = '';
  private lastScan = { id: '', time: 0 };
  private assignmentUntil = 0;
  private assigned = new Set<string>();
  private lastPlay = { album: '', position: -1 };
  constructor(
    private store: Store,
    private play: (id: string, position: number) => Promise<void>,
  ) {}
  mode(mode: 'play' | 'assign', queue: string[], overwrite: boolean) {
    if (this.state.busy) throw new Error('Reader is busy.');
    this.state.mode = mode;
    this.state.queue = queue;
    this.state.overwrite = overwrite;
    this.assignmentUntil = Date.now() + 300000;
    this.assigned.clear();
  }
  async scan(id: string) {
    if (!/^[a-zA-Z0-9_-]{3,64}$/.test(id) || ['__proto__', 'constructor', 'prototype'].includes(id))
      throw new Error('Invalid card ID.');
    if (this.state.busy) return;
    if (id === this.lastScan.id && Date.now() - this.lastScan.time < 1500) return;
    this.lastScan = { id, time: Date.now() };
    this.state.lastId = id;
    this.state.lastAt = Date.now();
    this.state.busy = true;
    try {
      if (this.state.mode === 'assign') {
        if (Date.now() > this.assignmentUntil) {
          this.state.queue = [];
          throw new Error('Assignment expired. Start a new session.');
        }
        if (this.assigned.has(id)) throw new Error('Use a different card for the next album.');
        const albumId = this.state.queue[0];
        if (!albumId) throw new Error('Assignment finished. Choose playback mode to listen.');
        if (this.store.data.cards[id] && !this.state.overwrite)
          throw new Error('Card already assigned. Enable overwrite to replace it.');
        if (this.store.data.cards[id] === albumId)
          throw new Error('This card already belongs to this album.');
        this.store.data.cards[id] = albumId;
        await this.store.save();
        this.assigned.add(id);
        this.state.queue.shift();
        this.state.message =
          'Assigned: ' + this.store.data.albums.find((a) => a.id === albumId)?.title;
      } else {
        const albumId = this.store.data.cards[id];
        const album = this.store.data.albums.find((a) => a.id === albumId);
        if (!album) throw new Error('Unassigned card. Select an album in assignment mode.');
        let position = 0;
        if (this.lastPlay.album === albumId && album.tracks.length > 1) {
          const choices = album.tracks.map((_, i) => i).filter((i) => i !== this.lastPlay.position);
          position = choices[Math.floor(Math.random() * choices.length)];
        }
        await this.play(albumId, position);
        this.lastPlay = { album: albumId, position };
        this.state.message = 'Playing: ' + album.title;
      }
    } catch (error: any) {
      this.state.message = error.message;
      throw error;
    } finally {
      this.state.busy = false;
    }
  }
  async reconnect() {
    const configured = this.store.data.config.readerPath;
    if (this.stream && this.device === configured) return;
    this.stream?.destroy();
    this.stream = undefined;
    this.device = configured;
    if (!configured || process.platform !== 'linux') {
      this.state.source = 'keyboard';
      this.state.connected = false;
      return;
    }
    this.state.source = 'linux';
    const devices = await discoverReaders();
    if (!devices.some((d) => d.path === configured)) {
      this.state.connected = false;
      this.state.message = 'USB reader disconnected';
      return;
    }
    const decoder = new EvdevDecoder((id) => {
      void this.scan(id).catch(() => {});
    });
    const stream = createReadStream(configured);
    this.stream = stream;
    stream.on('open', () => {
      this.state.connected = true;
      this.state.message = 'USB reader connected';
    });
    stream.on('data', (data) => decoder.push(data as Buffer));
    const close = () => {
      if (this.stream === stream) {
        this.stream = undefined;
        this.state.connected = false;
      }
    };
    stream.on('error', () => {
      this.state.message = 'Cannot read device. Check Linux input permissions.';
      close();
    });
    stream.on('close', close);
  }
}
