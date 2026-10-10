import { execFile, spawn } from 'child_process';
import { mkdirSync } from 'fs';
import * as net from 'net';
import * as path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { COMMAND_TIMEOUT_SEC, CONTROL_PORT, connectorDir, resolveInstall } from '../config.js';
import { DesignCraftSession, runCli, withSession } from '../engine.js';
import {
  DOCUMENTS, IMAGES, OUTPUTS, READ, collectInputs, errorResult, exportAll, exportOptionsSchema, formatsSchema, json, preview, previewScale, withPreview,
} from './common.js';

interface CommandDef {
  id: string;
  label: string;
  menu?: string[];
  params?: string | null;
}

let commandCache: CommandDef[] | undefined;
async function engineCommands(s?: DesignCraftSession): Promise<CommandDef[]> {
  if (!commandCache) commandCache = ((await (s ? s.json('list_commands', {}) : withSession((x) => x.json('list_commands', {})))) as { commands: CommandDef[] }).commands;
  return commandCache;
}

export function controlPortOpen(port = CONTROL_PORT, timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = net.connect({ host: '127.0.0.1', port });
    const done = (ok: boolean) => {
      sock.destroy();
      resolve(ok);
    };
    sock.setTimeout(timeoutMs, () => done(false));
    sock.once('connect', () => done(true));
    sock.once('error', () => done(false));
  });
}

function appRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      execFile('tasklist', ['/FI', 'IMAGENAME eq designcraft.exe', '/NH'], { windowsHide: true }, (err, out) => resolve(!err && /designcraft\.exe/i.test(out)));
    } else {
      // exact process name: never matches our own designcraft-cli engines
      execFile('pgrep', ['-xi', 'designcraft'], (err, out) => resolve(!err && out.trim().length > 0));
    }
  });
}

/** Replace "$steps[N].path.to[0]" with a value returned by step N (0-based), e.g. "$steps[0].story". */
export function substitute(value: unknown, steps: unknown[] = []): unknown {
  if (typeof value === 'string') {
    const st = /^\$steps\[(\d+)\]((?:\.[A-Za-z_]\w*|\[\d+\])*)$/.exec(value);
    if (st) {
      let cur: unknown = steps[Number(st[1])];
      for (const part of st[2].match(/\.[A-Za-z_]\w*|\[\d+\]/g) ?? []) {
        const key = part.startsWith('.') ? part.slice(1) : Number(part.slice(1, -1));
        cur = cur && typeof cur === 'object' ? (cur as Record<string | number, unknown>)[key] : undefined;
      }
      if (cur === undefined) throw new Error(`${value} is not available (step results so far: ${steps.length}).`);
      return cur;
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => substitute(v, steps));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, substitute(v, steps)]));
  return value;
}

const ENGINE_TOOLS = new Set(['inspect_document', 'get_story', 'set_story_text', 'new_document', 'place_image', 'render_page']);

