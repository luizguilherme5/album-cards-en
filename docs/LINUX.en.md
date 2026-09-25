# Dedicated player: power on and listen

The USB reader stays connected to the Linux computer running Album Cards. Use the browser to configure it; the background service reads cards and starts albums with the browser closed.

## Recommended operating system

- **Raspberry Pi 4/5:** [Raspberry Pi OS Lite 64-bit](https://www.raspberrypi.com/software/operating-systems/) using Raspberry Pi Imager.
- **Orange Pi 3B:** [Armbian Minimal/CLI for the exact 3B board](https://armbian.com/boards/orangepi3b), with stable Debian userspace. This board is community supported: check hardware revisions and image notes. The existing project device runs Debian 12; newer images have not all been physically tested.
- **PC:** current 64-bit Debian/Ubuntu. Keep a desktop session for the native Spotify application; use the receiver below for a headless player.

Configure networking and SSH. Use a suitable power supply and disable suspend. Raspberry images are not Orange Pi images. Official guides: [Raspberry](https://www.raspberrypi.com/documentation/computers/getting-started.html), [Armbian](https://docs.armbian.com/getting-started/).

## 1. Install Album Cards

Install [Node.js 24 LTS](https://nodejs.org/en/download), ARM64 on the Pi or x64 on a typical PC, and Git. Check `node --version` and `npm --version`. Inside the repository, as your normal user:

```sh
npm ci
npm run build
bash deployment/dev.sh setup
bash deployment/dev.sh up
```

For development, `npm run dev` remains available. Do not run it alongside the service on the same port. The service uses the same `data/` directory and the built frontend.

If the Pi has no screen, open another terminal on your computer:

```sh
ssh -N -L 3850:127.0.0.1:3850 your-user@your-player.local
```

Replace user/hostname, then open **http://127.0.0.1:3850** in your computer’s browser. Keep the tunnel open during configuration and Spotify authorization. Closing it afterward does not stop the Pi’s reader. Do not run another local app on port 3850.

Choose **Settings → Detect Linux devices**, select your reader and save. Wait for `USB reader connected`. If permissions fail, follow [READER.md](READER.md) to grant access only to that device. Its USB identity lets the app reconnect after a port change. Two identical readers require explicit selection.

## 2A. Local collection: Plex and Caldera

Plex Media Server catalogs and supplies your music files. Caldera is a separate Linux player controllable through Plexamp. Install and sign in following the [official instructions](https://caldera.homes/music/headless/). Its installer registers the `caldera-music.service` user service.

```sh
curl -fL https://releases.caldera.homes/music/headless/install.sh -o /tmp/caldera-install.sh
less /tmp/caldera-install.sh
bash /tmp/caldera-install.sh
~/caldera-music/caldera-music --login
```

Choose your audio output and play an album from Plexamp first. Configure Plex, find Caldera and import albums in Album Cards using [PLAYERS.md](PLAYERS.md). No music is written to a card.

Then enable **Album Cards and Caldera at boot**:

```sh
bash deployment/dev.sh enable plex
```

## 2B. Spotify: no downloaded collection

Requires Premium and internet. Album Cards reads cards and sends Web API commands; a Spotify Connect receiver plays the audio. Our user-service launcher uses librespot from the official package of the community [Raspotify](https://github.com/dtcooper/raspotify) project. It does not launch a duplicate system-wide Raspotify installation.

```sh
bash deployment/dev.sh dependencies
curl -fL "https://dtcooper.github.io/raspotify/raspotify-latest_$(dpkg --print-architecture).deb" -o /tmp/raspotify.deb
bash deployment/dev.sh install-spotify /tmp/raspotify.deb
cp -n deployment/runtime.env.example ~/.config/album-cards/runtime.env
nano ~/.config/album-cards/runtime.env
```

The launcher checks the package name/architecture and runs the binary’s version check. The dependencies command uses sudo for ALSA/Pulse, SSL and Avahi discovery. The application itself runs as your normal user.

Set `SPOTIFY_NAME` and `SPOTIFY_ALSA_DEVICE` in the file. Use `aplay -l` to find stable card names, such as `plughw:CARD=MySpeaker,DEV=0`, rather than changing numeric indexes. The project’s Edifier M90 uses `plughw:CARD=M90,DEV=0` and `SPOTIFY_AUDIO_FORMAT=S24_3`. Other hardware may need another format; S16 is the default. Restart the receiver after changes.

```sh
bash deployment/dev.sh spotify up
```

Open Spotify on your phone on the same network, choose **Album Cards** in Connect devices and play one song. This first connection pairs the receiver and stores its login locally. Also authorize Album Cards as described in [SPOTIFY.en.md](SPOTIFY.en.md). These are separate steps: making the receiver play, and allowing the app to control it.

Then enable **Album Cards and the Spotify receiver at boot**:

```sh
bash deployment/dev.sh enable spotify
```

**Linux desktop alternative:** choose the native Spotify app as your playback device. You do not need the receiver. Enable Spotify autostart in your desktop session, and use `bash deployment/dev.sh enable app` for card reading without login. Native Spotify still requires its desktop session. A suspended PC cannot read cards. `enable spotify` specifically targets this project’s receiver service.

## 3. Both services sharing one USB output

Choose `playbackProvider: "plex"` or `"spotify"` in each album’s **Details → Play this album with**. Imports set their source automatically. Auto mode follows the sole linked service; with both IDs it uses the Settings default.

If both players need the same exclusive USB output, add to `~/.config/album-cards/runtime.env`:

```sh
ALBUM_CARDS_AUDIO_HANDOFF=1
CALDERA_SERVICE="caldera-music.service"
```

```sh
bash deployment/dev.sh restart
bash deployment/dev.sh enable both
```

The reader stays active. A Spotify card stops Caldera and starts the receiver; a Plex card does the reverse. This releases the device without mixing players. The first card after switching can wait a few seconds for startup. Each player keeps its credentials. Change `CALDERA_SERVICE` if your installation uses a different name. This applies to two **user services on the same Linux host**, not a remote Spotify device or system service.

A stopped receiver is absent from Connect. For first pairing or manual Spotify use, run `bash deployment/dev.sh audio spotify`. To return to Plexamp manually, run `bash deployment/dev.sh audio plex` or tap a Plex card. The same exclusive USB output cannot be promised to both players simultaneously.

## 4. Everyday use and recovery

Assign cards and return to **Playback**. Mappings live in `data/library.json` on Linux. No URL is written into the chip. A different card starts its album; repeating a card chooses another track. Removing it does not pause.

```sh
bash deployment/dev.sh status
bash deployment/dev.sh logs
bash deployment/dev.sh spotify logs
bash deployment/dev.sh restart
```

`enable` asks for sudo only if it needs to enable services without login. Test a reboot, wait for networking and scan a card. Service state, reader connectivity and last-scan outcome are separate checks; the reader’s LED alone does not confirm playback.

To update: stop with `down`, privately back up `data/`, update code, run `npm ci`, `npm run build`, `setup`, then `up`. Never delete `data/`. To roll back from a migration, stop this service and restore the previous service/data. Do not leave two applications handling the same reader.

**Private files:** `data/` contains tokens, and `~/.local/share/album-cards-runtime/spotify-cache/` contains receiver credentials. Publish neither. Hardware licensing is separate from the software; see `hardware/README.md`.

### Spotify volume

The receiver starts at 20% only on first setup. It then restores the last volume chosen in Spotify, including after switching between Plex and Spotify or restarting. The volume file lives in the receiver’s private cache; keep that folder to preserve your preference. The speaker’s physical volume remains separate.
