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
- Real Plex catalog listing, selective import of six albums with tracks and original covers, and Caldera discovery. Private configuration stays in ignored local data.
- Plex numeric XML entities decode correctly; remote artwork cannot send credentials to another host.
- Browser flow: create album, edit metadata, upload artwork, crop, save, and open PDF preview.
- Spotify Premium OAuth completed with PKCE. The account connected, the active Spotify Web Player appeared as a Connect device, the app imported Fresno's *sua alegria foi cancelada* with 10 tracks, and the app's Play button started the album at its first track.

- Orange Pi 3B: Node 24 ARM64, dependency installation and production build completed on Armbian/Debian 12. The official Raspotify receiver appeared in Spotify Connect and the user selected it; cached receiver authentication was verified. The USB reader and Edifier M90 were subsequently detected; physical scans started Fresno through Spotify, Abbey Road through Plex and then Fresno through Spotify again. Service handoff was verified, and the user confirmed both paths played successfully through the M90. An actual cold-boot test remains separate.

## Needs your setup / Depende do seu setup

- Physical card association in the new native Linux reader remains pending. Phone-side playback and exported phone maps are no longer the supported workflow.
- A full reboot with no interactive login remains to be verified; the app and both players are enabled at boot.
- Physical USB hotplug and numeric ID reading were verified on the Orange Pi using the 1a86:2366 reader. Other models and operating systems require their own tests.
- Real print measurement and duplex alignment.

## Explicit release limits / Limites explícitos

- Single-user loopback interface. Remote UI access uses an SSH tunnel; no LAN login system is bundled yet.
- Browser keyboard capture requires focus. Native Linux mode supports 64-bit numeric event readers.
- Metadata scanning does not certify album completeness or decode every audio sample.
- Scanner limit: 20,000 audio files and 12 folder levels per import; split very large libraries into smaller folders.
- Plex imports selected albums, track identifiers and available original artwork (up to 50 per batch). Spotify imports metadata, not audio or cover files.
- Dense fact sheets that do not fit at the minimum font size are refused with a named error.
- PT/EN UI is available; some device/API diagnostic messages remain in English.
- No public release, live hardware compatibility certification or end-to-end provider validation is implied by passing unit tests.
