// Render jobs and tool texts shared by both NECX Video servers:
//   server/local.mjs   started automatically by the plugin on the user's computer (stdio)
//   server/server.mjs  the hosted connector (HTTP), for claude.ai on the web
// Neither imports Remotion until a render actually runs.
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as P from "../scripts/pipeline.mjs";

export { P };

export function catalogText(module) {
  const rows = Object.entries(P.CATALOG)
    .filter(([, s]) => !module || s.module === module)
    .map(([id, s]) => `| ${id} | ${s.module} | ${s.title ?? ""} | ${(s.body ?? "").replace(/\|/g, "/")} |`);
  return [
    "Real VS360 screens (vs360-webapp captures, fictional client data). The prospect's agency, title, initials and first-name greeting are written into each screen at render time. Title/body are verified copy, shown by default.",
    "",
    "| id | module | default title | default body |",
    "|---|---|---|---|",
    ...rows,
  ].join("\n");
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// the page a prospect lands on (hosted), or a local preview of it
export function watchHtml(meta, { ogImage = null } = {}) {
  const r = meta.recipient ?? {};
  const s = meta.sender ?? {};
  const mail = s.email ? `mailto:${encodeURIComponent(s.email)}?subject=${encodeURIComponent(`Re: the video for ${r.firstName ?? ""}`)}` : null;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>A short video for ${esc(r.firstName)} · NECX</title>
<meta property="og:title" content="A short video for ${esc(r.firstName)}">${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">` : ""}
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

// voiceLine: how a plan would be voiced right now, for preview_plan
export async function voiceLine(voice, videos, { setupHint }) {
  if (voice.provider !== "elevenlabs") {
    return voice.provider === "say"
      ? `Voice: macOS voice (fine for review, not for sending). ${setupHint}`
      : `Voice: none (captions only). ${setupHint}`;
  }
  const c = await P.credits(voice.key);
  const need = P.charactersNeeded(videos, voice);
  if (c?.error) return `Voice: ElevenLabs key check failed (${c.error}). ${setupHint}`;
  if (c && c.left < need) return `Voice: ElevenLabs has ${c.left.toLocaleString()} characters left but this plan needs ${need.toLocaleString()}; it would fall back until topped up.`;
  return `Voice: ElevenLabs (${need.toLocaleString()} characters needed${c ? `, ${c.left.toLocaleString()} left` : ""}).`;
}

// A sequential render queue persisted in <jobsDir>.
//   slugFor(video)      folder name for a video
//   videoDir(slug)      where its files go
//   linksFor(slug)      { watch, mp4, thumbnail, gif } shown to the user
//   voice()             current { provider, key, voiceId } (can change mid-session)
//   fallback()          voice to use if ElevenLabs can't finish
//   ready()             resolves when Remotion is installed
export function createRunner({ jobsDir, slugFor, videoDir, linksFor, voice, fallback, ready = async () => {}, log = console.error }) {
  mkdirSync(jobsDir, { recursive: true });
  const file = (id) => path.join(jobsDir, `${id}.json`);
  const load = (id) => (/^[a-f0-9]{16}$/.test(id) && existsSync(file(id)) ? JSON.parse(readFileSync(file(id), "utf8")) : null);
  const save = (job) => writeFileSync(file(job.id), JSON.stringify(job, null, 2));
  const queue = [];
  let busy = false;

  async function work() {
    if (busy) return;
    busy = true;
    while (queue.length) {
      const job = load(queue.shift());
      if (!job) continue;
      try {
        if (job.status === "queued") {
          job.status = "preparing";
          save(job);
        }
        await ready();
        job.status = "voicing";
        save(job);
        const videos = job.videos.map((x) => x.props);
        await P.stageImages(videos);
        job.voice = await P.voiceVideos(videos, voice(), { fallback: fallback(), log: (m) => (job.note = m) });
        job.status = "rendering";
        save(job);
        for (const [i, item] of job.videos.entries()) {
          item.status = "rendering";
          save(job);
          const dir = videoDir(item.slug);
          const props = videos[i];
          let last = 0;
          await P.renderVideo(props, dir, {
            provider: job.voice,
            name: "video",
            onProgress: ({ step, progress }) => {
              const pct = step === "video" ? Math.round(10 + progress * 90) : step === "gif" ? 8 : 4;
              if (pct - last >= 10 || pct === 100) {
                item.progress = last = pct;
                save(job);
              }
            },
          });
          const meta = { recipient: props.recipient, sender: props.sender ?? {}, videoId: props.videoId, created: new Date().toISOString() };
          writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta));
          writeFileSync(path.join(dir, "index.html"), watchHtml(meta));
          item.status = "done";
          item.progress = 100;
          save(job);
        }
        job.status = "done";
      } catch (e) {
        job.status = "failed";
        job.error = String(e.message ?? e).slice(0, 500);
        for (const item of job.videos) if (item.status !== "done") item.status = "failed";
        log(`job ${job.id} failed: ${e.stack ?? e}`);
      }
      job.finished = new Date().toISOString();
      save(job);
    }
    busy = false;
  }

  // resume jobs interrupted by a restart
  for (const f of readdirSync(jobsDir)) {
    try {
      const job = JSON.parse(readFileSync(path.join(jobsDir, f), "utf8"));
      if (!["done", "failed"].includes(job.status)) queue.push(job.id);
    } catch {}
  }
  setTimeout(work, 0);

  return {
    get busy() {
      return busy;
    },
    get queued() {
      return queue.length;
    },
    async preview(plan, setupHint = "") {
      const { videos, problems, warnings } = P.validatePlan(plan);
      return [
        problems.length ? `PROBLEMS (fix before rendering):\n- ${problems.join("\n- ")}` : "No blocking problems.",
        warnings.length ? `Warnings:\n- ${warnings.join("\n- ")}` : "",
        await voiceLine(voice(), videos, { setupHint }),
        ...videos.map((v) => P.scriptMarkdown(v, voice().provider)),
      ].filter(Boolean).join("\n\n");
    },
    submit(plan) {
      const { videos, problems } = P.validatePlan(plan);
      if (problems.length) return { error: `Not rendered. Fix these first:\n- ${problems.join("\n- ")}` };
      const id = randomBytes(8).toString("hex");
      const job = {
        id,
        created: new Date().toISOString(),
        status: "queued",
        videos: videos.map((v) => {
          const slug = slugFor(v);
          return { videoId: v.videoId, slug, status: "queued", progress: 0, seconds: P.lengthSeconds(v), links: linksFor(slug), props: v };
        }),
      };
      save(job);
      queue.push(id);
      setTimeout(work, 0);
      const ahead = queue.length - 1;
      return {
        job,
        text: [
          `Queued job ${id} (${videos.length} video${videos.length > 1 ? "s" : ""}${ahead > 0 ? `, ${ahead} job(s) ahead` : ""}). About ${Math.ceil(videos.length * 2)} min. Check with get_render_status.`,
          "",
          ...job.videos.map((x) => `- ${x.videoId} (${x.seconds} s): ${x.links.watch}`),
        ].join("\n"),
      };
    },
    status(id, extra = "") {
      const job = load(id);
      if (!job) return null;
      return [
        `Job ${job.id}: ${job.status}${job.voice ? ` · voice: ${job.voice}` : ""}${job.error ? ` · error: ${job.error}` : ""}${job.note ? `\nNote: ${job.note}` : ""}${extra ? `\n${extra}` : ""}`,
        ...job.videos.map((x) => `- ${x.videoId}: ${x.status}${x.status === "rendering" ? ` ${x.progress}%` : ""}${x.status === "done" ? `\n  watch: ${x.links.watch}\n  mp4: ${x.links.mp4}\n  thumbnail: ${x.links.thumbnail}\n  gif: ${x.links.gif}` : ""}`),
      ].join("\n");
    },
  };
}
