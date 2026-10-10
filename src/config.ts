import { existsSync } from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * An unfilled MCPB user_config placeholder ("${user_config.x}") reaches the process
 * literally when the user left the field empty, so treat it as unset.
 */
export function cleanEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const v = value.trim().replace(/^"(.*)"$/, '$1');
  if (!v || v.includes('${')) return undefined;
  return v;
}

export type Platform = 'win32' | 'darwin' | 'linux';

export function currentPlatform(): Platform {
  return process.platform === 'win32' || process.platform === 'darwin' ? process.platform : 'linux';
}

/** Path helpers of the given platform (lets the tests check every OS from any OS). */
export function pathFor(platform: Platform): path.PlatformPath {
  return platform === 'win32' ? path.win32 : path.posix;
}

export interface DesignCraftInstall {
  platform: Platform;
  /** Where we looked first (DESIGNCRAFT_DIR or the platform default). */
  dir: string;
  cli: string | undefined;
  app: string | undefined;
  searched: string[];
}

/** Executable names of the headless CLI and the desktop app. */
export function exeNames(platform: Platform): { cli: string; app: string[] } {
  if (platform === 'win32') return { cli: 'designcraft-cli.exe', app: ['designcraft.exe'] };
  // macOS: the app binary inside DesignCraft.app is "DesignCraft"; Linux packages install "designcraft"
  return { cli: 'designcraft-cli', app: platform === 'darwin' ? ['DesignCraft', 'designcraft'] : ['designcraft'] };
}

/** Folders DesignCraft installs into on each OS (the official MSI, DMG, deb/rpm and tar.gz layouts). */
export function defaultDirs(platform: Platform, env: NodeJS.ProcessEnv, home = os.homedir()): string[] {
  const p = pathFor(platform);
  if (platform === 'win32') {
    const local = env['LOCALAPPDATA'] || p.join(home, 'AppData', 'Local');
    return [
      p.join(env['ProgramFiles'] || 'C:\\Program Files', 'DesignCraft'),
      p.join(env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'DesignCraft'),
      p.join(local, 'Programs', 'DesignCraft'),
    ];
  }
  if (platform === 'darwin') {
    return [
      '/Applications/DesignCraft.app/Contents/MacOS',
      p.join(home, 'Applications', 'DesignCraft.app', 'Contents', 'MacOS'),
      '/usr/local/bin',
      '/opt/homebrew/bin',
      p.join(home, '.local', 'bin'),
      p.join(home, 'bin'),
    ];
  }
  return ['/usr/bin', '/usr/local/bin', '/opt/designcraft/bin', '/opt/designcraft', p.join(home, '.local', 'bin'), p.join(home, 'bin')];
}

/**
 * Find designcraft-cli and the desktop app.
 *  - DESIGNCRAFT_CLI: the CLI executable itself (wins).
 *  - DESIGNCRAFT_DIR: install folder, one of its executables, a tar.gz root (with bin/) or DesignCraft.app.
 *  - DESIGNCRAFT_APP: the desktop app executable (e.g. an AppImage) when it lives elsewhere.
 *  - otherwise the platform's default folders, then PATH.
 */
export function resolveInstall(
  env: NodeJS.ProcessEnv = process.env,
  exists: (p: string) => boolean = existsSync,
  platform: Platform = currentPlatform(),
  home = os.homedir(),
): DesignCraftInstall {
  const p = pathFor(platform);
  const names = exeNames(platform);
  const dirs: string[] = [];
  const fromEnv = cleanEnv(env['DESIGNCRAFT_DIR']);
  if (fromEnv) {
    let d = fromEnv;
    if (/\.app\/?$/i.test(d)) d = p.join(d, 'Contents', 'MacOS');
    else if (/\.(exe|appimage)$/i.test(d) || /(^|[\\/])(designcraft|designcraft-cli|DesignCraft)$/.test(d)) d = p.dirname(d);
    dirs.push(d, p.join(d, 'bin'));
  }
  dirs.push(...defaultDirs(platform, env, home));
  const sep = platform === 'win32' ? ';' : ':';
  for (const d of (env['PATH'] || env['Path'] || '').split(sep)) if (d) dirs.push(d.replace(/"/g, ''));
  const searched = [...new Set(dirs)];

  const cliEnv = cleanEnv(env['DESIGNCRAFT_CLI']);
  const cli = [cliEnv, ...searched.map((d) => p.join(d, names.cli))].filter((x): x is string => !!x).find((x) => exists(x));

  const appEnv = cleanEnv(env['DESIGNCRAFT_APP']);
  const appDirs = [...(cli ? [p.dirname(cli)] : []), ...searched];
  if (platform === 'darwin') appDirs.unshift('/Applications/DesignCraft.app/Contents/MacOS', p.join(home, 'Applications', 'DesignCraft.app', 'Contents', 'MacOS'));
  const app = [appEnv, ...appDirs.flatMap((d) => names.app.map((n) => p.join(d, n)))]
    .filter((x): x is string => !!x)
    .find((x) => exists(x));

  return { platform, dir: searched[0], cli, app, searched };
}

/** Positive integer from an env var, otherwise the default. */
export function resolveInt(envValue: string | undefined, def: number, max = 86400): number {
  if (!envValue || !/^\d+$/.test(envValue.trim())) return def;
  const n = Number(envValue.trim());
  return n > 0 && n <= max ? n : def;
}

/** Longest single engine call (long documents, big PDFs and data merges can take a while). */
export const COMMAND_TIMEOUT_SEC = resolveInt(process.env['DESIGNCRAFT_MCP_TIMEOUT'], 3600);

/** Control port of the live DesignCraft app (`designcraft --control PORT`). */
export const CONTROL_PORT = resolveInt(cleanEnv(process.env['DESIGNCRAFT_CONTROL_PORT']), 7981, 65535);

/**
 * Folder of this connector's own files (the working folder the desktop app is started from):
 * %APPDATA%\designcraft-mcp-server on Windows, ~/Library/Application Support/designcraft-mcp-server on macOS,
 * $XDG_CONFIG_HOME (or ~/.config)/designcraft-mcp-server on Linux.
 */
export function connectorDir(env: NodeJS.ProcessEnv = process.env, platform: Platform = currentPlatform(), home = os.homedir()): string {
  const p = pathFor(platform);
  if (platform === 'win32') return p.join(env['APPDATA'] || p.join(home, 'AppData', 'Roaming'), 'designcraft-mcp-server');
  if (platform === 'darwin') return p.join(home, 'Library', 'Application Support', 'designcraft-mcp-server');
  return p.join(env['XDG_CONFIG_HOME'] || p.join(home, '.config'), 'designcraft-mcp-server');
}
