# Como o código está organizado / How the code is organized

Uma aplicação Node serve a API e o frontend React. Durante desenvolvimento, Vite roda como middleware no mesmo processo. Não há serviços Python, filas externas ou banco para instalar.

| Pasta / File | Responsabilidade / Responsibility |
| --- | --- |
| `shared/schema.ts` | Contratos validados com Zod: álbum, faixa, configuração e tamanho do cartão. Validated data contracts and physical card dimensions. |
| `server/main.ts` | Liga rotas HTTP aos módulos, valida origem e inicia o servidor. HTTP routing, origin checks and application startup. |
| `server/store.ts` | Estado privado em JSON, gravado por arquivo temporário e rename. Atomic private state persistence. |
| `server/library.ts` | Leitura de metadados e imagens; não modifica áudio. Read-only music metadata scanning and image storage. |
| `server/reader.ts` | Decodifica teclado USB Linux e controla atribuição/reprodução. Linux USB event decoding and card state machine. |
| `server/spotify.ts` | PKCE, autorização, renovação de token e comandos Spotify. OAuth lifecycle and Spotify commands. |
| `server/plex.ts` | Biblioteca Plex, verificação de mídia e createPlayQueue no Caldera. Plex library and Caldera queue commands. |
| `server/pdf.ts` | Layout em milímetros, fontes e cálculo de espaço. Physical PDF layout and text fitting. |
| `src/main.tsx` | Navegação, coleção e sessões de cartões. Navigation, collection and card sessions. |
| `src/AlbumEditor.tsx` | Formulário de metadados e JSON opcional. Metadata form and optional JSON view. |
| `src/CropEditor.tsx` | Canvas, enquadramento, zoom e exportação exata. Canvas cropping and exact-size output. |
| `src/Settings.tsx` | Configuração de leitores e players. Reader and player setup. |
| `tests/` | Testes sem contas ou hardware real. Tests without real accounts or hardware. |

## Fluxo / Flow

```text
USB reader → card ID → assignment OR playback → Spotify / Plexamp
                   ↘ saved mapping in data/library.json
Music folder / JSON / provider → album metadata → artwork editor → print PDF
```

A tela consulta o estado periodicamente. O servidor é a fonte de verdade das atribuições. As leituras durante uma reprodução em andamento são descartadas para evitar filas de comandos. Eventos idênticos em menos de 1,5 segundo são ignorados. O sucesso do comando só é registrado depois de o provedor aceitá-lo.

The screen polls server state. The server owns card assignments. Scans received while a playback command is pending are dropped to prevent command queues. Identical scans within 1.5 seconds are ignored. Playback state is recorded only after the provider accepts the command.

## Repositórios / Repositories

As edições PT e EN compartilham os mesmos módulos. Diferem no README principal e no idioma inicial em `locale.json`. Ambas permitem trocar PT/EN na interface. Mantenha os módulos e testes sincronizados ao corrigir bugs; não introduza integrações diferentes em cada idioma.

PT and EN editions share application modules and tests. Only the landing documentation and default locale differ. Both support switching languages. Keep source changes synchronized.
