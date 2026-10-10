import { statSync, writeFileSync } from 'fs';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DesignCraftSession, withSession } from '../engine.js';
import {
  DOCUMENTS, IMAGES, READ, Units, WRITE, collectInputs, errorResult, exportAll, exportOptionsSchema, formatsSchema, json, outputFor,
  outputSchema, parsePages, preview, previewScale, swatchFor, toPt, unitsSchema, withPreview,
} from './common.js';

// ---------------------------------------------------------------- styles and items

const textAttrs = {
  font: z.string().optional().describe('Font family: any installed font, or the bundled Inter, Source Sans 3, Source Serif 4 (available on every system).'),
  font_style: z.string().optional().describe('Regular, Bold, Italic, Bold Italic...'),
  size: z.number().positive().max(1296).optional().describe('Font size in pt.'),
  leading: z.number().positive().optional().describe('Line spacing in pt (default auto).'),
  tracking: z.number().optional().describe('Letter spacing, 1/1000 em.'),
  color: z.string().optional().describe('Text colour "#rrggbb" or a swatch name.'),
  align: z.enum(['left', 'center', 'right', 'justify']).optional(),
  space_before: z.number().min(0).optional().describe('pt.'),
  space_after: z.number().min(0).optional().describe('pt.'),
  first_line_indent: z.number().optional().describe('pt.'),
  all_caps: z.boolean().optional(),
};

export const styleSchema = z.object({
  name: z.string(),
  based_on: z.string().optional(),
  ...textAttrs,
});

export const itemSchema = z.object({
  type: z.enum(['text', 'image', 'rect', 'ellipse', 'polygon', 'line', 'table']).describe('text frame, placed image, shape, line or table.'),
  page: z.number().int().min(1).default(1).describe('1-based page.'),
  x: z.number().optional().describe('From the page\'s left edge (default: the left margin).'),
  y: z.number().optional().describe('From the page\'s top edge (default: the top margin).'),
  width: z.number().positive().optional().describe('Default: up to the right margin.'),
  height: z.number().positive().optional().describe('Default: up to the bottom margin.'),
  x2: z.number().optional().describe('line: end x.'),
  y2: z.number().optional().describe('line: end y.'),
  name: z.string().optional(),
  // text
  text: z.string().optional().describe('Text (\\n = new paragraph). In data_merge, <<Field>> marks a field.'),
  style: z.string().optional().describe('Paragraph style name (from styles) for the whole frame.'),
  ...textAttrs,
  columns: z.number().int().min(1).max(20).optional().describe('Text frame columns.'),
  gutter: z.number().min(0).optional(),
  inset: z.number().min(0).optional().describe('Text frame inset.'),
  vertical_align: z.enum(['top', 'center', 'bottom', 'justify']).optional(),
  // image
  path: z.string().optional().describe('image: absolute path (PNG, JPEG, WebP, GIF, TIFF, PDF page, SVG).'),
  fit: z.enum(['fill', 'fit', 'stretch', 'center', 'frame_to_content']).optional().describe('image: fill the frame (crop), fit inside, stretch, center, or size the frame to the image. Default fill when width and height are given.'),
  field: z.string().optional().describe('data_merge: the CSV field whose image path goes into this frame.'),
  // shapes
  fill: z.string().optional().describe('Fill "#rrggbb", a swatch name or "none".'),
  gradient: z.array(z.string()).min(2).max(8).optional().describe('Gradient fill colours "#rrggbb", evenly spaced.'),
  gradient_angle: z.number().optional(),
  stroke_color: z.string().optional(),
  stroke_width: z.number().min(0).optional().describe('pt.'),
  corner_radius: z.number().min(0).optional(),
  sides: z.number().int().min(3).max(100).optional().describe('polygon sides.'),
  opacity: z.number().min(0).max(100).optional(),
  rotation: z.number().optional().describe('Degrees, counter-clockwise.'),
  shadow: z.boolean().optional().describe('Drop shadow.'),
  wrap: z.boolean().optional().describe('Text wraps around this object (bounding box).'),
  // table
  rows: z.array(z.array(z.string())).max(500).optional().describe('table: rows of cell texts; the first is the header when header is true.'),
  header: z.boolean().optional().describe('table: first row as header (filled with header_fill).'),
  header_fill: z.string().optional(),
});
export type ItemSpec = z.infer<typeof itemSchema>;
export type StyleSpec = z.infer<typeof styleSchema>;

