// Renders personalised outreach videos from a plan (the JSON the
// necx-outreach-planner skill writes). For each video:
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
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUN = path.join(HERE, "public/run");

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
if (!planFile && !CHECK) {
  console.error("usage: node scripts/render.mjs plan.json [--out dir] [--only videoId] [--voice auto|elevenlabs|say|none] [--no-gif] [--no-video] [--dry-run]");
  process.exit(1);
}
const PLAN_PATH = planFile ? path.resolve(planFile) : null;
const PLAN_DIR = PLAN_PATH ? path.dirname(PLAN_PATH) : process.cwd();
const OUT = path.resolve(opt("out", path.join(process.cwd(), "necx-outreach-videos")));
const ONLY = opt("only", null);
const DRY = flag("dry-run");

// ---- first run: dependencies -----------------------------------------------------
if (!CHECK && !existsSync(path.join(HERE, "node_modules/remotion"))) {
  console.log("Installing video dependencies (first run, about a minute)…");
  const r = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["install", "--no-audit", "--no-fund"], { cwd: HERE, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// ---- env -----------------------------------------------------------------------
const VOICE_ENV = path.join(os.homedir(), ".config", "necx-outreach", "voice.env");
let KEY_SOURCE = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API ? "environment" : null;
for (const file of [process.env.NECX_ENV_FILE, VOICE_ENV, path.join(HERE, ".env"), path.join(process.cwd(), ".env")].filter(Boolean)) {
  if (!existsSync(file)) continue;
  if (!KEY_SOURCE && /^\s*(ELEVENLABS_API_KEY|ELEVEN_LABS_API)\s*=\s*\S/m.test(readFileSync(file, "utf8"))) KEY_SOURCE = file === VOICE_ENV ? "plugin settings" : file;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY ?? process.env.ELEVEN_LABS_API;

// ---- plan ----------------------------------------------------------------------
const raw = PLAN_PATH ? JSON.parse(readFileSync(PLAN_PATH, "utf8")) : { videos: [] };
const PLAN = Array.isArray(raw) ? { videos: raw } : raw.videos ? raw : { videos: [raw] };
const CATALOG = JSON.parse(readFileSync(path.join(HERE, "public/screens/catalog.json"), "utf8")).screens;
const TYPES = new Set(["title", "problem", "website", "screen", "checklist", "stat", "cta"]);

const problems = [];
const videos = PLAN.videos
  .filter((v) => !ONLY || v.videoId === ONLY)
  .map((v) => {
    const video = { sender: PLAN.sender, ...PLAN.defaults, ...v, recipient: { ...v.recipient } };
    const where = video.videoId ?? "(no videoId)";
    if (!video.videoId || !/^[a-z0-9][a-z0-9-]{1,80}$/.test(video.videoId)) problems.push(`${where}: videoId must be lowercase letters, digits and dashes`);
    if (!video.recipient?.firstName) problems.push(`${where}: recipient.firstName is required`);
    if (!video.recipient?.org) problems.push(`${where}: recipient.org is required`);
    if (/^g$/i.test(video.persona ?? "")) problems.push(`${where}: gatekeepers (persona G) get no video`);
    if (!video.scenes?.length) problems.push(`${where}: no scenes`);
    for (const [i, s] of (video.scenes ?? []).entries()) {
      if (!TYPES.has(s.type)) problems.push(`${where} scene ${i + 1}: unknown type "${s.type}" (use ${[...TYPES].join(", ")})`);
      if (s.type === "screen" && !CATALOG[s.screen]) problems.push(`${where} scene ${i + 1}: unknown screen "${s.screen}" (see public/screens/catalog.json)`);
      if (s.type === "problem" && !s.headline) problems.push(`${where} scene ${i + 1}: problem needs a headline`);
      if (s.type === "checklist" && !s.items?.length) problems.push(`${where} scene ${i + 1}: checklist needs items`);
      if (s.type === "stat" && (!s.value || !s.label)) problems.push(`${where} scene ${i + 1}: stat needs value and label`);
      if (s.type === "website" && !s.image) problems.push(`${where} scene ${i + 1}: website needs image (a screenshot URL or file)`);
    }
    return video;
  });
if (!videos.length && !CHECK) problems.push(ONLY ? `no video with videoId "${ONLY}"` : "the plan has no videos");

// Every contact gets their own script: written for their role and their org,
// never a template. Hard rules are problems; softer signals are warnings.
const warnings = [];
const norm = (t) => (t ?? "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
for (const v of videos) {
  const where = v.videoId;
  const r = v.recipient ?? {};
  const title = v.scenes?.find((s) => s.type === "title");
  if (!title) problems.push(`${where}: start with a title scene`);
  else if (r.firstName && !(title.vo ?? "").includes(r.firstName)) problems.push(`${where}: the title voiceover must say ${r.firstName}'s name`);
  const all = (v.scenes ?? []).map((s) => [s.vo, s.topic, s.headline, s.question, ...(s.lines ?? []), ...(s.items ?? [])].join(" ")).join(" ");
  const orgWords = (r.org ?? "").split(/\s+/).filter((w) => w.length > 3 && !/^(the|and|for|inc|center|centre|services|shelter|family)$/i.test(w));
  if (r.org && !all.includes(r.org) && !orgWords.some((w) => all.includes(w))) warnings.push(`${where}: the script never names ${r.org}; mention the agency at least once`);
  if (!v.scenes?.some((s) => s.type === "screen")) warnings.push(`${where}: no VS360 screens; show the product for their role`);
  if (!(v.sources ?? []).length) warnings.push(`${where}: no sources; list the org-fact URLs the script relies on`);
  if (!v.sender?.name || /^your name$/i.test(v.sender.name)) warnings.push(`${where}: sender is the example sender; set your own name (plugin settings) or "sender" in the plan`);
}
for (let i = 0; i < videos.length; i++) {
  for (let j = i + 1; j < videos.length; j++) {
    const a = videos[i];
    const b = videos[j];
    const screens = (v) => (v.scenes ?? []).filter((s) => s.type === "screen").map((s) => s.screen).join(",");
    if (screens(a) && screens(a) === screens(b)) problems.push(`${a.videoId} and ${b.videoId} show the same screens in the same order; pick screens for each person's role`);
    const lines = (v) => new Set((v.scenes ?? []).filter((s) => s.type !== "cta" && s.vo).map((s) => norm(s.vo)));
    const la = lines(a);
    const shared = [...lines(b)].filter((l) => la.has(l));
    if (shared.length > 1) problems.push(`${a.videoId} and ${b.videoId} share ${shared.length} identical voiceover lines; write each script for its person`);
    else if (shared.length === 1) warnings.push(`${a.videoId} and ${b.videoId} share a voiceover line: "${shared[0].slice(0, 70)}…"`);
  }
}
for (const w of warnings) console.warn(`  ! ${w}`);
if (problems.length) {
  console.error("Plan problems:\n  " + problems.join("\n  "));
  process.exit(1);
}

// ---- voice ---------------------------------------------------------------------
// how NECX and funder acronyms should sound (from necx-advertisement-video)
const PRONUNCIATION = {
  "NECX dot org": "necks dot O. R. G.", NECX: "necks", VS360: "V. S. three sixty", VOCA: "Voka", HHSC: "H. H. S. C.", HUD: "hud",
  FVPSA: "F. V. P. S. A.", VAWA: "Vah-wah", OVC: "O. V. C.", PMT: "P. M. T.", DAL7: "D. A. L. seven", SASP: "S. A. S. P.", APR: "A. P. R.",
  CAPER: "caper", CoC: "C. o. C.", HMIS: "H. M. I. S.", ESG: "E. S. G.", CSV: "C. S. V.", VCLG: "V. C. L. G.", OAG: "O. A. G.", AI: "A. I.",
};
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const spoken = (text) =>
  Object.entries(PRONUNCIATION)
    .reduce((t, [w, say]) => t.replace(new RegExp(`\\b${esc(w)}\\b`, "g"), say), text)
    .replace(/([\w.+-]+)@necx\.org/g, (_, u) => `${u} at necks dot O. R. G.`)
    .replace(/\*/g, "");

const wanted = opt("voice", null) ?? videos[0]?.voice?.provider ?? "auto";
const hasSay = process.platform === "darwin" && spawnSync("which", ["say"]).status === 0;
let PROVIDER = wanted === "auto" ? (ELEVEN_KEY ? "elevenlabs" : hasSay ? "say" : "none") : wanted;
if (PROVIDER === "elevenlabs" && !ELEVEN_KEY) {
  console.error("--voice elevenlabs needs ELEVENLABS_API_KEY (environment, .env, or NECX_ENV_FILE).");
  process.exit(1);
}
if (PROVIDER === "say" && !hasSay) {
  console.error("--voice say needs macOS. Use --voice elevenlabs or --voice none.");
  process.exit(1);
}

// credits: what ElevenLabs has left vs what this plan's uncached lines need
async function credits() {
  if (!ELEVEN_KEY) return null;
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/user/subscription", { headers: { "xi-api-key": ELEVEN_KEY } });
    if (!res.ok) return { error: `ElevenLabs ${res.status}` };
    const sub = await res.json();
    return { left: (sub.character_limit ?? 0) - (sub.character_count ?? 0), tier: sub.tier, resets: sub.next_character_count_reset_unix };
  } catch (e) {
    return { error: e.message };
  }
}
const lineId = (text, voice, provider) => createHash("sha1").update(`${provider}|${voice?.voiceId ?? ""}|${voice?.speed ?? 1}|${spoken(text)}`).digest("hex").slice(0, 14);
const needed = () =>
  videos.flatMap((v) => v.scenes.filter((s) => s.vo).map((s) => [s.vo, v.voice])).filter(([t, voice]) => !existsSync(path.join(RUN, `vo-${lineId(t, voice, "elevenlabs")}.mp3`))).reduce((n, [t]) => n + spoken(t).length, 0);

if (CHECK) {
  const c = await credits();
  console.log(`ElevenLabs key: ${ELEVEN_KEY ? `found (${KEY_SOURCE})` : "not set"}`);
  if (c?.error) console.log(`ElevenLabs: key check failed (${c.error})`);
  else if (c) console.log(`ElevenLabs credits left: ${c.left.toLocaleString()} characters (${c.tier ?? "plan"})${c.resets ? `, resets ${new Date(c.resets * 1000).toISOString().slice(0, 10)}` : ""}`);
  if (videos.length) console.log(`This plan needs: ${needed().toLocaleString()} characters (${videos.length} video(s), already-voiced lines excluded)`);
  console.log(`Voice that would be used: ${PROVIDER}${PROVIDER === "say" ? " (macOS, review only)" : ""}`);
  process.exit(0);
}

const REMOTION_BIN = path.join(HERE, "node_modules/.bin", process.platform === "win32" ? "remotion.cmd" : "remotion");
function seconds(file) {
  const out = execFileSync(REMOTION_BIN, ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file], { encoding: "utf8" });
  return +parseFloat(out.trim()).toFixed(3);
}

async function synth(text, voice) {
  const say = spoken(text);
  const id = lineId(text, voice, PROVIDER);
  const ext = PROVIDER === "elevenlabs" ? "mp3" : "m4a";
  const rel = `run/vo-${id}.${ext}`;
  const file = path.join(HERE, "public", rel);
  if (!existsSync(file)) {
    if (PROVIDER === "elevenlabs") {
      const vid = voice?.voiceId || process.env.ELEVENLABS_VOICE || "EXAVITQu4vr4xnSDxMaL";
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": ELEVEN_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ text: say, model_id: process.env.VO_MODEL ?? "eleven_multilingual_v2", voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true, speed: voice?.speed ?? 1 } }),
      });
      if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    } else {
      const aiff = path.join(os.tmpdir(), `necx-vo-${id}.aiff`);
      execFileSync("say", ["-v", voice?.sayVoice ?? process.env.SAY_VOICE ?? "Samantha", "-r", "175", "-o", aiff, say]);
      execFileSync("afconvert", ["-f", "m4af", "-d", "aac", aiff, file]);
      rmSync(aiff, { force: true });
    }
  }
  return { file: rel, seconds: seconds(file), onset: 0 };
}

