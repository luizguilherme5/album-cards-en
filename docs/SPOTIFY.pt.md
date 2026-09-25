# Conectar sua conta do Spotify

Este guia começa do zero: você não precisa ter um aplicativo no Spotify Developer Dashboard nem conhecer OAuth.

Abra **Configurações → Spotify** no aplicativo e copie a Redirect URI exibida ali. O fluxo está implementado; a autorização e a reprodução reais precisam ser testadas com sua própria conta.

## O que você precisa

- Uma conta Spotify Premium para controlar a reprodução pela API.
- Acesso ao [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
- O Spotify aberto em um celular, computador ou dispositivo Spotify Connect compatível.
- Seu próprio aplicativo de desenvolvimento. Não é necessário contratar hospedagem ou comprar um domínio para usar no mesmo computador.

O software enviará comandos ao Spotify. A música será reproduzida pelo dispositivo escolhido, não pelo leitor RFID. Conectar um leitor USB a um Raspberry Pi não transforma automaticamente o Pi em uma saída de áudio do Spotify.

## 1. Criar o aplicativo

1. Entre no [Dashboard](https://developer.spotify.com/dashboard) com a conta que usará o projeto.
2. Escolha **Create app**, quando disponível para sua conta.
3. Escolha um nome, por exemplo **My Album Cards**, e uma descrição como **Personal RFID album player**.
4. Se houver seleção de APIs, selecione **Web API**. Para controlar um Spotify já aberto, não é necessário Web Playback SDK.
5. Cadastre a **Redirect URI** conforme a próxima seção. Revise os termos apresentados pelo Spotify e salve.

Se o Dashboard não permitir criar um aplicativo, consulte o aviso exibido pelo próprio Spotify. Ter o código deste projeto não concede acesso à API nem contorna restrições da plataforma.

## 2. Cadastrar o endereço de retorno

A Redirect URI é o endereço para o qual o Spotify retorna depois que você permite o acesso. Copie o endereço completo apresentado pelo assistente do aplicativo: protocolo, IP, porta e caminho precisam coincidir com o Dashboard.

Um exemplo de endereço válido para uso no mesmo computador é:

```text
http://127.0.0.1:3850/auth/spotify/callback
```

Essa é a porta padrão. Se você mudar a porta da instalação, use o endereço atualizado exibido na interface.

- Use `127.0.0.1`, e não `localhost`, para o retorno HTTP local.
- Não acrescente uma barra ao final se o endereço mostrado não tiver uma.
- `127.0.0.1` sempre significa o aparelho onde o navegador está aberto. Se o servidor está no Raspberry Pi e você autoriza pelo celular, esse endereço apontaria para o celular.
- Para um servidor acessado de outro aparelho, configure um endereço HTTPS acessível pelo navegador e pelo servidor, usando o mesmo retorno cadastrado. Um IP da rede local com HTTP não é equivalente à exceção de loopback.

Para a primeira configuração, usar navegador e aplicativo no mesmo computador simplifica o processo. A configuração de HTTPS remoto deve ser documentada e testada separadamente; não basta substituir o IP no exemplo.

## 3. Encontrar o Client ID

Abra as configurações do aplicativo no Dashboard e copie **Client ID**. Esse identificador informa ao Spotify qual aplicativo está pedindo acesso.

Não copie **Client Secret**. A integração usa **Authorization Code com PKCE**, que dispensa um segredo de cliente. Sua senha do Spotify só deve ser digitada nas páginas oficiais do Spotify.

Em **Configurações → Spotify**, informe o Client ID e selecione **Conectar Spotify**. O aplicativo salva o Client ID e abre a autorização. A Redirect URI é exibida para copiar, não para editar: ela é derivada do endereço da aplicação.

## 4. Autorizar a conta

Para conectar:

1. Selecione **Conectar Spotify** no aplicativo.
2. Confira que a página de login pertence ao Spotify.
3. Entre com a conta desejada e revise as permissões.
4. Autorize o acesso e aguarde o retorno ao aplicativo.

As permissões solicitadas são `user-read-playback-state`, para listar dispositivos e consultar a reprodução, e `user-modify-playback-state`, para controlar a reprodução. Não são pedidas permissões para editar playlists ou apagar itens da biblioteca.

## 5. Escolher onde ouvir

Abra o Spotify no aparelho desejado e reproduza uma faixa manualmente para disponibilizar o dispositivo. Depois, no aplicativo de cartões, atualize a lista, escolha o aparelho e faça um teste de reprodução antes de associar os cartões.

Cada álbum precisa de uma associação com o álbum correto do Spotify. Uma pasta local de músicas não é enviada automaticamente ao Spotify. Confira a edição, o artista e o nome antes de salvar a associação.

## Contas de outras pessoas

A documentação oficial consultada em 24/09/2026 informa que aplicativos novos começam em **development mode**, exigem Premium do proprietário e permitem até cinco usuários autenticados autorizados. Para outro usuário, abra **Settings → Users Management → Add new user** e inclua a conta correspondente. O login pode funcionar e os comandos falharem com 403 quando a conta não está autorizada.

Para distribuir o código, cada pessoa pode configurar seu próprio aplicativo, conforme as condições de acesso do Spotify. Não distribua seus tokens junto com o projeto. Publicar o código não transforma um aplicativo de desenvolvimento em um serviço liberado para qualquer conta.

## Se algo não funcionar

| Sintoma | O que verificar |
| --- | --- |
| `INVALID_CLIENT` ou retorno recusado | Client ID, endereço completo cadastrado e uso de `127.0.0.1` em vez de `localhost`. |
| O navegador retorna para uma página inexistente | Aplicativo iniciado, porta correta e navegador no aparelho correto. |
| 403 / acesso proibido | Premium, permissões e conta autorizada no Dashboard. |
| Nenhum dispositivo disponível | Abra o Spotify, toque uma música e atualize a lista. |
| Login funcionou, mas não há som | Dispositivo selecionado, volume, conta conectada e teste manual no Spotify. |
| 401 / autorização expirada | Reconecte a conta se a renovação automática não resolver. |
| 429 / limite de solicitações | Aguarde o período informado pelo Spotify; não repita os comandos continuamente. |

## Privacidade e desconexão

Os tokens de acesso e renovação são credenciais. A aplicação os mantém no armazenamento privado do servidor, fora do Git, sem devolvê-los para a interface ou incluí-los nos logs. O Client ID não substitui um token e não permite controlar sua conta sozinho.

Você pode revogar o acesso em [Aplicativos da sua conta Spotify](https://www.spotify.com/account/apps/). Apagar a configuração local não substitui a revogação no Spotify quando você quiser retirar completamente a permissão.

## Referências oficiais

- [PKCE](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)
- [Regras de Redirect URI](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri)
- [Reprodução e Premium](https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback)
- [Modo de desenvolvimento e usuários autorizados](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)

## Instalação em outro computador

Esta primeira versão aceita conexões locais. Para um Raspberry Pi ou servidor, use um túnel SSH: `ssh -L 3850:127.0.0.1:3850 usuario@seu-servidor`, com a aplicação já rodando nele. Abra `http://127.0.0.1:3850` no computador do navegador; o retorno OAuth percorre o mesmo túnel. Um domínio HTTPS exige implantação e proteção adicionais, não fornecidas automaticamente nesta versão.

## Player Linux sempre ligado

O leitor permanece no Linux. Configure o receptor Raspotify e o início automático em [LINUX.pt.md](LINUX.pt.md). Escolha o serviço por álbum em Dados. O mapa fica em data/ no player; não há transferência de mapas para celular nem escrita de URLs no cartão. O celular pode ser usado como controle Spotify Connect.