export interface Ctx {
  units: Units;
  swatches: Map<string, string>;
  pages: { index: number; spread: number; x0: number; y0: number; w: number; h: number; margins: { top: number; bottom: number; inside: number; outside: number }; side?: string }[];
  imageFields: { field: string; item: number }[];
}

/** Page geometry from inspect_document (spread index and the page's offset inside it). */
export async function pageGeometry(s: DesignCraftSession): Promise<Ctx['pages']> {
  const d = await s.json('inspect_document', {});
  const out: Ctx['pages'] = [];
  for (const sp of d?.spreads ?? []) {
    for (const p of sp.pages ?? []) {
      const [x0, y0, x1, y1] = p.bounds;
      out.push({ index: p.index, spread: sp.index, x0, y0, w: x1 - x0, h: y1 - y0, margins: p.margins ?? { top: 36, bottom: 36, inside: 36, outside: 36 }, side: p.side });
    }
  }
  return out.sort((a, b) => a.index - b.index);
}

async function charAttrs(s: DesignCraftSession, a: Partial<ItemSpec & StyleSpec>, ctx: Ctx): Promise<Record<string, unknown>> {
  const c: Record<string, unknown> = {};
  if (a.font) c['fontFamily'] = a.font;
  if (a.font_style) c['fontStyle'] = a.font_style;
  if (a.size) c['size'] = a.size;
  if (a.leading) c['leading'] = { kind: 'points', value: a.leading };
  if (a.tracking !== undefined) c['tracking'] = a.tracking;
  if (a.color) c['fill'] = await swatchFor(s, a.color, ctx.swatches);
  if (a.all_caps) c['capitalization'] = 'allCaps';
  return c;
}
function paraAttrs(a: Partial<ItemSpec & StyleSpec>): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  if (a.align) p['align'] = a.align;
  if (a.space_before !== undefined) p['spaceBefore'] = a.space_before;
  if (a.space_after !== undefined) p['spaceAfter'] = a.space_after;
  if (a.first_line_indent !== undefined) p['firstLineIndent'] = a.first_line_indent;
  return p;
}

export async function addStyles(s: DesignCraftSession, styles: StyleSpec[], ctx: Ctx): Promise<void> {
  for (const st of styles) {
    await s.cmd('style.paragraph.create', { name: st.name, ...(st.based_on ? { basedOn: st.based_on } : {}), para: paraAttrs(st), chars: await charAttrs(s, st, ctx) });
  }
}

const FIT: Record<string, string> = { fill: 'fillProportionally', fit: 'fitProportionally', stretch: 'fitContentToFrame', center: 'centerContent', frame_to_content: 'fitFrameToContent' };

