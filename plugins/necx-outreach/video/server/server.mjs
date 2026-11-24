// NECX Video: the render server behind the "NECX Video" connector (MCP).
// The same per-person video pipeline as scripts/render.mjs, so it works from
// claude.ai on the web, Claude Desktop, Cowork and Claude Code alike: the
// necx-outreach-video skill writes the plan, calls render_videos, and gets
// back hosted links (watch page, MP4, email thumbnail, GIF preview).
//
//   PUBLIC_URL=https://video.example.org ACCESS_TOKENS=<long random> \
//   ELEVENLABS_API_KEY=... node server/server.mjs
//
// Env:
//   PORT            default 8080
//   PUBLIC_URL      base URL people and Claude reach this server at (links use it)
//   ACCESS_TOKENS   comma-separated; required. Connect with  <PUBLIC_URL>/mcp/<token>
//                   (claude.ai custom connectors) or  Authorization: Bearer <token>
//   ELEVENLABS_API_KEY, ELEVENLABS_VOICE   narration; without a key videos are captions-only
//   DATA_DIR        jobs + rendered videos (default ./server-data)
//
// Watch pages live at /v/<videoId>-<random>/ : unguessable, not indexed, no listing.
import { randomBytes, timingSafeEqual } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const P = await import(pathToFileURL(path.join(HERE, "scripts/pipeline.mjs")).href);

const PORT = +(process.env.PORT ?? 8080);
const PUBLIC_URL = (process.env.PUBLIC_URL ?? `http://localhost:${PORT}`).replace(/\/$/, "");
const TOKENS = (process.env.ACCESS_TOKENS ?? "").split(",").map((t) => t.trim()).filter(Boolean);
const DATA = path.resolve(process.env.DATA_DIR ?? path.join(HERE, "server-data"));
const KEY = process.env.ELEVENLABS_API_KEY ?? process.env.ELEVEN_LABS_API;
const VOICE = { provider: KEY ? "elevenlabs" : "none", key: KEY, voiceId: process.env.ELEVENLABS_VOICE };
if (!TOKENS.length || TOKENS.some((t) => t.length < 24)) {
  console.error("Set ACCESS_TOKENS to one or more random tokens of at least 24 characters (e.g. `openssl rand -hex 24`).");
  process.exit(1);
}
mkdirSync(path.join(DATA, "jobs"), { recursive: true });
mkdirSync(path.join(DATA, "videos"), { recursive: true });

// ---- jobs ------------------------------------------------------------------------
const jobFile = (id) => path.join(DATA, "jobs", `${id}.json`);
const loadJob = (id) => (/^[a-f0-9]{16}$/.test(id) && existsSync(jobFile(id)) ? JSON.parse(readFileSync(jobFile(id), "utf8")) : null);
const saveJob = (job) => writeFileSync(jobFile(job.id), JSON.stringify(job, null, 2));
const links = (slug, name) => ({
  watch: `${PUBLIC_URL}/v/${slug}/`,
  mp4: `${PUBLIC_URL}/v/${slug}/${name}.mp4`,
  thumbnail: `${PUBLIC_URL}/v/${slug}/thumbnail.jpg`,
  gif: `${PUBLIC_URL}/v/${slug}/preview.gif`,
});

