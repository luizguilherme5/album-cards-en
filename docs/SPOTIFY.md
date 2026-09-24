# Connect your Spotify account

Start here even if you have never created a Spotify developer application or used OAuth.

Open **Settings → Spotify** and copy its Redirect URI. The flow is implemented; actual consent and playback still require validation with your account.

## What you need

- Spotify Premium to control playback through the API.
- Access to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
- Spotify running on a phone, computer, or compatible Spotify Connect device.
- Your own developer application. Using the application and browser on the same computer does not require paid hosting or a domain.

Album Cards will send playback commands. Your selected Spotify device plays the audio. Plugging a USB RFID reader into a Raspberry Pi does not automatically turn the Pi into a Spotify audio output.

## 1. Create an application

1. Sign in to the [Dashboard](https://developer.spotify.com/dashboard).
2. Choose **Create app**, if it is available for your account.
3. Enter a name such as **My Album Cards** and a description such as **Personal RFID album player**.
4. If asked which APIs you will use, select **Web API**. Controlling an existing Spotify client does not require the Web Playback SDK.
5. Register the Redirect URI as explained below, review Spotify's terms, and save.

If app creation is unavailable, follow the explanation shown by Spotify. Having this project's source code does not grant API access or bypass platform restrictions.

## 2. Register the callback address

The Redirect URI tells Spotify where to return after you approve access. Copy the full address displayed by the application's setup screen. Protocol, IP address, port, and path must match the Dashboard entry.

For example, a same-computer callback could look like:

```text
http://127.0.0.1:3850/auth/spotify/callback
```

This is the default port. If you change it, use the updated address shown by your installation.

- Use `127.0.0.1`, not `localhost`, for an HTTP loopback callback.
- Do not add a trailing slash unless it is part of the displayed address.
- `127.0.0.1` means the device running your browser. If the server runs on a Raspberry Pi while you sign in on your phone, that address points to the phone.
- For another device, configure a suitable HTTPS address accessible to your browser and server, with the exact registered callback. Plain HTTP on a LAN IP does not qualify for the loopback exception.

For initial setup, running the browser and application on the same computer is simpler. Remote HTTPS setup needs separate configuration and testing; changing the example's IP alone is not sufficient.

## 3. Copy the Client ID

Open your app's settings in the Dashboard and copy **Client ID**. It identifies the application requesting access.

Do not copy **Client Secret**. The integration uses **Authorization Code with PKCE**, which does not require a client secret. Only enter your Spotify password on Spotify's official pages.

Enter your Client ID in **Settings → Spotify** and choose **Connect Spotify**. The app saves the ID and opens authorization. Redirect URI is read-only and derived from the application address; copy it to the Dashboard.

## 4. Authorize your account

To connect:

1. Choose **Connect Spotify**.
2. Check that the sign-in page belongs to Spotify.
3. Sign in with the intended account and review the permissions.
4. Approve access and wait to return to the application.

Requested scopes are `user-read-playback-state`, to list devices and read playback status, and `user-modify-playback-state`, to control playback. No permissions for playlist editing or library deletion are requested.

## 5. Choose a playback device

Open Spotify on the intended device and play a track manually. Refresh the device list in the cards application, select that device, and test playback before assigning cards.

Each album needs a mapping to the correct Spotify album. Scanning your local music folder does not upload those tracks to Spotify. Check the artist, title, and edition before saving the association.

## Other people's accounts

Official documentation checked on September 24, 2026 states that new apps start in **development mode**, require Premium for the app owner, and support up to five authorized authenticated users. Add another account through **Settings → Users Management → Add new user**. Sign-in can succeed while API calls return 403 if that account is not allowlisted.

People using the source code can configure their own developer applications, subject to Spotify's access conditions. Never distribute your tokens with the project. Publishing source code does not grant a development app access to every Spotify account.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `INVALID_CLIENT` or rejected callback | Client ID, exact callback address, and `127.0.0.1` instead of `localhost`. |
| Browser returns to a missing page | Application running, correct port, and browser on the right device. |
| 403 / forbidden | Premium, granted permissions, and Dashboard allowlist. |
| No available device | Open Spotify, play a track, and refresh the device list. |
| Connected but silent | Selected device, volume, account, and manual playback in Spotify. |
| 401 / expired authorization | Reconnect if automatic token refresh cannot recover. |
| 429 / request limit | Wait as directed by Spotify; do not continuously retry. |

## Privacy and disconnecting

Access and refresh tokens are credentials. The application stores them privately on the server, exclude them from Git, and avoid returning them to the UI or writing them to logs. A Client ID alone cannot control your account.

Revoke access through [your Spotify account's Apps page](https://www.spotify.com/account/apps/). Deleting local configuration is not a replacement for revoking the permission at Spotify when you want to remove access completely.

## Official references

- [PKCE](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)
- [Redirect URI rules](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri)
- [Playback and Premium](https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback)
- [Development mode and authorized users](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)

## Running on another computer

This release accepts loopback connections. For a Raspberry Pi or server, run the app there and create an SSH tunnel: `ssh -L 3850:127.0.0.1:3850 user@your-server`. Open `http://127.0.0.1:3850` on the browser computer; the OAuth callback travels through the same tunnel. Remote HTTPS hosting requires additional deployment and access controls and is not automatically provided.
