#!/usr/bin/env bash
set -euo pipefail
runtime="$HOME/.local/share/album-cards-runtime"
mkdir -p "$runtime/spotify-cache"
chmod 700 "$runtime/spotify-cache"
exec "$runtime/raspotify/usr/bin/librespot" \
  --name "${SPOTIFY_NAME:-Album Cards}" \
  --backend alsa --device "${SPOTIFY_ALSA_DEVICE:-default}" \
  --format "${SPOTIFY_AUDIO_FORMAT:-S16}" --bitrate 320 \
  --initial-volume 20 --disable-audio-cache \
  --cache "$runtime/spotify-cache"
