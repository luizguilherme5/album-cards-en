import React, { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { api, request, setCsrf } from './api';
import { CropEditor } from './CropEditor';
import { Settings } from './Settings';
import { AlbumEditor } from './AlbumEditor';
const PdfPreview = lazy(() =>
  import('./PdfPreview').then((module) => ({ default: module.PdfPreview })),
);
import type { LibraryAlbum } from '../shared/schema';
import './style.css';
function App() {
  const [state, setState] = useState<any>(),
    [en, setEn] = useState(false),
    [tab, setTab] = useState('library');
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const [query, setQuery] = useState(''),
    [selected, setSelected] = useState<string[]>([]),
    [minimum, setMinimum] = useState(false);
  const [crop, setCrop] = useState<LibraryAlbum>(),
    [edit, setEdit] = useState<LibraryAlbum>(),
    [json, setJson] = useState('');
  const [folders, setFolders] = useState<any>(),
    [folderPath, setFolderPath] = useState('');
  const [spotifyId, setSpotifyId] = useState(''),
    [scan, setScan] = useState(''),
    [overwrite, setOverwrite] = useState(false);
  const [pdf, setPdf] = useState(''),
    [mirror, setMirror] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const t = (pt: string, english: string) => (en ? english : pt);
  function report(e: any) {
    setError(e?.message || String(e));
  }
  async function refresh() {
    const value = await api('/state');
    setCsrf(value.csrf);
    setState(value);
    return value;
  }
  useEffect(() => {
    refresh()
      .then((value) => setEn((localStorage.getItem('album-language') || value.locale) === 'en'))
      .catch(report);
    const timer = setInterval(() => {
      void refresh().catch(() => {});
    }, 2500);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    return () => {
      if (pdf) URL.revokeObjectURL(pdf);
    };
  }, [pdf]);
  async function action(fn: () => Promise<any>) {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await fn();
      await refresh();
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function showPdf(kind: 'front' | 'back', ids = selected, single = false) {
    await action(async () => {
      const response = await request('/pdf', {
        ids,
        kind,
        single,
        mirror: kind === 'back' && mirror,
      });
      setPdf(URL.createObjectURL(await response.blob()));
    });
  }
  function toggle(id: string) {
    setSelected((old) =>
      old.includes(id) ? old.filter((x) => x !== id) : old.length < 50 ? [...old, id] : old,
    );
  }
  if (!state)
    return (
      <main className="loading">
        <h1>Album Cards</h1>
        <p>{error || 'Opening your collection…'}</p>
      </main>
    );
  const albums: LibraryAlbum[] = [...state.albums].sort((a, b) => a.title.localeCompare(b.title));
  const visible = albums.filter(
    (a) =>
      (!minimum || a.tracks.length >= 5) &&
      `${a.title} ${a.artist}`.toLowerCase().includes(query.toLowerCase()),
  );
  const selectedSorted = albums.filter((a) => selected.includes(a.id)).map((a) => a.id);
  return (
    <>
      <header>
        <a className="brand" href="/">
          ◉{' '}
          <span>
            album cards<small>{t('SUA MÚSICA, EM MÃOS', 'YOUR MUSIC, IN HAND')}</small>
          </span>
        </a>
        <nav>
          {[
            ['library', t('Coleção', 'Collection')],
            ['cards', t('Cartões', 'Cards')],
            ['print', t('Impressão', 'Print studio')],
            ['settings', t('Configurações', 'Settings')],
          ].map(([id, name]) => (
            <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
              {name}
            </button>
          ))}
        </nav>
        <button
          className="language"
          onClick={() => {
            setEn(!en);
            localStorage.setItem('album-language', en ? 'pt' : 'en');
          }}
        >
          {en ? 'PT' : 'EN'}
        </button>
      </header>
      <main>
        <div className="hero">
          <div>
            <span className="eyebrow">THE ALBUM CARDS PROJECT / VOL. 01</span>
            <h1>
              {tab === 'settings'
                ? t('Tudo no seu ritmo.', 'Make yourself at home.')
                : tab === 'cards'
                  ? t('Um cartão. Um álbum.', 'One card. One album.')
                  : tab === 'print'
                    ? t('Da coleção para o papel.', 'From collection to paper.')
                    : t('Dê forma à sua música.', 'Give your music a shape.')}
            </h1>
            <p>
              {t(
                'Escolha um disco. Prepare a capa. Aproxime o cartão e aperte o mundo no pause.',
                'Choose a record. Frame the cover. Tap a card and make time for an album.',
              )}
            </p>
          </div>
          <div className="stats">
            <strong>{albums.length.toString().padStart(2, '0')}</strong>
            <span>{t('álbuns na coleção', 'albums in your collection')}</span>
          </div>
        </div>
        {error && (
          <div className="message error" role="alert">
            {error}
            <button onClick={() => setError('')}>✕</button>
          </div>
        )}
        {notice && (
          <div className="message" role="status">
            {notice}
          </div>
        )}
        {busy && (
          <div className="message" role="status">
            {t('Preparando… mantenha esta página aberta.', 'Working… keep this page open.')}
          </div>
        )}
        {tab === 'settings' ? (
          <Settings
            key="settings"
            state={state}
            en={en}
            refresh={() => void refresh()}
            report={report}
          />
        ) : (
          <>
            {tab === 'cards' && (
              <section className="panel reader-panel">
                <div>
                  <span className="eyebrow">
                    RFID / {state.reader.source === 'linux' ? 'USB LINUX' : 'KEYBOARD'}
                  </span>
                  <h2>
                    {state.reader.source === 'linux'
                      ? state.reader.connected
                        ? t('Leitor conectado', 'Reader connected')
                        : t('Leitor desconectado', 'Reader disconnected')
                      : state.reader.lastAt
                        ? t('Leitura recebida', 'Scan received')
                        : t('Aguardando primeira leitura', 'Waiting for the first scan')}
                  </h2>
                  <p>
                    {en
                      ? state.reader.message
                      : state.reader.message
                          .replace('Ready for a keyboard scan', 'Aguardando leitura pelo teclado')
                          .replace('Assigned:', 'Atribuído:')
                          .replace('Playing:', 'Tocando:')}
                  </p>
                  <p className="hint">
                    {state.reader.lastId && `ID: ${state.reader.lastId}`}{' '}
                    {state.reader.lastAt && new Date(state.reader.lastAt).toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <div className="segmented">
                    <button
                      className={state.reader.mode === 'play' ? 'active' : ''}
                      onClick={() => action(() => api('/reader/mode', { mode: 'play' }))}
                    >
                      {t('Reproduzir', 'Playback')}
                    </button>
                    <button
                      className={state.reader.mode === 'assign' ? 'active' : ''}
                      disabled={!selected.length}
                      onClick={() =>
                        action(() =>
                          api('/reader/mode', { mode: 'assign', queue: selectedSorted, overwrite }),
                        )
                      }
                    >
                      {t('Atribuir selecionados', 'Assign selected')}
                    </button>
                  </div>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={overwrite}
                      onChange={(e) => setOverwrite(e.target.checked)}
                    />
                    {t('Permitir substituir atribuições', 'Allow overwriting assignments')}
                  </label>
                  {state.reader.mode === 'assign' && (
                    <p>
                      {t('Próximo:', 'Next:')}{' '}
                      <strong>
                        {albums.find((a) => a.id === state.reader.queue[0])?.title ||
                          t('Lote concluído', 'Batch complete')}
                      </strong>{' '}
                      · {state.reader.queue.length} {t('restantes', 'remaining')}
                    </p>
                  )}
                  {state.reader.source === 'keyboard' && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const id = scan.trim();
                        setScan('');
                        void action(() => api('/reader/scan', { id }));
                        input.current?.focus();
                      }}
                    >
                      <label>
                        {t(
                          'Clique no campo e aproxime o cartão',
                          'Click the field and tap your card',
                        )}
                        <input
                          ref={input}
                          placeholder={t('ID + Enter', 'ID + Enter')}
                          value={scan}
                          onChange={(e) => setScan(e.target.value)}
                          autoComplete="off"
                        />
                      </label>
                    </form>
                  )}
                  <p className="hint">
                    {t(
                      'A captura pelo navegador exige esta aba em foco. O bip sozinho não confirma a conexão com o aplicativo.',
                      'Browser capture needs this tab in focus. A beep alone does not confirm the application connection.',
                    )}
                  </p>
                </div>
              </section>
            )}
            {tab === 'print' && (
              <section className="panel print-bar">
                <div>
                  <h2>54 × 85.6 mm</h2>
                  <p>
                    {t(
                      '10 cartões por A4 paisagem · 3 mm entre artes · imprimir em 100%',
                      '10 cards per landscape A4 · 3 mm gutters · print at 100%',
                    )}
                  </p>
                </div>
                <button
                  disabled={!selected.length || busy}
                  onClick={() => showPdf('front', selectedSorted)}
                >
                  {t('Gerar PDF das capas', 'Generate cover PDF')}
                </button>
                <button
                  disabled={!selected.length || busy}
                  onClick={() => showPdf('back', selectedSorted)}
                >
                  {t('Gerar PDF das fichas', 'Generate fact sheet PDF')}
                </button>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={mirror}
                    onChange={(e) => setMirror(e.target.checked)}
                  />
                  {t('Espelhar ordem dos versos', 'Mirror back-side order')}
                </label>
              </section>
            )}
            <div className="toolbar">
              <input
                aria-label={t('Pesquisar álbuns', 'Search albums')}
                placeholder={t('Buscar artista ou álbum…', 'Search artist or album…')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <label className="check">
                <input
                  type="checkbox"
                  checked={minimum}
                  onChange={(e) => setMinimum(e.target.checked)}
                />
                {t('5+ faixas', '5+ tracks')}
              </label>
              <button onClick={() => setSelected(visible.slice(0, 50).map((a) => a.id))}>
                {t('Selecionar', 'Select')} ({Math.min(50, visible.length)})
              </button>
              <button onClick={() => setSelected([])}>{selected.length}/50 ✕</button>
              {tab === 'library' && (
                <button
                  className="primary"
                  onClick={() =>
                    action(async () => {
                      const f = await api('/folders');
                      setFolders(f);
                      setFolderPath(f.path);
                    })
                  }
                >
                  {t('+ Adicionar álbuns', '+ Add albums')}
                </button>
              )}
            </div>
            {!albums.length ? (
              <section className="empty">
                <div className="record">◉</div>
                <h2>
                  {t('Toda coleção começa com um disco.', 'Every collection starts with a record.')}
                </h2>
                <p>
                  {t(
                    'Importe uma pasta de músicas, um JSON ou conecte sua biblioteca nas configurações.',
                    'Import a music folder, a JSON file, or connect your library in settings.',
                  )}
                </p>
                <button
                  onClick={() => {
                    const a = {
                      playbackProvider: 'auto' as const,
                      id: crypto.randomUUID(),
                      title: '',
                      artist: '',
                      year: '',
                      label: '',
                      tracks: [],
                    };
                    setEdit(a);
                    setJson(JSON.stringify(a, null, 2));
                  }}
                >
                  {t('Criar álbum manualmente', 'Create an album manually')}
                </button>
              </section>
            ) : (
              <div className="album-grid">
                {visible.map((album) => (
                  <article
                    key={album.id}
                    className={selected.includes(album.id) ? 'album selected' : 'album'}
                  >
                    <div className="artwork">
                      <button
                        className="art-button"
                        onClick={() => setCrop(album)}
                        aria-label={t('Editar arte de ', 'Edit cover of ') + album.title}
                      >
                        {album.vertical || album.original ? (
                          <img
                            src={'/images/' + (album.vertical || album.original)}
                            alt={album.title}
                          />
                        ) : (
                          <div className="placeholder">◉</div>
                        )}
                        <span className="edit-cover">
                          {t('Enquadrar arte ↗', 'Frame artwork ↗')}
                        </span>
                      </button>
                      <input
                        type="checkbox"
                        aria-label={t('Selecionar ', 'Select ') + album.title}
                        checked={selected.includes(album.id)}
                        onChange={() => toggle(album.id)}
                      />
                      {album.vertical && (
                        <span className="ready">{t('VERTICAL PRONTA', 'VERTICAL READY')}</span>
                      )}
                    </div>
                    <div className="album-info">
                      <h3>{album.title}</h3>
                      <p>{album.artist}</p>
                      <small>
                        {album.year || '—'} · {album.tracks.length} {t('faixas', 'tracks')}
                      </small>
                      <div className="album-actions">
                        <button
                          onClick={() => {
                            setEdit(album);
                            const { original, vertical, source, ...portable } = album;
                            setJson(JSON.stringify(portable, null, 2));
                          }}
                        >
                          {t('Dados', 'Details')}
                        </button>
                        <button onClick={() => showPdf('back', [album.id], true)}>
                          {t('Ficha', 'Facts')}
                        </button>
                        <button
                          aria-label={t('Tocar ', 'Play ') + album.title}
                          onClick={() => action(() => api('/play', { id: album.id }))}
                        >
                          ▶
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <div className="import-footer">
              <button
                onClick={() =>
                  setEdit({
                    playbackProvider: 'auto',
                    id: crypto.randomUUID(),
                    title: '',
                    artist: '',
                    year: '',
                    label: '',
                    tracks: [],
                  })
                }
              >
                {t('Novo álbum', 'New album')}
              </button>
              <label className="file-button">
                {t('Importar JSON de álbum', 'Import album JSON')}
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file)
                      void action(async () => {
                        await api('/albums', JSON.parse(await file.text()));
                      });
                    e.target.value = '';
                  }}
                />
              </label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void action(() =>
                    api('/spotify/import', {
                      id: spotifyId
                        .trim()
                        .replace(/^https:\/\/open.spotify.com\/album\//, '')
                        .split('?')[0],
                    }),
                  );
                }}
              >
                <input
                  placeholder={t('Link ou ID do álbum Spotify', 'Spotify album link or ID')}
                  value={spotifyId}
                  onChange={(e) => setSpotifyId(e.target.value)}
                />
                <button disabled={!state.config.spotifyConnected || busy}>
                  {t('Importar Spotify', 'Import Spotify')}
                </button>
              </form>
            </div>
          </>
        )}
        <footer>
          ALBUM CARDS{' '}
          <span>
            {t('Feito para ouvir com intenção.', 'Made for intentional listening.')} · LOCAL FIRST ·
            OPEN SOURCE
          </span>
        </footer>
      </main>
      {crop && (
        <CropEditor
          album={crop}
          en={en}
          close={() => setCrop(undefined)}
          saved={() => void refresh()}
          report={report}
        />
      )}
      {edit && (
        <AlbumEditor
          album={edit}
          en={en}
          close={() => setEdit(undefined)}
          saved={() => void refresh()}
          report={report}
        />
      )}
      {folders && (
        <div className="overlay">
          <section className="dialog" role="dialog" aria-modal="true">
            <div className="dialog-title">
              <h2>{t('Escolha uma pasta', 'Choose a folder')}</h2>
              <button onClick={() => setFolders(undefined)}>✕</button>
            </div>
            <p>
              {t(
                'Pastas do computador que executa este aplicativo. Seus arquivos não serão alterados.',
                'Folders on the computer running this application. Your files will not be modified.',
              )}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void action(async () =>
                  setFolders(await api('/folders?path=' + encodeURIComponent(folderPath))),
                );
              }}
            >
              <input value={folderPath} onChange={(e) => setFolderPath(e.target.value)} />
              <button>{t('Abrir caminho', 'Open path')}</button>
            </form>
            <div className="folder-list">
              {[
                { name: '..', path: folders.parent },
                ...folders.folders.map((name: string) => ({
                  name,
                  path: folders.path + '/' + name,
                })),
              ].map((f) => (
                <button
                  key={f.path}
                  onClick={() =>
                    action(async () => {
                      const next = await api('/folders?path=' + encodeURIComponent(f.path));
                      setFolders(next);
                      setFolderPath(next.path);
                    })
                  }
                >
                  ▱ {f.name}
                </button>
              ))}
            </div>
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                action(async () => {
                  const result = await api('/scan', { path: folders.path });
                  setNotice(
                    `${result.albums} ${t('álbuns importados', 'albums imported')}. ${result.warnings.length} ${t('avisos', 'warnings')}.`,
                  );
                  setFolders(undefined);
                })
              }
            >
              {t('Importar esta pasta', 'Import this folder')}
            </button>
          </section>
        </div>
      )}
      {pdf && (
        <div className="overlay">
          <section className="dialog pdf-dialog" role="dialog" aria-modal="true">
            <div className="dialog-title">
              <h2>{t('Prévia para impressão', 'Print preview')}</h2>
              <div>
                <a className="button primary" href={pdf} download="album-cards.pdf">
                  {t('Baixar PDF', 'Download PDF')}
                </a>
                <button onClick={() => setPdf('')}>✕</button>
              </div>
            </div>
            <Suspense fallback={<p>PDF…</p>}>
              <PdfPreview url={pdf} en={en} />
            </Suspense>
            <p>
              {t(
                'Imprima em tamanho real (100%). Faça uma folha de teste antes de imprimir frente e verso.',
                'Print at actual size (100%). Test one sheet before duplex printing.',
              )}
            </p>
          </section>
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