/** Create one item on its page. Returns its id and, for text, its story. */
export async function addItem(s: DesignCraftSession, it: ItemSpec, ctx: Ctx): Promise<{ id: number; story?: number; overset?: boolean }> {
  const pg = ctx.pages[it.page - 1];
  if (!pg) throw new Error(`page ${it.page} does not exist (the document has ${ctx.pages.length}).`);
  const u = (v: number | undefined) => (v === undefined ? undefined : toPt(v, ctx.units));
  const left = pg.side === 'left' ? pg.margins.outside : pg.margins.inside;
  const right = pg.side === 'left' ? pg.margins.inside : pg.margins.outside;
  const x = u(it.x) ?? left;
  const y = u(it.y) ?? pg.margins.top;
  const w = u(it.width) ?? Math.max(10, pg.w - right - x);
  const h = u(it.height) ?? Math.max(10, pg.h - pg.margins.bottom - y);
  const rect = [pg.x0 + x, pg.y0 + y, pg.x0 + x + w, pg.y0 + y + h];
  let id: number;
  let story: number | undefined;
  switch (it.type) {
    case 'text': {
      const r = await s.cmd('frame.create', { spread: pg.spread, rect, content: 'text', text: it.text ?? '' });
      id = r.id;
      story = r.story;
      const len = Buffer.byteLength(it.text ?? '');
      if (len) {
        await s.cmd('text.select', { story, anchor: 0, focus: len });
        if (it.style) await s.cmd('style.paragraph.apply', { name: it.style });
        const c = await charAttrs(s, it, ctx);
        if (Object.keys(c).length) await s.cmd('type.char', { attrs: c });
        const p = paraAttrs(it);
        if (Object.keys(p).length) await s.cmd('type.para', { attrs: p });
      }
      const opts: Record<string, unknown> = {};
      if (it.columns) opts['columns'] = it.columns;
      if (it.gutter !== undefined) opts['gutter'] = u(it.gutter);
      if (it.inset !== undefined) opts['inset'] = u(it.inset);
      if (it.vertical_align) opts['verticalJustification'] = it.vertical_align;
      if (Object.keys(opts).length) await s.cmd('object.textFrameOptions', { ...opts, ids: [id] });
      break;
    }
    case 'image': {
      if (it.field) {
        const r = await s.cmd('frame.create', { spread: pg.spread, rect, content: 'graphic' });
        id = r.id;
        ctx.imageFields.push({ field: it.field, item: id });
      } else {
        if (!it.path) throw new Error('image needs path (or field in data_merge).');
        const [file] = collectInputs([it.path], undefined, IMAGES);
        const frame = await s.cmd('frame.create', { spread: pg.spread, rect, content: 'graphic' });
        await s.json('place_image', { path: file, frame: frame.id });
        id = frame.id;
      }
      const mode = FIT[it.fit ?? 'fill'];
      if (it.field) {
        if (mode !== 'fitFrameToContent') await s.cmd('object.fittingOptions', { fitting: mode, ids: [id] });
      } else await s.cmd('object.fit', { mode, ids: [id] });
      break;
    }
    case 'rect':
    case 'ellipse':
    case 'polygon': {
      const r = await s.cmd('frame.create', { spread: pg.spread, rect, content: 'unassigned', shape: it.type === 'rect' ? 'rectangle' : it.type, ...(it.sides ? { sides: it.sides } : {}) });
      id = r.id;
      break;
    }
    case 'line': {
      const x2 = u(it.x2) ?? x + w;
      const y2 = u(it.y2) ?? y;
      const r = await s.cmd('line.create', { spread: pg.spread, a: [pg.x0 + x, pg.y0 + y], b: [pg.x0 + x2, pg.y0 + y2] });
      id = r.id;
      if (!it.stroke_color) await s.cmd('object.stroke', { swatch: await swatchFor(s, it.color ?? '#000000', ctx.swatches), weight: it.stroke_width ?? 1, ids: [id] });
      break;
    }
    case 'table': {
      if (!it.rows?.length) throw new Error('table needs rows.');
      const cols = Math.max(...it.rows.map((r) => r.length));
      const tsv = it.rows.map((row) => Array.from({ length: cols }, (_, i) => (row[i] ?? '').replace(/[\t\n]/g, ' ')).join('\t')).join('\n');
      const r = await s.cmd('frame.create', { spread: pg.spread, rect, content: 'text', text: tsv });
      id = r.id;
      story = r.story;
      await s.cmd('text.select', { story, anchor: 0, focus: Buffer.byteLength(tsv) });
      const c = await charAttrs(s, it, ctx);
      if (Object.keys(c).length) await s.cmd('type.char', { attrs: c });
      const t = await s.cmd('table.convertFromText', { columnSeparator: 'tab' });
      if (it.header) await s.cmd('table.options', { headerRows: 1 });
      if (it.header && it.header_fill) {
        await s.cmd('table.select', { story, table: t.table, rows: [0, 0], what: 'row' });
        await s.cmd('table.setCell', { fill: await swatchFor(s, it.header_fill, ctx.swatches) });
      }
      break;
    }
  }
  // shape look
  if (it.type !== 'text' || it.fill || it.stroke_color) {
    if (it.gradient) {
      const n = it.gradient.length - 1;
      await s.cmd('object.gradient', { kind: 'linear', angle: it.gradient_angle ?? 0, stops: it.gradient.map((c, i) => ({ location: (i / n) * 100, color: c })), ids: [id] });
    } else if (it.fill) await s.cmd('object.fill', { swatch: await swatchFor(s, it.fill, ctx.swatches), ids: [id] });
    else if (it.type === 'rect' || it.type === 'ellipse' || it.type === 'polygon') await s.cmd('object.fill', { swatch: await swatchFor(s, '#000000', ctx.swatches), ids: [id] });
    if (it.stroke_color) await s.cmd('object.stroke', { swatch: await swatchFor(s, it.stroke_color, ctx.swatches), weight: it.stroke_width ?? 1, ids: [id] });
    else if (it.type === 'rect' || it.type === 'ellipse' || it.type === 'polygon' || it.type === 'image') await s.cmd('object.stroke', { swatch: '[None]', ids: [id] });
  }
  if (it.corner_radius) await s.cmd('object.cornerOptions', { shape: 'rounded', size: u(it.corner_radius), ids: [id] });
  if (it.opacity !== undefined) await s.cmd('object.opacity', { opacity: it.opacity / 100, ids: [id] });
  if (it.shadow) await s.cmd('object.dropShadow', { on: true, ids: [id] });
  if (it.wrap) await s.cmd('object.textWrap', { mode: 'boundingBox', offset: 8, ids: [id] });
  if (it.rotation) await s.cmd('transform.rotate', { angle: it.rotation, ids: [id] });
  if (it.name) await s.cmd('object.rename', { id, name: it.name });
  return { id, ...(story !== undefined ? { story } : {}) };
}

