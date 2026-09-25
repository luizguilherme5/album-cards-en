#!/usr/bin/env bash
# Persistent Linux services. Run as your normal user, never as root.
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
config="$HOME/.config/album-cards"
runtime="$HOME/.local/share/album-cards-runtime"
logs="$HOME/.local/state/album-cards"
mkdir -p "$logs"
chmod 700 "$logs"
service=album-cards.service
receiver=album-cards-spotify.service
mkdir -p "$config"
chmod 700 "$config"
if [[ -f "$config/runtime.env" ]]; then set -a; source "$config/runtime.env"; set +a; fi
caldera="${CALDERA_SERVICE:-caldera-music.service}"
[[ "$caldera" =~ ^[a-zA-Z0-9_.@-]+\.service$ ]] || { echo 'Invalid CALDERA_SERVICE' >&2; exit 1; }
case "${1:-help}" in
  help) cat <<'HELP'
Album Cards — Linux service lifecycle (normal user)
  bash deployment/dev.sh setup            Register the built app as a user service
  bash deployment/dev.sh dependencies     Install Debian audio/discovery prerequisites
  bash deployment/dev.sh up|down|restart  Control the app
  bash deployment/dev.sh status           Show app and Spotify receiver state
  bash deployment/dev.sh logs             Recent app logs
  bash deployment/dev.sh enable app|plex|spotify|both
                                          Enable app + selected players at boot
  bash deployment/dev.sh disable          Disable app autostart
  bash deployment/dev.sh install-spotify FILE.deb
                                          Extract a compatible official Raspotify package
  bash deployment/dev.sh spotify up|down|restart|logs
  bash deployment/dev.sh audio plex|spotify
                                          Switch exclusive USB ownership
Build first with npm ci and npm run build. See docs/LINUX.pt.md or LINUX.en.md.
HELP
  ;;
  dependencies)
    sudo apt-get update
    alsa=libasound2; ssl=libssl3
    if apt-cache show libasound2t64 2>/dev/null | grep -q '^Version:'; then alsa=libasound2t64; fi
    if apt-cache show libssl3t64 2>/dev/null | grep -q '^Version:'; then ssl=libssl3t64; fi
    sudo apt-get install -y avahi-daemon alsa-utils "$alsa" libpulse0 "$ssl"
    sudo systemctl enable --now avahi-daemon
    ;;
  setup)
    [[ $(uname -s) == Linux && $(id -u) != 0 ]] || { echo 'Use a normal Linux account.' >&2; exit 1; }
    [[ -f "$root/dist/index.html" ]] || { echo 'Run npm run build first.' >&2; exit 1; }
    nodebin="$(command -v node)"
    [[ "$root" =~ ^[a-zA-Z0-9_./-]+$ && "$nodebin" =~ ^[a-zA-Z0-9_./-]+$ ]] || { echo 'For service installation, use a directory without spaces or special characters.' >&2; exit 1; }
    mkdir -p "$HOME/.config/systemd/user"
    cat > "$HOME/.config/systemd/user/$service" <<UNIT
[Unit]
Description=Album Cards USB reader and music library
After=network-online.target
Wants=network-online.target
[Service]
Type=simple
WorkingDirectory=$root
Environment=NODE_ENV=production
Environment=PORT=3850
Environment=BIND_ADDRESS=127.0.0.1
EnvironmentFile=-%h/.config/album-cards/runtime.env
ExecStart=$nodebin --import tsx server/main.ts --production
StandardOutput=append:%h/.local/state/album-cards/app.log
StandardError=inherit
Restart=on-failure
RestartSec=5
UMask=0077
[Install]
WantedBy=default.target
UNIT
    systemctl --user daemon-reload
    ;;
  up) systemctl --user start "$service" ;;
  down) systemctl --user stop "$service" ;;
  restart) systemctl --user restart "$service" ;;
  enable)
    units=("$service")
    case "${2:-}" in
      app) ;;
      plex) units+=("$caldera") ;;
      spotify) units+=("$receiver") ;;
      both) units+=("$caldera" "$receiver") ;;
      *) echo 'Use enable app|plex|spotify|both after installing your players.' >&2; exit 2 ;;
    esac
    for unit in "${units[@]}"; do
      [[ $(systemctl --user show "$unit" -p LoadState --value) == loaded ]] || { echo "Install $unit first." >&2; exit 1; }
    done
    if [[ $(loginctl show-user "$(id -un)" -p Linger --value) != yes ]]; then
      sudo loginctl enable-linger "$(id -un)"
    fi
    systemctl --user enable --now "${units[@]}"
    ;;
  disable) systemctl --user disable "$service" ;;
  status) systemctl --user show "$service" "$receiver" -p Id -p ActiveState -p SubState -p UnitFileState ;;
  logs) tail -n 60 "$logs/app.log" ;;
  install-spotify)
    archive="${2:?Provide the downloaded official Raspotify .deb}"
    [[ $(dpkg-deb -f "$archive" Package) == raspotify ]] || { echo 'Expected a Raspotify package'; exit 1; }
    [[ $(dpkg-deb -f "$archive" Architecture) == "$(dpkg --print-architecture)" ]] || { echo 'Architecture mismatch'; exit 1; }
    mkdir -p "$runtime" "$HOME/.config/systemd/user"
    dpkg-deb -x "$archive" "$runtime/raspotify"
    "$runtime/raspotify/usr/bin/librespot" --version
    install -m 755 "$root/deployment/spotify-run.sh" "$runtime/spotify-run.sh"
    cat > "$HOME/.config/systemd/user/$receiver" <<'UNIT'
[Unit]
Description=Album Cards Spotify Connect receiver (librespot from Raspotify)
After=network-online.target
Wants=network-online.target
[Service]
EnvironmentFile=-%h/.config/album-cards/runtime.env
ExecStart=%h/.local/share/album-cards-runtime/spotify-run.sh
StandardOutput=append:%h/.local/state/album-cards/spotify.log
StandardError=inherit
Restart=on-failure
RestartSec=5
UMask=0077
[Install]
WantedBy=default.target
UNIT
    systemctl --user daemon-reload
    ;;
  spotify)
    case "${2:-}" in
      up) systemctl --user start "$receiver" ;;
      down) systemctl --user stop "$receiver" ;;
      restart) systemctl --user restart "$receiver" ;;
      logs) tail -n 60 "$logs/spotify.log" ;;
      *) echo 'Use spotify up|down|restart|logs' >&2; exit 2 ;;
    esac
    ;;
  audio)
    case "${2:-}" in
      spotify) systemctl --user stop "$caldera"; systemctl --user start "$receiver" ;;
      plex) systemctl --user stop "$receiver"; systemctl --user start "$caldera" ;;
      *) echo 'Use audio plex|spotify' >&2; exit 2 ;;
    esac
    ;;
  *) echo 'Unknown command. Use help.' >&2; exit 2 ;;
esac
