import { useState } from 'react';
import type { LibraryAlbum, Album } from '../shared/schema';
import { api } from './api';
export function AlbumEditor({
  album,
  en,
  close,
  saved,
  report,
}: {
  album: LibraryAlbum;
  en: boolean;
  close: () => void;
  saved: () => void;
  report: (e: unknown) => void;
}) {
  const { original, vertical, source, ...portable } = album;
  const [draft, setDraft] = useState<Album>(portable),
    [advanced, setAdvanced] = useState(false),
    [json, setJson] = useState(''),
    [busy, setBusy] = useState(false);
  const t = (pt: string, eng: string) => (en ? eng : pt);
  function field(
    key: 'title' | 'artist' | 'year' | 'label' | 'spotifyId' | 'plexKey',
    label: string,
  ) {
    return (
      <label>
        {label}
        <input
          value={draft[key] || ''}
          onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        />
      </label>
    );
  }
  async function save() {
    setBusy(true);
    try {
      await api('/albums', { ...(advanced ? JSON.parse(json) : draft), id: album.id });
      saved();
      close();
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="overlay">
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t('Dados do álbum', 'Album details')}
      >
        <div className="dialog-title">
          <h2>{t('Ficha do álbum', 'Album details')}</h2>
          <button onClick={close}>✕</button>
        </div>
        <div className="segmented">
          <button
            className={!advanced ? 'active' : ''}
            onClick={() => {
              if (advanced) {
                try {
                  setDraft(JSON.parse(json));
                  setAdvanced(false);
                } catch (e) {
                  report(e);
                }
              }
            }}
          >
            {t('Editor visual', 'Visual editor')}
          </button>
          <button
            className={advanced ? 'active' : ''}
            onClick={() => {
              setJson(JSON.stringify(draft, null, 2));
              setAdvanced(true);
            }}
          >
            JSON
          </button>
        </div>
        {advanced ? (
          <textarea
            className="json"
            value={json}
            onChange={(e) => setJson(e.target.value)}
            spellCheck={false}
          />
        ) : (
          <>
            <div className="metadata-fields">
              {field('title', t('Álbum', 'Album'))}
              {field('artist', t('Artista', 'Artist'))}
              {field('year', t('Ano', 'Year'))}
              {field('label', t('Gravadora', 'Label'))}
              {field('spotifyId', 'Spotify album ID')}
              {field('plexKey', 'Plex rating key')}
            </div>
            <h3>{t('Lista de faixas', 'Track list')}</h3>
            <p>
              {t(
                'Numere cada disco separadamente. A ficha de impressão agrupa as faixas por disco.',
                'Number each disc separately. The printed card groups tracks by disc.',
              )}
            </p>
            <div className="track-table">
              <div className="track-row heading">
                <span>{t('Disco', 'Disc')}</span>
                <span>Nº</span>
                <span>{t('Título', 'Title')}</span>
                <span />
              </div>
              {draft.tracks.map((track, index) => (
                <div className="track-row" key={index}>
                  <input
                    aria-label={t('Disco', 'Disc')}
                    type="number"
                    min="1"
                    value={track.disc}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        tracks: draft.tracks.map((tr, i) =>
                          i === index ? { ...tr, disc: Number(e.target.value) } : tr,
                        ),
                      })
                    }
                  />
                  <input
                    aria-label={t('Número', 'Number')}
                    type="number"
                    min="1"
                    value={track.number}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        tracks: draft.tracks.map((tr, i) =>
                          i === index ? { ...tr, number: Number(e.target.value) } : tr,
                        ),
                      })
                    }
                  />
                  <input
                    aria-label={t('Título da faixa', 'Track title')}
                    value={track.title}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        tracks: draft.tracks.map((tr, i) =>
                          i === index ? { ...tr, title: e.target.value } : tr,
                        ),
                      })
                    }
                  />
                  <button
                    aria-label={t('Remover faixa', 'Remove track')}
                    onClick={() =>
                      setDraft({ ...draft, tracks: draft.tracks.filter((_, i) => i !== index) })
                    }
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() =>
                setDraft({
                  ...draft,
                  tracks: [
                    ...draft.tracks,
                    {
                      title: '',
                      disc: draft.tracks.at(-1)?.disc || 1,
                      number: (draft.tracks.at(-1)?.number || 0) + 1,
                    },
                  ],
                })
              }
            >
              {t('+ Adicionar faixa', '+ Add track')}
            </button>
          </>
        )}
        <div className="actions">
          <a href={`/api/albums/${album.id}/export`} download>
            {t('Exportar JSON', 'Export JSON')}
          </a>
          <button className="primary" disabled={busy} onClick={save}>
            {t('Salvar dados', 'Save details')}
          </button>
        </div>
      </section>
    </div>
  );
}
