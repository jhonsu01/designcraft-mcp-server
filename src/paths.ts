import { copyFileSync, existsSync, renameSync, unlinkSync } from 'fs';
import { Platform, currentPlatform, pathFor } from './config.js';

/**
 * Output path rules:
 *  - explicit path: must be absolute; the extension is added when missing and must match the format;
 *    an existing file is only replaced with overwrite=true.
 *  - no path: in outputDir (default: next to the input) as <input name><suffix>.<ext>, adding _2, _3...
 *    instead of replacing anything.
 */
export function resolveOutputPath(opts: {
  inputPath: string;
  ext: string;
  suffix?: string;
  outputPath?: string;
  outputDir?: string;
  overwrite?: boolean;
  exists?: (p: string) => boolean;
  platform?: Platform;
}): { path: string } | { error: string } {
  const exists = opts.exists ?? existsSync;
  const platform = opts.platform ?? currentPlatform();
  const p = pathFor(platform);
  const same = (a: string, b: string) => sameFile(a, b, platform);
  if (opts.outputPath) {
    if (!p.isAbsolute(opts.outputPath)) return { error: `output_path must be an absolute path: ${opts.outputPath}` };
    const cur = p.extname(opts.outputPath).replace(/^\./, '').toLowerCase();
    let out = opts.outputPath;
    if (!cur) out = `${opts.outputPath}.${opts.ext}`;
    else if (!sameExt(cur, opts.ext)) return { error: `output_path has extension ".${cur}" but the format writes ".${opts.ext}".` };
    if (exists(out) && !opts.overwrite) return { error: `File already exists (set overwrite: true to replace it): ${out}` };
    if (same(out, opts.inputPath)) return { error: 'output_path must be different from the input file.' };
    return { path: out };
  }
  const dir = opts.outputDir ?? p.dirname(opts.inputPath);
  if (!p.isAbsolute(dir)) return { error: `output_dir must be an absolute path: ${dir}` };
  const stem = stemOf(opts.inputPath, platform) + (opts.suffix ?? '');
  let candidate = p.join(dir, `${stem}.${opts.ext}`);
  for (let i = 2; (exists(candidate) && !opts.overwrite) || same(candidate, opts.inputPath); i++) {
    candidate = p.join(dir, `${stem}_${i}.${opts.ext}`);
  }
  return { path: candidate };
}

export function sameExt(a: string, b: string): boolean {
  const norm = (e: string) => ({ aif: 'aiff', tif: 'tiff', jpeg: 'jpg', m4v: 'mp4' })[e.toLowerCase()] ?? e.toLowerCase();
  return norm(a) === norm(b);
}

/** Windows and (by default) macOS file systems ignore case; Linux does not. */
export function sameFile(a: string, b: string, platform: Platform = currentPlatform()): boolean {
  const p = pathFor(platform);
  const ra = p.resolve(a);
  const rb = p.resolve(b);
  return platform === 'linux' ? ra === rb : ra.toLowerCase() === rb.toLowerCase();
}

/** File name of a path without its extension. */
export function stemOf(p: string, platform: Platform = currentPlatform()): string {
  return pathFor(platform).basename(p).replace(/\.[^.]+$/, '');
}

/** Windows paths go to the engine with forward slashes (it accepts both); POSIX paths unchanged. */
export function toEnginePath(p: string, platform: Platform = currentPlatform()): string {
  return platform === 'win32' ? p.replace(/\\/g, '/') : p;
}

/** Rename, or copy + delete across drives; replaces an existing target (callers check overwrite first). */
export function moveFile(src: string, dst: string): void {
  if (existsSync(dst)) unlinkSync(dst);
  try {
    renameSync(src, dst);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EXDEV') throw e;
    copyFileSync(src, dst);
    unlinkSync(src);
  }
}
