<p align="center"><img src="icon.png" width="120" alt="DesignCraft Bridge icon"></p>

<h1 align="center">DesignCraft MCP Server</h1>

<p align="center">
  <b>English</b> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Let Claude do page layout with the <b>DesignCraft</b> installed on your computer — <b>Windows, macOS and Linux</b>:<br>
  flyers, posters, brochures, cards and book pages, data merge, InDesign IDML files, and print-ready PDF, PNG, EPUB and HTML.
</p>

---

## Why

[DesignCraft](https://github.com/storytold/designcraft) is an open-source, InDesign-class desktop publishing app with a headless CLI (`designcraft-cli`), 444 commands, IDML import and export and an MCP mode. This [Model Context Protocol](https://modelcontextprotocol.io) server turns that engine into **file-in / file-out tools** for Claude, so you can ask things like:

> *"Make an A5 flyer for my café: a photo, the name in big serif letters, opening hours and a price table, as a print PDF with 3 mm bleed."*
> *"Create a badge for every person in `team.csv`, with their photo, name and role."*
> *"Print 30 address labels per page from this list."*
> *"In `catalog.idml`, change every '2025' to '2026', replace Arial with Inter and export PDF/X-4."*
> *"Export every document in `D:\Layouts` as PDF and as 150 dpi PNG pages."*

Sibling of [effectcraft-mcp-server](https://github.com/jhonsu01/effectcraft-mcp-server), [lightcraft-mcp-server](https://github.com/jhonsu01/lightcraft-mcp-server), [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) and [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Platforms

| OS | DesignCraft package to install | Where the server finds it (no setup needed) | Status |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI or portable zip | `C:\Program Files\DesignCraft`, `%LOCALAPPDATA%\Programs\DesignCraft`, `PATH` | ✅ Verified (Windows 11) |
| **Linux** (x86_64, aarch64) | `.deb`, `.rpm` or `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/designcraft/bin`, `~/.local/bin`, `PATH` | ✅ Verified (Debian 12, headless) |
| **macOS** 11+ (Apple silicon and Intel) | `.dmg` (the app) **plus** `designcraft-cli-<version>-macos-universal.zip` | `/Applications/DesignCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Supported, not yet tested on a Mac |

All downloads: [DesignCraft releases](https://github.com/storytold/designcraft/releases) (there is also a FreeBSD tar.gz; set `DESIGNCRAFT_DIR` to it). Anywhere else: set `DESIGNCRAFT_DIR` (folder, `.tar.gz` root or `DesignCraft.app`) or `DESIGNCRAFT_CLI`.

- **macOS:** the DMG contains only the app. Unzip the separate `designcraft-cli` zip and move `designcraft-cli` to `/usr/local/bin` (or point `DESIGNCRAFT_CLI` at it). The first run checks Apple's notarization online.
- **Linux:** the AppImage and Flatpak contain only the app, not `designcraft-cli`; use the deb, rpm or tar.gz. For an AppImage app, set `DESIGNCRAFT_APP` so `open_in_designcraft` can start it. On a server without a GPU, the verified setup used `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## How it works

| Part | What it is |
| --- | --- |
| **DesignCraft engine** (`designcraft-cli mcp`) | DesignCraft's own engine: text composer, styles, frames, tables, data merge, preflight and the PDF / IDML / EPUB / HTML exporters. Started fresh and **headless** for each job with in-memory documents, so it never touches the DesignCraft app or an open document. |
| **MCP server** (Node.js) | 10 high-level tools. Builds documents from a simple item list (positions per page, any units), creates the colour swatches the engine needs, places your images by reference (they are only read) and checks every output first: DesignCraft itself would replace existing files silently. |
| **Live app** (optional) | `open_in_designcraft control=true` starts the app with its loopback-only control channel (port 7981) and `run_designcraft_commands live=true` drives it. The channel has no password: close the app when you are done. |

## Tools

| Tool | What it does |
| --- | --- |
| `create_layout` | A new document (preset or custom size, pages, facing pages, margins, columns, bleed, background colour, paragraph styles) from items placed on pages: text frames (font, style, size, leading, tracking, colour, alignment, spacing, columns, vertical alignment), images (fill / fit / stretch / center), rectangles, ellipses, polygons and lines (fill, gradient, stroke, rounded corners, opacity, drop shadow, text wrap, rotation) and tables (header row and colour). Reports overset text |
| `data_merge` | A CSV or a list of rows merged into an existing `.designcraft` / `.idml` template or one built from items: `<<Field>>` text and image fields; one page per record or several records per page (labels, cards) |
| `export_document` | One document, a list or a folder → PDF (page range, PDF/X-4, PDF/A-2b, bleed, crop marks, spreads, tagged), PNG / JPG pages at any dpi, IDML, EPUB (reflowable or fixed), HTML, booklet PDF, package |
| `edit_document` | Find / change (also GREP), replace a story's text, put new images in frames, replace fonts, add pages and items; written as a new copy |
| `get_document_info` | Pages, items per page, stories (and overset), styles, swatches, fonts (missing too), links (missing, low resolution), preflight issues |
| `render_pages` | Pages shown to Claude and optionally saved as PNG |
| `list_designcraft_catalog` | 444 commands with parameters, page presets, font availability (or the fonts a document uses), formats |
| `run_designcraft_commands` | Any engine commands plus `inspect_document`, `get_story`, `place_image`... in one session (`$steps[N].field` references), headless or live, then export |
| `open_in_designcraft` | Open documents in the DesignCraft app (optionally with the control channel) |
| `get_designcraft_status` | Platform, installation, version, commands, app / control port |

| | |
| --- | --- |
| **Opens** | `.designcraft`, InDesign `.idml`; places PNG, JPEG, WebP, GIF, TIFF, PDF and SVG; merges CSV / TSV |
| **Exports** | PDF (PDF/X-4, PDF/A-2b), PNG, JPG, IDML, `.designcraft`, EPUB (reflowable and fixed layout), HTML, booklet PDF, package folder |

Sizes are in **pt** unless `units` says `mm`, `cm`, `in` or `px`; `x` / `y` are measured from the **top-left corner of each page** (default: the margins). Inter, Source Sans 3 and Source Serif 4 are bundled with DesignCraft and work on every system.

## Example

```json
{
  "name": "cafe-flyer",
  "units": "mm",
  "preset": "A5",
  "margins": 12,
  "bleed": 3,
  "background": "#fdf6ec",
  "styles": [
    { "name": "Title", "font": "Source Serif 4", "font_style": "Bold", "size": 34, "color": "#ffffff", "align": "center" },
    { "name": "Body", "font": "Inter", "size": 11, "color": "#333333", "space_after": 4 }
  ],
  "items": [
    { "type": "rect", "x": 0, "y": 0, "width": 148, "height": 40, "gradient": ["#c0661f", "#f2b134"] },
    { "type": "text", "x": 12, "y": 10, "width": 124, "height": 22, "text": "Café del Ñandú", "style": "Title", "vertical_align": "center" },
    { "type": "image", "path": "C:\\Photos\\coffee.jpg", "x": 12, "y": 48, "width": 124, "height": 70, "corner_radius": 4 },
    { "type": "text", "x": 12, "y": 124, "width": 124, "height": 20, "text": "Roasted every morning.\nMonday to Saturday, 7:00–19:00.", "style": "Body" },
    { "type": "table", "x": 12, "y": 150, "width": 124, "height": 40, "header": true, "header_fill": "#f2b134",
      "rows": [["Drink", "Price"], ["Espresso", "2.50"], ["Cappuccino", "3.20"]] }
  ],
  "formats": ["pdf", "png", "designcraft"],
  "pdf_standard": "x4",
  "include_bleed": true,
  "crop_marks": true,
  "output_dir": "C:\\Layouts"
}
```

## Requirements

- **DesignCraft** with `designcraft-cli` (tested with **0.5.0**); see [Platforms](#platforms)
- Node.js ≥ 20 (bundled with Claude Desktop for `.mcpb` installs)

## Installation

### Claude Desktop (recommended, all platforms)

1. Download `designcraft-mcp-server.mcpb` from the [latest release](https://github.com/jhonsu01/designcraft-mcp-server/releases/latest).
2. Double-click it (or drag it into Claude Desktop → *Settings → Extensions*) and click **Install**.
3. Optional: if DesignCraft is not in a standard location, fill in its folder or the `designcraft-cli` path in the extension settings.

### Codex (OpenAI)

**Recommended — the marketplace (gets updates):** *Plugins → Add → Add marketplace*, source `jhonsu01/craft-marketplace`, reference `main`, then install **DesignCraft Bridge** from **Craft Bridges** ([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). New versions arrive by refreshing the marketplace. Or upload the zip (Codex then keeps it in your account and refuses a newer zip with the same name):

1. Download `designcraft-mcp-server-<version>-codex.zip` from the [latest release](https://github.com/jhonsu01/designcraft-mcp-server/releases/latest).
2. In Codex: *Plugins → Add → New plugin*, choose the zip and click **Add plugin**.
3. Codex starts the server with `node`, so Node.js ≥ 20 must be on `PATH`. If DesignCraft is not in a standard location, set `DESIGNCRAFT_DIR` or `DESIGNCRAFT_CLI` as system environment variables (Codex has no settings form for local plugins).

### Claude Code / other MCP clients

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

## Configuration

| Variable | Meaning |
| --- | --- |
| `DESIGNCRAFT_DIR` | DesignCraft folder, one of its executables, a `.tar.gz` root (with `bin/`) or `DesignCraft.app`. Default: auto-detect |
| `DESIGNCRAFT_CLI` | Path of `designcraft-cli` / `designcraft-cli.exe` (wins over `DESIGNCRAFT_DIR`) |
| `DESIGNCRAFT_APP` | Path of the desktop app when it lives elsewhere (e.g. a Linux AppImage) |
| `DESIGNCRAFT_CONTROL_PORT` | Control port of the desktop app (default 7981) |
| `DESIGNCRAFT_MCP_TIMEOUT` | Maximum seconds per engine call (default 3600) |

## Safety

- Files are **never overwritten** unless `overwrite: true`: a free name (`_2`) is used in folders and an existing `output_path` is an error. Documents, images and data are only read; an edited document is saved only as a new copy.
- All paths must be absolute. The engine runs headless with in-memory documents and never touches the DesignCraft app unless `live: true`.
- Everything runs locally with no network access. Each job uses a private engine in a temporary folder that is deleted at the end.

## Development

```bash
npm run build       # TypeScript + single-file bundle (dist/bundle.cjs)
npm test            # unit tests (Windows, macOS and Linux path logic)
npm run test:e2e    # 29 end-to-end checks over real MCP stdio (synthetic images and CSV)
npm run pack:mcpb   # designcraft-mcp-server.mcpb
npm run pack:codex  # Codex plugin zip
```

Linux test in Docker (unpack `designcraft-<version>-linux-x86_64.tar.gz` first):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/path/to/designcraft-0.5.0-linux-x86_64:/opt/designcraft:ro" -e DESIGNCRAFT_DIR=/opt/designcraft -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## License

Apache-2.0. DesignCraft is © its authors (Storytold), MIT or Apache-2.0.
This project is not affiliated with or endorsed by DesignCraft or Storytold. InDesign is a trademark of Adobe.
