// Packs the server as a Codex plugin: <name>-<version>-codex.zip holding one folder <name>/ with
// .codex-plugin/plugin.json, .mcp.json (a local stdio server: node ./dist/bundle.cjs), the bundle, the icon and docs.
// Metadata comes from manifest.json (the .mcpb manifest), so both packages stay in step.
// Usage: npm run build && node scripts/pack-codex.mjs [--to <marketplace>/plugins]
//   --to also copies the plugin folder into a Codex marketplace checkout (replacing <dir>/<name>).
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'fs';
import { dirname, join, relative } from 'path';
import { deflateRawSync } from 'zlib';

const root = join(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf-8'));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
if (manifest.version !== pkg.version) throw new Error(`manifest.json ${manifest.version} != package.json ${pkg.version}`);
if (!existsSync(join(root, 'dist', 'bundle.cjs'))) throw new Error('dist/bundle.cjs is missing: run npm run build first.');

const name = manifest.name;
const stage = join(root, '.tmp', 'codex', name);
rmSync(join(root, '.tmp', 'codex'), { recursive: true, force: true });
mkdirSync(join(stage, '.codex-plugin'), { recursive: true });
mkdirSync(join(stage, 'dist'), { recursive: true });
mkdirSync(join(stage, 'assets'), { recursive: true });

// per-connector Codex listing: package.json "codex" {shortDescription, category, brandColor, defaultPrompt (max 3, <=128 chars)}
const codex = pkg.codex ?? {};
for (const k of ['shortDescription', 'category', 'brandColor', 'defaultPrompt']) if (!codex[k]) throw new Error(`package.json codex.${k} is missing`);
if (codex.defaultPrompt.length > 3 || codex.defaultPrompt.some((t) => t.length > 128)) throw new Error('codex.defaultPrompt: at most 3 prompts of 128 characters');
const PREFIX = name.replace(/-mcp-server$/, '').toUpperCase();

// environment the server reads: install detection, ports, temp folders, user folders
const ENV_VARS = [
  'PATH', 'Path', 'HOME', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA', 'ProgramFiles', 'ProgramFiles(x86)', 'TEMP', 'TMP', 'TMPDIR',
  'SystemRoot', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'DISPLAY', 'WAYLAND_DISPLAY',
  ...Object.keys(manifest.server.mcp_config.env ?? {}),
  `${PREFIX}_APP`, `${PREFIX}_MCP_TIMEOUT`,
];

const plugin = {
  name,
  version: manifest.version,
  description: manifest.description,
  author: { name: manifest.author.name, url: manifest.author.url },
  homepage: manifest.homepage,
  repository: manifest.repository.url.replace(/\.git$/, ''),
  license: manifest.license,
  keywords: manifest.keywords,
  mcpServers: './.mcp.json',
  interface: {
    displayName: manifest.display_name,
    shortDescription: codex.shortDescription,
    longDescription: manifest.long_description,
    developerName: manifest.author.name,
    category: codex.category,
    capabilities: ['Read', 'Write'],
    websiteURL: manifest.homepage,
    privacyPolicyURL: `${manifest.homepage}#safety`,
    termsOfServiceURL: `${manifest.homepage}/blob/main/LICENSE`,
    defaultPrompt: codex.defaultPrompt,
    brandColor: codex.brandColor,
    composerIcon: './assets/icon.png',
    logo: './assets/icon.png',
    screenshots: [],
  },
};
const mcp = {
  mcpServers: {
    [name.replace(/-mcp-server$/, '')]: {
      command: 'node',
      args: ['./dist/bundle.cjs'],
      cwd: '.',
      env_vars: [...new Set(ENV_VARS)],
      startup_timeout_sec: 60,
      tool_timeout_sec: 3600,
    },
  },
};
writeFileSync(join(stage, '.codex-plugin', 'plugin.json'), JSON.stringify(plugin, null, 2) + '\n');
writeFileSync(join(stage, '.mcp.json'), JSON.stringify(mcp, null, 2) + '\n');
copyFileSync(join(root, 'dist', 'bundle.cjs'), join(stage, 'dist', 'bundle.cjs'));
copyFileSync(join(root, 'icon.png'), join(stage, 'assets', 'icon.png'));
// the bundle reads ../package.json for its version
writeFileSync(join(stage, 'package.json'), JSON.stringify({ name, version: pkg.version, description: pkg.description, license: pkg.license, private: true }, null, 2) + '\n');
for (const f of ['LICENSE', 'README.md']) copyFileSync(join(root, f), join(stage, f));

// ---- minimal ZIP writer (deflate, UTF-8 names)
const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const walk = (dir) => readdirSync(dir).sort().flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
const files = walk(stage);
const locals = [];
const centrals = [];
let offset = 0;
const now = new Date();
const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
for (const f of files) {
  const nameBuf = Buffer.from(`${name}/${relative(stage, f).split('\\').join('/')}`, 'utf-8');
  const data = readFileSync(f);
  const comp = deflateRawSync(data, { level: 9 });
  const crc = crc32(data);
  const head = Buffer.alloc(30);
  head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(0x0800, 6); head.writeUInt16LE(8, 8);
  head.writeUInt16LE(dosTime, 10); head.writeUInt16LE(dosDate, 12); head.writeUInt32LE(crc, 14);
  head.writeUInt32LE(comp.length, 18); head.writeUInt32LE(data.length, 22); head.writeUInt16LE(nameBuf.length, 26);
  locals.push(head, nameBuf, comp);
  const cen = Buffer.alloc(46);
  cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(0x0800, 8); cen.writeUInt16LE(8, 10);
  cen.writeUInt16LE(dosTime, 12); cen.writeUInt16LE(dosDate, 14); cen.writeUInt32LE(crc, 16);
  cen.writeUInt32LE(comp.length, 20); cen.writeUInt32LE(data.length, 24); cen.writeUInt16LE(nameBuf.length, 28);
  cen.writeUInt32LE(offset, 42);
  centrals.push(cen, nameBuf);
  offset += head.length + nameBuf.length + comp.length;
}
const cenSize = centrals.reduce((n, b) => n + b.length, 0);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(cenSize, 12); end.writeUInt32LE(offset, 16);
const out = join(root, `${name}-${manifest.version}-codex.zip`);
writeFileSync(out, Buffer.concat([...locals, ...centrals, end]));
console.log(`${out} (${files.length} files, ${statSync(out).size} bytes)`);
for (const f of files) console.log(`  ${name}/${relative(stage, f).split('\\').join('/')}`);

const toIdx = process.argv.indexOf('--to');
if (toIdx > 0) {
  const dest = join(process.argv[toIdx + 1], name);
  rmSync(dest, { recursive: true, force: true });
  cpSync(stage, dest, { recursive: true });
  console.log(`copied to ${dest}`);
}