// the prospect's homepage screenshot: a URL or a file next to the plan
async function stage(image) {
  const id = createHash("sha1").update(image).digest("hex").slice(0, 14);
  const ext = (image.split("?")[0].match(/\.(png|jpe?g|webp)$/i)?.[1] ?? "png").toLowerCase();
  const rel = `run/site-${id}.${ext}`;
  const file = path.join(HERE, "public", rel);
  if (!existsSync(file)) {
    if (/^https?:\/\//.test(image)) {
      const res = await fetch(image);
      if (!res.ok) throw new Error(`couldn't download ${image}: ${res.status}`);
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    } else {
      copyFileSync(path.resolve(PLAN_DIR, image), file);
    }
  }
  return rel;
}

mkdirSync(RUN, { recursive: true });
// don't start a render ElevenLabs can't finish
if (PROVIDER === "elevenlabs" && !DRY) {
  const c = await credits();
  const need = needed();
  const short = c?.error ? c.error : c && c.left < need ? `${c.left.toLocaleString()} characters left, this plan needs ${need.toLocaleString()}` : null;
  if (short) {
    if (wanted !== "auto") {
      console.error(`ElevenLabs can't voice this plan: ${short}. Top up, or use --voice say for a review render.`);
      process.exit(1);
    }
    PROVIDER = hasSay ? "say" : "none";
    console.warn(`ElevenLabs can't voice this plan (${short}). Using ${PROVIDER} instead; re-render after topping up for the real voice.`);
  }
}
console.log(`Voice: ${PROVIDER}${PROVIDER === "none" ? " (captions only)" : PROVIDER === "say" ? " (macOS, review only)" : ""}`);
async function voiceAll() {
  for (const v of videos) for (const s of v.scenes) if (s.vo && PROVIDER !== "none" && !DRY) s.audio = await synth(s.vo, v.voice);
}
for (const v of videos) for (const s of v.scenes) if (s.type === "website" && !DRY) s.image = await stage(s.image);
try {
  await voiceAll();
} catch (e) {
  // with --voice auto, an ElevenLabs failure (quota, key) falls back for every line, so one video never mixes voices
  if (wanted !== "auto" || PROVIDER !== "elevenlabs") throw e;
  PROVIDER = hasSay ? "say" : "none";
  console.warn(`ElevenLabs failed (${e.message.slice(0, 160)}). Falling back to: ${PROVIDER}.`);
  for (const v of videos) for (const s of v.scenes) delete s.audio;
  await voiceAll();
}

