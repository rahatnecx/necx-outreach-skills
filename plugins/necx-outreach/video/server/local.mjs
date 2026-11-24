// NECX Video, local: the connector the plugin starts automatically on the
// user's computer (Claude Code, Claude Desktop, Cowork). MCP over stdio with no
// npm dependencies, so it starts instantly; the video tools (Remotion) install
// in the background on first run. Videos are saved to a folder on this computer.
//
// Started by server/start.sh (finds or downloads Node) from the plugin's .mcp.json.
// Env (from the plugin settings):
//   ELEVENLABS_API_KEY, ELEVENLABS_VOICE   narration (else ~/.config/necx-outreach/voice.env,
//                                          else the macOS voice, else captions only)
//   NECX_VIDEO_OUT                         where videos go (default ~/NECX Outreach Videos)
// stdout carries the protocol only; every log goes to stderr.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath, pathToFileURL } from "node:url";
import { P, catalogText, createRunner } from "./jobs.mjs";

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const log = (...a) => console.error("[necx-video]", ...a);
// plugin settings left empty can arrive as a literal "${user_config.x}"
const setting = (v) => (v && !/^\$\{.*\}$/.test(v.trim()) ? v.trim() : "");

const HOME = os.homedir();
const OUT = path.resolve(setting(process.env.NECX_VIDEO_OUT).replace(/^~(?=$|\/)/, HOME) || path.join(HOME, "NECX Outreach Videos"));
const STATE = path.join(HOME, ".necx-outreach");
const VOICE_ENV = path.join(HOME, ".config", "necx-outreach", "voice.env");
mkdirSync(OUT, { recursive: true });

// ---- voice: re-read each time, so a key saved mid-session is picked up -----------
function savedKey() {
  if (!existsSync(VOICE_ENV)) return {};
  const t = readFileSync(VOICE_ENV, "utf8");
  return { key: t.match(/^ELEVENLABS_API_KEY=(.+)$/m)?.[1]?.trim(), voiceId: t.match(/^ELEVENLABS_VOICE=(.+)$/m)?.[1]?.trim() };
}
function voice() {
  const key = setting(process.env.ELEVENLABS_API_KEY) || savedKey().key;
  const voiceId = setting(process.env.ELEVENLABS_VOICE) || savedKey().voiceId;
  if (key) return { provider: "elevenlabs", key, voiceId };
  return { provider: P.hasSay ? "say" : "none" };
}
const fallback = () => ({ provider: P.hasSay ? "say" : "none" });
const SETUP_HINT = "To use the real NECX voice, call setup_voice: it opens a private page in the browser to enter the ElevenLabs key (never paste the key into the chat).";

