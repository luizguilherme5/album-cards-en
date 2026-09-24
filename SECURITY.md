# Security model

This release is a single-user, loopback-only local application. It provides server-side folder browsing and controls music devices, so it must not be exposed directly to a LAN or Internet listener without adding real authentication and authorization. Host and Origin checks plus a per-process request token protect mutating routes against ordinary cross-site requests. They are not an account system.

OAuth uses PKCE S256, unpredictable single-use state, a browser-bound HttpOnly SameSite cookie, ten-minute expiry and server-side tokens. Refresh tokens and Plex credentials are stored in `data/library.json` (0600); protect the host account and backups. They are not encrypted at rest. API state responses exclude secret values.

Folder imports read metadata and do not modify audio. Symlinks are skipped during recursive scans. Images are decoded with a pixel limit and re-encoded before serving. Vertical images must have exact output dimensions. Portable album exports use a schema that removes local paths and credentials.

Do not share `data/`, `.env`, logs with credentials, or a real Plex token in an issue. Revoke Spotify permissions in the account dashboard if access needs to be removed completely. Local disconnect deletes the stored tokens but does not revoke an existing consent at Spotify.

Use the maintainers' private contact channel for vulnerabilities. This private prerelease has not undergone an independent security audit.
