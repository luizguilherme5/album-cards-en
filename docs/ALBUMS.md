# Formato de álbum / Album format

Use `examples/album.json` as a starting point. Import it through **Importar JSON de álbum / Import album JSON**, or use **Dados / Details** to edit fields visually.

- `id`: stable identifier, 1–80 letters, numbers, `_` or `-`. Importing the same ID updates that album and preserves its saved artwork. Use a different ID for a different edition.
- `title`, `artist`: required text.
- `year`, `label`: text; may be empty when unknown. Do not guess a label just to fill the card.
- `tracks`: ordered array of `title`, positive `disc`, positive `number`, optional `seconds` duration. Maximum 300 tracks; print capacity depends on title lengths.
- `spotifyId`: optional 22-character Spotify album ID. It is not a track ID. Copy it from the album's Spotify link after `/album/`.
- `playbackProvider`: `auto`, `plex` or `spotify`. An explicit choice wins; `auto` uses a single linked service, or the Settings default when both IDs exist.
- `plexKey`: optional numerical Plex album rating key. Automatic Plex import supplies it.

Use `disc: 2, number: 1` to begin the second disc. There are no hard-coded track counts. Metadata scanning reports what exists in the selected folder and does not validate completeness, decode the full audio, or retag files.

O JSON não inclui caminho de áudio, token ou arquivo de imagem. Faça upload da capa na instalação de destino. O aplicativo salva a imagem original e a versão vertical separadamente; exportar a ficha não exporta a coleção privada inteira.

Portable JSON excludes local audio paths, tokens and images. Upload artwork separately on the destination installation. Exporting one album does not export private application state.
