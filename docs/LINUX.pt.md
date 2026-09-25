# Player dedicado: ligar e ouvir

O leitor fica conectado ao computador Linux que executa Album Cards. O navegador serve para configurar; o serviço lê cada cartão e inicia o álbum sem navegador aberto.

## Sistema recomendado

- **Raspberry Pi 4/5:** [Raspberry Pi OS Lite 64 bits](https://www.raspberrypi.com/software/operating-systems/), pelo Raspberry Pi Imager.
- **Orange Pi 3B:** [Armbian Minimal/CLI para o 3B](https://armbian.com/boards/orangepi3b), com Debian estável. O suporte desta placa é comunitário; confira a revisão e as notas da imagem. O aparelho usado no projeto tem Debian 12; isso não significa que todas as imagens posteriores foram testadas.
- **PC:** Debian/Ubuntu de 64 bits. Para Spotify nativo, mantenha uma sessão gráfica; para um player sem tela, use o receptor abaixo.

Configure rede e SSH. Use uma fonte adequada e desative a suspensão automática. Não instale uma imagem de Raspberry no Orange Pi. Instruções oficiais: [Raspberry](https://www.raspberrypi.com/documentation/computers/getting-started.html) e [Armbian](https://docs.armbian.com/getting-started/).

## 1. Instalar a aplicação

Instale [Node.js 24 LTS](https://nodejs.org/en/download) para ARM64 no Pi ou x64 no PC e Git. Confira `node --version` e `npm --version`. Na pasta do projeto, como usuário normal:

```sh
npm ci
npm run build
bash deployment/dev.sh setup
bash deployment/dev.sh up
```

Para experimentar ou desenvolver, `npm run dev` continua disponível. Não rode junto com o serviço na mesma porta. O serviço usa o mesmo banco `data/` e frontend compilado.

Sem monitor no Pi? No seu computador, abra outro terminal:

```sh
ssh -N -L 3850:127.0.0.1:3850 seu-usuario@seu-player.local
```

Troque usuário/endereço. Abra **http://127.0.0.1:3850** no navegador do computador. Mantenha o túnel aberto durante a configuração e autorização Spotify. Ao fechar esse terminal, a leitura no Pi continua funcionando. Não execute uma segunda cópia local do app nessa porta.

Em **Configurações → Detectar dispositivos Linux**, selecione o leitor e salve. Espere `USB reader connected`. Para conceder acesso apenas ao leitor, siga [READER.md](READER.md). O app reconecta pela identidade USB quando o dispositivo volta. Dois leitores iguais exigem escolha explícita.

## 2A. Coleção local: Plex e Caldera

O Plex Media Server guarda o catálogo e fornece os arquivos. O Caldera é um player Linux separado, controlável pelo Plexamp. Instale e autentique seguindo a [página oficial](https://caldera.homes/music/headless/). O instalador oficial cria o serviço de usuário `caldera-music.service`.

```sh
curl -fL https://releases.caldera.homes/music/headless/install.sh -o /tmp/caldera-install.sh
less /tmp/caldera-install.sh
bash /tmp/caldera-install.sh
~/caldera-music/caldera-music --login
```

Escolha a saída de áudio e teste um álbum pelo Plexamp. No Album Cards, configure Plex, encontre Caldera e importe álbuns conforme [PLAYERS.md](PLAYERS.md). Nenhuma música precisa ser copiada para o cartão.

Depois de configurar, este comando deixa **Album Cards e Caldera iniciarem junto com o Linux**:

```sh
bash deployment/dev.sh enable plex
```

## 2B. Spotify: sem coleção baixada

Requer Spotify Premium e internet. Há dois processos diferentes: Album Cards recebe os cartões e envia comandos pela Web API; o receptor Spotify Connect recebe o áudio. Nosso serviço usa o librespot do pacote oficial do projeto comunitário [Raspotify](https://github.com/dtcooper/raspotify), sem iniciar uma segunda instalação de Raspotify do sistema.

```sh
bash deployment/dev.sh dependencies
curl -fL "https://dtcooper.github.io/raspotify/raspotify-latest_$(dpkg --print-architecture).deb" -o /tmp/raspotify.deb
bash deployment/dev.sh install-spotify /tmp/raspotify.deb
cp -n deployment/runtime.env.example ~/.config/album-cards/runtime.env
nano ~/.config/album-cards/runtime.env
```

O instalador confere o nome e a arquitetura do pacote e verifica se o executável roda. O comando de dependências usa sudo e instala áudio ALSA/Pulse, SSL e descoberta Avahi. Não instala nem executa a aplicação como root.

No arquivo, defina `SPOTIFY_NAME` e `SPOTIFY_ALSA_DEVICE`. `aplay -l` lista as placas. Prefira um nome estável como `plughw:CARD=MinhaCaixa,DEV=0`, não um número que muda a cada boot. A Edifier M90 do projeto usa `plughw:CARD=M90,DEV=0` e `SPOTIFY_AUDIO_FORMAT=S24_3`. Para outro equipamento, teste o formato suportado; o padrão é S16. Reinicie o receptor depois de alterar o arquivo.

```sh
bash deployment/dev.sh spotify up
```

No Spotify do celular, na mesma rede, selecione **Album Cards** na lista Connect e toque uma música. Essa primeira conexão salva credenciais do receptor localmente. Configure também a autorização do Album Cards seguindo [SPOTIFY.pt.md](SPOTIFY.pt.md). São duas etapas: o receptor tocar e o app poder controlá-lo.

Depois de configurar, deixe **Album Cards e receptor Spotify iniciarem no boot**:

```sh
bash deployment/dev.sh enable spotify
```

**Variação PC Linux:** use o aplicativo Spotify nativo como destino. Nesse caso não precisa instalar o receptor. Habilite o início automático do Spotify na sessão gráfica e execute `bash deployment/dev.sh enable app` para iniciar a leitura mesmo sem login. O Spotify nativo ainda depende da sessão gráfica; um PC suspenso não lê cartões. O comando `enable spotify` é específico para o receptor instalado por este projeto.

## 3. Usar os dois serviços na mesma caixa USB

Cada álbum pode ter `playbackProvider: "plex"` ou `"spotify"`. As importações já preenchem isso. Na UI, altere em **Dados → Reproduzir este álbum em**. No modo automático, um único ID de serviço decide o destino; quando existem dois, vale o padrão das Configurações.

Se ambos disputam uma saída USB exclusiva, acrescente no `~/.config/album-cards/runtime.env`:

```sh
ALBUM_CARDS_AUDIO_HANDOFF=1
CALDERA_SERVICE="caldera-music.service"
```

```sh
bash deployment/dev.sh restart
bash deployment/dev.sh enable both
```

O leitor fica ativo sempre. Ao tocar um cartão Spotify, ele para Caldera e inicia o receptor; num cartão Plex, faz o inverso. Isso libera a saída sem misturar os dois players. A primeira reprodução após a troca pode esperar alguns segundos pelo player. Spotify e Caldera têm credenciais próprias que continuam salvas. O nome do serviço Caldera pode ser ajustado se sua instalação usar outro nome. Este modo se aplica aos dois **serviços de usuário no mesmo Linux**, não a um Spotify remoto ou serviço de sistema.

Quando o receptor estiver parado, ele não aparece no Connect. Para escolhê-lo pela primeira vez ou usar o Spotify manualmente, rode `bash deployment/dev.sh audio spotify`. Para voltar ao Plexamp manualmente, rode `bash deployment/dev.sh audio plex` ou aproxime um cartão Plex. Não há promessa de acesso simultâneo exclusivo à mesma USB.

## 4. Dia a dia e diagnóstico

Cadastre os cartões na aba Cartões e volte a **Reproduzir**. O cadastro fica em `data/library.json`, no Linux. Nenhuma URL é gravada no chip. Trocar cartão começa outro álbum; repetir escolhe outra faixa. Retirar não pausa.

```sh
bash deployment/dev.sh status
bash deployment/dev.sh logs
bash deployment/dev.sh spotify logs
bash deployment/dev.sh restart
```

`enable` solicita sudo apenas se precisar ativar o funcionamento sem login. Depois, teste um reinício do computador, aguarde a rede e aproxime um cartão. O status do app distingue serviço em execução, leitor conectado e resultado da última leitura; um LED verde sozinho não prova que houve play.

Para atualizar: pare com `down`, faça backup privado de `data/`, atualize o código, rode `npm ci`, `npm run build`, `setup` e `up`. Não apague `data/`. Para reverter a migração de outro player, pare este serviço e restaure o serviço e dados anteriores; nunca deixe dois programas processando o mesmo leitor ao mesmo tempo.

**Privado:** `data/` contém tokens; `~/.local/share/album-cards-runtime/spotify-cache/` contém o login do receptor. Não publique nenhum deles. Os modelos 3D têm licença separada do software; consulte `hardware/README.md`.