/** New document from the shared document fields. */
export async function newDocument(s: DesignCraftSession, a: DocArgs, ctx: Ctx): Promise<void> {
  const u = (v: number | undefined) => (v === undefined ? undefined : toPt(v, a.units));
  await s.json('new_document', {
    ...(a.preset ? { preset: a.preset } : {}),
    ...(a.width ? { width: u(a.width) } : {}),
    ...(a.height ? { height: u(a.height) } : {}),
    pages: a.page_count,
    facingPages: a.facing_pages,
    margins: u(a.margins),
    ...(a.columns ? { columns: a.columns } : {}),
    ...(a.gutter !== undefined ? { gutter: u(a.gutter) } : {}),
    ...(a.bleed !== undefined ? { bleed: u(a.bleed) } : {}),
    ...(a.title ? { title: a.title } : {}),
  });
  ctx.pages = await pageGeometry(s);
  if (a.background) {
    for (const pg of ctx.pages) {
      const r = await s.cmd('frame.create', { spread: pg.spread, rect: [pg.x0, pg.y0, pg.x0 + pg.w, pg.y0 + pg.h], content: 'unassigned' });
      await s.cmd('object.fill', { swatch: await swatchFor(s, a.background, ctx.swatches), ids: [r.id] });
      // new frames get a black stroke by default: a background has none
      await s.cmd('object.stroke', { swatch: '[None]', ids: [r.id] });
    }
  }
  await addStyles(s, a.styles, ctx);
}

const docSchema = {
  units: unitsSchema,
  preset: z.string().optional().describe('Page size preset: Letter, Legal, Tabloid, A3, A4, A5, B5, Letter - Half... (list_designcraft_catalog kind=presets).'),
  width: z.number().positive().optional().describe('Page width (instead of preset).'),
  height: z.number().positive().optional(),
  page_count: z.number().int().min(1).max(999).default(1).describe('Number of pages.'),
  facing_pages: z.boolean().default(false).describe('Facing pages (spreads), for books and magazines.'),
  margins: z.number().min(0).default(36).describe('Uniform margin (36 pt = 1/2 in).'),
  columns: z.number().int().min(1).max(20).optional(),
  gutter: z.number().min(0).optional(),
  bleed: z.number().min(0).optional(),
  title: z.string().optional(),
  background: z.string().optional().describe('Page background colour "#rrggbb" (a full-page rectangle under everything).'),
  styles: z.array(styleSchema).max(50).default([]).describe('Paragraph styles to create (use them with item.style).'),
};
type DocArgs = { [K in keyof typeof docSchema]: z.infer<(typeof docSchema)[K]> };

