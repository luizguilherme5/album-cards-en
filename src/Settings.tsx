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
  const [players, setPlayers] = useState<any[] | null>(null);
  const [catalog, setCatalog] = useState<any[] | null>(null);
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<string[]>([]);
  const [importResult, setImportResult] = useState('');
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
            'O Plex organiza seus arquivos. O Caldera reproduz no Linux e pode ser controlado pelo Plexamp.',
            'Plex organizes your files. Caldera plays on Linux and can be controlled by Plexamp.',
          )}
        </p>
        {field('plexUrl', t('Endereço do Plex', 'Plex address'), 'url', 'http://your-server:32400')}
        {field(
          'plexToken',
          t('Token Plex (deixe vazio para manter)', 'Plex token (blank keeps the saved token)'),
          'password',
        )}
        <button
          disabled={busy}
          onClick={() =>
            action(async () => {
              await save();
              setPlayers(await api('/plex/players'));
            })
          }
        >
          {t('Encontrar Caldera na rede', 'Find Caldera on the network')}
        </button>
        {players && (
          <label>
            {t('Player encontrado', 'Discovered player')}
            <select
              value={form.calderaClientId}
              onChange={(e) => {
                const player = players.find((p) => p.id === e.target.value);
                if (player)
                  setForm({ ...form, calderaUrl: player.url, calderaClientId: player.id });
              }}
            >
              <option value="">{t('Selecione um player', 'Choose a player')}</option>
              {players.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {!players.length && (
              <small>
                {t(
                  'Ligue o Caldera e entre na mesma conta Plex. Se necessário, preencha os campos abaixo manualmente.',
                  'Start Caldera and sign in to the same Plex account. You can also fill in the fields below manually.',
                )}
              </small>
            )}
          </label>
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
              setCatalog(await api('/plex/albums'));
              setChosen([]);
              setImportResult('');
            })
          }
          disabled={busy}
        >
          {busy
            ? t('Conectando…', 'Connecting…')
            : t('Escolher álbuns do Plex', 'Choose Plex albums')}
        </button>
      </section>
      {importResult && (
        <p className="message" role="status">
          {importResult}
        </p>
      )}
      {catalog && (
        <div className="overlay">
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="plex-import-title"
          >
            <div className="dialog-title">
              <h2 id="plex-import-title">{t('Sua biblioteca no Plex', 'Your Plex library')}</h2>
              <button
                aria-label={t('Fechar', 'Close')}
                disabled={busy}
                onClick={() => setCatalog(null)}
              >
                ✕
              </button>
            </div>
            <p>
              {t(
                'Escolha até 50 álbuns por vez. Importamos as faixas e a capa original; seus arquivos de música ficam onde estão.',
                'Choose up to 50 albums. We import track details and original covers; your music files stay where they are.',
              )}
            </p>
            <label>
              {t('Buscar artista ou álbum', 'Search artist or album')}
              <input value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <p>
              {catalog.length} {t('álbuns encontrados', 'albums found')} · {chosen.length}/50{' '}
              {t('selecionados', 'selected')}
            </p>
            <div className="plex-catalog">
              {catalog
                .filter((a) => `${a.title} ${a.artist}`.toLowerCase().includes(query.toLowerCase()))
                .sort((a, b) => a.title.localeCompare(b.title))
                .map((a) => (
                  <label className="check" key={a.plexKey}>
                    <input
                      type="checkbox"
                      checked={chosen.includes(a.plexKey)}
                      disabled={busy || (!chosen.includes(a.plexKey) && chosen.length >= 50)}
                      onChange={() =>
                        setChosen((old) =>
                          old.includes(a.plexKey)
                            ? old.filter((k) => k !== a.plexKey)
                            : [...old, a.plexKey],
                        )
                      }
                    />
                    <span>
                      <strong>{a.title}</strong>
                      <small>
                        {a.artist} · {a.year}
                      </small>
                    </span>
                  </label>
                ))}
            </div>
            <button
              className="primary"
              disabled={busy || !chosen.length}
              onClick={() =>
                action(async () => {
                  const result = await api('/plex/import', { keys: chosen });
                  setImportResult(
                    `${result.albums} ${t('álbuns importados com dados do Plex', 'albums imported from Plex')}. ${result.warnings.length ? result.warnings.join('; ') : ''}`,
                  );
                  setCatalog(null);
                })
              }
            >
              {busy
                ? t('Importando faixas e capas…', 'Importing tracks and covers…')
                : t('Importar selecionados', 'Import selected')}
            </button>
          </section>
        </div>
      )}
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
