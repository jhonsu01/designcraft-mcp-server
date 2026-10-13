# Changelog

## [1.0.4] - 2026-10-13
### Added
- DeepSeek Harness: the plugin folder in the Craft Bridges marketplace is also a Harness bundle (`cordis.patch.yml`
  inserting Harness's own MCP client, `@deepseek-ai/dsh-mcp-client`, over stdio with a 1-hour tool timeout).
  Install it with `github:jhonsu01/craft-marketplace#path:/plugins/designcraft-mcp-server` in *Plugins → Add plugin*.
- Server instructions: when the app has a tool that delivers files (`present` in Harness), also call it with the
  output files, so they appear as cards that open in the app.
### Verified
- DeepSeek Harness 0.2.0-rc.2 on Windows 11: installed from GitHub, tools listed as `mcp__<server>__<tool>`, outputs
  shown as cards that open in Harness's viewer. Windows 11 and Debian 12 end-to-end checks pass.

## [1.0.3] - 2026-10-13
### Added
- Every result that names output files now carries `files_markdown`: ready-made links (percent-encoded `file:///`
  URLs) to each file and folder written, and the server instructions ask the assistant to show them as given. Paths
  with spaces, accents or parentheses no longer break the links, so agent apps (Codex, SunsamCode, Claude...) can
  open every output from the chat, also when a tool writes many files.
### Verified
- Windows 11 and Debian 12 (Docker): 29/29 end-to-end checks each (new: every `files_markdown` link is a valid
  `file:///` URL to an existing output); the `.mcpb` and the Codex plugin tested unpacked.

## [1.0.2] - 2026-10-10
### Fixed
- Output names keep their dots: `name: "menu-1.0.1"` now writes `menu-1.0.1.pdf` (1.0.0 and 1.0.1 took `.1` for an
  extension and wrote `menu-1.0.pdf`). A real output extension in the name (`flyer.pdf`) is still dropped.
### Verified
- Windows 11 and Debian 12 (Docker): 28/28 end-to-end checks each (new: dots in the output name); the `.mcpb` and the
  Codex zip both tested unpacked.

## [1.0.1] - 2026-10-10
### Fixed
- `background` no longer draws a thin black outline around the page: DesignCraft gives new frames a black stroke by
  default and the background rectangle kept it.
### Added
- Codex (OpenAI) plugin: each release also ships `designcraft-mcp-server-<version>-codex.zip` with
  `.codex-plugin/plugin.json` and `.mcp.json` (a local stdio server, `node ./dist/bundle.cjs`), built by
  `npm run pack:codex` from the same bundle and manifest as the `.mcpb`.
### Verified
- Windows 11 and Debian 12 (Docker): 27/27 end-to-end checks each (new: the background has no outline); the Codex zip
  extracted with two tools and its server started from `.mcp.json` with only the listed environment, on both systems.

## [1.0.0] - 2026-10-10
### Added
- MCP server on DesignCraft's own engine (`designcraft-cli mcp`): one private, headless engine per job with in-memory
  documents. Documents, images and data are only read; edited documents are saved only as new copies.
- 10 tools: `create_layout`, `data_merge`, `export_document`, `edit_document`, `get_document_info`, `render_pages`,
  `list_designcraft_catalog`, `run_designcraft_commands`, `open_in_designcraft`, `get_designcraft_status`.
- A simple item list placed per page (x / y from each page's top-left, in pt, mm, cm, in or px): text frames with
  paragraph styles and inline formatting, images (fill / fit / stretch / center), rectangles, ellipses, polygons, lines
  and tables; fills, gradients, strokes, rounded corners, opacity, drop shadows, text wrap and rotation. Colours are
  given as `#rrggbb` and the connector creates the swatches the engine needs.
- Data merge from a CSV or a list of rows into an existing template or one built from items: `<<Field>>` text, image
  fields, one page per record or several records per page.
- Export to PDF (page ranges, PDF/X-4, PDF/A-2b, bleed, crop marks, spreads, tagged), PNG / JPG pages, IDML,
  `.designcraft`, EPUB (reflowable and fixed), HTML, booklet PDF and packages; overset text is reported.
- Output guard: DesignCraft replaces existing files silently, so every output gets a free `_2` name (or an error for an
  existing `output_path`) unless `overwrite` is true.
- Live mode: `open_in_designcraft control=true` (port 7981) and `run_designcraft_commands live=true`.
- Windows, macOS and Linux install detection (`DESIGNCRAFT_DIR`, `DESIGNCRAFT_CLI`, `DESIGNCRAFT_APP`).
### Verified
- Windows 11 and Debian 12 (Docker, headless): 26/26 end-to-end checks each; live mode on Windows 11.
