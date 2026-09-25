# Album Cards

**Your music collection, in your hands.** A local TypeScript application: import albums, frame artwork, prepare printed cards, assign RFID tags, and control Spotify or Plexamp/Caldera.

> First testing release. UI, persistence, simulated reader events and PDFs have automated checks. Actual playback requires your Spotify account or Plex/Caldera installation; physical readers need validation on your host. No music, commercial album art or personal configurations are included.

## Start here

Install **Node.js 24 LTS**, then run inside this repository:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:3850**. One application and one port; no Python, external database or mandatory containers. In an ordinary installation, keep the terminal open and stop with Ctrl+C. If a local management `dev.sh` exists, `npm run dev` delegates to it.

1. **Collection → Add albums:** choose a folder on the computer running the server. Audio files remain unchanged. The scanner reads artist, album, tracks, durations, label and artwork when available in tags.
2. **Details:** edit metadata using a form and organize multiple discs. Optional JSON editing/export makes metadata portable. See the [fictional example](examples/album.json).
3. **Click a cover:** upload, drag and zoom, then save an exact **1080 × 1712 px** crop at **54 × 85.6 mm**. Source and vertical artwork are stored separately.
4. **Settings:** connect [Spotify](docs/SPOTIFY.md) or configure [Plex/Caldera](docs/PLAYERS.md). Select a playback device before testing a card.
5. **Cards:** select albums, optionally enable overwriting, start assignment and present one card per album. The queue is alphabetical. Switch to Playback afterward.
6. **Print studio:** select up to 50 albums and generate artwork or fact-sheet PDFs. Preview and download use the same PDF file.

Local audio is not uploaded to Spotify. Enter the correct **Spotify album ID** in Details or import a Spotify album link after connecting your account. Plex import supplies album rating keys and tracks.

## Readers

- **Mac or Windows, with the browser on the same computer:** a USB keyboard reader that types an ID followed by Enter. Keep Cards and the input field focused. The UI confirms scans, not USB enumeration on these platforms.
- **64-bit Linux / Raspberry Pi / Orange Pi:** select an input device in Settings. Native reading continues with the browser closed while Node is running. Prefer stable `/dev/input/by-id/…` paths.
- Grant permissions only to your identified reader; see [reader setup](docs/READER.md). Do not run the entire app as root.
- No writing to the card memory is necessary: the application maps its ID to an album.
- Keyboard readers usually cannot report removal, so removing a card **does not pause**. Another card starts its album; repeating the same card picks another registered track position, excluding the last position started by the app.
- Assignment never starts playback. Sessions expire after five minutes and do not automatically return to playback after completion. One card cannot consume two positions in the same session.

## Dedicated player, no browser left open

The recommended setup is 64-bit Linux: Raspberry Pi, Orange Pi or PC. The reader stays connected there. Choose **Plex/Caldera** for your own collection or **Spotify** for Premium streaming without a music server. Albums can use different providers.

Follow [Linux installation and autostart](docs/LINUX.en.md). After setup, `bash deployment/dev.sh enable plex` or `bash deployment/dev.sh enable spotify` starts the app and player at boot. For both on one USB output, follow the audio handoff section.

## Printing

Landscape A4, **10 cards per sheet**, 54 × 85.6 mm frames and 3 mm gutters. Print at **100% / actual size**, without fitting to page. Mirror back-side order is available; physically test one sheet with your printer's duplex mode. The last sheet preserves matching positions.

Fact sheets embed fonts and use up to two columns, adjusting text size to a minimum of 5.25 pt. Overflow reports the affected album instead of silently clipping. Shorten excessive text or make a separate insert for very dense releases. The five-track filter is only a filter: **it does not prove an album is complete**.

## Data and privacy

Private state lives in `data/`, excluded from Git. Back it up to preserve albums, covers, cards and settings. `library.json` contains credentials; use individual album export to share metadata safely. Images use content-versioned filenames so previews update immediately. This release listens on loopback only; use an SSH tunnel to access an installation on another host. Do not expose the application port directly to the Internet.

## Development

```sh
npm run typecheck
npm test
npm run build
npm start
```

Build before starting production mode. Do not run development and production servers simultaneously on the same port. Configure `PORT`, `DATA_DIR`, `DEFAULT_LOCALE`, or `APP_ORIGIN` through your environment; `.env` is not automatically loaded.

Read [architecture](docs/ARCHITECTURE.md), [album format](docs/ALBUMS.md), [validation and limitations](docs/VALIDATION.md), and [security](SECURITY.md).

Code is MIT licensed. Bundled fonts retain their licenses in `public/fonts/`. The V3 models in `hardware/` are by Luiz Guilherme, licensed under CC BY 4.0 for sharing and adaptation with attribution.
