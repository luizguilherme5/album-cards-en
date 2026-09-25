import { randomBytes, createHash } from 'node:crypto';
import type { Store, Tokens } from './store.js';

export function createPkce() {
  const verifier = randomBytes(48).toString('base64url');
  return { verifier, challenge: createHash('sha256').update(verifier).digest('base64url') };
}
export class Spotify {
  private sessions = new Map<
    string,
    { verifier: string; expires: number; browser: string; clientId: string }
  >();
  private refreshing?: Promise<Tokens>;
  constructor(
    private store: Store,
    readonly callback: string,
  ) {}
  authorize(browser: string) {
    const clientId = this.store.data.config.spotifyClientId;
    if (!/^[a-zA-Z0-9]{32}$/.test(clientId)) throw new Error('Configure Spotify Client ID first.');
    for (const [key, value] of this.sessions)
      if (value.expires < Date.now()) this.sessions.delete(key);
    const state = randomBytes(32).toString('hex');
    const { verifier, challenge } = createPkce();
    this.sessions.set(state, { verifier, expires: Date.now() + 600000, browser, clientId });
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: this.callback,
      scope: 'user-read-playback-state user-modify-playback-state',
      state,
      code_challenge_method: 'S256',
      code_challenge: challenge,
    });
    return 'https://accounts.spotify.com/authorize?' + params;
  }
  async callbackCode(code: string, state: string, browser: string) {
    const session = this.sessions.get(state);
    this.sessions.delete(state); // Single-use, including failed exchanges.
    if (
      !session ||
      session.expires < Date.now() ||
      session.browser !== browser ||
      session.clientId !== this.store.data.config.spotifyClientId
    )
      throw new Error('OAuth session expired or invalid. Reconnect Spotify.');
    await this.exchange({
      grant_type: 'authorization_code',
      code,
      code_verifier: session.verifier,
      redirect_uri: this.callback,
    });
  }
  private async exchange(params: Record<string, string>): Promise<Tokens> {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ ...params, client_id: this.store.data.config.spotifyClientId }),
    });
    if (!response.ok)
      throw new Error(`Spotify authorization failed (${response.status}). Reconnect your account.`);
    const token: any = await response.json();
    const saved = {
      access_token: token.access_token,
      refresh_token: token.refresh_token || this.store.data.spotify?.refresh_token,
      expiresAt: Date.now() + token.expires_in * 1000,
    };
    if (!saved.access_token || !saved.refresh_token)
      throw new Error('Spotify returned incomplete credentials.');
    this.store.data.spotify = saved;
    await this.store.save();
    return saved;
  }
  async api(route: string, method = 'GET', body?: unknown): Promise<any> {
    let token = this.store.data.spotify;
    if (!token) throw new Error('Connect Spotify first.');
    if (token.expiresAt < Date.now() + 60000) {
      this.refreshing ||= this.exchange({
        grant_type: 'refresh_token',
        refresh_token: token.refresh_token,
      }).finally(() => {
        this.refreshing = undefined;
      });
      token = await this.refreshing;
    }
    const response = await fetch('https://api.spotify.com/v1' + route, {
      method,
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const messages: Record<number, string> = {
        401: 'Reconnect Spotify.',
        403: 'Check Premium and the Dashboard user allowlist.',
        404: 'Open Spotify and select an available device.',
        429: `Rate limit. Retry after ${response.headers.get('retry-after') || 'a few'} seconds.`,
      };
      throw new Error(
        `Spotify ${response.status}: ${messages[response.status] || 'Request failed.'}`,
      );
    }
    return response.status === 204 ? {} : response.json();
  }
  async play(albumId: string, position: number) {
    let device = this.store.data.config.spotifyDeviceId;
    if (!device && !this.store.data.config.spotifyDeviceName)
      throw new Error('Select a Spotify device first.');
    let target: any;
    const attempts = process.env.ALBUM_CARDS_AUDIO_HANDOFF === '1' ? 10 : 1;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const { devices = [] } = await this.api('/me/player/devices');
      target = devices.find((d: any) => d.id === device && !d.is_restricted);
      if (!target && this.store.data.config.spotifyDeviceName) {
        const matches = devices.filter(
          (d: any) => d.name === this.store.data.config.spotifyDeviceName && !d.is_restricted,
        );
        if (matches.length === 1) target = matches[0];
      }
      if (target) break;
      if (attempt + 1 < attempts) await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    if (!target)
      throw new Error('Open Spotify on your selected device, play a song once, then scan again.');
    if (target.id !== device || target.name !== this.store.data.config.spotifyDeviceName) {
      device = target.id;
      this.store.data.config.spotifyDeviceId = device;
      this.store.data.config.spotifyDeviceName = target.name;
      await this.store.save();
    }
    await this.api('/me/player/play?device_id=' + encodeURIComponent(device), 'PUT', {
      context_uri: 'spotify:album:' + albumId,
      offset: { position },
      position_ms: 0,
    });
  }
  async pause() {
    const device = this.store.data.config.spotifyDeviceId;
    if (device) await this.api('/me/player/pause?device_id=' + encodeURIComponent(device), 'PUT');
  }
}
