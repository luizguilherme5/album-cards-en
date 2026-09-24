# RFID V3 — arquivos para importar no Cura

Exportados do V3 atualizado, com a face retrofuturista. Todos os modelos estão em **milímetros, escala 1:1**, com a orientação aplicada à malha e a parte inferior em **Z = 0**.

## Importar todas as peças

Abra **V3-todas-as-pecas-organizadas.3mf** como modelo. Ele contém as três peças agrupadas e distribuídas na mesa, sem perfil de impressora embutido.

Alternativa: abra **V3-todas-as-pecas-organizadas-mm.stl**. Esse STL contém as mesmas três peças, com o espaçamento preservado.

Escolha apenas uma dessas alternativas; importar ambas duplica as peças. Não é necessário girar, redimensionar ou usar orientação automática. A ocupação do conjunto é **186,30 × 173,45 mm**, com altura máxima de **129,00 mm**. O 3MF posiciona o conjunto no centro de uma mesa de 220 × 220 mm.

## Importar uma peça por vez

Os arquivos de `pecas-individuais` têm as mesmas orientações, centralizados individualmente:

| Arquivo | Orientação aplicada | Dimensões X × Y × Z, mm |
|---|---|---|
| P01-base-mm.stl | Fundo plano na mesa; linguetas para cima | 107,20 × 88,40 × 44,96 |
| P02-corpo-mm.stl | Em pé no eixo local do corpo; sem a inclinação de 12° da montagem | 77,60 × 31,28 × 129,00 |
| P03-tampa-mm.stl | Face externa na mesa; nervuras e batente para cima | 67,40 × 120,90 × 19,80 |

O corpo fica em pé para manter livres as guias verticais e o alojamento do leitor. A abertura no topo elimina a ponte sobre a largura do cartão. A tampa usa sua face externa plana como apoio, e a base conserva o fundo amplo na mesa. O arquivo `orientacao-das-pecas.png` mostra as posições.

## Configuração a selecionar no Cura

Use a configuração informada para este projeto: **Ender 3 S1, PLA, bico de 0,6 mm, Standard Quality com camada de 0,2 mm**. Mantenha escala 100%. Os arquivos não configuram temperatura, velocidade, preenchimento, brim ou suportes. O projeto prevê brim para estabilizar o corpo alto; confira sua área junto ao espaçamento e à área útil da mesa.

Os modelos estão prontos para importação, mas **ainda não foram fatiados no Cura**. Antes de imprimir, confira a prévia das camadas, principalmente os pequenos balanços dos relevos da face e as retenções do sleeve. O encaixe do sleeve continua baseado nas medidas provisórias documentadas no projeto.

## Conteúdo e verificação

Somente as três peças de PLA foram exportadas. Leitor, cabo, cartão, papel, sleeve, piso, luzes e câmeras não fazem parte dos arquivos de impressão.

Os STL foram relidos após a exportação: três sólidos fechados, orientação consistente das faces, volume positivo, sem arestas abertas ou triângulos degenerados. Cada peça tem área plana apoiada em Z = 0. O 3MF também foi relido, com conferência das unidades, dos três sólidos e de suas posições. Relatórios: `exportacao.json` e `verificacao-dos-arquivos.json`.

Esses são modelos geométricos, não G-code nem um projeto Cura com configurações de fatiamento.

Referências dos formatos: [formatos aceitos pelo Cura — UltiMaker](https://ultimaker.com/learn/get-started-with-cura-printing-with-two-colors/) e [especificação 3MF](https://github.com/3MFConsortium/spec_core/blob/master/3MF%20Core%20Specification.md).