// ---- first run: install the video tools, then Remotion's headless Chrome ----------
// Remotion keeps its Chrome under the working directory: run from the plugin's
// video folder so it never lands in the user's project.
process.chdir(HERE);
// a download cut short (Claude closed mid-way) leaves a lock and a partial zip: start it over
try {
  const dl = path.join(HERE, "node_modules/.remotion/chrome-headless-shell");
  const lock = path.join(dl, "download.lock");
  if (existsSync(lock) && Date.now() - statSync(lock).mtimeMs > 3 * 60 * 1000) rmSync(dl, { recursive: true, force: true });
} catch {}
let depsState = "checking";
let depsError = "";
let depsStep = "";
function npmInstall() {
  return new Promise((resolve, reject) => {
    depsStep = "installing the video tools (one time, about a minute)";
    log(depsStep);
    const npm = path.join(path.dirname(process.execPath), process.platform === "win32" ? "npm.cmd" : "npm");
    const child = spawn(existsSync(npm) ? npm : "npm", ["install", "--no-audit", "--no-fund", "--omit=dev"], {
      cwd: HERE,
      stdio: ["ignore", "ignore", "pipe"],
      env: { ...process.env, PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH ?? ""}` },
    });
    let err = "";
    child.stderr.on("data", (d) => (err = (err + d).slice(-2000)));
    child.on("error", (e) => reject(e));
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(err.trim().split("\n").slice(-3).join(" ") || `npm exited ${code}`))));
  });
}
const deps = (async () => {
  if (!existsSync(path.join(HERE, "node_modules/remotion"))) {
    depsState = "installing";
    await npmInstall();
  }
  const { ensureBrowser } = await import(pathToFileURL(path.join(HERE, "node_modules/@remotion/renderer/dist/index.js")).href);
  depsState = "installing";
  depsStep = "downloading the video renderer (one time, about 110 MB)";
  let last = -1;
  await ensureBrowser({
    onBrowserDownload: () => {
      log(depsStep);
      return {
        version: null,
        onProgress: ({ percent }) => {
          const p = Math.floor(percent * 10);
          if (p !== last) depsStep = `downloading the video renderer (one time): ${(last = p) * 10}%`;
        },
      };
    },
  });
  depsState = "ready";
  depsStep = "";
  log("video tools ready");
})().catch((e) => {
  depsState = "failed";
  depsError = String(e.message ?? e).slice(0, 400);
  log(`setup failed: ${depsError}`);
  throw e;
});
deps.catch(() => {});

const runner = createRunner({
  jobsDir: path.join(STATE, "jobs"),
  slugFor: (v) => v.videoId,
  videoDir: (slug) => path.join(OUT, slug),
  linksFor: (slug) => {
    const dir = path.join(OUT, slug);
    return { watch: pathToFileURL(path.join(dir, "index.html")).href, mp4: path.join(dir, "video.mp4"), thumbnail: path.join(dir, "thumbnail.jpg"), gif: path.join(dir, "preview.gif") };
  },
  voice,
  fallback,
  ready: () => deps,
  log,
});

// ---- voice setup page: the key goes browser → this computer, never through the chat --
let setupServer = null;
function openInBrowser(url) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    const child = spawn(cmd, args, { stdio: "ignore", detached: true });
    child.on("error", () => {}); // no browser opener: the URL is in the tool result anyway
    child.unref();
    return true;
  } catch {
    return false;
  }
}
const page = (body) => `<!doctype html><html><head><meta charset="utf-8"><title>NECX Video · voice</title><style>body{font-family:system-ui,-apple-system,sans-serif;background:#172631;color:#e9f2f6;display:grid;place-items:center;min-height:100vh;margin:0}main{max-width:460px;padding:32px;background:#22394a;border-radius:16px}h1{margin-top:0;font-size:22px}input{width:100%;padding:12px;border-radius:10px;border:1px solid #31A3B6;background:#0c141a;color:#fff;font-size:15px;box-sizing:border-box;margin:6px 0 14px}button{padding:12px 22px;border:0;border-radius:999px;background:#31A3B6;color:#172631;font-weight:700;font-size:15px;cursor:pointer}small{color:#9fb6c2}</style></head><body><main>${body}</main></body></html>`;
async function startSetup() {
  if (setupServer) return setupServer.url;
  const token = randomBytes(16).toString("hex");
  const srv = http.createServer(async (req, res) => {
    const u = new URL(req.url, "http://127.0.0.1");
    if (u.pathname !== `/${token}`) {
      res.writeHead(404);
      return res.end();
    }
    if (req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(page(`<h1>NECX Video: narration voice</h1><p>Paste your ElevenLabs API key (elevenlabs.io → Profile → API keys). It's checked with ElevenLabs and saved only on this computer.</p><form method="post"><label>API key<input name="key" type="password" autocomplete="off" required></label><label>Voice ID <small>(optional; empty = the NECX default voice)</small><input name="voice" autocomplete="off"></label><button>Save</button></form>`));
    }
    let body = "";
    for await (const c of req) body += c;
    const form = new URLSearchParams(body);
    const key = (form.get("key") ?? "").trim();
    const vid = (form.get("voice") ?? "").trim();
    const c = /^[A-Za-z0-9_-]{16,128}$/.test(key) ? await P.credits(key) : { error: "that doesn't look like an API key" };
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    if (!c || c.error) return res.end(page(`<h1>Not saved</h1><p>ElevenLabs didn't accept that key (${c?.error ?? "no answer"}).</p><p><a style="color:#7fd8e6" href="/${token}">Try again</a></p>`));
    mkdirSync(path.dirname(VOICE_ENV), { recursive: true, mode: 0o700 });
    writeFileSync(VOICE_ENV, `# source: NECX Video setup page\nELEVENLABS_API_KEY=${key}\n${/^[A-Za-z0-9]{8,64}$/.test(vid) ? `ELEVENLABS_VOICE=${vid}\n` : ""}`, { mode: 0o600 });
    chmodSync(VOICE_ENV, 0o600);
    res.end(page(`<h1>Saved ✓</h1><p>${c.left.toLocaleString()} ElevenLabs characters left (a video uses about 900–1,400). You can close this tab and go back to Claude.</p>`));
    setTimeout(() => {
      srv.close();
      setupServer = null;
    }, 1000);
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${srv.address().port}/${token}`;
  setupServer = { srv, url };
  setTimeout(() => {
    srv.close();
    if (setupServer?.srv === srv) setupServer = null;
  }, 15 * 60 * 1000).unref();
  return url;
}

// ---- tools -------------------------------------------------------------------------
const PLAN = { type: "object", description: "The video plan: { sender, defaults?, videos: [{ videoId, persona, recipient: {firstName, lastName, title, org}, scenes: [...], sources }] }. One different script per person.", additionalProperties: true };
const TOOLS = [
  { name: "list_screens", description: "The real VS360 screens a video can show, with ids, modules and verified default copy. Read before choosing `screen` scenes. Optional module filter: dashboard, cases, referrals, hotline, shelters, reports, voca, hud, fvpsa, stop, hhsc, vclg, access, calendar, notes, drive, network, services.", inputSchema: { type: "object", properties: { module: { type: "string" } } }, annotations: { readOnlyHint: true } },
  { name: "preview_plan", description: "Validates a per-person video plan without rendering: blocking problems (including two contacts sharing screens or voiceover lines), warnings, each video's script and length, and the voice that would be used. Free; call before render_videos and show the user the scripts.", inputSchema: { type: "object", properties: { plan: PLAN }, required: ["plan"] }, annotations: { readOnlyHint: true } },
  { name: "render_videos", description: "Renders one personalized video per person in the plan on this computer: MP4, email thumbnail, GIF preview and a preview page, saved in the NECX Outreach Videos folder. Returns a jobId at once; about 1-3 minutes per video (the first run also installs the video tools, about a minute). Poll get_render_status until done.", inputSchema: { type: "object", properties: { plan: PLAN }, required: ["plan"] } },
  { name: "get_render_status", description: "Status of a render job: per video queued / preparing / rendering (with %) / done / failed, the voice used, and where the files are.", inputSchema: { type: "object", properties: { jobId: { type: "string" } }, required: ["jobId"] }, annotations: { readOnlyHint: true } },
  { name: "setup_voice", description: "Opens a private page in the user's browser (on this computer) to enter or change the ElevenLabs API key for narration. Use when there's no key or it's out of credits. Never ask the user to paste a key into the chat.", inputSchema: { type: "object", properties: {} } },
  { name: "open_videos_folder", description: "Opens the folder with the rendered videos in Finder / Explorer, or the folder of one video.", inputSchema: { type: "object", properties: { videoId: { type: "string" } } } },
];

async function callTool(name, args = {}) {
  switch (name) {
    case "list_screens":
      return catalogText(args.module);
    case "preview_plan": {
      const setup = depsState === "installing" ? "\n\n(The video tools are still installing in the background; rendering can be queued now.)" : depsState === "failed" ? `\n\nThe video tools failed to install: ${depsError}` : "";
      return (await runner.preview(args.plan, SETUP_HINT)) + setup;
    }
    case "render_videos": {
      if (depsState === "failed") throw new Error(`The video tools couldn't be installed: ${depsError}. Check the internet connection, then restart Claude.`);
      const r = runner.submit(args.plan);
      if (r.error) throw new Error(r.error);
      const v = voice();
      return `${r.text}\n\nVideos are saved in: ${OUT}${depsState === "installing" ? `\nFirst run: ${depsStep} before rendering.` : ""}${v.provider !== "elevenlabs" ? `\n${SETUP_HINT}` : ""}`;
    }
    case "get_render_status": {
      const t = runner.status(String(args.jobId ?? ""), depsState === "installing" ? `First run: ${depsStep}…` : "");
      if (!t) throw new Error(`No job ${args.jobId}.`);
      return t;
    }
    case "setup_voice": {
      const url = await startSetup();
      const opened = openInBrowser(url);
      return `${opened ? "Opened" : "Open"} the voice setup page in the browser: ${url}\nIt's only reachable from this computer and closes after saving (or in 15 minutes). The key is checked with ElevenLabs and saved to ${VOICE_ENV}, readable only by this user. Ask the user to tell you when it says "Saved".`;
    }
    case "open_videos_folder": {
      const dir = args.videoId && /^[a-z0-9-]+$/.test(args.videoId) ? path.join(OUT, args.videoId) : OUT;
      openInBrowser(dir);
      return `Opened ${dir}`;
    }
    default:
      throw new Error(`Unknown tool ${name}`);
  }
}

// ---- MCP over stdio (newline-delimited JSON-RPC) ------------------------------------
const send = (msg) => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", ...msg }) + "\n");
const rl = readline.createInterface({ input: process.stdin });
rl.on("line", async (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return send({ id: null, error: { code: -32700, message: "Parse error" } });
  }
  const { id, method, params } = msg;
  if (id === undefined) return; // notifications
  try {
    if (method === "initialize") {
      return send({ id, result: { protocolVersion: params?.protocolVersion ?? "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "necx-video", version: "1.2.0" }, instructions: "Render a different personalized NECX outreach video per contact on this computer. Use with the necx-outreach-video skill: preview_plan, then render_videos, then get_render_status. For the ElevenLabs key use setup_voice; never ask for it in chat." } });
    }
    if (method === "ping") return send({ id, result: {} });
    if (method === "tools/list") return send({ id, result: { tools: TOOLS } });
    if (method === "tools/call") {
      try {
        const out = await callTool(params?.name, params?.arguments);
        return send({ id, result: { content: [{ type: "text", text: out }] } });
      } catch (e) {
        return send({ id, result: { content: [{ type: "text", text: String(e.message ?? e) }], isError: true } });
      }
    }
    send({ id, error: { code: -32601, message: `Method not found: ${method}` } });
  } catch (e) {
    send({ id, error: { code: -32603, message: String(e.message ?? e) } });
  }
});
rl.on("close", () => process.exit(0));
log(`ready · videos: ${OUT} · voice: ${voice().provider} · tools: ${depsState}`);
