// End-to-end test over real MCP stdio against dist/bundle.cjs (what the .mcpb runs).
// Needs DesignCraft installed. Usage: npm run build && npm run test:e2e
// E2E_BUNDLE=<path to bundle.cjs> tests another build (e.g. the contents of an unpacked .mcpb).
// Draws its own synthetic images and CSV (no personal files).
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { deflateSync } from 'zlib';

const out = mkdtempSync(join(tmpdir(), 'dc-e2e-'));
const src = join(out, 'Imágenes ñandú');
mkdirSync(src, { recursive: true });

// --- tiny PNG writer
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(path, w, h, pixel) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const [r, g, b] = pixel(x, y);
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
// a photo-like scene: sky-to-grass gradient with a round orange subject
const photo = join(src, 'foto.png');
png(photo, 800, 450, (x, y) => {
  const d = Math.hypot(x - 400, y - 225);
  if (d < 120) return [240, 140, 30];
  return y < 300 ? [100 + (y >> 2), 160 + (y >> 3), 235] : [50, 130 + ((x * 7) % 30), 60];
});
const face = (n, rgb) => { const f = join(src, `persona${n}.png`); png(f, 200, 200, (x, y) => (Math.hypot(x - 100, y - 90) < 60 ? rgb : [220, 225, 235])); return f; };
const csvPath = join(src, 'equipo.csv');
writeFileSync(csvPath, `Nombre,Cargo,Foto\nAna Pérez,Diseñadora,${face(1, [230, 120, 90])}\nLuis Gómez,Editor,${face(2, [90, 140, 230])}\nSofía Ruiz,Fotógrafa,${face(3, [120, 200, 110])}\n`);

const client = new Client({ name: 'e2e', version: '1.0.0' });
await client.connect(new StdioClientTransport({ command: process.execPath, args: [process.env.E2E_BUNDLE || 'dist/bundle.cjs'] }));

let failed = 0;
const check = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failed++; };
const call = async (name, args) => {
  const res = await client.callTool({ name, arguments: args });
  const body = JSON.parse(res.content.find((c) => c.type === 'text').text);
  if (res.isError) console.log('      ', JSON.stringify(body).slice(0, 400));
  return { ...body, _imgs: res.content.filter((c) => c.type === 'image').length };
};
const t0 = Date.now();
const isPdf = (f) => !!f && existsSync(f) && readFileSync(f).subarray(0, 5).toString() === '%PDF-';

const { tools } = await client.listTools();
check(tools.length === 10, `10 tools exposed (${tools.map((t) => t.name).join(', ')})`);
check(!JSON.stringify(tools.map((t) => t.inputSchema)).includes('"items":['), 'no JSON Schema tuples in any input schema');

const st = await call('get_designcraft_status', {});
check(st.ready && /designcraft-cli \d/.test(st.version ?? '') && st.commands > 400, `status: ${st.version}, ${st.commands} commands, ${st.platform}`);

// ---- create_layout: a two-page flyer with styles, shapes, image, table, line
const flyer = await call('create_layout', {
  name: 'Volante café',
  units: 'mm',
  preset: 'A5',
  page_count: 2,
  margins: 12,
  background: '#fdf6ec',
  styles: [
    { name: 'Título', font: 'Georgia', font_style: 'Bold', size: 34, color: '#7a3e12', align: 'center' },
    { name: 'Cuerpo', font: 'Arial', size: 11, color: '#333333', space_after: 4 },
  ],
  items: [
    { type: 'rect', x: 0, y: 0, width: 148, height: 40, gradient: ['#c0661f', '#f2b134'], name: 'Cabecera' },
    { type: 'text', x: 12, y: 10, width: 124, height: 22, text: 'Café del Ñandú', style: 'Título', color: '#ffffff', vertical_align: 'center' },
    { type: 'image', path: photo, x: 12, y: 48, width: 124, height: 70, corner_radius: 4, shadow: true },
    { type: 'text', x: 12, y: 124, width: 124, height: 30, text: 'Granos tostados cada mañana.\nAbierto de lunes a sábado, 7:00–19:00.', style: 'Cuerpo', columns: 2, gutter: 4 },
    { type: 'ellipse', x: 110, y: 160, width: 26, height: 26, fill: '#2e7d32', opacity: 80, rotation: 15 },
    { type: 'polygon', x: 12, y: 160, width: 26, height: 26, sides: 6, fill: '#1565c0', stroke_color: '#0d47a1', stroke_width: 1 },
    { type: 'line', x: 12, y: 195, x2: 136, y2: 195, color: '#7a3e12', stroke_width: 1.5 },
    { type: 'table', page: 2, x: 12, y: 20, width: 124, height: 60, rows: [['Bebida', 'Precio'], ['Espresso', '2,50 €'], ['Capuchino', '3,20 €'], ['Té chai', '3,00 €']], header: true, header_fill: '#f2b134', font: 'Arial', size: 12 },
    { type: 'text', page: 2, text: 'Este texto es demasiado largo para su marco. '.repeat(40), x: 12, y: 100, width: 60, height: 15, size: 10 },
  ],
  formats: ['pdf', 'png', 'designcraft', 'idml'],
  output_dir: join(out, 'flyer'),
  dpi: 72,
  preview_pages: [1, 2],
});
const fo = Object.fromEntries((flyer.outputs ?? []).map((o) => [o.format, o]));
check(flyer.success && flyer.pages === 2 && flyer.items?.length === 9 && flyer._imgs === 2, `create_layout: 2 pages, 9 items, 2 previews`);
check(isPdf(fo.pdf?.path) && fo.pdf?.pages === 2, `create_layout: PDF with 2 pages (${fo.pdf?.bytes} bytes)`);
check(fo.png?.files?.length === 2 && fo.png.files.every((f) => existsSync(f)), 'create_layout: one PNG per page');
check(existsSync(fo.designcraft?.path ?? '') && existsSync(fo.idml?.path ?? ''), 'create_layout: .designcraft and .idml saved');
check(flyer.overset_text?.length === 1, 'create_layout: reports the overset text frame');

