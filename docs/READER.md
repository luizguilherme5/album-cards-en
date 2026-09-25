# Leitor USB / USB reader

## Navegador / Browser

Teste o leitor em um editor de texto vazio: ao aproximar um cartão ele deve digitar um ID seguido de Enter. Esse é o tipo de leitor suportado pelo modo de teclado. Um leitor PC/SC ou NFC de escrita pode usar outro protocolo e não funcionar aqui.

Test the reader in an empty text editor: tapping a card should type an ID followed by Enter. PC/SC and NFC writers may use a different protocol and are not supported by this keyboard adapter.

Abra Cartões, clique no campo de captura e mantenha a aba em foco. Não use um campo com informações importantes para testar: o dispositivo se comporta como um teclado.

Open Cards and focus the capture field. Keep the tab active. The application confirms receipt of a scan, not physical USB enumeration on macOS/Windows.

## Linux 64-bit

Em Configurações, clique Detectar dispositivos Linux. Selecione o leitor pelo nome; prefira `/dev/input/by-id/…-event-kbd` para reconectar ao mesmo dispositivo após trocar portas. Os caminhos `eventN` podem mudar. Salve a configuração. Apenas o dispositivo selecionado é aberto, e a captura de teclado pelo navegador é desativada para evitar leitura dupla.

Detect Linux devices in Settings, choose the correct name, prefer a stable `by-id` path, and save. `eventN` paths can change after reconnecting. Browser scan submission is disabled while native input is selected to avoid duplicate playback.

O adaptador atual suporta eventos `input_event` de 24 bytes em Linux 64-bit e teclas numéricas da fileira superior e do teclado numérico. Leitores com códigos hexadecimais digitados como letras, modo serial, PC/SC ou kernels 32-bit precisam de outro adaptador. Não confunda LED verde com confirmação de protocolo compatível.

The native adapter currently supports 24-byte Linux 64-bit input events and top-row and numeric-keypad digits. Serial, PC/SC, 32-bit kernels and readers emitting hexadecimal letters need another adapter. A green LED does not prove protocol compatibility.

### Permissões / Permissions

Se aparecer erro de permissão, identifique **seu** VID/PID com `lsusb` e confirme o dispositivo com `udevadm info`. Crie uma regra udev restrita a esse leitor, com `MODE="0660"` e um grupo dedicado que inclua apenas o usuário do aplicativo. Recarregue as regras e reconecte o dispositivo. Não use `chmod 666 /dev/input/*` e não execute o aplicativo inteiro como root.

If access is denied, identify your reader using `lsusb` and `udevadm info`. Use a udev rule limited to its actual vendor/product IDs, mode `0660`, and a dedicated group containing the application user. Reload the rules and reconnect the reader. Do not grant access to every keyboard or run the full application as root.

## Atribuição / Assignment

Selecione até 50 álbuns, abra Cartões e escolha Atribuir selecionados. A fila é alfabética. Por padrão, cartões existentes não são sobrescritos. O checkbox permite substituição explícita. O mesmo cartão não avança duas posições na mesma sessão. A sessão expira depois de cinco minutos e não volta automaticamente para reprodução ao terminar.

Select up to 50 albums and start assignment. Albums are assigned alphabetically. Existing cards require the overwrite checkbox. The same card cannot fill two positions in one session. Sessions expire after five minutes and never automatically switch to playback when the queue ends.

## Identidade e reconexão / Identity and reconnect

Ao salvar o leitor, o app guarda fornecedor, produto e nome USB. Se `eventN` mudar, ele reconecta ao único dispositivo correspondente; não segue o número antigo para um teclado diferente. Dois candidatos iguais não são escolhidos automaticamente.

Saving the reader records its USB vendor, product and name. If `eventN` changes, the app reconnects to the unique match rather than following the old number to a different keyboard. Ambiguous matches require selection.

Exemplo de regra para **o leitor usado no projeto**, VID/PID `1a86:2366` (confira o seu primeiro). Substitua `SEU_USUARIO` antes de salvar em `/etc/udev/rules.d/70-album-cards.rules`:

```text
SUBSYSTEM=="input", KERNEL=="event*", ATTRS{idVendor}=="1a86", ATTRS{idProduct}=="2366", OWNER="SEU_USUARIO", MODE="0400"
```

```sh
sudo udevadm control --reload-rules
```

Reconecte o leitor. Reconnect the reader. Replace `SEU_USUARIO` with your Linux account; use this VID/PID only if it matches your device.