// ---- review script ---------------------------------------------------------------
const { plan } = await import(pathToFileURL(path.join(HERE, "src/timeline.js")).href);
function script(v) {
  const { cues, total } = plan(v.scenes);
  const at = new Map(cues.map((c) => [c.scene, c.cue]));
  const r = v.recipient;
  const rows = v.scenes.map((s, i) => {
    const what = s.type === "screen" ? `${s.screen}: ${s.title ?? CATALOG[s.screen].title}` : s.type === "title" ? `For ${r.firstName} · ${s.topic ?? ""}` : s.headline ?? s.value ?? s.question ?? s.type;
    const t = at.has(s) ? (at.get(s) / 30).toFixed(1) + "s" : "";
    return `| ${i + 1} | ${t} | ${s.type} | ${String(what).replace(/\|/g, "/")} | ${(s.vo ?? "").replace(/\|/g, "/")} |`;
  });
  return [
    `# ${v.videoId}: ${r.firstName} ${r.lastName ?? ""}, ${r.title ?? ""} · ${r.org}`.replace(/\s+/g, " ").trim(),
    "",
    `Length: ${(total / 30).toFixed(1)} s · voice: ${PROVIDER} · screens personalised: ${v.personalizeScreens !== false ? "yes" : "no"}`,
    "",
    "| # | Voice at | Scene | On screen | Voiceover |",
    "|---|---|---|---|---|",
    ...rows,
    "",
    "Product screens are real VS360 captures with fictional client data. Only the agency name, title, initials and greeting are the prospect's.",
    "",
  ].join("\n");
}

