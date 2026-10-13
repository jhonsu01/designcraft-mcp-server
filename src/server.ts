import { readFileSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAdvancedTools } from './tools/advanced.js';
import { registerLayoutTools } from './tools/layout.js';
import { LINK_INSTRUCTIONS } from './links.js';

/** serverInfo.version comes from package.json (reachable as ../package.json from dist/ and src/). */
export function readPackageVersion(): string {
  try {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(path.resolve(dir, '../package.json'), 'utf-8')) as { version?: unknown };
    if (typeof pkg.version === 'string' && pkg.version) return pkg.version;
  } catch {
    // package.json not shipped next to the bundle: still start
  }
  return '0.0.0-unknown';
}

export function createServer(): McpServer {
  const server = new McpServer(
    { name: 'designcraft-mcp-server', version: readPackageVersion() },
    {
      instructions:
        'Lays out pages with the engine of the locally installed DesignCraft (Windows, macOS, Linux), an open-source InDesign-class ' +
        'desktop publishing app: flyers, posters, brochures, menus, business cards, certificates, newsletters, reports and book pages from ' +
        'text frames, images, shapes, lines and tables with paragraph styles; data merge from CSV (letters, labels, badges); find / change, ' +
        'font replacement and image replacement in existing documents; preflight. Opens .designcraft and InDesign .idml files and exports ' +
        'print-ready PDF (PDF/X-4, PDF/A-2b, bleed, crop marks), PNG / JPG pages, IDML, EPUB, HTML, booklets and packages. Sizes are in ' +
        'pt unless units says otherwise; x / y are measured from the top-left of each page. All paths must be absolute; inputs are only ' +
        'read; files are never overwritten unless overwrite is true. The engine runs headless and never touches the DesignCraft app unless ' +
        'live=true.' +
        ' ' +
        LINK_INSTRUCTIONS,
    },
  );
  registerLayoutTools(server);
  registerAdvancedTools(server);
  return server;
}