async function addItems(s: DesignCraftSession, items: ItemSpec[], ctx: Ctx): Promise<unknown[]> {
  const out: unknown[] = [];
  for (const [i, it] of items.entries()) {
    try {
      out.push({ type: it.type, page: it.page, ...(await addItem(s, it, ctx)) });
    } catch (e) {
      throw new Error(`item ${i + 1} (${it.type}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return out;
}

/** Overset stories and preflight issues of the active document. */
async function checks(s: DesignCraftSession): Promise<Record<string, unknown>> {
  const d = await s.json('inspect_document', {});
  const overset = (d?.stories ?? []).filter((st: any) => st.overset).map((st: any) => ({ story: st.id, frames: st.frames, preview: st.preview }));
  return { pages: d?.pageCount, ...(overset.length ? { overset_text: overset } : {}) };
}

async function previews(s: DesignCraftSession, pages: number[] | undefined, count: number, maxSide = 900) {
  const scale = await previewScale(s, maxSide);
  const list = pages?.length ? pages : [1];
  const imgs = [];
  for (const p of list.filter((p) => p >= 1 && p <= count).slice(0, 6)) imgs.push(await preview(s, p - 1, scale));
  return imgs;
}

// ---------------------------------------------------------------- tools

export function registerLayoutTools(server: McpServer): void {
  server.registerTool(
    'create_layout',
    {
      title: 'Create a page layout',
      description:
        'Lay out a new document — flyers, posters, brochures, menus, business cards, certificates, newsletters, reports, book pages — from a ' +
        'list of items placed on pages: text frames (fonts, sizes, colours, alignment, columns, paragraph styles), images (fill / fit), ' +
        'rectangles, ellipses, polygons and lines (fills, gradients, strokes, rounded corners, opacity, drop shadows, text wrap) and tables. ' +
        'Sizes in pt, mm, cm, in or px. Exports print-ready PDF (PDF/X-4, bleed, crop marks), PNG / JPG pages, InDesign IDML, EPUB, HTML, ' +
        'the editable .designcraft file and a package; reports overset text.',
      inputSchema: {
        name: z.string().default('layout').describe('File name.'),
        ...docSchema,
        items: z.array(itemSchema).min(1).max(500),
        formats: formatsSchema.default(['pdf']),
        output_dir: z.string().optional().describe('Absolute output folder (required unless output_path).'),
        output_path: z.string().optional(),
        overwrite: z.boolean().default(false),
        ...exportOptionsSchema,
        preview_pages: z.array(z.number().int().min(1)).max(6).optional().describe('Pages to preview (default the first).'),
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        const dir = args.output_path ? path.dirname(args.output_path) : args.output_dir;
        if (!dir || !path.isAbsolute(dir)) throw new Error('Give an absolute output_dir or output_path.');
        return await withSession(async (s) => {
          const ctx: Ctx = { units: args.units, swatches: new Map(), pages: [], imageFields: [] };
          await newDocument(s, args, ctx);
          const items = await addItems(s, args.items, ctx);
          const info = await checks(s);
          const outputs = await exportAll(s, { stemSource: path.join(dir, args.name), name: args.name, suffix: '', output_dir: dir, output_path: args.output_path, overwrite: args.overwrite }, args.formats, args);
          return withPreview({ success: true, ...info, items, outputs }, await previews(s, args.preview_pages, Number(info['pages'] ?? 1)));
        });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'data_merge',
    {
      title: 'Data merge',
      description:
        'Mail-merge a CSV (or rows) into a template: one page per record (letters, certificates, invitations, ID cards) or several records per ' +
        'page (labels, badges, business cards). The template is an existing .designcraft / .idml file with data placeholders, or one built here ' +
        'with the same items as create_layout: write <<Field>> in text, and give image items `field` for pictures whose path is in the CSV. ' +
        'Exports the merged document as PDF, PNG pages, IDML, .designcraft...',
      inputSchema: {
        template_path: z.string().optional().describe('Absolute .designcraft / .idml template (instead of building one).'),
        csv_path: z.string().optional().describe('Absolute CSV / TSV file (first row = field names).'),
        rows: z.array(z.record(z.string(), z.string())).max(10000).optional().describe('Records as objects instead of a CSV file.'),
        ...docSchema,
        items: z.array(itemSchema).max(300).default([]).describe('Template items when no template_path.'),
        per_page: z.boolean().default(false).describe('Several records per page (labels, cards) instead of one page per record.'),
        spacing: z.number().min(0).optional().describe('per_page: space between records (in units).'),
        records: z.string().optional().describe('Only these records, 1-based: "1-10,15".'),
        name: z.string().default('merge'),
        formats: formatsSchema.default(['pdf']),
        output_dir: z.string().optional(),
        output_path: z.string().optional(),
        overwrite: z.boolean().default(false),
        ...exportOptionsSchema,
        preview_pages: z.array(z.number().int().min(1)).max(6).optional(),
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        if (!args.csv_path && !args.rows?.length) throw new Error('Give csv_path or rows.');
        const dir = args.output_path ? path.dirname(args.output_path) : args.output_dir ?? (args.template_path ? path.dirname(args.template_path) : undefined);
        if (!dir || !path.isAbsolute(dir)) throw new Error('Give an absolute output_dir or output_path.');
        const csv = args.csv_path ? collectInputs([args.csv_path], undefined, ['csv', 'tsv', 'txt'])[0] : undefined;
        return await withSession(async (s) => {
          const ctx: Ctx = { units: args.units, swatches: new Map(), pages: [], imageFields: [] };
          if (args.template_path) {
            const [file] = collectInputs([args.template_path], undefined, DOCUMENTS);
            await s.json('open_document', { path: file });
            ctx.pages = await pageGeometry(s);
            await addStyles(s, args.styles, ctx);
          } else {
            if (!args.items.length) throw new Error('Give template_path or items.');
            await newDocument(s, args, ctx);
          }
          if (args.items.length) await addItems(s, args.items, ctx);
          const source = csv ? { path: csv } : { csv: toCsv(args.rows!) };
          const fields = await s.cmd('data.fields', source);
          await s.cmd('data.source.select', csv ? { path: csv, name: path.basename(csv) } : { base64: Buffer.from(toCsv(args.rows!)).toString('base64'), name: 'rows.csv' }).catch(() => undefined);
          for (const f of ctx.imageFields) await s.cmd('data.placeholder.add', { field: f.field, role: 'image', item: f.item });
          const r = await s.cmd('data.merge', {
            ...source,
            ...(args.per_page ? { perPage: 'multiple' } : {}),
            ...(args.spacing !== undefined ? { rowSpacing: toPt(args.spacing, args.units), columnSpacing: toPt(args.spacing, args.units) } : {}),
            ...(args.records ? { range: args.records } : {}),
          });
          const info = await checks(s);
          const outputs = await exportAll(s, { stemSource: path.join(dir, args.name), name: args.name, suffix: '', output_dir: dir, output_path: args.output_path, overwrite: args.overwrite }, args.formats, args);
          return withPreview(
            { success: true, fields: (fields ?? []).map((f: any) => f.name), records: r?.records, pages: r?.pages, ...(r?.missingImages?.length ? { missing_images: r.missingImages } : {}), ...(r?.oversetStories ? { overset_stories: r.oversetStories } : {}), ...(r?.warnings?.length ? { warnings: r.warnings } : {}), ...info, outputs },
            await previews(s, args.preview_pages, Number(info['pages'] ?? 1)),
          );
        });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'export_document',
    {
      title: 'Export a document',
      description:
        'Export .designcraft or InDesign .idml documents (one, a list or a folder) to PDF (page range, PDF/X-4 or PDF/A-2b, bleed, crop marks, ' +
        'spreads, tagged), PNG / JPG pages at any dpi, IDML, EPUB (reflowable or fixed), HTML, booklet PDF (printer spreads) or a package ' +
        'folder (document, links, fonts, IDML, report). Inputs are never modified.',
      inputSchema: {
        input_path: z.string().optional(),
        input_paths: z.array(z.string()).max(200).optional(),
        input_dir: z.string().optional(),
        formats: formatsSchema.default(['pdf']),
        suffix: z.string().default(''),
        ...outputSchema,
        ...exportOptionsSchema,
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        const inputs = collectInputs([...(args.input_path ? [args.input_path] : []), ...(args.input_paths ?? [])], args.input_dir, DOCUMENTS);
        if (args.output_path && inputs.length > 1) throw new Error('output_path needs a single input; use output_dir.');
        return json(
          await withSession(async (s) => {
            const done: { input: string; outputs: unknown[]; warnings?: string[] }[] = [];
            const errors: { input: string; error: string }[] = [];
            for (const input of inputs) {
              try {
                const o = await s.json('open_document', { path: input });
                const outputs = await exportAll(s, { stemSource: input, suffix: args.suffix, output_dir: args.output_dir, output_path: args.output_path, overwrite: args.overwrite }, args.formats, args);
                done.push({ input, outputs, ...(o?.warnings?.length ? { warnings: o.warnings } : {}) });
                await s.cmd('file.close', {}).catch(() => undefined);
              } catch (e) {
                errors.push({ input, error: e instanceof Error ? e.message : String(e) });
              }
            }
            return { success: errors.length === 0, exported: done.length, results: done, ...(errors.length ? { errors } : {}) };
          }),
        );
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'edit_document',
    {
      title: 'Edit a document',
      description:
        'Open a .designcraft or .idml document and change it: find / change text (also GREP) with optional formatting, replace a story\'s text, ' +
        'put new images into frames, replace a font everywhere, add pages and add items (as in create_layout). The result is written as new ' +
        'files (default: <name>_edit.designcraft and .pdf); the original is never modified.',
      inputSchema: {
        input_path: z.string().describe('Absolute .designcraft / .idml file.'),
        units: unitsSchema,
        find_replace: z
          .array(z.object({ find: z.string(), change: z.string(), grep: z.boolean().optional(), case_sensitive: z.boolean().optional(), whole_word: z.boolean().optional() }))
          .max(100)
          .default([]),
        set_text: z.array(z.object({ frame: z.number().int().optional(), story: z.number().int().optional(), text: z.string() })).max(100).default([]).describe('Replace a whole story (ids from get_document_info).'),
        replace_images: z.array(z.object({ frame: z.number().int(), path: z.string(), fit: z.enum(['fill', 'fit', 'stretch', 'center', 'frame_to_content']).optional() })).max(100).default([]),
        replace_font: z.array(z.object({ family: z.string(), to_family: z.string(), style: z.string().optional(), to_style: z.string().optional() })).max(20).default([]),
        add_pages: z.number().int().min(0).max(500).default(0).describe('Pages to add at the end.'),
        styles: z.array(styleSchema).max(50).default([]),
        items: z.array(itemSchema).max(300).default([]),
        formats: formatsSchema.default(['designcraft', 'pdf']),
        suffix: z.string().default('_edit'),
        ...outputSchema,
        ...exportOptionsSchema,
        preview_pages: z.array(z.number().int().min(1)).max(6).optional(),
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        const [file] = collectInputs([args.input_path], undefined, DOCUMENTS);
        return await withSession(async (s) => {
          const ctx: Ctx = { units: args.units, swatches: new Map(), pages: [], imageFields: [] };
          await s.json('open_document', { path: file });
          const log: Record<string, unknown>[] = [];
          for (const f of args.find_replace) {
            const r = await s.cmd('find.change', { find: f.find, change: f.change, ...(f.grep ? { grep: true } : {}), ...(f.case_sensitive ? { caseSensitive: true } : {}), ...(f.whole_word ? { wholeWord: true } : {}), scope: 'document' });
            log.push({ find: f.find, changed: r?.count ?? 0 });
          }
          for (const t of args.set_text) {
            if (t.story === undefined && t.frame === undefined) throw new Error('set_text needs story or frame.');
            await s.json('set_story_text', { ...(t.story !== undefined ? { story: t.story } : { frame: t.frame }), text: t.text });
            log.push({ set_text: t.story ?? t.frame });
          }
          for (const im of args.replace_images) {
            const [img] = collectInputs([im.path], undefined, IMAGES);
            await s.json('place_image', { path: img, frame: im.frame });
            await s.cmd('object.fit', { mode: FIT[im.fit ?? 'fill'], ids: [im.frame] }).catch(() => undefined);
            log.push({ image: im.frame });
          }
          for (const fr of args.replace_font) {
            await s.cmd('font.replace', { family: fr.family, toFamily: fr.to_family, ...(fr.style ? { style: fr.style } : {}), ...(fr.to_style ? { toStyle: fr.to_style } : {}) });
            log.push({ font: `${fr.family} → ${fr.to_family}` });
          }
          if (args.add_pages) await s.cmd('layout.pages.insert', { count: args.add_pages });
          ctx.pages = await pageGeometry(s);
          await addStyles(s, args.styles, ctx);
          const items = args.items.length ? await addItems(s, args.items, ctx) : [];
          const info = await checks(s);
          const outputs = await exportAll(s, { stemSource: file, suffix: args.suffix, output_dir: args.output_dir, output_path: args.output_path, overwrite: args.overwrite }, args.formats, args);
          return withPreview({ success: true, changes: log, ...(items.length ? { items } : {}), ...info, outputs }, await previews(s, args.preview_pages, Number(info['pages'] ?? 1)));
        });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'get_document_info',
    {
      title: 'Document information',
      description:
        'Pages (size, margins, columns), items per page (id, kind, bounds, fill), stories (text preview, overset), paragraph / character styles, ' +
        'swatches, fonts (missing ones too), placed images (missing, low resolution) and preflight issues of a .designcraft or .idml file.',
      inputSchema: { input_path: z.string().describe('Absolute .designcraft / .idml file.'), preflight_min_ppi: z.number().positive().default(150) },
      annotations: READ,
    },
    async (args) => {
      try {
        const [file] = collectInputs([args.input_path], undefined, DOCUMENTS);
        return json(
          await withSession(async (s) => {
            const o = await s.json('open_document', { path: file });
            const d = await s.json('inspect_document', {});
            const fonts = await s.cmd('font.list').catch(() => []);
            const links = await s.cmd('links.list').catch(() => []);
            const pre = await s.cmd('preflight.run', { minPpi: args.preflight_min_ppi }).catch(() => undefined);
            return {
              success: true,
              path: file,
              bytes: statSync(file).size,
              title: d?.title,
              page_count: d?.pageCount,
              settings: d?.settings,
              pages: (d?.spreads ?? []).flatMap((sp: any) =>
                (sp.pages ?? []).map((p: any) => ({
                  page: p.index + 1,
                  name: p.name,
                  size: [p.bounds[2] - p.bounds[0], p.bounds[3] - p.bounds[1]],
                  margins: p.margins,
                  columns: p.columns,
                  items: (sp.items ?? []).filter((it: any) => it.bounds && it.bounds[0] < p.bounds[2] && it.bounds[2] > p.bounds[0]).map((it: any) => ({ id: it.id, kind: it.kind, bounds: it.bounds, ...(it.story !== undefined ? { story: it.story } : {}), ...(it.fill && it.fill !== '[None]' ? { fill: it.fill } : {}), ...(it.name ? { name: it.name } : {}) })),
                })),
              ),
              stories: (d?.stories ?? []).map((st: any) => ({ id: st.id, frames: st.frames, preview: st.preview, ...(st.overset ? { overset: true } : {}) })),
              paragraph_styles: d?.paragraphStyles,
              character_styles: d?.characterStyles,
              swatches: d?.swatches,
              fonts,
              links,
              preflight: pre?.issues ?? pre,
              ...(o?.warnings?.length ? { warnings: o.warnings } : {}),
            };
          }),
        );
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'render_pages',
    {
      title: 'Preview pages',
      description: 'Render pages of a .designcraft or .idml document so Claude can see them; optionally save them as PNG.',
      inputSchema: {
        input_path: z.string().describe('Absolute .designcraft / .idml file.'),
        pages: z.string().default('1').describe('1-based pages, e.g. "1-3,6" (at most 6).'),
        max_side: z.number().int().min(100).max(4000).default(900),
        save_dir: z.string().optional().describe('Absolute folder: also write <name>_p<N>.png there.'),
        overwrite: z.boolean().default(false),
      },
      annotations: READ,
    },
    async (args) => {
      try {
        const [file] = collectInputs([args.input_path], undefined, DOCUMENTS);
        return await withSession(async (s) => {
          await s.json('open_document', { path: file });
          const d = await s.json('inspect_document', {});
          const list = parsePages(args.pages, d?.pageCount ?? 1).slice(0, 6);
          const scale = await previewScale(s, args.max_side);
          const imgs = [];
          const saved: string[] = [];
          for (const p of list) {
            const img = await preview(s, p - 1, scale);
            imgs.push(img);
            if (img && args.save_dir) {
              const out = outputFor(path.join(args.save_dir, path.basename(file)), 'png', `_p${p}`, { output_dir: args.save_dir, overwrite: args.overwrite });
              writeFileSync(out, Buffer.from(img.data, 'base64'));
              saved.push(out);
            }
          }
          return withPreview({ success: true, input: file, page_count: d?.pageCount, pages: list, ...(saved.length ? { saved } : {}) }, imgs);
        });
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}

/** Records → CSV text (quoted when needed). */
export function toCsv(rows: Record<string, string>[]): string {
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const q = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [keys.map(q).join(','), ...rows.map((r) => keys.map((k) => q(String(r[k] ?? ''))).join(','))].join('\n');
}
