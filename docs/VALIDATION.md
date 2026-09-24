# Validation / Validação

## Verified locally / Verificado localmente

- TypeScript type checking and Vite production build.
- Metadata schema rejects invalid IDs and strips private paths from portable exports.
- Atomic JSON writes survive concurrent saves; public configuration omits Plex token.
- Assignment does not play, rejects unwanted overwrites and prevents using one card twice within a batch.
- Playback failure leaves the reader usable for subsequent scans.
- Fragmented 64-bit Linux numeric keyboard events decode correctly in a synthetic fixture.
- PKCE S256 challenge correctness and rejection of a callback from a different browser session.
- PDF dimensions, multi-disc fitting, missing-cover rejection and overflow rejection.
- Image re-encoding, exact vertical dimensions and distinct URLs after image changes.
- Browser flow: create album, edit metadata, upload artwork, crop, save, and open PDF preview.

## Needs your setup / Depende do seu setup

- Real OAuth consent and playback: no Spotify developer app or connected Premium account was supplied.
- Actual Plex/Caldera playback: the new app does not borrow production credentials.
- Physical USB hotplug on Linux and the exact hardware's event format.
- Real print measurement and duplex alignment.

## Explicit release limits / Limites explícitos

- Single-user loopback interface. Remote UI access uses an SSH tunnel; no LAN login system is bundled yet.
- Browser keyboard capture requires focus. Native Linux mode supports 64-bit numeric event readers.
- Metadata scanning does not certify album completeness or decode every audio sample.
- Scanner limit: 20,000 audio files and 12 folder levels per import; split very large libraries into smaller folders.
- Plex imports metadata and track identifiers; upload artwork separately. Spotify imports metadata, not audio or cover files.
- Dense fact sheets that do not fit at the minimum font size are refused with a named error.
- PT/EN UI is available; some device/API diagnostic messages remain in English.
- No public release, live hardware compatibility certification or end-to-end provider validation is implied by passing unit tests.