export function registerAdvancedTools(server: McpServer): void {
  server.registerTool(
    'list_designcraft_catalog',
    {
      title: 'List commands, presets, fonts, formats',
      description:
        'What DesignCraft can do: commands (444 engine commands with parameters, for run_designcraft_commands), presets (page sizes), fonts ' +
        '(whether families are available, bundled or installed, or the fonts a document uses), formats (open and export).',
      inputSchema: {
        kind: z.enum(['commands', 'presets', 'fonts', 'formats']),
        filter: z.string().optional().describe('Case-insensitive text to match. kind=fonts: comma-separated families to check ("Georgia, Inter").'),
        input_path: z.string().optional().describe('kind=fonts: list the fonts this .designcraft / .idml uses (missing ones first).'),
      },
      annotations: READ,
    },
    async (args) => {
      try {
        const f = (args.filter ?? '').toLowerCase();
        const match = (...parts: unknown[]) => !f || parts.some((p) => String(p ?? '').toLowerCase().includes(f));
        if (args.kind === 'formats') return json({ success: true, open: DOCUMENTS, place: IMAGES, data: ['csv', 'tsv', 'txt'], export: Object.keys(OUTPUTS) });
        return json(
          await withSession(async (s) => {
            if (args.kind === 'commands') {
              const l = (await engineCommands(s)).filter((c) => match(c.id, c.label, (c.menu ?? []).join(' ')));
              return { success: true, count: l.length, commands: l.slice(0, 300).map((c) => ({ id: c.id, label: c.label, params: c.params ?? null })), truncated: l.length > 300 };
            }
            if (args.kind === 'presets') {
              const l = ((await s.cmd('file.presets', {})) ?? []) as any[];
              return { success: true, presets: l.filter((p) => match(p.name, p.category)) };
            }
            // fonts: the ones a document uses, or whether the families asked for are available (bundled or installed)
            if (args.input_path) {
              const [file] = collectInputs([args.input_path], undefined, DOCUMENTS);
              await s.json('open_document', { path: file });
              return { success: true, document: file, fonts: await s.cmd('font.list', {}) };
            }
            const wanted = (args.filter ?? '').split(',').map((x) => x.trim()).filter(Boolean);
            if (!wanted.length) throw new Error('fonts: give filter with one or more family names ("Georgia, Inter") to check, or input_path for the fonts a document uses.');
            await s.json('new_document', {});
            const r = await s.cmd('frame.create', { spread: 0, rect: [0, 0, 400, 400], content: 'text', text: wanted.join('\n') });
            let at = 0;
            for (const fam of wanted) {
              const len = Buffer.byteLength(fam);
              await s.cmd('text.select', { story: r.story, anchor: at, focus: at + len });
              await s.cmd('type.char', { attrs: { fontFamily: fam } });
              at += len + 1;
            }
            const l = ((await s.cmd('font.list', {})) ?? []) as any[];
            return {
              success: true,
              fonts: wanted.map((fam) => {
                const f = l.find((x) => String(x.family).toLowerCase() === fam.toLowerCase());
                return { family: fam, available: !!f && !f.missing, source: f?.source ?? null };
              }),
            };
          }),
        );
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'run_designcraft_commands',
    {
      title: 'Run DesignCraft engine commands',
      description:
        'Advanced: run any of DesignCraft\'s 444 engine commands in order (frame.*, text.*, type.*, style.*, table.*, object.*, transform.*, ' +
        'layout.*, swatch.*, find.*, data.*, links.*, preflight.*, book.*...) plus the engine tools inspect_document / get_story / ' +
        'set_story_text / new_document / place_image / render_page (step id = the tool name), on a new document or an opened .designcraft / ' +
        '.idml, then export. Coordinates are points in spread space. Parameters can use "$steps[N].field" for a value returned by step N ' +
        '(0-based), e.g. "$steps[0].story".',
      inputSchema: {
        steps: z.array(z.object({ id: z.string(), params: z.record(z.string(), z.any()).optional() })).max(1000).default([]),
        stop_on_error: z.boolean().default(true),
        open_path: z.string().optional().describe('Absolute .designcraft / .idml to open first (never saved over; export designcraft for a copy).'),
        new_document: z.record(z.string(), z.any()).optional().describe('new_document parameters when there is no open_path, e.g. {"preset":"A4","pages":2}.'),
        formats: formatsSchema.optional().describe('Export the result (needs output_dir or output_path).'),
        name: z.string().default('designcraft'),
        output_dir: z.string().optional(),
        output_path: z.string().optional(),
        overwrite: z.boolean().default(false),
        ...exportOptionsSchema,
        preview_page: z.number().int().min(1).optional().describe('Return a preview of this page.'),
        live: z.boolean().default(false).describe(`Drive the open DesignCraft app (control port ${CONTROL_PORT}) instead of a headless engine.`),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    },
    async (args) => {
      try {
        if (args.live && !(await controlPortOpen())) throw new Error(`DesignCraft is not listening on port ${CONTROL_PORT}: call open_in_designcraft with control=true first.`);
        const dir = args.output_path ? path.dirname(args.output_path) : args.output_dir;
        if (args.formats?.length && (!dir || !path.isAbsolute(dir))) throw new Error('Exporting needs an absolute output_dir or output_path.');
        return await withSession(
          async (s) => {
            if (args.open_path) {
              const [file] = collectInputs([args.open_path], undefined, DOCUMENTS);
              await s.json('open_document', { path: file });
            } else if (!args.live) await s.json('new_document', args.new_document ?? {});
            const values: unknown[] = [];
            const results: Record<string, unknown>[] = [];
            let failed = 0;
            for (const step of args.steps) {
              try {
                const params = substitute(step.params ?? {}, values) as Record<string, unknown>;
                const out = ENGINE_TOOLS.has(step.id) ? await s.json(step.id, params) : await s.cmd(step.id, params);
                values.push(out);
                results.push({ id: step.id, ok: true, result: out });
              } catch (e) {
                failed++;
                values.push(undefined);
                results.push({ id: step.id, ok: false, error: e instanceof Error ? e.message : String(e) });
                if (args.stop_on_error) break;
              }
            }
            let outputs: unknown[] | undefined;
            if (args.formats?.length && !failed) outputs = await exportAll(s, { stemSource: path.join(dir!, args.name), name: args.name, suffix: '', output_dir: dir, output_path: args.output_path, overwrite: args.overwrite }, args.formats, args);
            const img = args.preview_page ? await preview(s, args.preview_page - 1, await previewScale(s, 900)).catch(() => undefined) : undefined;
            return withPreview({ success: !failed, completed: results.length - failed, failed_steps: failed, results, ...(outputs ? { outputs } : {}) }, [img], !!failed);
          },
          args.live ? String(CONTROL_PORT) : undefined,
        );
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'open_in_designcraft',
    {
      title: 'Open in DesignCraft',
      description:
        'Open .designcraft or .idml documents in the DesignCraft desktop app for manual editing. With control=true the app also starts its ' +
        'loopback-only control channel so run_designcraft_commands live=true can drive it (the channel has no password: close the app when done).',
      inputSchema: {
        paths: z.array(z.string()).max(50).default([]).describe('Absolute .designcraft / .idml files.'),
        control: z.boolean().default(false),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async (args) => {
      try {
        const files = args.paths.length ? collectInputs(args.paths, undefined, DOCUMENTS) : [];
        const install = resolveInstall();
        if (!install.app) throw new Error('DesignCraft desktop app not found. Set DESIGNCRAFT_DIR (or DESIGNCRAFT_APP).');
        const extra = args.control && !(await controlPortOpen()) ? ['--control', String(CONTROL_PORT)] : [];
        // run it from this connector's folder: GPU drivers drop log folders into the working directory
        const cwd = connectorDir();
        mkdirSync(cwd, { recursive: true });
        const child = spawn(install.app, [...extra, ...files], { cwd, detached: true, stdio: 'ignore', windowsHide: false });
        child.on('error', () => undefined);
        child.unref();
        let listening: boolean | undefined;
        if (extra.length) {
          const deadline = Date.now() + 20_000;
          while (!(listening = await controlPortOpen()) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 500));
          if (!listening) throw new Error(`DesignCraft started but is not listening on port ${CONTROL_PORT} after 20 s (it may have closed). Start it by hand with: designcraft --control ${CONTROL_PORT}`);
        }
        return json({ success: true, app: install.app, opened: files, ...(extra.length || args.control ? { control_port: CONTROL_PORT, listening: listening ?? true } : {}) });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.registerTool(
    'get_designcraft_status',
    {
      title: 'DesignCraft status',
      description: 'Check the DesignCraft installation: platform, executables, version, engine commands, export formats, whether the app is running / listening for control.',
      inputSchema: {},
      annotations: READ,
    },
    async () => {
      const install = resolveInstall();
      const status: Record<string, unknown> = { ready: !!install.cli, platform: `${install.platform} ${process.arch}`, install_dir: install.dir, cli: install.cli ?? null, app: install.app ?? null };
      try {
        if (!install.cli) throw new Error(`designcraft-cli not found (searched ${install.searched.length} folders). Install DesignCraft or set DESIGNCRAFT_DIR / DESIGNCRAFT_CLI.`);
        status['version'] = (await runCli(['--version'])).split('\n')[0].trim();
        status['commands'] = (await engineCommands()).length;
        status['app_running'] = await appRunning();
        status['control_port'] = CONTROL_PORT;
        status['control_listening'] = await controlPortOpen();
        status['export_formats'] = Object.keys(OUTPUTS);
        status['timeout_sec'] = COMMAND_TIMEOUT_SEC;
        return json(status);
      } catch (e) {
        return json({ ...status, ready: false, error: e instanceof Error ? e.message : String(e) }, true);
      }
    },
  );
}
