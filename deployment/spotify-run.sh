#!/usr/bin/env bash
set -euo pipefail
runtime="$HOME/.local/share/album-cards-runtime"
mkdir -p "$runtime/spotify-cache"
chmod 700 "$runtime/spotify-cache"
# An explicit initial volume overrides librespot's saved volume. Only use
# the first-run level before any volume has been cached (including mute=0).
initial=()
if [[ ! -s "$runtime/spotify-cache/volume" ]]; then initial=(--initial-volume 20); fi
exec "$runtime/raspotify/usr/bin/librespot" \
  --name "${SPOTIFY_NAME:-Album Cards}" \
  --backend alsa --device "${SPOTIFY_ALSA_DEVICE:-default}" \
  --format "${SPOTIFY_AUDIO_FORMAT:-S16}" --bitrate 320 \
  "${initial[@]}" --disable-audio-cache \
  --cache "$runtime/spotify-cache" --system-cache "$runtime/spotify-cache"
