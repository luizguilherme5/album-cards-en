import { XMLParser } from 'fast-xml-parser';
import type { Store } from './store.js';
import { saveImage } from './library.js';
const parser = new XMLParser({
  ignoreAttributes: false,
  htmlEntities: true,
  attributeNamePrefix: '',
  parseAttributeValue: false,
});
const array = (value: any) => (value ? (Array.isArray(value) ? value : [value]) : []);
export class Plex {
  private command = 0;
  constructor(private store: Store) {}
  private async request(base: string, route: string, target?: string) {
    const url = new URL(base);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
      throw new Error('Invalid Plex/Caldera URL.');
    const response = await fetch(new URL(route, url), {
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
      headers: {
        'X-Plex-Token': this.store.data.config.plexToken,
        'X-Plex-Client-Identifier': 'album-cards',
        'X-Plex-Product': 'Album Cards',
        ...(target ? { 'X-Plex-Target-Client-Identifier': target } : {}),
      },
    });
    if (!response.ok) throw new Error(`Plex/Caldera: HTTP ${response.status}`);
    return parser.parse(await response.text());
  }
  async players() {
    const result = await this.request(this.store.data.config.plexUrl, '/clients');
    return array(result.MediaContainer?.Server)
      .filter((p) => p.product === 'Caldera Music')
      .map((p) => ({
        name: p.name,
        id: p.machineIdentifier,
        url: `http://${p.address.includes(':') ? `[${p.address}]` : p.address}:${p.port}`,
      }));
  }
  async albums() {
    const base = this.store.data.config.plexUrl;
    const sections = array(
      (await this.request(base, '/library/sections')).MediaContainer?.Directory,
    ).filter((s) => s.type === 'artist');
    const albums = [];
    for (const section of sections) {
      const result = await this.request(base, `/library/sections/${section.key}/all?type=9`);
      for (const a of array(result.MediaContainer?.Directory))
        albums.push({
          id: `plex-${a.ratingKey}`,
          plexKey: a.ratingKey,
          title: a.title,
          artist: a.parentTitle || 'Unknown artist',
          year: a.year || '',
          label: a.studio || '',
          tracks: [],
        });
    }
    return albums;
  }
  // Fetch artwork from the configured server only; the token never reaches image URLs.
  async cover(key: string, id: string) {
    if (!/^\d+$/.test(key)) throw new Error('Invalid Plex album key.');
    const result = await this.request(this.store.data.config.plexUrl, `/library/metadata/${key}`);
    const thumb = array(result.MediaContainer?.Directory)[0]?.thumb;
    if (!thumb) return undefined;
    const base = new URL(this.store.data.config.plexUrl);
    const url = new URL(thumb, base);
    if (url.origin !== base.origin || !url.pathname.startsWith('/library/metadata/'))
      throw new Error('Invalid Plex artwork path.');
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
      headers: { 'X-Plex-Token': this.store.data.config.plexToken },
    });
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/'))
      throw new Error('Plex artwork unavailable.');
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Empty artwork.');
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 16_000_000) throw new Error('Artwork exceeds 16 MB.');
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    return saveImage(this.store, Buffer.concat(chunks), id, 'original');
  }
  async tracks(key: string) {
    const result = await this.request(
      this.store.data.config.plexUrl,
      `/library/metadata/${key}/children`,
    );
    return array(result.MediaContainer?.Track).sort(
      (a, b) =>
        Number(a.parentIndex || 1) - Number(b.parentIndex || 1) ||
        Number(a.index) - Number(b.index),
    );
  }
  async play(key: string, position: number) {
    const { plexUrl, calderaUrl, calderaClientId } = this.store.data.config;
    if (!calderaUrl || !calderaClientId) throw new Error('Configure Caldera URL and client ID.');
    const identity = (await this.request(plexUrl, '/identity')).MediaContainer?.machineIdentifier;
    if (!identity) throw new Error('Plex server identity is unavailable.');
    const tracks = await this.tracks(key);
    if (!tracks.length) throw new Error('Plex album has no tracks.');
    // Refuse queues with absent media instead of rapidly skipping broken tracks.
    for (const track of tracks) {
      const parts = array(track.Media).flatMap((media) => array(media.Part));
      if (!parts.length || parts.some((p) => p.exists === '0' || p.accessible === '0'))
        throw new Error('Some Plex audio files are unavailable. Scan your library first.');
      for (const part of parts) {
        if (!String(part.key).startsWith('/library/parts/'))
          throw new Error('Invalid Plex media path.');
        const response = await fetch(new URL(part.key, plexUrl), {
          signal: AbortSignal.timeout(10000),
          headers: { 'X-Plex-Token': this.store.data.config.plexToken, Range: 'bytes=0-3' },
          redirect: 'error',
        });
        const reader = response.body?.getReader();
        const first = await reader?.read();
        await reader?.cancel();
        if (!response.ok || !first?.value?.length)
          throw new Error('Plex cannot read an audio file.');
      }
    }
    const source = new URL(plexUrl);
    const params = new URLSearchParams({
      uri: `server://${identity}/com.plexapp.plugins.library/library/metadata/${key}`,
      key: `/library/metadata/${tracks[position % tracks.length].ratingKey}`,
      type: 'audio',
      machineIdentifier: identity,
      source: identity,
      protocol: source.protocol.slice(0, -1),
      address: source.hostname,
      port: source.port || (source.protocol === 'https:' ? '443' : '80'),
      shuffle: '0',
      repeat: '0',
      continuous: '0',
      includeRelated: '0',
      offset: '0',
      paused: '0',
      commandID: String(++this.command),
    });
    const result = await this.request(
      calderaUrl,
      '/player/playback/createPlayQueue?' + params,
      calderaClientId,
    );
    if (result.Response?.code && result.Response.code !== '200')
      throw new Error('Caldera rejected playback.');
  }
}