const queue = [];
let busy = false;
async function work() {
  if (busy) return;
  busy = true;
  while (queue.length) {
    const id = queue.shift();
    const job = loadJob(id);
    if (!job) continue;
    try {
      job.status = "voicing";
      saveJob(job);
      const videos = job.videos.map((x) => x.props);
      await P.stageImages(videos);
      job.voice = await P.voiceVideos(videos, VOICE, { fallback: { provider: "none" }, log: (m) => (job.note = m) });
      job.status = "rendering";
      saveJob(job);
      for (const [i, item] of job.videos.entries()) {
        item.status = "rendering";
        saveJob(job);
        const dir = path.join(DATA, "videos", item.slug);
        const props = videos[i];
        let last = 0;
        await P.renderVideo(props, dir, {
          provider: job.voice,
          name: "video",
          onProgress: ({ step, progress }) => {
            const pct = step === "video" ? Math.round(10 + progress * 90) : step === "gif" ? 8 : 4;
            if (pct - last >= 10 || pct === 100) {
              item.progress = pct;
              last = pct;
              saveJob(job);
            }
          },
        });
        writeFileSync(path.join(dir, "meta.json"), JSON.stringify({ recipient: props.recipient, sender: props.sender ?? {}, videoId: props.videoId, created: new Date().toISOString() }));
        item.status = "done";
        item.progress = 100;
        saveJob(job);
      }
      job.status = "done";
    } catch (e) {
      job.status = "failed";
      job.error = String(e.message ?? e).slice(0, 500);
      for (const item of job.videos) if (item.status !== "done") item.status = "failed";
      console.error(`job ${id} failed:`, e);
    }
    job.finished = new Date().toISOString();
    saveJob(job);
  }
  busy = false;
}
// resume jobs interrupted by a restart
for (const f of readdirSync(path.join(DATA, "jobs"))) {
  const job = JSON.parse(readFileSync(path.join(DATA, "jobs", f), "utf8"));
  if (!["done", "failed"].includes(job.status)) queue.push(job.id);
}
work();

// ---- MCP tools -------------------------------------------------------------------
const text = (t) => ({ content: [{ type: "text", text: t }] });
const planSchema = z.object({}).passthrough().describe("The video plan: { sender, defaults?, videos: [{ videoId, persona, recipient: {firstName, lastName, title, org}, scenes: [...], sources }] }. One different script per person.");

function catalogText(module) {
  const rows = Object.entries(P.CATALOG)
    .filter(([, s]) => !module || s.module === module)
    .map(([id, s]) => `| ${id} | ${s.module} | ${s.title ?? ""} | ${(s.body ?? "").replace(/\|/g, "/")} |`);
  return ["Real VS360 screens (vs360-webapp captures, fictional client data). The prospect's agency, title, initials and first-name greeting are written into each screen at render time. Title/body are verified copy, shown by default.", "", "| id | module | default title | default body |", "|---|---|---|---|", ...rows].join("\n");
}

