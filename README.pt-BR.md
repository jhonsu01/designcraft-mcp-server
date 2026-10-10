<p align="center"><img src="icon.png" width="120" alt="Ícone do DesignCraft Bridge"></p>

<h1 align="center">DesignCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <b>Português</b> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Deixe o Claude diagramar páginas com o <b>DesignCraft</b> instalado no seu computador — <b>Windows, macOS e Linux</b>:<br>
  panfletos, pôsteres, folhetos, cartões e páginas de livro, mala direta, arquivos IDML do InDesign e PDF pronto para gráfica, PNG, EPUB e HTML.
</p>

---

## Por quê

O [DesignCraft](https://github.com/storytold/designcraft) é um aplicativo de editoração eletrônica de código aberto no nível do InDesign, com uma CLI sem interface (`designcraft-cli`), 444 comandos, importação e exportação IDML e um modo MCP. Este servidor [Model Context Protocol](https://modelcontextprotocol.io) transforma esse motor em **ferramentas de arquivo de entrada / arquivo de saída** para o Claude, para você pedir coisas como:

> *"Faça um panfleto A5 para o meu café: uma foto, o nome em letras serifadas grandes, o horário e uma tabela de preços, como PDF para gráfica com 3 mm de sangria."*
> *"Crie um crachá para cada pessoa de `equipe.csv`, com foto, nome e cargo."*
> *"Imprima 30 etiquetas de endereço por página a partir desta lista."*
> *"Em `catalogo.idml`, troque todo '2025' por '2026', substitua Arial por Inter e exporte PDF/X-4."*
> *"Exporte todos os documentos de `D:\Layouts` como PDF e como páginas PNG a 150 dpi."*

Irmão de [effectcraft-mcp-server](https://github.com/jhonsu01/effectcraft-mcp-server), [lightcraft-mcp-server](https://github.com/jhonsu01/lightcraft-mcp-server), [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) e [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Plataformas

| SO | Pacote do DesignCraft a instalar | Onde o servidor o encontra (sem configuração) | Status |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI ou zip portátil | `C:\Program Files\DesignCraft`, `%LOCALAPPDATA%\Programs\DesignCraft`, `PATH` | ✅ Verificado (Windows 11) |
| **Linux** (x86_64, aarch64) | `.deb`, `.rpm` ou `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/designcraft/bin`, `~/.local/bin`, `PATH` | ✅ Verificado (Debian 12, sem interface) |
| **macOS** 11+ (Apple silicon e Intel) | `.dmg` (o app) **mais** `designcraft-cli-<versão>-macos-universal.zip` | `/Applications/DesignCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Suportado, ainda não testado em um Mac |

Todos os downloads: [versões do DesignCraft](https://github.com/storytold/designcraft/releases) (também há um tar.gz para FreeBSD; aponte `DESIGNCRAFT_DIR` para ele). Em qualquer outro lugar: defina `DESIGNCRAFT_DIR` (pasta, raiz do `.tar.gz` ou `DesignCraft.app`) ou `DESIGNCRAFT_CLI`.

- **macOS:** o DMG contém só o app. Descompacte o zip separado do `designcraft-cli` e mova `designcraft-cli` para `/usr/local/bin` (ou aponte `DESIGNCRAFT_CLI` para ele). A primeira execução verifica online a notarização da Apple.
- **Linux:** o AppImage e o Flatpak contêm só o app, não o `designcraft-cli`; use o deb, o rpm ou o tar.gz. Para um app AppImage, defina `DESIGNCRAFT_APP` para que `open_in_designcraft` possa abri-lo. Em um servidor sem GPU, a configuração verificada usou `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## Como funciona

| Parte | O que é |
| --- | --- |
| **Motor do DesignCraft** (`designcraft-cli mcp`) | O próprio motor do DesignCraft: compositor de texto, estilos, quadros, tabelas, mala direta, comprovação e os exportadores PDF / IDML / EPUB / HTML. Iniciado do zero e **sem interface** a cada tarefa, com documentos em memória, então nunca mexe no app do DesignCraft nem em um documento aberto. |
| **Servidor MCP** (Node.js) | 10 ferramentas de alto nível. Monta documentos a partir de uma lista simples de itens (posições por página, em qualquer unidade), cria as amostras de cor de que o motor precisa, coloca suas imagens por referência (elas só são lidas) e verifica cada saída antes: o próprio DesignCraft substituiria arquivos existentes sem avisar. |
| **App ao vivo** (opcional) | `open_in_designcraft control=true` abre o app com seu canal de controle só local (porta 7981) e `run_designcraft_commands live=true` o comanda. O canal não tem senha: feche o app quando terminar. |

## Ferramentas

| Ferramenta | O que faz |
| --- | --- |
| `create_layout` | Um documento novo (tamanho predefinido ou próprio, páginas, páginas espelhadas, margens, colunas, sangria, cor de fundo, estilos de parágrafo) a partir de itens colocados nas páginas: quadros de texto (fonte, estilo, tamanho, entrelinha, espacejamento, cor, alinhamento, espaços, colunas, alinhamento vertical), imagens (preencher / encaixar / esticar / centralizar), retângulos, elipses, polígonos e linhas (preenchimento, degradê, contorno, cantos arredondados, opacidade, sombra, contorno de texto, rotação) e tabelas (linha de cabeçalho e sua cor). Informa texto excedente |
| `data_merge` | Um CSV ou uma lista de linhas mesclados em um modelo `.designcraft` / `.idml` existente ou montado a partir de itens: texto `<<Campo>>` e campos de imagem; uma página por registro ou vários registros por página (etiquetas, cartões) |
| `export_document` | Um documento, uma lista ou uma pasta → PDF (intervalo de páginas, PDF/X-4, PDF/A-2b, sangria, marcas de corte, spreads, com tags), páginas PNG / JPG em qualquer resolução, IDML, EPUB (refluível ou fixo), HTML, PDF em livreto, pacote |
| `edit_document` | Localizar / alterar (também GREP), substituir o texto de uma matéria, colocar imagens novas em quadros, substituir fontes, adicionar páginas e itens; salvo como cópia nova |
| `get_document_info` | Páginas, itens por página, matérias (e excedentes), estilos, amostras, fontes (inclusive ausentes), vínculos (ausentes, baixa resolução), problemas de comprovação |
| `render_pages` | Páginas mostradas ao Claude e, opcionalmente, salvas como PNG |
| `list_designcraft_catalog` | 444 comandos com parâmetros, tamanhos de página predefinidos, disponibilidade de fontes (ou as fontes que um documento usa), formatos |
| `run_designcraft_commands` | Quaisquer comandos do motor mais `inspect_document`, `get_story`, `place_image`... em uma sessão (referências `$steps[N].campo`), sem interface ou ao vivo, e depois exporta |
| `open_in_designcraft` | Abre documentos no app DesignCraft (opcionalmente com o canal de controle) |
| `get_designcraft_status` | Plataforma, instalação, versão, comandos, app / porta de controle |

| | |
| --- | --- |
| **Abre** | `.designcraft`, `.idml` do InDesign; coloca PNG, JPEG, WebP, GIF, TIFF, PDF e SVG; mescla CSV / TSV |
| **Exporta** | PDF (PDF/X-4, PDF/A-2b), PNG, JPG, IDML, `.designcraft`, EPUB (refluível e de layout fixo), HTML, PDF em livreto, pasta de pacote |

As medidas são em **pt**, a menos que `units` diga `mm`, `cm`, `in` ou `px`; `x` / `y` são medidos a partir do **canto superior esquerdo de cada página** (padrão: as margens). Inter, Source Sans 3 e Source Serif 4 vêm com o DesignCraft e funcionam em qualquer sistema.

## Exemplo

```json
{
  "name": "panfleto-cafe",
  "units": "mm",
  "preset": "A5",
  "margins": 12,
  "bleed": 3,
  "background": "#fdf6ec",
  "styles": [
    { "name": "Título", "font": "Source Serif 4", "font_style": "Bold", "size": 34, "color": "#ffffff", "align": "center" },
    { "name": "Corpo", "font": "Inter", "size": 11, "color": "#333333", "space_after": 4 }
  ],
  "items": [
    { "type": "rect", "x": 0, "y": 0, "width": 148, "height": 40, "gradient": ["#c0661f", "#f2b134"] },
    { "type": "text", "x": 12, "y": 10, "width": 124, "height": 22, "text": "Café do Ñandú", "style": "Título", "vertical_align": "center" },
    { "type": "image", "path": "C:\\Fotos\\cafe.jpg", "x": 12, "y": 48, "width": 124, "height": 70, "corner_radius": 4 },
    { "type": "text", "x": 12, "y": 124, "width": 124, "height": 20, "text": "Torrado toda manhã.\nDe segunda a sábado, 7:00–19:00.", "style": "Corpo" },
    { "type": "table", "x": 12, "y": 150, "width": 124, "height": 40, "header": true, "header_fill": "#f2b134",
      "rows": [["Bebida", "Preço"], ["Espresso", "2,50"], ["Cappuccino", "3,20"]] }
  ],
  "formats": ["pdf", "png", "designcraft"],
  "pdf_standard": "x4",
  "include_bleed": true,
  "crop_marks": true,
  "output_dir": "C:\\Layouts"
}
```

## Requisitos

- **DesignCraft** com `designcraft-cli` (testado com **0.5.0**); veja [Plataformas](#plataformas)
- Node.js ≥ 20 (incluído no Claude Desktop para instalações `.mcpb`)

## Instalação

### Claude Desktop (recomendado, todas as plataformas)

1. Baixe `designcraft-mcp-server.mcpb` da [versão mais recente](https://github.com/jhonsu01/designcraft-mcp-server/releases/latest).
2. Dê um clique duplo (ou arraste para o Claude Desktop → *Configurações → Extensões*) e clique em **Instalar**.
3. Opcional: se o DesignCraft não estiver em um local padrão, informe a pasta dele ou o caminho do `designcraft-cli` nas configurações da extensão.

### Claude Code / outros clientes MCP

```bash
git clone https://github.com/jhonsu01/designcraft-mcp-server.git
cd designcraft-mcp-server
npm install
npm run build
```

Windows:

```bash
claude mcp add designcraft -- node "%CD%\dist\bundle.cjs"
```

macOS / Linux:

```bash
claude mcp add designcraft -- node "$PWD/dist/bundle.cjs"
```

## Configuração

| Variável | Significado |
| --- | --- |
| `DESIGNCRAFT_DIR` | Pasta do DesignCraft, um de seus executáveis, a raiz de um `.tar.gz` (com `bin/`) ou `DesignCraft.app`. Padrão: detecção automática |
| `DESIGNCRAFT_CLI` | Caminho do `designcraft-cli` / `designcraft-cli.exe` (tem prioridade sobre `DESIGNCRAFT_DIR`) |
| `DESIGNCRAFT_APP` | Caminho do app de desktop quando ele está em outro lugar (ex.: um AppImage no Linux) |
| `DESIGNCRAFT_CONTROL_PORT` | Porta de controle do app de desktop (padrão 7981) |
| `DESIGNCRAFT_MCP_TIMEOUT` | Máximo de segundos por chamada ao motor (padrão 3600) |

## Segurança

- Os arquivos **nunca são sobrescritos**, a menos que `overwrite: true`: em pastas é usado um nome livre (`_2`) e um `output_path` existente é um erro. Documentos, imagens e dados só são lidos; um documento editado só é salvo como cópia nova.
- Todos os caminhos devem ser absolutos. O motor roda sem interface com documentos em memória e nunca mexe no app do DesignCraft, a menos que `live: true`.
- Tudo roda localmente, sem acesso à rede. Cada tarefa usa um motor privado em uma pasta temporária que é apagada no final.

## Desenvolvimento

```bash
npm run build       # TypeScript + bundle de arquivo único (dist/bundle.cjs)
npm test            # testes unitários (lógica de caminhos de Windows, macOS e Linux)
npm run test:e2e    # 26 verificações de ponta a ponta sobre MCP stdio real (imagens e CSV sintéticos)
npm run pack:mcpb   # designcraft-mcp-server.mcpb
```

Teste de Linux no Docker (descompacte antes `designcraft-<versão>-linux-x86_64.tar.gz`):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/caminho/para/designcraft-0.5.0-linux-x86_64:/opt/designcraft:ro" -e DESIGNCRAFT_DIR=/opt/designcraft -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## Licença

Apache-2.0. O DesignCraft é © de seus autores (Storytold), MIT ou Apache-2.0.
Este projeto não é afiliado nem endossado pelo DesignCraft ou pela Storytold. InDesign é uma marca da Adobe.
