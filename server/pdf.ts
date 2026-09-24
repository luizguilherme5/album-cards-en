import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { CARD, type LibraryAlbum } from '../shared/schema.js';
const mm = (n: number) => (n * 72) / 25.4;
const ink = rgb(0.14, 0.17, 0.15);

export function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const candidate = line ? line + ' ' + word : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = '';
    for (const char of word) {
      if (font.widthOfTextAtSize(line + char, size) > width) {
        lines.push(line);
        line = '';
      }
      line += char;
    }
  }
  if (line) lines.push(line);
  return lines;
}
function drawFacts(
  page: PDFPage,
  album: LibraryAlbum,
  x: number,
  y: number,
  sans: PDFFont,
  serif: PDFFont,
) {
  const w = mm(CARD.widthMm),
    h = mm(CARD.heightMm),
    pad = mm(4);
  page.drawRectangle({ x, y, width: w, height: h, color: rgb(0.97, 0.96, 0.92) });
  const width = w - pad * 2;
  let cursor = y + h - pad;
  const titleSize = album.title.length > 32 ? 11 : 14;
  const titleLines = wrap(album.title, serif, titleSize, width);
  const artistLines = wrap(album.artist, sans, 7, width);
  const details = wrap([album.year, album.label].filter(Boolean).join(' · '), sans, 6, width);
  const header =
    titleLines.length * (titleSize + 2) + artistLines.length * 9 + details.length * 8 + 18;
  const available = h - pad * 2 - header - 14;
  type Line = { text: string; disc: boolean };
  let chosen: { size: number; lines: Line[]; columns: number } | undefined;
  const columns = album.tracks.length > 24 ? 2 : 1;
  const columnWidth = (width - (columns - 1) * 6) / columns;
  for (let size = 7; size >= 5.25; size -= 0.25) {
    const lines: Line[] = [];
    let disc = 0;
    for (const track of album.tracks) {
      if (track.disc !== disc) {
        disc = track.disc;
        lines.push({ text: `DISC ${disc}`, disc: true });
      }
      wrap(
        `${String(track.number).padStart(2, '0')}  ${track.title}`,
        sans,
        size,
        columnWidth,
      ).forEach((text) => lines.push({ text, disc: false }));
    }
    if (Math.ceil(lines.length / columns) * (size + 1.1) <= available) {
      chosen = { size, lines, columns };
      break;
    }
  }
  // We refuse to silently truncate or shrink dense multi-disc albums into unreadable text.
  if (!chosen)
    throw new Error(
      `Track list does not fit legibly on one card: ${album.title}. Shorten metadata or print a separate insert.`,
    );
  const text = (value: string, font: PDFFont, size: number, line: number) => {
    cursor -= line;
    page.drawText(value, { x: x + pad, y: cursor, font, size, color: ink });
  };
  titleLines.forEach((t) => text(t, serif, titleSize, titleSize + 2));
  cursor -= 5;
  artistLines.forEach((t) => text(t, sans, 7, 9));
  details.forEach((t) => text(t, sans, 6, 8));
  cursor -= 8;
  page.drawLine({
    start: { x: x + pad, y: cursor },
    end: { x: x + w - pad, y: cursor },
    thickness: 0.4,
    color: ink,
  });
  cursor -= 4;
  const top = cursor;
  const rows = Math.ceil(chosen.lines.length / chosen.columns);
  chosen.lines.forEach((line, index) => {
    const col = Math.floor(index / rows),
      row = index % rows;
    page.drawText(line.text, {
      x: x + pad + col * (columnWidth + 6),
      y: top - (row + 1) * (chosen!.size + 1.1),
      font: sans,
      size: chosen!.size,
      color: ink,
    });
  });
  page.drawText(`${album.tracks.length} TRACKS   /   ALBUM CARDS`, {
    x: x + pad,
    y: y + pad,
    font: sans,
    size: 5,
    color: ink,
  });
}
export async function makePdf(
  albums: LibraryAlbum[],
  kind: 'front' | 'back',
  imageDirectory: string,
  single = false,
  mirror = false,
) {
  if (!albums.length || albums.length > 50) throw new Error('Select between 1 and 50 albums.');
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const sans = await pdf.embedFont(await readFile('public/fonts/DejaVuSans.ttf'), { subset: true });
  const serif = await pdf.embedFont(await readFile('public/fonts/DejaVuSerif.ttf'), {
    subset: true,
  });
  const fallbackFonts = new Map<string, PDFFont>();
  async function fontFor(text: string, preferred: PDFFont) {
    const supports = (font: PDFFont) => {
      const characters = new Set(font.getCharacterSet());
      return Array.from(text).every(
        (char) => /\s/.test(char) || characters.has(char.codePointAt(0)!),
      );
    };
    if (supports(preferred)) return preferred;
    for (const name of ['NanumGothic.ttf', 'DroidSansFallbackFull.ttf']) {
      let font = fallbackFonts.get(name);
      if (!font) {
        font = await pdf.embedFont(await readFile('public/fonts/' + name), { subset: true });
        fallbackFonts.set(name, font);
      }
      if (supports(font)) return font;
    }
    throw new Error(
      'Some characters are not supported by the print fonts. Check the album metadata.',
    );
  }
  const perPage = single ? 1 : 10;
  for (let start = 0; start < albums.length; start += perPage) {
    const page = pdf.addPage(single ? [mm(54), mm(85.6)] : [mm(297), mm(210)]);
    for (let i = 0; i < Math.min(perPage, albums.length - start); i++) {
      const album = albums[start + i];
      const col = mirror ? 4 - (i % 5) : i % 5;
      const x = single ? 0 : mm(7.5 + col * 57),
        y = single ? 0 : mm(210 - 17.9 - 85.6 - Math.floor(i / 5) * 88.6);
      if (kind === 'back') {
        const bodyText = [
          album.artist,
          album.year,
          album.label,
          ...album.tracks.map((t) => t.title),
        ].join(' ');
        drawFacts(
          page,
          album,
          x,
          y,
          await fontFor(bodyText, sans),
          await fontFor(album.title, serif),
        );
      } else {
        if (!album.vertical) throw new Error(`Missing vertical cover: ${album.title}`);
        const image = await pdf.embedPng(await readFile(path.join(imageDirectory, album.vertical)));
        page.drawImage(image, { x, y, width: mm(54), height: mm(85.6) });
      }
      if (!single) {
        page.drawRectangle({
          x,
          y,
          width: mm(54),
          height: mm(85.6),
          borderColor: rgb(0.65, 0.65, 0.65),
          borderWidth: 0.25,
        });
        for (const dx of [0, 54])
          for (const dy of [0, 85.6]) {
            const cx = x + mm(dx),
              cy = y + mm(dy);
            page.drawLine({
              start: { x: cx + (dx ? 1 : -1), y: cy },
              end: { x: cx + (dx ? 3 : -3), y: cy },
              thickness: 0.25,
              color: ink,
            });
          }
      }
    }
  }
  return pdf.save();
}
