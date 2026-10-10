# Changelog

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