if (DRY) {
  for (const v of videos) console.log("\n" + script(v));
  process.exit(0);
}

// ---- render --------------------------------------------------------------------
const { bundle } = await import(pathToFileURL(path.join(HERE, "node_modules/@remotion/bundler/dist/index.js")).href);
const { renderMedia, renderStill, selectComposition } = await import(pathToFileURL(path.join(HERE, "node_modules/@remotion/renderer/dist/index.js")).href);

console.log("Bundling…");
const serveUrl = await bundle({ entryPoint: path.join(HERE, "src/index.js"), publicDir: path.join(HERE, "public") });
const done = [];
for (const v of videos) {
  const dir = path.join(OUT, v.videoId);
  mkdirSync(dir, { recursive: true });
  const props = v;
  writeFileSync(path.join(dir, "props.json"), JSON.stringify(props, null, 2) + "\n");
  writeFileSync(path.join(dir, "script.md"), script(v));
  const comp = await selectComposition({ serveUrl, id: "OutreachVideo", inputProps: props });
  const thumbProps = { ...props, thumbnail: true };
  const thumbComp = await selectComposition({ serveUrl, id: "OutreachVideo", inputProps: thumbProps });
  const still = Math.min(75, comp.durationInFrames - 1);
  console.log(`▶ ${v.videoId}  ${(comp.durationInFrames / 30).toFixed(1)} s`);
  await renderStill({ serveUrl, composition: thumbComp, inputProps: thumbProps, frame: still, output: path.join(dir, "thumbnail.png") });
  await renderStill({ serveUrl, composition: thumbComp, inputProps: thumbProps, frame: still, output: path.join(dir, "thumbnail.jpg"), imageFormat: "jpeg", jpegQuality: 82, scale: 0.5 });
  console.log("  ✓ thumbnail");
  if (!flag("no-gif")) {
    await renderMedia({ serveUrl, composition: thumbComp, inputProps: thumbProps, codec: "gif", frameRange: [0, Math.min(89, thumbComp.durationInFrames - 1)], everyNthFrame: 2, scale: 0.3, outputLocation: path.join(dir, "preview.gif") });
    console.log("  ✓ preview.gif");
  }
  if (!flag("no-video")) {
    let last = -1;
    await renderMedia({
      serveUrl, composition: comp, inputProps: props, codec: "h264", crf: 20, outputLocation: path.join(dir, `${v.videoId}.mp4`),
      onProgress: ({ progress }) => {
        const p = Math.floor(progress * 10);
        if (p !== last) process.stdout.write(`  ${p * 10}%${p === 10 ? "\n" : ""}`);
        last = p;
      },
    });
    console.log(`  ✓ ${v.videoId}.mp4`);
  }
  done.push(dir);
}
console.log(`\nDone. ${done.length} video(s) in ${OUT}`);
for (const d of done) console.log(`  ${d}`);
