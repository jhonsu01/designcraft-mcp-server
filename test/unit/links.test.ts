import { mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';
import { fileUrl, outputFiles, withFileLinks } from '../../src/links.js';

describe('output file links', () => {
  const dir = mkdtempSync(join(tmpdir(), 'links-'));
  const sub = join(dir, 'Carpeta con espacios (prueba)');
  mkdirSync(sub);
  const out = join(sub, 'Rúbrica de evaluación (v1.0).pdf');
  const input = join(sub, 'original.pdf');
  writeFileSync(out, 'x');
  writeFileSync(input, 'x');

  it('makes file:/// URLs a markdown link can always hold', () => {
    const url = fileUrl(out);
    expect(url.startsWith('file:///')).toBe(true);
    expect(url).not.toMatch(/[ ()]/);
    expect(url).toContain('%28v1.0%29');
    expect(fileURLToPath(url)).toBe(out);
  });

  it('links outputs only: existing paths, not inputs or missing files', () => {
    const r = { input, outputs: [{ path: out, format: 'pdf' }, { path: join(dir, 'missing.pdf') }], folder: sub, note: 'text' };
    expect(outputFiles(r).sort()).toEqual([out, sub].sort());
  });

  it('adds files_markdown with one link per output, folders ending in /', () => {
    const r = withFileLinks({ success: true, outputs: [{ path: out }], folder: sub }) as any;
    const lines = r.files_markdown.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(`- [Rúbrica de evaluación (v1.0).pdf](${fileUrl(out)})`);
    expect(lines[1]).toBe(`- [Carpeta con espacios (prueba)/](${fileUrl(sub)})`);
    expect(withFileLinks({ success: false, error: 'x' })).toEqual({ success: false, error: 'x' });
  });
});
