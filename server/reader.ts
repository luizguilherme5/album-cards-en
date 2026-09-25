import { createReadStream, type ReadStream } from 'node:fs';
import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import type { Config, ReaderState } from '../shared/schema.js';
import type { Store } from './store.js';

// USB keyboard readers send a sequence of key presses followed by Enter.
// This decoder handles fragmented Linux input_event packets (64-bit hosts).
export class EvdevDecoder {
  private bytes = Buffer.alloc(0);
  private digits = '';
  private lastKey = 0;
  private invalid = false;
  private dropped = false;
  constructor(private scanned: (id: string) => void) {}
  push(chunk: Buffer) {
    this.bytes = Buffer.concat([this.bytes, chunk]);
    while (this.bytes.length >= 24) {
      const event = this.bytes.subarray(0, 24);
      this.bytes = this.bytes.subarray(24);
      const type = event.readUInt16LE(16);
      const code = event.readUInt16LE(18);
      if (type === 0 && code === 3) {
        this.dropped = true;
        this.digits = '';
        this.invalid = true;
      }
      if (this.dropped) {
        if (type === 0 && code === 0) this.dropped = false;
        continue;
      }
      if (type !== 1 || event.readInt32LE(20) !== 1) continue;
      if (Date.now() - this.lastKey > 1000) {
        this.digits = '';
        this.invalid = false;
      }
      this.lastKey = Date.now();
      if (code === 28 || code === 96) {
        if (this.digits && !this.invalid) this.scanned(this.digits);
        this.digits = '';
        this.invalid = false;
        continue;
      }
      const keypad: Record<number, string> = {
        82: '0',
        79: '1',
        80: '2',
        81: '3',
        75: '4',
        76: '5',
        77: '6',
        71: '7',
        72: '8',
        73: '9',
      };
      const digit = code >= 2 && code <= 11 ? String((code - 1) % 10) : keypad[code];
      if (digit !== undefined) this.digits += digit;
      else if (![42, 54, 69].includes(code)) this.invalid = true;
      if (this.digits.length > 64) this.invalid = true;
    }
  }
}
export type InputDevice = { path: string; name: string; vendorId: string; productId: string };
export function selectReader(devices: InputDevice[], config: Config) {
  const identity = Boolean(config.readerVendorId && config.readerProductId);
  const matches = devices.filter(
    (d) =>
      !identity ||
      (d.vendorId === config.readerVendorId &&
        d.productId === config.readerProductId &&
        (!config.readerName || d.name === config.readerName)),
  );
  const exact = matches.find((d) => d.path === config.readerPath);
  return exact || (identity && matches.length === 1 ? matches[0] : undefined);
}
export async function discoverReaders(): Promise<InputDevice[]> {
  if (process.platform !== 'linux') return [];
  const paths: InputDevice[] = [];
  const aliases = await readdir('/dev/input/by-id').catch(() => []);
  const aliasTargets = await Promise.all(
    aliases
      .filter((n) => n.endsWith('-event-kbd'))
      .map(async (n) => ({
        path: '/dev/input/by-id/' + n,
        target: await realpath('/dev/input/by-id/' + n).catch(() => ''),
      })),
  );
  for (const name of await readdir('/sys/class/input').catch(() => [])) {
    if (!/^event\d+$/.test(name)) continue;
    const capabilities = await readFile(
      `/sys/class/input/${name}/device/capabilities/key`,
      'utf8',
    ).catch(() => '0');
    const keys = capabilities
      .trim()
      .split(/\s+/)
      .reduce((bits, word) => (bits << 64n) | BigInt('0x' + word), 0n);
    // Composite USB readers may expose a second consumer-control interface.
    // Only list interfaces capable of sending a number and Enter.
    if (!(keys & ((1n << 28n) | (1n << 96n))) || !(keys & ((1n << 2n) | (1n << 79n)))) continue;
    const label = await readFile(`/sys/class/input/${name}/device/name`, 'utf8').catch(
      () => 'Unknown',
    );
    const [vendorId, productId] = await Promise.all(
      ['vendor', 'product'].map((id) =>
        readFile(`/sys/class/input/${name}/device/id/${id}`, 'utf8')
          .then((v) => v.trim())
          .catch(() => ''),
      ),
    );
    paths.push({
      path:
        aliasTargets.find((a) => a.target === `/dev/input/${name}`)?.path || `/dev/input/${name}`,
      name: label.trim(),
      vendorId,
      productId,
    });
  }
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
  private identity = '';
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
    const config = this.store.data.config;
    const configured = config.readerPath;
    if (!configured || process.platform !== 'linux') {
      this.state.source = 'keyboard';
      this.state.connected = false;
      this.stream?.destroy();
      this.stream = undefined;
      return;
    }
    this.state.source = 'linux';
    const devices = await discoverReaders();
    const selected = selectReader(devices, config);
    const info = selected && (await stat(selected.path).catch(() => undefined));
    const identity = info ? `${info.dev}:${info.ino}:${info.rdev}` : '';
    if (this.stream && selected?.path === this.device && identity === this.identity) return;
    this.stream?.destroy();
    this.stream = undefined;
    if (!selected || !info) {
      this.state.connected = false;
      this.state.message = 'USB reader disconnected';
      return;
    }
    this.device = selected.path;
    this.identity = identity;
    const decoder = new EvdevDecoder((id) => {
      void this.scan(id).catch(() => {});
    });
    const stream = createReadStream(selected.path);
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
