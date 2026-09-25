import type { Album, Config } from '../shared/schema.js';
import type { Store } from './store.js';

// An explicit album choice wins. A single service ID is unambiguous; the
// installation default is used only when an album links to both services.
export function playbackProvider(album: Album, fallback: Config['provider']) {
  if (album.playbackProvider && album.playbackProvider !== 'auto') return album.playbackProvider;
  if (album.spotifyId && !album.plexKey) return 'spotify';
  if (album.plexKey && !album.spotifyId) return 'plex';
  return fallback;
}

type Player = { play: (id: string, position: number) => Promise<void>; pause: () => Promise<void> };
export class Playback {
  private busy = false;
  private lastProvider?: 'spotify' | 'plex';
  constructor(
    private store: Store,
    private spotify: Player,
    private plex: Player,
    private handoff?: (provider: 'spotify' | 'plex') => Promise<void>,
  ) {}
  async play(id: string, position: number) {
    if (this.busy) throw new Error('A playback command is already running.');
    const album = this.store.data.albums.find((a) => a.id === id);
    if (!album) throw new Error('Album not found.');
    const provider = playbackProvider(album, this.store.data.config.provider);
    const key = provider === 'spotify' ? album.spotifyId : album.plexKey;
    if (!key)
      throw new Error(
        `Add the ${provider === 'spotify' ? 'Spotify album ID' : 'Plex album rating key'} in album details.`,
      );
    this.busy = true;
    try {
      if (this.handoff) await this.handoff(provider);
      else if (this.lastProvider && this.lastProvider !== provider) {
        await this[this.lastProvider].pause();
      }
      await this[provider].play(key, position);
      this.lastProvider = provider;
      console.info(`Playback started: ${provider} / ${album.artist} / ${album.title}`);
    } finally {
      this.busy = false;
    }
  }
}
