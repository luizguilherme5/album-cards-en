# Album Cards

**Sua coleção de música, em cartões.** Um aplicativo local em TypeScript: importe álbuns, prepare capas e fichas, associe cartões RFID e envie a reprodução ao Spotify ou Plexamp/Caldera.

> Primeira versão para testes. A interface, persistência, leitura simulada e PDFs são verificadas automaticamente. Reprodução real exige sua conta Spotify ou seu Plex/Caldera, e o leitor físico deve ser validado no seu computador. Não inclui músicas, capas comerciais ou configurações pessoais.

## Comece aqui

Instale **Node.js 24 LTS**. Na pasta deste repositório:

```sh
npm ci
npm run dev
```

Abra **http://127.0.0.1:3850**. Uma aplicação, uma porta, nenhum Python, banco externo ou container obrigatório. Em uma instalação comum, mantenha o terminal aberto e use Ctrl+C para parar. Onde houver um `dev.sh` de gerenciamento local, `npm run dev` delega a ele.

1. **Coleção → Adicionar álbuns:** escolha uma pasta do computador que executa o aplicativo. Os arquivos não são alterados. A leitura extrai artista, álbum, faixas, duração, gravadora e capa quando esses dados existem nas tags.
2. **Dados:** corrija informações no formulário e organize discos/faixas. A aba JSON e o botão Exportar permitem levar a ficha para outra instalação. Há um [exemplo fictício](../examples/album.json).
3. **Clique na capa:** envie uma imagem, arraste, ajuste zoom e salve o recorte de **1080 × 1712 px**, na proporção **54 × 85,6 mm**. A origem fica separada da arte vertical.
4. **Configurações:** conecte [Spotify](SPOTIFY.md) ou configure [Plex/Caldera](PLAYERS.md). Escolha um player antes de tentar tocar um cartão.
5. **Cartões:** selecione álbuns, habilite substituição se desejar, clique em Atribuir selecionados e apresente um cartão por álbum. A fila usa ordem alfabética. Depois mude para Reproduzir.
6. **Impressão:** selecione até 50 álbuns e gere o PDF das capas ou das fichas. A prévia e o download usam o mesmo arquivo.

Uma pasta local não é enviada ao Spotify. Associe seu álbum ao **Spotify album ID** ou importe diretamente pelo link do Spotify depois de conectar a conta. Para Plex, a importação traz os identificadores necessários e as faixas.

## Leitores

- **Mac ou Windows, com navegador no mesmo computador:** leitor USB que digita ID + Enter. Na aba Cartões, mantenha o campo de captura e a página em foco. A interface confirma uma leitura recebida; não afirma que um USB está conectado só porque o campo está aberto.
- **Linux 64-bit / Raspberry Pi / Orange Pi:** selecione o dispositivo em Configurações. A leitura nativa funciona sem manter o navegador aberto, enquanto o aplicativo Node estiver rodando. Prefira o caminho estável `/dev/input/by-id/…` quando disponível.
- Conceda acesso somente ao leitor identificado. Veja [configuração do leitor](READER.md). Não execute todo o aplicativo como root.
- Não é necessário gravar a memória do cartão: o aplicativo associa o ID a um álbum.
- Leitores de teclado geralmente não notificam remoção. Remover o cartão **não pausa**. Outro cartão inicia seu álbum; repetir o mesmo cartão escolhe outra posição entre as faixas cadastradas, evitando a última posição iniciada pelo aplicativo.
- Durante atribuição, as leituras não enviam comandos de reprodução. A sessão expira após cinco minutos; reinicie-a se necessário. O mesmo cartão não preenche duas posições na mesma sessão.

## Player dedicado, sem navegador aberto

O caminho recomendado é Linux de 64 bits: Raspberry Pi, Orange Pi ou PC. O leitor fica conectado nele. Escolha **Plex/Caldera** para sua coleção local ou **Spotify** para streaming com Premium, sem servidor de músicas. Cada álbum pode usar seu próprio serviço.

Siga [instalação Linux e início automático](LINUX.pt.md). Depois de configurar, `bash deployment/dev.sh enable plex` ou `bash deployment/dev.sh enable spotify` deixa o aplicativo e o player iniciarem no boot. Para ambos na mesma saída USB, veja a troca de áudio nesse guia.

## Impressão

A4 paisagem, **dez cartões por página**, molduras de 54 × 85,6 mm e 3 mm entre cartões. Imprima em **100% / tamanho real**, sem ajustar à página. A opção Espelhar ordem dos versos ajuda a preparar frente e verso, mas exige teste físico conforme o modo duplex de sua impressora. A última folha preserva as mesmas posições.

As fichas usam tipografia incorporada e até duas colunas. O tamanho é ajustado até um mínimo de 5,25 pt. Se os dados não couberem, o sistema informa o álbum em vez de cortar informações. Reduza textos excessivos ou prepare um encarte para discos muito extensos. Uma contagem de cinco ou mais faixas é só um filtro: **não certifica que um álbum está completo**.

## Dados e privacidade

Tudo fica em `data/`, ignorada pelo Git. Faça backup dela para preservar fichas, imagens, cartões e configurações. `library.json` contém credenciais locais e não deve ser compartilhado; use Exportar JSON na ficha para compartilhar só metadados. Imagens são versionadas pelo conteúdo, sem substituir o arquivo anterior. O aplicativo escuta apenas em loopback nesta versão; para usar a interface de outro computador, use um túnel SSH até o servidor. Não publique a porta diretamente na Internet.

## Para desenvolver

```sh
npm run typecheck
npm test
npm run build
npm start
```

`npm start` serve a compilação do frontend usando o mesmo servidor Node; execute `npm run build` primeiro. Não inicie `npm start` e `npm run dev` juntos na mesma porta. `PORT`, `DATA_DIR`, `DEFAULT_LOCALE` e `APP_ORIGIN` podem ser definidos no ambiente. O projeto não carrega `.env` automaticamente.

Leia [arquitetura](ARCHITECTURE.md), [formato dos álbuns](ALBUMS.md), [limites e validação](VALIDATION.md) e [segurança](../SECURITY.md).

Código sob MIT. Fontes têm licenças próprias em `public/fonts/`. Os modelos 3D, quando incluídos em `hardware/`, têm situação de licença independente; consulte seu README antes de redistribuir.
