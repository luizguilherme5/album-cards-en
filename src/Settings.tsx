import { useState } from 'react';
import { api } from './api';
export function Settings({
  state,
  en,
  refresh,
  report,
}: {
  state: any;
  en: boolean;
  refresh: () => void;
  report: (e: unknown) => void;
}) {
  const [form, setForm] = useState<any>({ ...state.config, plexToken: '' });
  const [devices, setDevices] = useState<any[]>([]),
    [readers, setReaders] = useState<any[]>([]),
    [busy, setBusy] = useState(false);
  const t = (pt: string, enText: string) => (en ? enText : pt);
  async function action(fn: () => Promise<any>) {
    setBusy(true);
    try {
      await fn();
      refresh();
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    const { hasPlexToken, spotifyConnected, ...values } = form;
    if (!values.plexToken) delete values.plexToken;
    await api('/config', values);
  }
  function field(name: string, label: string, type = 'text', placeholder = '') {
    return (
      <label>
        {label}
        <input
          type={type}
          placeholder={placeholder}
          value={form[name] || ''}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        />
      </label>
    );
  }
  return (
    <div className="settings-grid">
      <section className="panel">
        <span className="eyebrow">01 / PLAYER</span>
        <h2>{t('Onde vamos ouvir?', 'Where will you listen?')}</h2>
        <p>
          {t(
            'Escolha o serviço que recebe os comandos dos cartões.',
            'Choose the service that receives your card commands.',
          )}
        </p>
        <div className="segmented">
          {['spotify', 'plex'].map((provider) => (
            <button
              className={form.provider === provider ? 'active' : ''}
              key={provider}
              onClick={() => setForm({ ...form, provider })}
            >
              {provider === 'spotify' ? 'Spotify' : 'Plex / Caldera'}
            </button>
          ))}
        </div>
        <button className="primary" onClick={() => action(save)} disabled={busy}>
          {t('Salvar configurações', 'Save settings')}
        </button>
      </section>
      <section className="panel">
        <span className="eyebrow">SPOTIFY CONNECT</span>
        <h2>Spotify</h2>
        <p>
          {t(
            'Requer Premium e um dispositivo com Spotify aberto. Não precisa de Client Secret.',
            'Requires Premium and an open Spotify device. No Client Secret needed.',
          )}
        </p>
        {field('spotifyClientId', 'Client ID')}
        <label>
          Redirect URI
          <input readOnly value={state.callback} />
        </label>
        <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">
          {t('Criar aplicativo no Spotify ↗', 'Create a Spotify application ↗')}
        </a>
        <ol className="steps">
          <li>{t('Crie um app e selecione Web API.', 'Create an app and select Web API.')}</li>
          <li>
            {t(
              'Copie o endereço acima para Redirect URIs.',
              'Copy the address above into Redirect URIs.',
            )}
          </li>
          <li>
            {t('Cole o Client ID e clique em Conectar.', 'Paste the Client ID and choose Connect.')}
          </li>
        </ol>
        <button
          onClick={() =>
            action(async () => {
              await save();
              const result = await api('/spotify/connect', {});
              window.location.href = result.url;
            })
          }
          disabled={busy}
        >
          {t('Conectar Spotify', 'Connect Spotify')}
        </button>
        {state.config.spotifyConnected && (
          <>
            <span className="badge">{t('Conta conectada', 'Account connected')}</span>
            <button
              onClick={() =>
                action(async () => setDevices((await api('/spotify/devices')).devices))
              }
            >
              {t('Buscar dispositivos', 'Find devices')}
            </button>
            <label>
              {t('Dispositivo', 'Device')}
              <select
                value={form.spotifyDeviceId}
                onChange={(e) => setForm({ ...form, spotifyDeviceId: e.target.value })}
              >
                <option value="">{t('Selecione', 'Select')}</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.is_active ? ' •' : ''}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={() => action(() => api('/spotify/disconnect', {}))}>
              {t('Desconectar conta', 'Disconnect account')}
            </button>
          </>
        )}
      </section>
      <section className="panel">
        <span className="eyebrow">YOUR OWN MUSIC</span>
        <h2>Plex / Caldera</h2>
        <p>
          {t(
            'O Plex organiza seus arquivos; o Plexamp toca. Caldera é o player sem tela do Plexamp.',
            'Plex organizes your files; Plexamp plays them. Caldera is the headless Plexamp player.',
          )}
        </p>
        {field('plexUrl', t('Endereço do Plex', 'Plex address'), 'url', 'http://your-server:32400')}
        {field(
          'plexToken',
          t('Token Plex (deixe vazio para manter)', 'Plex token (blank keeps the saved token)'),
          'password',
        )}
        {field(
          'calderaUrl',
          t('Endereço do Caldera', 'Caldera address'),
          'url',
          'http://your-player:32500',
        )}
        {field(
          'calderaClientId',
          t('Identificador do player Caldera', 'Caldera player identifier'),
        )}
        <button
          onClick={() =>
            action(async () => {
              await save();
              await api('/plex/import', {});
            })
          }
          disabled={busy}
        >
          {t('Importar biblioteca do Plex', 'Import Plex library')}
        </button>
      </section>
      <section className="panel">
        <span className="eyebrow">02 / USB</span>
        <h2>{t('Conectar leitor', 'Connect a reader')}</h2>
        <p>
          {t(
            'No Mac e Windows, use a captura de teclado na aba Cartões. No Linux, escolha o dispositivo para ler mesmo sem o navegador aberto.',
            'On Mac and Windows, use keyboard capture in Cards. On Linux, select a device to read with the browser closed.',
          )}
        </p>
        <button onClick={() => action(async () => setReaders(await api('/readers')))}>
          {t('Detectar dispositivos Linux', 'Detect Linux devices')}
        </button>
        <label>
          {t('Dispositivo de entrada', 'Input device')}
          <select
            value={form.readerPath}
            onChange={(e) => setForm({ ...form, readerPath: e.target.value })}
          >
            <option value="">{t('Teclado pelo navegador', 'Browser keyboard input')}</option>
            {readers.map((r) => (
              <option key={r.path} value={r.path}>
                {r.name} — {r.path}
              </option>
            ))}
          </select>
        </label>
        <p className="hint">
          {t(
            'Leitores de teclado normalmente enviam o ID e Enter. A remoção do cartão não pode ser detectada sem suporte do leitor.',
            'Keyboard readers usually send an ID and Enter. Card removal cannot be detected without reader support.',
          )}
        </p>
      </section>
    </div>
  );
}