// the same output again never overwrites
const again = await call('create_layout', { name: 'Volante café', items: [{ type: 'text', text: 'x' }], formats: ['pdf'], output_dir: join(out, 'flyer') });
check(again.success && /Volante café_2\.pdf$/.test(again.outputs?.[0]?.path ?? ''), 'create_layout: an existing file gets a _2 name instead of being replaced');
const clash = await call('create_layout', { items: [{ type: 'text', text: 'x' }], formats: ['pdf'], output_path: fo.pdf?.path ?? join(out, 'x.pdf') });
check(!clash.success && /exists/i.test(clash.error ?? ''), 'create_layout: an explicit existing output_path is refused without overwrite');

// ---- info / render on the saved document
const info = await call('get_document_info', { input_path: fo.designcraft?.path ?? '' });
const p1 = info.pages?.[0];
check(info.success && info.page_count === 2 && p1?.items?.length >= 8 && JSON.stringify(info.paragraph_styles ?? '').includes('Título'), `get_document_info: 2 pages, ${p1?.items?.length} items on page 1, the styles`);
check(Array.isArray(info.links) && info.links.length >= 1 && Array.isArray(info.fonts), `get_document_info: ${info.links?.length} link(s), ${info.fonts?.length} fonts, preflight ${Array.isArray(info.preflight) ? info.preflight.length : '?'} issue(s)`);
const insp = await call('run_designcraft_commands', { open_path: fo.designcraft?.path ?? '', steps: [{ id: 'inspect_document' }] });
const bg = insp.results?.[0]?.result?.spreads?.[0]?.items?.[0];
check(bg?.fill === '#fdf6ec' && bg?.stroke?.swatch === '[None]', `create_layout: the page background has no outline (stroke ${bg?.stroke?.swatch})`);
const rp = await call('render_pages', { input_path: fo.designcraft?.path ?? '', pages: '1-2', max_side: 400, save_dir: join(out, 'render') });
check(rp.success && rp._imgs === 2 && rp.saved?.length === 2 && rp.saved.every((f) => existsSync(f)), 'render_pages: 2 previews saved as PNG');

// ---- edit_document: find/change, font replace, new image, added page and item
const imgFrame = p1?.items?.find((x) => /graphic|image|rectangle/i.test(x.kind) && x.bounds[1] > 100 && x.bounds[1] < 200)?.id;
const ed = await call('edit_document', {
  input_path: fo.designcraft?.path ?? '',
  find_replace: [{ find: 'sábado', change: 'domingo' }],
  replace_font: [{ family: 'Arial', to_family: 'Georgia' }],
  ...(imgFrame ? { replace_images: [{ frame: imgFrame, path: join(src, 'persona1.png'), fit: 'fit' }] } : {}),
  add_pages: 1,
  items: [{ type: 'text', page: 3, text: 'Página nueva', size: 24 }],
  formats: ['designcraft', 'pdf'],
});
const eo = Object.fromEntries((ed.outputs ?? []).map((o) => [o.format, o]));
check(ed.success && ed.changes?.[0]?.changed === 1 && ed.pages === 3 && isPdf(eo.pdf?.path), `edit_document: 1 change, 3 pages, image frame ${imgFrame}`);
const info2 = await call('get_document_info', { input_path: eo.designcraft?.path ?? '' });
check(info2.stories?.some((x) => /domingo/.test(x.preview ?? '')) && !info2.fonts?.some((f) => f.family === 'Arial'), 'edit_document: text changed and Arial replaced in the new file');
const info0 = await call('get_document_info', { input_path: fo.designcraft?.path ?? '' });
check(info0.stories?.some((x) => /sábado/.test(x.preview ?? '')) && info0.page_count === 2, 'edit_document: the original document is untouched');