function buildServer() {
  const server = new McpServer({ name: "necx-video", version: "1.2.0" });

  server.registerTool(
    "list_screens",
    {
      title: "List VS360 screens",
      description: "The real VS360 screens a video can show, with ids, modules and verified default copy. Read before choosing `screen` scenes. Optional module filter: dashboard, cases, referrals, hotline, shelters, reports, voca, hud, fvpsa, stop, hhsc, vclg, access, calendar, notes, drive, network, services.",
      inputSchema: { module: z.string().optional() },
      annotations: { readOnlyHint: true },
    },
    async ({ module }) => text(catalogText(module)),
  );

  server.registerTool(
    "preview_plan",
    {
      title: "Check a video plan",
      description: "Validates a per-person video plan without rendering: problems that block it (including two contacts sharing screens or voiceover lines), warnings, each video's script and length, and the voice that would be used. Free; call before render_videos and show the user the scripts.",
      inputSchema: { plan: planSchema },
      annotations: { readOnlyHint: true },
    },
    async ({ plan }) => {
      const { videos, problems, warnings } = P.validatePlan(plan);
      const c = KEY ? await P.credits(KEY) : null;
      const need = KEY ? P.charactersNeeded(videos, VOICE) : 0;
      const voiceLine = !KEY ? "Voice: none on this server (captions only); ask the NECX admin to set ELEVENLABS_API_KEY." : c?.error ? `Voice: ElevenLabs check failed (${c.error}); videos would be captions-only.` : c && c.left < need ? `Voice: ElevenLabs has ${c.left.toLocaleString()} characters left but this plan needs ${need.toLocaleString()}; videos would be captions-only until it's topped up.` : `Voice: ElevenLabs (${need.toLocaleString()} characters needed${c ? `, ${c.left.toLocaleString()} left` : ""}).`;
      return text([
        problems.length ? `PROBLEMS (fix before rendering):\n- ${problems.join("\n- ")}` : "No blocking problems.",
        warnings.length ? `Warnings:\n- ${warnings.join("\n- ")}` : "",
        voiceLine,
        ...videos.map((v) => P.scriptMarkdown(v, VOICE.provider)),
      ].filter(Boolean).join("\n\n"));
    },
  );

  server.registerTool(
    "render_videos",
    {
      title: "Render personalized videos",
      description: "Renders one personalized video per person in the plan on the NECX server: MP4, email thumbnail, GIF preview and a hosted watch page. Returns a jobId and the links at once; rendering takes about 1-3 minutes per video. Poll get_render_status until done. Rejects plans with problems (run preview_plan first).",
      inputSchema: { plan: planSchema },
    },
    async ({ plan }) => {
      const { videos, problems } = P.validatePlan(plan);
      if (problems.length) return { ...text(`Not rendered. Fix these first:\n- ${problems.join("\n- ")}`), isError: true };
      const id = randomBytes(8).toString("hex");
      const job = {
        id,
        created: new Date().toISOString(),
        status: "queued",
        videos: videos.map((v) => {
          const slug = `${v.videoId}-${randomBytes(6).toString("hex")}`;
          return { videoId: v.videoId, slug, status: "queued", progress: 0, seconds: P.lengthSeconds(v), links: links(slug, "video"), props: v };
        }),
      };
      saveJob(job);
      queue.push(id);
      work();
      const ahead = queue.length - 1;
      return text([
        `Queued job ${id} (${videos.length} video${videos.length > 1 ? "s" : ""}${ahead > 0 ? `, ${ahead} job(s) ahead` : ""}). About ${Math.ceil(videos.length * 2)} min. Check with get_render_status.`,
        "",
        ...job.videos.map((x) => `- ${x.videoId} (${x.seconds} s): watch page ${x.links.watch} · thumbnail ${x.links.thumbnail} · GIF ${x.links.gif}`),
        "",
        "The links work once the status is done.",
      ].join("\n"));
    },
  );

  server.registerTool(
    "get_render_status",
    {
      title: "Render status",
      description: "Status of a render job from render_videos: per video queued / rendering (with %) / done / failed, the voice used, and the hosted links (watch page, MP4, thumbnail, GIF).",
      inputSchema: { jobId: z.string() },
      annotations: { readOnlyHint: true },
    },
    async ({ jobId }) => {
      const job = loadJob(jobId);
      if (!job) return { ...text(`No job ${jobId}.`), isError: true };
      return text([
        `Job ${job.id}: ${job.status}${job.voice ? ` · voice: ${job.voice}` : ""}${job.error ? ` · error: ${job.error}` : ""}${job.note ? `\nNote: ${job.note}` : ""}`,
        ...job.videos.map((x) => `- ${x.videoId}: ${x.status}${x.status === "rendering" ? ` ${x.progress}%` : ""}${x.status === "done" ? `\n  watch: ${x.links.watch}\n  mp4: ${x.links.mp4}\n  thumbnail: ${x.links.thumbnail}\n  gif: ${x.links.gif}` : ""}`),
      ].join("\n"));
    },
  );
  return server;
}

// ---- HTTP ------------------------------------------------------------------------
const okToken = (t) => !!t && TOKENS.some((k) => k.length === t.length && timingSafeEqual(Buffer.from(k), Buffer.from(t)));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const TYPES = { ".mp4": "video/mp4", ".jpg": "image/jpeg", ".png": "image/png", ".gif": "image/gif" };

