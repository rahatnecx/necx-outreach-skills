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
import { P, catalogText, createRunner, setVideoLink } from "./jobs.mjs";
import { folderName } from "../scripts/outreach.mjs";

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

// ---- sender profile: asked once per computer, used in every plan ---------------------
const PROFILE = path.join(HOME, ".config", "necx-outreach", "profile.json");
function profile() {
  const fromSettings = { name: setting(process.env.NECX_SENDER_NAME), title: setting(process.env.NECX_SENDER_TITLE), email: setting(process.env.NECX_SENDER_EMAIL) };
  const saved = existsSync(PROFILE) ? JSON.parse(readFileSync(PROFILE, "utf8")) : {};
  return { name: saved.name || fromSettings.name, title: saved.title || fromSettings.title, email: saved.email || fromSettings.email };
}
// the saved sender fills whatever the plan leaves out
function withSender(plan) {
  if (!plan || typeof plan !== "object") return plan;
  const me = profile();
  return { ...plan, sender: { ...me, ...Object.fromEntries(Object.entries(plan.sender ?? {}).filter(([, v]) => v)) } };
}
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

// <OUT>/<Agency>/<NN. Person (Title)>/  (and "00. Agency video (whole team)")
const runner = createRunner({
  jobsDir: path.join(STATE, "jobs"),
  baseDir: OUT,
  slugFor: (v) => v.folder,
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
  { name: "get_setup", description: "Call FIRST, before any outreach work: the saved sender (name, designation, email), whether an ElevenLabs voice key is set and its credits, and where videos are saved. If the sender is missing, ask the user and call save_profile; if the key is missing, call setup_voice.", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } },
  { name: "save_profile", description: "Saves the sender used on every video and email (asked once per computer): name, designation/title, NECX email.", inputSchema: { type: "object", properties: { name: { type: "string" }, title: { type: "string" }, email: { type: "string" } }, required: ["name", "title", "email"] } },
  { name: "save_outreach", description: "Saves an agency's outreach without rendering videos: per-person email sequences (TXT + safe HTML video emails), outreach.md, outreach.json, sequence.csv (CRM import) in <videos folder>/<Agency>/<NN. Person (Title)>/. Enforces the writing rules (AI-sounding phrases, dashes, links, length): fix every problem it reports.", inputSchema: { type: "object", properties: { plan: { type: "object", additionalProperties: true } }, required: ["plan"] } },
  { name: "set_video_link", description: "After the user uploads a video (Drive, Vimeo, Loom...), fill its https link (and optionally a hosted thumbnail image URL) into that person's emails and the CSV. person = name, videoId, or 'agency'.", inputSchema: { type: "object", properties: { org: { type: "string" }, person: { type: "string" }, videoUrl: { type: "string" }, thumbnailUrl: { type: "string" } }, required: ["org", "person", "videoUrl"] } },
  { name: "list_screens", description: "The real VS360 screens a video can show, with ids, modules and verified default copy. Read before choosing `screen` scenes. Optional module filter: dashboard, cases, referrals, hotline, shelters, reports, voca, hud, fvpsa, stop, hhsc, vclg, access, calendar, notes, drive, network, services.", inputSchema: { type: "object", properties: { module: { type: "string" } } }, annotations: { readOnlyHint: true } },
  { name: "preview_plan", description: "Validates a per-person video plan without rendering: blocking problems (including two contacts sharing screens or voiceover lines), warnings, each video's script and length, and the voice that would be used. Free; call before render_videos and show the user the scripts.", inputSchema: { type: "object", properties: { plan: PLAN }, required: ["plan"] }, annotations: { readOnlyHint: true } },
  { name: "render_videos", description: "Renders one personalized video per person in the plan on this computer: MP4, email thumbnail, GIF preview and a preview page, saved in the NECX Outreach Videos folder. Returns a jobId at once; about 1-3 minutes per video (the first run also installs the video tools, about a minute). Poll get_render_status until done.", inputSchema: { type: "object", properties: { plan: PLAN }, required: ["plan"] } },
  { name: "get_render_status", description: "Status of a render job: per video queued / preparing / rendering (with %) / done / failed, the voice used, and where the files are.", inputSchema: { type: "object", properties: { jobId: { type: "string" } }, required: ["jobId"] }, annotations: { readOnlyHint: true } },
  { name: "setup_voice", description: "Opens a private page in the user's browser (on this computer) to enter or change the ElevenLabs API key for narration. Use when there's no key or it's out of credits. Never ask the user to paste a key into the chat.", inputSchema: { type: "object", properties: {} } },
  { name: "open_videos_folder", description: "Opens the videos folder in Finder / Explorer, or one agency's folder.", inputSchema: { type: "object", properties: { org: { type: "string" } } } },
];

