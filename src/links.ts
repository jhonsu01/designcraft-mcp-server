import { existsSync, statSync } from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

/**
 * Ready-made links to the files a tool wrote, so the assistant can show every output as a clickable link.
 * Agent apps (Codex, SunsamCode, Claude...) open file:/// links in their own viewers, but a Windows path with spaces,
 * accents or parentheses breaks a markdown link when the model writes it by hand; a percent-encoded file:/// URL never
 * does.
 */

// keys that hold inputs or installation details, not outputs
const SKIP = /^(input|inputs|input_path|input_paths|input_dir|source|sources|template|template_path|csv_path|open_path|script_path|install_dir|cli|app|connector_dir|work_dir)$/i;
const MAX = 60;

/** file:/// URL with everything that could end a markdown link destination percent-encoded. */
export function fileUrl(p: string): string {
  return pathToFileURL(p).href.replace(/\(/g, '%28').replace(/\)/g, '%29');
}

/** Absolute paths of existing files and folders in a tool result (outputs only). */
export function outputFiles(obj: unknown): string[] {
  const found = new Set<string>();
  const walk = (v: unknown, key?: string): void => {
    if (found.size >= MAX || (key !== undefined && SKIP.test(key))) return;
    if (typeof v === 'string') {
      if (v.length < 1024 && path.isAbsolute(v) && !/^[\\/]+$/.test(v) && existsSync(v)) found.add(path.resolve(v));
    } else if (Array.isArray(v)) {
      for (const x of v) walk(x, key);
    } else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) walk(x, k);
    }
  };
  walk(obj);
  return [...found];
}

/** Markdown list linking each path: "- [name](file:///...)"; folders end in "/". */
export function filesMarkdown(files: string[]): string {
  return files
    .map((f) => {
      let dir = false;
      try {
        dir = statSync(f).isDirectory();
      } catch {
        // gone meanwhile: still link it
      }
      const label = (path.basename(f) || f).replace(/([[\]\\])/g, '\\$1') + (dir ? '/' : '');
      return `- [${label}](${fileUrl(f)})`;
    })
    .join('\n');
}

/** The result with `files_markdown` added when it names output files. */
export function withFileLinks<T>(obj: T): T {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const files = outputFiles(obj);
  return files.length ? ({ ...obj, files_markdown: filesMarkdown(files) } as T) : obj;
}

/** Sentence for the server instructions. */
export const LINK_INSTRUCTIONS =
  'When a result lists output files it includes files_markdown: ready-made links (file:/// URLs) to every file and folder ' +
  'written. Show them to the user exactly as given (one per line, or inside a table cell) so each output can be opened ' +
  'from the chat; never retype the paths.';
