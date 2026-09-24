# Plex, Plexamp e Caldera / Plex, Plexamp and Caldera

**Plex Media Server** cataloga a pasta de músicas. **Plexamp** reproduz essa biblioteca. **Caldera** é um player de terceiros para Linux que usa a biblioteca Plex e pode ser controlado pelo Plexamp. Este aplicativo controla um player já instalado; não instala nem autentica o Plexamp por você.

Plex Media Server catalogs music. Plexamp plays it. Caldera is a separate third-party Linux player compatible with Plex and Plexamp remote control. Album Cards controls an existing player; it does not install Plexamp or authenticate it on your behalf.

## Configuração / Setup

1. Confirme que o Plexamp já toca sua biblioteca normalmente. First verify ordinary Plexamp playback.
2. Em Configurações, escolha **Plex / Caldera**. Select it as the playback provider.
3. Informe a URL do servidor Plex, incluindo a porta configurada (comumente 32400). Enter the server URL and actual port.
4. Informe seu token Plex. Obtenha-o seguindo a [documentação oficial](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/). Nunca publique esse token. Follow Plex's official token guide; never publish it.
5. Clique **Encontrar Caldera na rede / Find Caldera on the network**, selecione seu player e salve. Se não for encontrado, informe URL e identificador manualmente. Select your discovered player and save, or enter its URL and client identifier manually.
6. Clique **Escolher álbuns do Plex / Choose Plex albums**, pesquise, marque até 50 e importe. A importação traz faixas, capas originais e identificadores. Ela preserva capas já salvas e artes verticais. Choose up to 50 albums to import with track metadata and original covers; existing artwork is preserved.
7. Teste o botão ▶ de um álbum antes do cartão. Test an album's play button before assigning a card.

O comando usa a rota Companion `/player/playback/createPlayQueue`. O servidor de música e o player precisam ser acessíveis pelo computador que executa Album Cards. Todos os arquivos do álbum são verificados por pequenas leituras antes de substituir a fila. Uma falha não significa que a música foi apagada; confira montagem do disco, permissões e caminho da biblioteca no Plex.

The Companion command uses `/player/playback/createPlayQueue`. Both endpoints must be reachable from the Album Cards host. Small media reads verify every track before replacing the queue. On failure, check storage mounts, permissions and library paths. No music is deleted by this application.

Esta integração tem verificação estrutural e tratamento de erros, mas precisa de teste real com a versão do seu Caldera. Não há credenciais ou endereços de um setup pessoal no projeto.

This adapter needs real playback validation with your Caldera version. No personal setup addresses or credentials are bundled.
