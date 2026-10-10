import { existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { DesignCraftSession } from '../engine.js';
import { resolveOutputPath, stemOf } from '../paths.js';

export type Content = { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string };
export type ToolResult = { content: Content[]; isError?: boolean };

export function json(obj: unknown, isError = false): ToolResult {
  const out: ToolResult = { content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] };
  if (isError) out.isError = true;
  return out;
}

export function errorResult(e: unknown): ToolResult {
  return json({ success: false, error: e instanceof Error ? e.message : String(e) }, true);
}

export const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const;
export const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

// ---------------------------------------------------------------- formats

export const DOCUMENTS = ['designcraft', 'idml'];
export const IMAGES = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'tif', 'tiff', 'pdf', 'svg'];

/** Output formats: id → extension (folder for package). */
export const OUTPUTS = {
  pdf: 'pdf',
  png: 'png',
  jpg: 'jpg',
  idml: 'idml',
  designcraft: 'designcraft',
  epub: 'epub',
  fixed_epub: 'epub',
  html: 'html',
  booklet_pdf: 'pdf',
  package: '',
} as const;
export type OutputFormat = keyof typeof OUTPUTS;
export const OUTPUT_IDS = Object.keys(OUTPUTS) as [OutputFormat, ...OutputFormat[]];

export const formatsSchema = z
  .array(z.enum(OUTPUT_IDS))
  .min(1)
  .max(10)
  .describe(
    'Outputs: pdf, png / jpg (one image per page: <name>_p1.png...), idml (InDesign), designcraft (the editable native file), epub (reflowable), ' +
      'fixed_epub, html (one self-contained page), booklet_pdf (printer spreads, saddle stitch), package (a folder with the document, its ' +
      'links, fonts, an IDML copy and a report).',
  );

export const exportOptionsSchema = {
  export_pages: z.string().optional().describe('Pages to export, 1-based: "1-3,5" (default all).'),
  pdf_standard: z.enum(['none', 'x4', 'a2b']).optional().describe('PDF/X-4 for print, PDF/A-2b for archiving.'),
  include_bleed: z.boolean().optional().describe('PDF: include the document bleed.'),
  crop_marks: z.boolean().optional().describe('PDF: crop and bleed marks.'),
  spreads: z.boolean().optional().describe('PDF: spreads instead of single pages.'),
  tagged: z.boolean().optional().describe('PDF: tagged (accessible) structure.'),
  dpi: z.number().positive().max(1200).optional().describe('PNG / JPG resolution (default 144).'),
  title: z.string().optional().describe('PDF / EPUB / HTML title.'),
  author: z.string().optional(),
};
export type ExportOpts = { [K in keyof typeof exportOptionsSchema]?: z.infer<(typeof exportOptionsSchema)[K]> };

export const outputSchema = {
  output_dir: z.string().optional().describe('Absolute output folder (default: next to the input; required for new documents).'),
  output_path: z.string().optional().describe('Absolute output file for the first format (its extension must match).'),
  overwrite: z.boolean().default(false).describe('Replace existing outputs.'),
};

// ---------------------------------------------------------------- units

export const unitsSchema = z.enum(['pt', 'mm', 'cm', 'in', 'px']).default('pt').describe('Units of every size and position: pt (1/72 in, default), mm, cm, in, px (96 per inch).');
export type Units = z.infer<typeof unitsSchema>;
const PER: Record<Units, number> = { pt: 1, mm: 72 / 25.4, cm: 72 / 2.54, in: 72, px: 0.75 };
/** A value in `units` → points. */
export function toPt(v: number, units: Units): number {
  return v * PER[units];
}

// ---------------------------------------------------------------- inputs

export function collectInputs(paths: string[], dir?: string, exts = DOCUMENTS): string[] {
  const out: string[] = [];
  for (const p of paths) {
    if (!path.isAbsolute(p)) throw new Error(`Paths must be absolute: ${p}`);
    if (!existsSync(p) || !statSync(p).isFile()) throw new Error(`File not found: ${p}`);
    out.push(p);
  }
  if (dir) {
    if (!path.isAbsolute(dir)) throw new Error(`input_dir must be an absolute path: ${dir}`);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) throw new Error(`Folder not found: ${dir}`);
    for (const name of readdirSync(dir).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
      const full = path.join(dir, name);
      if (exts.includes(path.extname(name).slice(1).toLowerCase()) && statSync(full).isFile()) out.push(full);
    }
  }
  if (out.length === 0) throw new Error('No input files.');
  return out;
}

