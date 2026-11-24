// Renders personalised outreach videos from a plan (the JSON the
// necx-outreach-planner skill writes), on this computer. For each video:
//   <out>/<videoId>/<videoId>.mp4   1920×1080 H.264, voice + captions + music
//   <out>/<videoId>/thumbnail.png   title frame with a play button, for the email
//   <out>/<videoId>/thumbnail.jpg   same, smaller
//   <out>/<videoId>/preview.gif     3-second animated thumbnail
//   <out>/<videoId>/script.md       what is said and shown, for review before sending
//
//   node scripts/render.mjs plan.json [--out dir] [--only videoId] [--voice auto|elevenlabs|say|none]
//                                     [--no-gif] [--no-video] [--dry-run]
//   node scripts/render.mjs [plan.json] --check-voice   which voice, ElevenLabs credits left, credits the plan needs
//
// Voice: ElevenLabs when a key is available: the plugin's settings (Claude Code
// asks for it when the plugin is enabled; a SessionStart hook copies it to
// ~/.config/necx-outreach/voice.env), scripts/voice-setup.mjs (same file),
// ELEVENLABS_API_KEY in the environment, ./.env, this folder's .env, or the file
// named by NECX_ENV_FILE. Otherwise the macOS `say` voice; otherwise captions only.
// Clips are cached in public/run/ by text, so re-renders don't pay twice.
// The same pipeline runs on the NECX render server (server/server.mjs).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---- args ----------------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : def;
};
const BOOL = ["--no-gif", "--no-video", "--dry-run", "--check-voice"];
const planFile = argv.find((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--") && !BOOL.includes(argv[i - 1])));
const CHECK = flag("check-voice");
const DRY = flag("dry-run");
if (!planFile && !CHECK) {
  console.error("usage: node scripts/render.mjs plan.json [--out dir] [--only videoId] [--voice auto|elevenlabs|say|none] [--no-gif] [--no-video] [--dry-run]");
  process.exit(1);
}
const PLAN_PATH = planFile ? path.resolve(planFile) : null;
const OUT = path.resolve(opt("out", path.join(process.cwd(), "necx-outreach-videos")));

// ---- first run: dependencies -----------------------------------------------------
if (!CHECK && !DRY && !existsSync(path.join(HERE, "node_modules/remotion"))) {
  console.log("Installing video dependencies (first run, about a minute)…");
  const r = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["install", "--no-audit", "--no-fund"], { cwd: HERE, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// ---- env -----------------------------------------------------------------------
const VOICE_ENV = path.join(os.homedir(), ".config", "necx-outreach", "voice.env");
let KEY_SOURCE = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API ? "environment" : null;
for (const file of [process.env.NECX_ENV_FILE, VOICE_ENV, path.join(HERE, ".env"), path.join(process.cwd(), ".env")].filter(Boolean)) {
  if (!existsSync(file)) continue;
  const text = readFileSync(file, "utf8");
  if (!KEY_SOURCE && /^\s*(ELEVENLABS_API_KEY|ELEVEN_LABS_API)\s*=\s*\S/m.test(text)) KEY_SOURCE = file === VOICE_ENV ? "plugin settings" : file;
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY ?? process.env.ELEVEN_LABS_API;

const P = await import(pathToFileURL(path.join(HERE, "scripts/pipeline.mjs")).href);

// ---- plan ----------------------------------------------------------------------
const raw = PLAN_PATH ? JSON.parse(readFileSync(PLAN_PATH, "utf8")) : { videos: [] };
const { videos, problems, warnings } = P.validatePlan(raw, { only: opt("only", null) });
if (!CHECK || videos.length) {
  for (const w of warnings) console.warn(`  ! ${w}`);
  if (problems.length && !(CHECK && !PLAN_PATH)) {
    console.error("Plan problems:\n  " + problems.join("\n  "));
    process.exit(1);
  }
}

// ---- voice ---------------------------------------------------------------------
const wanted = opt("voice", null) ?? videos[0]?.voice?.provider ?? "auto";
const provider = wanted === "auto" ? (ELEVEN_KEY ? "elevenlabs" : P.hasSay ? "say" : "none") : wanted;
if (provider === "elevenlabs" && !ELEVEN_KEY) {
  console.error("--voice elevenlabs needs an ElevenLabs key (plugin settings, voice-setup.mjs, or ELEVENLABS_API_KEY).");
  process.exit(1);
}
if (provider === "say" && !P.hasSay) {
  console.error("--voice say needs macOS. Use --voice elevenlabs or --voice none.");
  process.exit(1);
}
const voice = { provider, key: ELEVEN_KEY, voiceId: process.env.ELEVENLABS_VOICE };
const fallback = wanted === "auto" && provider === "elevenlabs" ? { provider: P.hasSay ? "say" : "none" } : null;

if (CHECK) {
  const c = await P.credits(ELEVEN_KEY);
  console.log(`ElevenLabs key: ${ELEVEN_KEY ? `found (${KEY_SOURCE})` : "not set"}`);
  if (c?.error) console.log(`ElevenLabs: key check failed (${c.error})`);
  else if (c) console.log(`ElevenLabs credits left: ${c.left.toLocaleString()} characters (${c.tier ?? "plan"})${c.resets ? `, resets ${new Date(c.resets * 1000).toISOString().slice(0, 10)}` : ""}`);
  if (videos.length) console.log(`This plan needs: ${P.charactersNeeded(videos, voice).toLocaleString()} characters (${videos.length} video(s), already-voiced lines excluded)`);
  console.log(`Voice that would be used: ${provider}${provider === "say" ? " (macOS, review only)" : ""}`);
  process.exit(0);
}

if (DRY) {
  for (const v of videos) console.log("\n" + P.scriptMarkdown(v, provider));
  process.exit(0);
}

// ---- render --------------------------------------------------------------------
await P.stageImages(videos, path.dirname(PLAN_PATH));
const used = await P.voiceVideos(videos, voice, { fallback });
console.log(`Voice: ${used}${used === "none" ? " (captions only)" : used === "say" ? " (macOS, review only)" : ""}`);
console.log("Bundling…");
const done = [];
for (const v of videos) {
  const dir = path.join(OUT, v.videoId);
  console.log(`▶ ${v.videoId}  ${P.lengthSeconds(v)} s`);
  let last = -1;
  await P.renderVideo(v, dir, {
    provider: used,
    gif: !flag("no-gif"),
    video: !flag("no-video"),
    onProgress: ({ step, progress }) => {
      if (step !== "video") return console.log(`  ✓ ${step === "gif" ? "preview.gif" : "thumbnail"}`);
      const p = Math.floor(progress * 10);
      if (p !== last) process.stdout.write(`  ${p * 10}%${p === 10 ? "\n" : ""}`);
      last = p;
    },
  });
  if (!flag("no-video")) console.log(`  ✓ ${v.videoId}.mp4`);
  done.push(dir);
}
console.log(`\nDone. ${done.length} video(s) in ${OUT}`);
for (const d of done) console.log(`  ${d}`);
process.exit(0);
