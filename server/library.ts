import { readdir, realpath, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseFile } from 'music-metadata';
import sharp from 'sharp';
import type { Store } from './store.js';
import type { LibraryAlbum } from '../shared/schema.js';

const audio = /\.(flac|mp3|m4a|ogg|opus|wav|aiff|aif)$/i;
export async function browse(directory: string) {
  const root = await realpath(directory);
  const entries = await readdir(root, { withFileTypes: true });
  return {
    path: root,
    parent: path.dirname(root),
    folders: entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => e.name)
      .sort(),
  };
}

// Scan reads metadata only. Music is never moved, renamed, uploaded or retagged.
export async function scan(directory: string, store: Store) {
  const root = await realpath(directory);
  const groups = new Map<string, LibraryAlbum>();
  const warnings: string[] = [];
  let count = 0;
  async function walk(folder: string, depth: number) {
    if (depth > 12) {
      warnings.push(`Depth limit: ${folder}`);
      return;
    }
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) {
        await walk(file, depth + 1);
        continue;
      }
      if (!audio.test(entry.name)) continue;
      if (++count > 20000) throw new Error('Scan limit: choose a smaller folder (20,000 files).');
      try {
        const metadata = await parseFile(file, { duration: true });
        const m = metadata.common;
        const title = m.album || path.basename(folder);
        const artist = m.albumartist || m.artist || 'Unknown artist';
        // Group disc subfolders by album tags, scoped to the selected root.
        const identity = root + '\0' + artist + '\0' + title;
        const id = createHash('sha256').update(identity).digest('hex').slice(0, 24);
        let album = groups.get(id);
        if (!album) {
          const previous = store.data.albums.find((a) => a.id === id);
          album = {
            ...previous,
            id,
            title,
            artist,
            year: String(m.year || ''),
            label: m.label?.join(', ') || '',
            tracks: [],
            source: root,
          };
          groups.set(id, album);
          const picture = m.picture?.[0];
          if (picture && !album.original)
            album.original = await saveImage(store, picture.data, id, 'original');
          if (!album.original) {
            const cover = (await readdir(folder)).find((n) =>
              /^(cover|folder|front)\.(jpg|jpeg|png)$/i.test(n),
            );
            if (cover)
              album.original = await saveImage(
                store,
                await readFile(path.join(folder, cover)),
                id,
                'original',
              );
          }
        }
        album.tracks.push({
          title: m.title || path.parse(file).name,
          disc: m.disk.no || 1,
          number: m.track.no || album.tracks.length + 1,
          seconds: metadata.format.duration,
        });
      } catch {
        warnings.push(entry.name);
      }
    }
  }
  await walk(root, 0);
  for (const album of groups.values()) {
    album.tracks.sort((a, b) => a.disc - b.disc || a.number - b.number);
    const index = store.data.albums.findIndex((a) => a.id === album.id);
    if (index < 0) store.data.albums.push(album);
    else store.data.albums[index] = album;
  }
  await store.save();
  return { albums: groups.size, files: count, warnings };
}

export async function saveImage(
  store: Store,
  input: Uint8Array,
  id: string,
  kind: 'original' | 'vertical',
) {
  const image = sharp(input, { limitInputPixels: 40_000_000 }).rotate();
  const meta = await image.metadata();
  if (kind === 'vertical' && (meta.width !== 1080 || meta.height !== 1712))
    throw new Error('The crop must be 1080 × 1712 px.');
  const data = await image.png().toBuffer();
  const hash = createHash('sha256').update(data).digest('hex').slice(0, 12);
  const filename = `${id}-${kind}-${hash}.png`;
  await writeFile(path.join(store.directory, 'images', filename), data);
  return filename; // Content-addressed URLs prevent stale previews after saving.
}
