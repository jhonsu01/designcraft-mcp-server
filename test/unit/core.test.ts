import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { cleanEnv, connectorDir, resolveInstall, resolveInt } from '../../src/config.js';
import { resolveOutputPath, sameFile } from '../../src/paths.js';
import { substitute } from '../../src/tools/advanced.js';
import { OUTPUTS, collectInputs, freeFolder, nameStem, parsePages, toPt } from '../../src/tools/common.js';
import { itemSchema, styleSchema, toCsv } from '../../src/tools/layout.js';

describe('config', () => {
  it('treats unfilled MCPB placeholders as unset', () => {
    expect(cleanEnv('${user_config.designcraft_dir}')).toBeUndefined();
    expect(resolveInt('${user_config.control_port}', 7981, 65535)).toBe(7981);
  });
  it('Windows: install folder, an .exe inside it, or nothing', () => {
    const exists = (p: string) => /^D:\\DC\\designcraft(-cli)?\.exe$/i.test(p);
    const r = resolveInstall({ DESIGNCRAFT_DIR: 'D:\\DC' }, exists, 'win32', 'C:\\Users\\u');
    expect([r.cli, r.app]).toEqual(['D:\\DC\\designcraft-cli.exe', 'D:\\DC\\designcraft.exe']);
    const pf = (p: string) => p === 'C:\\Program Files\\DesignCraft\\designcraft-cli.exe';
    expect(resolveInstall({ ProgramFiles: 'C:\\Program Files' }, pf, 'win32').cli).toBe('C:\\Program Files\\DesignCraft\\designcraft-cli.exe');
  });
  it('Linux: deb/rpm, tar.gz root, AppImage app', () => {
    const deb = new Set(['/usr/bin/designcraft-cli', '/usr/bin/designcraft']);
    const r = resolveInstall({}, (p) => deb.has(p), 'linux', '/home/u');
    expect([r.cli, r.app]).toEqual(['/usr/bin/designcraft-cli', '/usr/bin/designcraft']);
    const tar = new Set(['/opt/x/designcraft-0.5.0-linux-x86_64/bin/designcraft-cli']);
    expect(resolveInstall({ DESIGNCRAFT_DIR: '/opt/x/designcraft-0.5.0-linux-x86_64' }, (p) => tar.has(p), 'linux', '/home/u').cli).toBe('/opt/x/designcraft-0.5.0-linux-x86_64/bin/designcraft-cli');
    const img = '/home/u/designcraft-0.5.0-linux-x86_64.AppImage';
    expect(resolveInstall({ DESIGNCRAFT_APP: img }, (p) => p === img, 'linux', '/home/u').app).toBe(img);
  });
  it('macOS: DesignCraft.app plus the separate CLI zip', () => {
    const files = new Set(['/Applications/DesignCraft.app/Contents/MacOS/DesignCraft', '/usr/local/bin/designcraft-cli']);
    const r = resolveInstall({}, (p) => files.has(p), 'darwin', '/Users/u');
    expect([r.cli, r.app]).toEqual(['/usr/local/bin/designcraft-cli', '/Applications/DesignCraft.app/Contents/MacOS/DesignCraft']);
    expect(connectorDir({}, 'darwin', '/Users/u')).toBe('/Users/u/Library/Application Support/designcraft-mcp-server');
  });
});

describe('paths, units and formats', () => {
  it('never overwrites, POSIX case-sensitive', () => {
    const exists = (p: string) => p === 'D:\\d\\flyer.pdf';
    expect(resolveOutputPath({ inputPath: 'D:\\d\\flyer.designcraft', ext: 'pdf', exists, platform: 'win32' })).toEqual({ path: 'D:\\d\\flyer_2.pdf' });
    expect(resolveOutputPath({ inputPath: '/d/a.idml', ext: 'pdf', outputPath: '/d/out.png', platform: 'linux' })).toHaveProperty('error');
    expect(sameFile('/a/A.pdf', '/a/a.pdf', 'linux')).toBe(false);
  });
  it('gives each package a fresh folder', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dc-unit-'));
    mkdirSync(join(dir, 'flyer_package'));
    expect(freeFolder(dir, 'flyer_package')).toBe(join(dir, 'flyer_package_2'));
    expect(freeFolder(dir, 'flyer_package', true)).toBe(join(dir, 'flyer_package'));
  });
  it('keeps dots in output names, dropping only a real extension', () => {
    expect(nameStem('prueba-1.0.1')).toBe('prueba-1.0.1');
    expect(nameStem('menu.2026')).toBe('menu.2026');
    expect(nameStem('flyer.pdf')).toBe('flyer');
    expect(nameStem('Catálogo v2.IDML')).toBe('Catálogo v2');
  });
  it('converts units to points', () => {
    expect(toPt(1, 'in')).toBe(72);
    expect(toPt(25.4, 'mm')).toBeCloseTo(72);
    expect(toPt(96, 'px')).toBe(72);
  });
  it('parses page ranges within the document', () => {
    expect(parsePages('1-3, 5, 9', 6)).toEqual([1, 2, 3, 5]);
    expect(parsePages(undefined, 3)).toEqual([1, 2, 3]);
    expect(() => parsePages('x', 3)).toThrow(/page range/);
  });
  it('knows every export format', () => {
    expect(OUTPUTS.fixed_epub).toBe('epub');
    expect(OUTPUTS.booklet_pdf).toBe('pdf');
  });
  it('collects documents from a folder', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dc-unit-'));
    for (const f of ['b.IDML', 'a.designcraft', 'c.pdf', 'd.txt']) writeFileSync(join(dir, f), 'x');
    expect(collectInputs([], dir).map((p) => p.slice(dir.length + 1))).toEqual(['a.designcraft', 'b.IDML']);
    expect(() => collectInputs(['rel.idml'])).toThrow(/absolute/);
  });
});

describe('layout items', () => {
  it('schemas have no JSON Schema tuples and default the page', () => {
    expect(JSON.stringify(z.toJSONSchema(itemSchema))).not.toContain('prefixItems');
    expect(itemSchema.parse({ type: 'text', text: 'Hola' }).page).toBe(1);
    expect(styleSchema.parse({ name: 'Título', size: 30 }).size).toBe(30);
  });
  it('writes merge rows as quoted CSV', () => {
    expect(toCsv([{ Nombre: 'Ana, P.', Cargo: 'Dice "hola"' }, { Nombre: 'Luis' }])).toBe('Nombre,Cargo\n"Ana, P.","Dice ""hola"""\nLuis,');
  });
});

describe('run_designcraft_commands references', () => {
  it('replaces $steps values', () => {
    expect(substitute({ story: '$steps[0].story', ids: ['$steps[1].ids[0]'], x: '$x' }, [{ story: 4 }, { ids: [7] }])).toEqual({ story: 4, ids: [7], x: '$x' });
    expect(() => substitute('$steps[3].id', [])).toThrow();
  });
});