async function callTool(name, args = {}) {
  switch (name) {
    case "list_screens":
      return catalogText(args.module);
    case "get_setup": {
      const me = profile();
      const v = voice();
      const c = v.provider === "elevenlabs" ? await P.credits(v.key) : null;
      const missing = ["name", "title", "email"].filter((k) => !me[k]);
      return [
        `Sender: ${missing.length ? `MISSING ${missing.join(", ")}; ask the user (designation = title), then call save_profile` : `${me.name}, ${me.title} <${me.email}>`}`,
        `Voice: ${v.provider === "elevenlabs" ? (c?.error ? `ElevenLabs key set but the check failed (${c.error}); offer setup_voice to replace it` : `ElevenLabs, ${c ? `${c.left.toLocaleString()} characters left (about 900-1,400 per video)` : "key set"}`) : `NO ElevenLabs key; call setup_voice so the user can enter it in their browser (never in chat). Until then: ${v.provider === "say" ? "macOS voice, review only" : "captions only"}`}`,
        `Videos and emails are saved in: ${OUT}/<Agency>/<NN. Person (Title)>/`,
        `Video tools: ${depsState === "ready" ? "ready" : depsState === "failed" ? `failed (${depsError})` : `setting up (${depsStep || "checking"})`}`,
      ].join("\n");
    }
    case "save_profile": {
      const name = String(args.name ?? "").trim();
      const title = String(args.title ?? "").trim();
      const email = String(args.email ?? "").trim();
      if (!name || !title || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) throw new Error("Need a name, a designation/title and a valid email.");
      mkdirSync(path.dirname(PROFILE), { recursive: true, mode: 0o700 });
      writeFileSync(PROFILE, JSON.stringify({ name, title, email }, null, 2), { mode: 0o600 });
      return `Saved. Videos and emails will be signed ${name}, ${title} <${email}>.`;
    }
    case "save_outreach": {
      const r = runner.saveOnly(withSender(args.plan));
      if (r.error) throw new Error(r.error);
      return r.text;
    }
    case "set_video_link": {
      const r = setVideoLink(OUT, args);
      if (r.error) throw new Error(r.error);
      return r.text;
    }
    case "preview_plan": {
      const setup = depsState === "installing" ? "\n\n(The video tools are still installing in the background; rendering can be queued now.)" : depsState === "failed" ? `\n\nThe video tools failed to install: ${depsError}` : "";
      return (await runner.preview(withSender(args.plan), SETUP_HINT)) + setup;
    }
    case "render_videos": {
      if (depsState === "failed") throw new Error(`The video tools couldn't be installed: ${depsError}. Check the internet connection, then restart Claude.`);
      const r = runner.submit(withSender(args.plan));
      if (r.error) throw new Error(r.error);
      const v = voice();
      return `${r.text}\n\nFolder: ${OUT}${depsState === "installing" ? `\nFirst run: ${depsStep} before rendering.` : ""}${v.provider !== "elevenlabs" ? `\n${SETUP_HINT}` : ""}`;
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
      const dir = args.org && existsSync(path.join(OUT, folderName(args.org))) ? path.join(OUT, folderName(args.org)) : OUT;
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
      return send({ id, result: { protocolVersion: params?.protocolVersion ?? "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "necx-video", version: "1.3.0" }, instructions: "NECX outreach on this computer: per-person email sequences and personalized videos, saved per agency. Use with the necx-outreach-video skill. Start with get_setup (ask the sender's name, designation, email once; ElevenLabs key only via setup_voice, never in chat). Then preview_plan, render_videos (or save_outreach for emails only), get_render_status, set_video_link." } });
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
