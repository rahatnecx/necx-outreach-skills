// NECX Video, hosted: the HTTP version of the connector, for claude.ai on the
// web (which can't start anything on the user's computer). Claude Code,
// Desktop and Cowork use server/local.mjs instead, started by the plugin.
//
//   PUBLIC_URL=https://video.example.org ACCESS_TOKENS=<openssl rand -hex 24> \
//   ELEVENLABS_API_KEY=... node server/server.mjs
//
// Env:
//   PORT            default 8080
//   PUBLIC_URL      base URL people and Claude reach this server at (links use it)
//   ACCESS_TOKENS   comma-separated, required. Connect with <PUBLIC_URL>/mcp/<token>
//                   (claude.ai custom connectors) or Authorization: Bearer <token>
//   ELEVENLABS_API_KEY, ELEVENLABS_VOICE   narration; without a key videos are captions-only
//   DATA_DIR        jobs + rendered videos (default ./server-data)
//
// Watch pages live at /v/<videoId>-<random>/ : unguessable, not indexed, no listing.
import { randomBytes, timingSafeEqual } from "node:crypto";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { catalogText, createRunner, watchHtml } from "./jobs.mjs";

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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
const VIDEOS = path.join(DATA, "videos");
const hostedLinks = (slug) => ({
  watch: `${PUBLIC_URL}/v/${slug}/`, mp4: `${PUBLIC_URL}/v/${slug}/video.mp4`, thumbnail: `${PUBLIC_URL}/v/${slug}/thumbnail.jpg`, gif: `${PUBLIC_URL}/v/${slug}/preview.gif`,
  // what the email files use
  videoUrl: `${PUBLIC_URL}/v/${slug}/`, thumbnailUrl: `${PUBLIC_URL}/v/${slug}/thumbnail.jpg`,
});
const runner = createRunner({
  jobsDir: path.join(DATA, "jobs"),
  baseDir: DATA,
  slugFor: (v) => `${v.videoId}-${randomBytes(6).toString("hex")}`,
  hosted: hostedLinks,
  localFiles: false,
  voice: () => VOICE,
  fallback: () => ({ provider: "none" }),
});

// ---- MCP ---------------------------------------------------------------------------
const text = (t) => ({ content: [{ type: "text", text: t }] });
const planSchema = z.object({}).passthrough().describe("The video plan: { sender, defaults?, videos: [{ videoId, persona, recipient: {firstName, lastName, title, org}, scenes: [...], sources }] }. One different script per person.");
const HINT = "Ask the NECX admin to set ELEVENLABS_API_KEY on the render server.";

function buildServer() {
  const server = new McpServer({ name: "necx-video", version: "1.2.0" });
  server.registerTool("list_screens", { title: "List VS360 screens", description: TOOL_DOCS.list_screens, inputSchema: { module: z.string().optional() }, annotations: { readOnlyHint: true } }, async ({ module }) => text(catalogText(module)));
  server.registerTool("preview_plan", { title: "Check a video plan", description: TOOL_DOCS.preview_plan, inputSchema: { plan: planSchema }, annotations: { readOnlyHint: true } }, async ({ plan }) => text(await runner.preview(plan, HINT)));
  server.registerTool("render_videos", { title: "Render personalized videos", description: TOOL_DOCS.render_videos, inputSchema: { plan: planSchema } }, async ({ plan }) => {
    const r = runner.submit(plan);
    return r.error ? { ...text(r.error), isError: true } : text(`${r.text}\n\nThe links work once the status is done.`);
  });
  server.registerTool("get_outreach", { title: "Get the outreach files", description: TOOL_DOCS.get_outreach, inputSchema: { jobId: z.string(), format: z.enum(["markdown", "csv", "json"]).optional() }, annotations: { readOnlyHint: true } }, async ({ jobId, format }) => {
    const t = runner.outreachFile(jobId, format ?? "markdown");
    return t ? text(t) : { ...text(`No outreach saved for job ${jobId}.`), isError: true };
  });
  server.registerTool("get_render_status", { title: "Render status", description: TOOL_DOCS.get_render_status, inputSchema: { jobId: z.string() }, annotations: { readOnlyHint: true } }, async ({ jobId }) => {
    const t = runner.status(jobId);
    return t ? text(t) : { ...text(`No job ${jobId}.`), isError: true };
  });
  return server;
}

export const TOOL_DOCS = {
  list_screens: "The real VS360 screens a video can show, with ids, modules and verified default copy. Read before choosing `screen` scenes. Optional module filter: dashboard, cases, referrals, hotline, shelters, reports, voca, hud, fvpsa, stop, hhsc, vclg, access, calendar, notes, drive, network, services.",
  preview_plan: "Validates a per-person video plan without rendering: problems that block it (including two contacts sharing screens or voiceover lines), warnings, each video's script and length, and the voice that would be used. Free; call before render_videos and show the user the scripts.",
  render_videos: "Saves the agency's email sequences (with the hosted links filled in) and renders one personalized video per person plus the optional agency-wide video: MP4, email thumbnail, GIF preview and a watch page. Returns a jobId and the links at once; rendering takes about 1-3 minutes per video. Poll get_render_status until done. Rejects plans with problems (run preview_plan first).",
  get_outreach: "The saved outreach of a render job with the hosted video links filled in: markdown (every email, ready to paste), csv (sequence for CRM import) or json (structured).",
  get_render_status: "Status of a render job from render_videos: per video queued / preparing / rendering (with %) / done / failed, the voice used, and the links (watch page, MP4, thumbnail, GIF).",
};

// ---- HTTP --------------------------------------------------------------------------
const okToken = (t) => !!t && TOKENS.some((k) => k.length === t.length && timingSafeEqual(Buffer.from(k), Buffer.from(t)));
const MIME = { ".mp4": "video/mp4", ".jpg": "image/jpeg", ".png": "image/png", ".gif": "image/gif" };
const notFound = (res) => {
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
};

function serveVideoFile(req, res, slug, file) {
  const dir = path.join(VIDEOS, slug);
  if (!/^[a-z0-9-]+$/.test(slug) || !existsSync(path.join(dir, "meta.json"))) return notFound(res);
  if (!file) {
    const meta = JSON.parse(readFileSync(path.join(dir, "meta.json"), "utf8"));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex", "Cache-Control": "no-store" });
    return res.end(watchHtml(meta, { ogImage: `${PUBLIC_URL}/v/${slug}/thumbnail.png` }));
  }
  if (!/^(video\.mp4|thumbnail\.(jpg|png)|preview\.gif)$/.test(file)) return notFound(res);
  const fp = path.join(dir, file);
  if (!existsSync(fp)) return notFound(res);
  const size = statSync(fp).size;
  const base = { "Content-Type": MIME[path.extname(fp)], "Accept-Ranges": "bytes", "X-Robots-Tag": "noindex", "Cache-Control": "public, max-age=86400" };
  const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
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
      return res.end(JSON.stringify({ ok: true, voice: VOICE.provider, queued: runner.queued, busy: runner.busy }));
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