export function outputFor(input: string, ext: string, suffix: string, o: { output_path?: string; output_dir?: string; overwrite?: boolean }): string {
  if (o.output_dir) mkdirSync(o.output_dir, { recursive: true });
  const r = resolveOutputPath({ inputPath: input, ext, suffix, outputPath: o.output_path, outputDir: o.output_dir, overwrite: o.overwrite });
  if ('error' in r) throw new Error(r.error);
  mkdirSync(path.dirname(r.path), { recursive: true });
  return r.path;
}

/** A free folder <dir>/<name> (then <name>_2...) unless overwrite. */
export function freeFolder(dir: string, name: string, overwrite?: boolean): string {
  let candidate = path.join(dir, name);
  for (let i = 2; existsSync(candidate) && !overwrite; i++) candidate = path.join(dir, `${name}_${i}`);
  return candidate;
}

/** "1-3,5" → [1,2,3,5] (bounded by the page count). */
export function parsePages(spec: string | undefined, count: number): number[] {
  if (!spec) return Array.from({ length: count }, (_, i) => i + 1);
  const out = new Set<number>();
  for (const part of spec.split(',').map((x) => x.trim()).filter(Boolean)) {
    const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part);
    if (!m) throw new Error(`Bad page range "${part}" (use e.g. "1-3,5").`);
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    for (let p = Math.min(a, b); p <= Math.max(a, b); p++) if (p >= 1 && p <= count) out.add(p);
  }
  if (!out.size) throw new Error(`No pages in "${spec}" (the document has ${count}).`);
  return [...out].sort((x, y) => x - y);
}

// ---------------------------------------------------------------- engine helpers

/** Swatch for a "#rrggbb" colour (created once per document); names pass through. */
export async function swatchFor(s: DesignCraftSession, color: string | undefined, cache: Map<string, string>): Promise<string | undefined> {
  if (!color) return undefined;
  if (color === 'none') return '[None]';
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
  const key = color.toLowerCase();
  const known = cache.get(key);
  if (known) return known;
  const name = key;
  try {
    await s.cmd('swatch.create', { name, color: key });
  } catch (e) {
    if (!/exists/i.test(String(e))) throw e;
  }
  cache.set(key, name);
  return name;
}

export interface Exported {
  path: string;
  format: string;
  bytes?: number;
  pages?: number;
  files?: string[];
  warnings?: string[];
}

/** A file name given by the user: kept as is (dots included), except a trailing output / document extension. */
export function nameStem(name: string): string {
  const exts = new Set<string>([...Object.values(OUTPUTS).filter(Boolean), ...DOCUMENTS, 'jpeg']);
  const m = /\.([^.\\/]+)$/.exec(name);
  return m && exts.has(m[1].toLowerCase()) ? name.slice(0, -m[0].length) : name;
}

/**
 * Export the active document once per format: output_path for the first, the others as
 * <output_dir or the base's folder>/<stem><suffix>.<ext>; never replacing anything unless overwrite.
 */