// ---- export_document: folder of documents → PDF/X-4 + JPG + EPUB + HTML + package
const ex = await call('export_document', { input_dir: join(out, 'flyer'), formats: ['pdf', 'jpg', 'epub', 'html', 'package'], pdf_standard: 'x4', include_bleed: true, crop_marks: true, export_pages: '1', output_dir: join(out, 'export'), dpi: 50 });
const exf = ex.results?.flatMap((r) => r.outputs) ?? [];
check(ex.success && ex.exported === 3 && exf.filter((o) => o.format === 'pdf').every((o) => isPdf(o.path)), `export_document: ${ex.exported} documents (.designcraft, _edit, .idml) → PDF/X-4 page 1`);
check(['jpg', 'epub', 'html', 'package'].every((f) => exf.some((o) => o.format === f && existsSync(o.path))), 'export_document: JPG, EPUB, HTML and package written');

// ---- data_merge: one page per record with an image field, and labels several per page
const dm = await call('data_merge', {
  csv_path: csvPath,
  width: 300, height: 200, margins: 10,
  items: [
    { type: 'image', field: 'Foto', x: 10, y: 10, width: 80, height: 80, fit: 'fit' },
    { type: 'text', x: 100, y: 20, width: 190, height: 30, text: '<<Nombre>>', size: 20, font_style: 'Bold' },
    { type: 'text', x: 100, y: 55, width: 190, height: 20, text: '<<Cargo>>', size: 12, color: '#666666' },
  ],
  formats: ['pdf', 'designcraft'],
  name: 'Gafetes',
  output_dir: join(out, 'merge'),
});
check(dm.success && dm.records === 3 && dm.pages === 3 && !dm.missing_images?.length && dm._imgs === 1, `data_merge: ${dm.records} records → ${dm.pages} pages, fields ${dm.fields}`);
const dmi = await call('get_document_info', { input_path: dm.outputs?.find((o) => o.format === 'designcraft')?.path ?? '' });
check(dmi.stories?.some((x) => /Luis Gómez/.test(x.preview ?? '')) && dmi.links?.length >= 3, 'data_merge: merged names and the 3 pictures are in the document');
const labels = await call('data_merge', {
  rows: [{ Ciudad: 'Bogotá' }, { Ciudad: 'Medellín' }, { Ciudad: 'Cali' }, { Ciudad: 'Cartagena' }],
  width: 400, height: 300, margins: 10,
  items: [{ type: 'text', x: 10, y: 10, width: 120, height: 40, text: '<<Ciudad>>', size: 14 }],
  per_page: true,
  formats: ['pdf'],
  name: 'Etiquetas',
  output_dir: join(out, 'merge'),
});
check(labels.success && labels.records === 4 && labels.pages === 1, `data_merge: 4 rows as labels on ${labels.pages} page`);

// ---- catalog / commands
const cc = await call('list_designcraft_catalog', { kind: 'commands', filter: 'table' });
const cp = await call('list_designcraft_catalog', { kind: 'presets' });
const cf = await call('list_designcraft_catalog', { kind: 'fonts', filter: 'Inter, Fuente Inexistente' });
check(cc.count > 20 && JSON.stringify(cp.presets ?? '').includes('A4') && cf.fonts?.[0]?.available === true && cf.fonts?.[1]?.available === false, `catalog: ${cc.count} table commands, ${cp.presets?.length} presets, Inter (bundled) available, a made-up font not`);

const rc = await call('run_designcraft_commands', {
  new_document: { width: 300, height: 200, pages: 1, facingPages: false },
  steps: [
    { id: 'frame.create', params: { spread: 0, rect: [20, 20, 280, 100], content: 'text', text: 'Hola' } },
    { id: 'text.select', params: { story: '$steps[0].story', anchor: 0, focus: 4 } },
    { id: 'type.char', params: { attrs: { size: 40 } } },
    { id: 'get_story', params: { story: '$steps[0].story' } },
  ],
  formats: ['png'],
  output_dir: join(out, 'cmd'),
  preview_page: 1,
});
check(rc.success && rc.completed === 4 && rc.outputs?.[0] && existsSync(rc.outputs[0].path) && rc._imgs === 1, 'run_designcraft_commands: frame, $steps story, formatting → PNG');

const relPath = await call('export_document', { input_path: 'a.designcraft' });
check(!relPath.success && /absolute/.test(relPath.error ?? ''), 'relative paths are rejected');
check(readdirSync(src).length === 5, 'the input folder still holds only the original files');

await client.close();
console.log(`\n${failed ? `${failed} FAILED` : 'ALL PASSED'} in ${((Date.now() - t0) / 1000).toFixed(1)} s · output in ${out}`);
process.exit(failed ? 1 : 0);
