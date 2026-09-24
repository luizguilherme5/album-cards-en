# Plex, Plexamp e Caldera / Plex, Plexamp and Caldera

**Plex Media Server** cataloga a pasta de músicas. **Plexamp** reproduz essa biblioteca. **Caldera** é o nome do player Plexamp sem interface gráfica, usado em computadores como Raspberry Pi e Orange Pi. Este aplicativo controla um player já instalado; não instala nem autentica o Plexamp por você.

Plex Media Server catalogs music. Plexamp plays it. Caldera is the headless Plexamp player. Album Cards controls an existing player; it does not install Plexamp or authenticate it on your behalf.

## Configuração / Setup

1. Confirme que o Plexamp já toca sua biblioteca normalmente. First verify ordinary Plexamp playback.
2. Em Configurações, escolha **Plex / Caldera**. Select it as the playback provider.
3. Informe a URL do servidor Plex, incluindo a porta configurada (comumente 32400). Enter the server URL and actual port.
4. Informe seu token Plex. Obtenha-o seguindo a [documentação oficial](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/). Nunca publique esse token. Follow Plex's official token guide; never publish it.
5. Informe URL e identificador do player Caldera instalado. Esses valores pertencem ao seu player e não são o identificador do servidor. Enter the Caldera URL and player client identifier, not the server identifier.
6. Salve e escolha **Importar biblioteca do Plex / Import Plex library**. A importação traz álbuns, faixas e rating keys; faça upload das capas separadamente nesta versão. It imports album metadata and identifiers; upload artwork separately in this release.
7. Teste o botão ▶ de um álbum antes do cartão. Test an album's play button before assigning a card.

O comando usa a rota Companion `/player/playback/createPlayQueue`. O servidor de música e o player precisam ser acessíveis pelo computador que executa Album Cards. Todos os arquivos do álbum são verificados por pequenas leituras antes de substituir a fila. Uma falha não significa que a música foi apagada; confira montagem do disco, permissões e caminho da biblioteca no Plex.

The Companion command uses `/player/playback/createPlayQueue`. Both endpoints must be reachable from the Album Cards host. Small media reads verify every track before replacing the queue. On failure, check storage mounts, permissions and library paths. No music is deleted by this application.

Esta integração tem verificação estrutural e tratamento de erros, mas precisa de teste real com a versão do seu Caldera. Não há credenciais ou endereços de um setup pessoal no projeto.

This adapter needs real playback validation with your Caldera version. No personal setup addresses or credentials are bundled.