export async function exportAll(
  s: DesignCraftSession,
  base: { stemSource: string; name?: string; suffix: string; output_dir?: string; output_path?: string; overwrite?: boolean },
  formats: OutputFormat[],
  o: ExportOpts,
): Promise<Exported[]> {
  const out: Exported[] = [];
  const doc = await s.json('inspect_document', {});
  const pageCount: number = doc?.pageCount ?? 1;
  for (const [i, f] of formats.entries()) {
    const ext = OUTPUTS[f];
    const usePath = i === 0 && base.output_path;
    if (usePath && (f === 'png' || f === 'jpg' || f === 'package')) throw new Error(`output_path cannot name ${f} output (one file per page / a folder); use output_dir.`);
    if (usePath && path.extname(base.output_path!).slice(1).toLowerCase() !== ext) throw new Error(`output_path must end in .${ext} for ${f}.`);
    const dir = base.output_dir ?? path.dirname(base.output_path ?? base.stemSource);
    const stem = base.output_path ? stemOf(base.output_path) : (base.name !== undefined ? nameStem(base.name) : stemOf(base.stemSource)) + base.suffix;
    const target = (e: string, suffix = '') =>
      usePath
        ? outputFor(base.output_path + '.__src', e, '', { output_path: base.output_path, overwrite: base.overwrite })
        : outputFor(path.join(dir, stem + suffix + '.__src'), e, '', { output_dir: dir, overwrite: base.overwrite });
    switch (f) {
      case 'pdf': {
        const p = target('pdf');
        const r = await s.cmd('file.exportPdf', {
          path: p,
          ...(o.export_pages ? { pages: o.export_pages } : {}),
          ...(o.pdf_standard ? { standard: o.pdf_standard } : {}),
          ...(o.include_bleed ? { bleed: true } : {}),
          ...(o.crop_marks ? { marks: true } : {}),
          ...(o.spreads ? { spreads: true } : {}),
          ...(o.tagged ? { tagged: true } : {}),
          ...(o.title ? { title: o.title } : {}),
          ...(o.author ? { author: o.author } : {}),
        });
        out.push({ path: p, format: f, bytes: r?.bytes, pages: r?.pages, ...(r?.warnings?.length ? { warnings: r.warnings } : {}) });
        break;
      }
      case 'png':
      case 'jpg': {
        const files: string[] = [];
        for (const pg of parsePages(o.export_pages, pageCount)) {
          const p = target(ext, pageCount > 1 || o.export_pages ? `_p${pg}` : '');
          await s.json('export_png', { page: pg - 1, path: p, scale: (o.dpi ?? 144) / 72 });
          files.push(p);
        }
        out.push({ path: files[0], format: f, files, pages: files.length });
        break;
      }
      case 'idml': {
        const p = target('idml');
        const r = await s.cmd('file.exportIdml', { path: p });
        out.push({ path: p, format: f, bytes: r?.bytes });
        break;
      }
      case 'designcraft': {
        const p = target('designcraft');
        await s.cmd('file.saveACopy', { path: p });
        out.push({ path: p, format: f, bytes: statSync(p).size });
        break;
      }
      case 'epub':
      case 'fixed_epub': {
        const p = target('epub', f === 'fixed_epub' && formats.includes('epub') ? '_fixed' : '');
        const r = await s.cmd(f === 'epub' ? 'file.exportEpub' : 'file.exportFixedEpub', { path: p, ...(o.title ? { title: o.title } : {}), ...(o.author ? { author: o.author } : {}) });
        out.push({ path: p, format: f, bytes: r?.bytes });
        break;
      }
      case 'html': {
        const p = target('html');
        const r = await s.cmd('file.exportHtml', { path: p, ...(o.title ? { title: o.title } : {}) });
        out.push({ path: p, format: f, bytes: r?.bytes });
        break;
      }
      case 'booklet_pdf': {
        const p = target('pdf', formats.includes('pdf') ? '_booklet' : '');
        const r = await s.cmd('file.printBooklet', { path: p });
        out.push({ path: p, format: f, bytes: r?.bytes, pages: r?.sheets });
        break;
      }
      case 'package': {
        const folder = freeFolder(dir, `${stem}_package`, base.overwrite);
        const r = await s.cmd('file.package', { dir: folder, idml: true });
        out.push({ path: folder, format: f, files: r?.files, ...(r?.report ? { warnings: [r.report] } : {}) });
        break;
      }
    }
  }
  return out;
}

/** A rendered page of the active document, returned as an MCP image. */
export async function preview(s: DesignCraftSession, page = 0, scale = 1): Promise<{ data: string; mimeType: string } | undefined> {
  const r = await s.call('render_page', { page, scale });
  const img = r.content.find((c) => c.type === 'image');
  return img?.data ? { data: img.data, mimeType: img.mimeType ?? 'image/png' } : undefined;
}

/** A preview scale that keeps the longest page side near `maxSide` pixels. */
export async function previewScale(s: DesignCraftSession, maxSide = 900): Promise<number> {
  const d = await s.json('inspect_document', {});
  const w = d?.settings?.pageWidth ?? 612;
  const h = d?.settings?.pageHeight ?? 792;
  return Math.min(3, Math.max(0.2, maxSide / Math.max(w, h)));
}

export function withPreview(body: unknown, imgs: ({ data: string; mimeType: string } | undefined)[], isError = false): ToolResult {
  const res = json(body, isError);
  for (const img of imgs) if (img) res.content.push({ type: 'image', ...img });
  return res;
}

export { stemOf };