function watchPage(slug) {
  const meta = JSON.parse(readFileSync(path.join(DATA, "videos", slug, "meta.json"), "utf8"));
  const r = meta.recipient ?? {};
  const s = meta.sender ?? {};
  const mail = s.email ? `mailto:${encodeURIComponent(s.email)}?subject=${encodeURIComponent(`Re: the video for ${r.firstName ?? ""}`)}` : null;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>A short video for ${esc(r.firstName)} · NECX</title>
<meta property="og:title" content="A short video for ${esc(r.firstName)}"><meta property="og:image" content="${PUBLIC_URL}/v/${slug}/thumbnail.png">
<style>
:root{--teal:#31A3B6;--navy:#172631}*{box-sizing:border-box}body{margin:0;font-family:Poppins,system-ui,-apple-system,Segoe UI,sans-serif;background:radial-gradient(120% 90% at 50% 0%,#22394a,#172631 50%,#0c141a);color:#e9f2f6;min-height:100vh}
main{max-width:1040px;margin:0 auto;padding:32px 20px 48px}.brand{font-weight:800;letter-spacing:3px;color:#fff;font-size:20px}
h1{font-size:clamp(24px,4vw,38px);margin:28px 0 6px}p.sub{margin:0 0 22px;color:rgba(233,242,246,.7)}
video{width:100%;border-radius:14px;box-shadow:0 30px 80px rgba(0,0,0,.5);background:#000}
.cta{display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-top:24px}
a.btn{display:inline-block;padding:14px 26px;border-radius:999px;background:linear-gradient(90deg,#7fd8e6,var(--teal));color:var(--navy);font-weight:700;text-decoration:none}
.from{color:rgba(233,242,246,.75)}footer{margin-top:40px;font-size:13px;color:rgba(233,242,246,.45)}a{color:#7fd8e6}
</style></head><body><main>
<div class="brand">NECX</div>
<h1>${esc(r.firstName)}, this short video is for you</h1>
<p class="sub">${esc([r.title, r.org].filter(Boolean).join(" · "))}</p>
<video controls playsinline preload="metadata" poster="thumbnail.jpg" src="video.mp4"></video>
<div class="cta">${mail ? `<a class="btn" href="${mail}">Reply to ${esc(s.name ?? "us")}</a>` : ""}<span class="from">${esc([s.name, s.title].filter(Boolean).join(", "))}${s.email ? ` · <a href="mailto:${esc(s.email)}">${esc(s.email)}</a>` : ""}</span></div>
<footer>Product screens are from NECX VS360 with fictional client data. <a href="https://necx.org">necx.org</a></footer>
</main></body></html>`;
}

function serveVideoFile(req, res, slug, file) {
  const dir = path.join(DATA, "videos", slug);
  if (!/^[a-z0-9-]+$/.test(slug) || !existsSync(path.join(dir, "meta.json"))) return notFound(res);
  if (!file) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex", "Cache-Control": "no-store" });
    return res.end(watchPage(slug));
  }
  if (!/^(video\.mp4|thumbnail\.(jpg|png)|preview\.gif)$/.test(file)) return notFound(res);
  const fp = path.join(dir, file);
  if (!existsSync(fp)) return notFound(res);
  const size = statSync(fp).size;
  const type = TYPES[path.extname(fp)];
  const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
  const base = { "Content-Type": type, "Accept-Ranges": "bytes", "X-Robots-Tag": "noindex", "Cache-Control": "public, max-age=86400" };
  if (range) {
    const start = range[1] ? +range[1] : 0;
    const end = range[2] ? Math.min(+range[2], size - 1) : size - 1;
    if (start > end || start >= size) {
      res.writeHead(416, { "Content-Range": `bytes */${size}` });
      return res.end();
    }
    res.writeHead(206, { ...base, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": end - start + 1 });
    return createReadStream(fp, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...base, "Content-Length": size });
  createReadStream(fp).pipe(res);
}

function notFound(res) {
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
}

async function readJson(req) {
  const chunks = [];
  let n = 0;
  for await (const c of req) {
    n += c.length;
    if (n > 2_000_000) throw new Error("request too large");
    chunks.push(c);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : undefined;
}

const httpServer = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, PUBLIC_URL);
    const parts = url.pathname.split("/").filter(Boolean);
    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: true, voice: VOICE.provider, queue: queue.length, busy }));
    }
    if (parts[0] === "v" && parts[1]) {
      if (!url.pathname.endsWith("/") && parts.length === 2) {
        res.writeHead(301, { Location: `${url.pathname}/` });
        return res.end();
      }
      return serveVideoFile(req, res, parts[1], parts[2]);
    }
    if (parts[0] === "mcp") {
      const bearer = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
      if (!okToken(parts[1] ?? bearer)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "unauthorized" }));
      }
      if (req.method !== "POST") {
        res.writeHead(405, { Allow: "POST" });
        return res.end();
      }
      // stateless: a fresh server + transport per request
      const body = await readJson(req);
      const server = buildServer();
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      res.on("close", () => {
        transport.close();
        server.close();
      });
      await server.connect(transport);
      return transport.handleRequest(req, res, body);
    }
    notFound(res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Server error");
    }
  }
});
httpServer.listen(PORT, () => console.log(`NECX Video on :${PORT} · ${PUBLIC_URL} · voice: ${VOICE.provider} · data: ${DATA}`));
