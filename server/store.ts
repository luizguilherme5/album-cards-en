import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { configSchema, type Config, type LibraryAlbum } from '../shared/schema.js';

export type Tokens = { access_token: string; refresh_token: string; expiresAt: number };
export type Database = {
  version: 1;
  albums: LibraryAlbum[];
  cards: Record<string, string>;
  config: Config;
  spotify?: Tokens;
};
export class Store {
  data!: Database;
  private pending = Promise.resolve();
  constructor(readonly directory: string) {}
  async open() {
    await mkdir(path.join(this.directory, 'images'), { recursive: true, mode: 0o700 });
    try {
      this.data = JSON.parse(await readFile(path.join(this.directory, 'library.json'), 'utf8'));
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error; // Never replace a damaged library with an empty one.
      this.data = { version: 1, albums: [], cards: {}, config: configSchema.parse({}) };
    }
    if (this.data.version !== 1) throw new Error('Unsupported library version');
    this.data.config = configSchema.parse(this.data.config);
    return this;
  }
  save() {
    const snapshot = JSON.stringify(this.data, null, 2);
    const write = async () => {
      const target = path.join(this.directory, 'library.json');
      await writeFile(target + '.tmp', snapshot, { mode: 0o600 });
      await rename(target + '.tmp', target);
    };
    this.pending = this.pending.catch(() => {}).then(write);
    return this.pending;
  }
  publicConfig() {
    const { plexToken, ...config } = this.data.config;
    return {
      ...config,
      hasPlexToken: Boolean(plexToken),
      spotifyConnected: Boolean(this.data.spotify),
    };
  }
}
