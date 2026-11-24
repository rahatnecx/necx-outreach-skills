// The video pipeline, shared by the command line (render.mjs) and the render
// server (server/server.mjs): validate a plan, voice it, render it.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const RUN = path.join(HERE, "public/run");
export const CATALOG = JSON.parse(readFileSync(path.join(HERE, "public/screens/catalog.json"), "utf8")).screens;
export const TYPES = ["title", "problem", "website", "screen", "checklist", "stat", "cta"];
const { plan: timeline } = await import(pathToFileURL(path.join(HERE, "src/timeline.js")).href);

// ---- plan ----------------------------------------------------------------------

// raw plan → { videos (sender/defaults merged), problems (block rendering), warnings }
export function validatePlan(raw, { only = null } = {}) {
  const PLAN = Array.isArray(raw) ? { videos: raw } : raw?.videos ? raw : { videos: raw ? [raw] : [] };
  const problems = [];
  const warnings = [];
  const videos = (PLAN.videos ?? [])
    .filter((v) => !only || v.videoId === only)
    .map((v) => {
      const video = structuredClone({ sender: PLAN.sender, ...PLAN.defaults, ...v, recipient: { ...v.recipient } });
      const where = video.videoId ?? "(no videoId)";
      if (!video.videoId || !/^[a-z0-9][a-z0-9-]{1,80}$/.test(video.videoId)) problems.push(`${where}: videoId must be lowercase letters, digits and dashes`);
      if (!video.recipient?.firstName) problems.push(`${where}: recipient.firstName is required`);
      if (!video.recipient?.org) problems.push(`${where}: recipient.org is required`);
      if (/^g$/i.test(video.persona ?? "")) problems.push(`${where}: gatekeepers (persona G) get no video`);
      if (!video.scenes?.length) problems.push(`${where}: no scenes`);
      for (const [i, s] of (video.scenes ?? []).entries()) {
        if (!TYPES.includes(s.type)) problems.push(`${where} scene ${i + 1}: unknown type "${s.type}" (use ${TYPES.join(", ")})`);
        if (s.type === "screen" && !CATALOG[s.screen]) problems.push(`${where} scene ${i + 1}: unknown screen "${s.screen}" (see the screen catalog)`);
        if (s.type === "problem" && !s.headline) problems.push(`${where} scene ${i + 1}: problem needs a headline`);
        if (s.type === "checklist" && !s.items?.length) problems.push(`${where} scene ${i + 1}: checklist needs items`);
        if (s.type === "stat" && (!s.value || !s.label)) problems.push(`${where} scene ${i + 1}: stat needs value and label`);
        if (s.type === "website" && !s.image) problems.push(`${where} scene ${i + 1}: website needs image (a screenshot URL)`);
      }
      return video;
    });
  if (!videos.length) problems.push(only ? `no video with videoId "${only}"` : "the plan has no videos");

  // every contact gets their own script, written for their role and org
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
    if (!v.sender?.name || /^your name$/i.test(v.sender.name)) warnings.push(`${where}: no sender name; set "sender" in the plan`);
  }
  const screens = (v) => (v.scenes ?? []).filter((s) => s.type === "screen").map((s) => s.screen).join(",");
  const lines = (v) => new Set((v.scenes ?? []).filter((s) => s.type !== "cta" && s.vo).map((s) => norm(s.vo)));
  for (let i = 0; i < videos.length; i++) {
    for (let j = i + 1; j < videos.length; j++) {
      const [a, b] = [videos[i], videos[j]];
      if (screens(a) && screens(a) === screens(b)) problems.push(`${a.videoId} and ${b.videoId} show the same screens in the same order; pick screens for each person's role`);
      const la = lines(a);
      const shared = [...lines(b)].filter((l) => la.has(l));
      if (shared.length > 1) problems.push(`${a.videoId} and ${b.videoId} share ${shared.length} identical voiceover lines; write each script for its person`);
      else if (shared.length === 1) warnings.push(`${a.videoId} and ${b.videoId} share a voiceover line: "${shared[0].slice(0, 70)}…"`);
    }
  }
  return { videos, problems, warnings };
}

// ---- voice ---------------------------------------------------------------------

// how NECX and funder acronyms should sound (from necx-advertisement-video)
const PRONUNCIATION = {
  "NECX dot org": "necks dot O. R. G.", NECX: "necks", VS360: "V. S. three sixty", VOCA: "Voka", HHSC: "H. H. S. C.", HUD: "hud",
  FVPSA: "F. V. P. S. A.", VAWA: "Vah-wah", OVC: "O. V. C.", PMT: "P. M. T.", DAL7: "D. A. L. seven", SASP: "S. A. S. P.", APR: "A. P. R.",
  CAPER: "caper", CoC: "C. o. C.", HMIS: "H. M. I. S.", ESG: "E. S. G.", CSV: "C. S. V.", VCLG: "V. C. L. G.", OAG: "O. A. G.", AI: "A. I.",
};
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const spoken = (text) =>
  Object.entries(PRONUNCIATION)
    .reduce((t, [w, say]) => t.replace(new RegExp(`\\b${esc(w)}\\b`, "g"), say), text)
    .replace(/([\w.+-]+)@necx\.org/g, (_, u) => `${u} at necks dot O. R. G.`)
    .replace(/\*/g, "");

export const hasSay = process.platform === "darwin" && spawnSync("which", ["say"]).status === 0;
const lineId = (text, voice, provider, defaultVoice) =>
  createHash("sha1").update(`${provider}|${provider === "elevenlabs" ? voice?.voiceId || defaultVoice || "" : voice?.voiceId ?? ""}|${voice?.speed ?? 1}|${spoken(text)}`).digest("hex").slice(0, 14);

const REMOTION_BIN = path.join(HERE, "node_modules/.bin", process.platform === "win32" ? "remotion.cmd" : "remotion");
function seconds(file) {
  const out = execFileSync(REMOTION_BIN, ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file], { encoding: "utf8" });
  return +parseFloat(out.trim()).toFixed(3);
}

// a voice: { provider: "elevenlabs" | "say" | "none", key?, voiceId? }
export async function credits(key) {
  if (!key) return null;
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/user/subscription", { headers: { "xi-api-key": key } });
    if (!res.ok) return { error: `ElevenLabs ${res.status}` };
    const sub = await res.json();
    return { left: (sub.character_limit ?? 0) - (sub.character_count ?? 0), tier: sub.tier, resets: sub.next_character_count_reset_unix };
  } catch (e) {
    return { error: e.message };
  }
}

// characters ElevenLabs would bill for this plan (lines already voiced are cached)
export const charactersNeeded = (videos, voice) =>
  videos
    .flatMap((v) => v.scenes.filter((s) => s.vo).map((s) => [s.vo, v.voice]))
    .filter(([t, vv]) => !existsSync(path.join(RUN, `vo-${lineId(t, vv, "elevenlabs", voice?.voiceId)}.mp3`)))
    .reduce((n, [t]) => n + spoken(t).length, 0);

async function synth(text, vv, voice) {
  const id = lineId(text, vv, voice.provider, voice.voiceId);
  const ext = voice.provider === "elevenlabs" ? "mp3" : "m4a";
  const rel = `run/vo-${id}.${ext}`;
  const file = path.join(HERE, "public", rel);
  if (!existsSync(file)) {
    const say = spoken(text);
    if (voice.provider === "elevenlabs") {
      const vid = vv?.voiceId || voice.voiceId || "EXAVITQu4vr4xnSDxMaL";
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": voice.key, "Content-Type": "application/json" },
        body: JSON.stringify({ text: say, model_id: process.env.VO_MODEL ?? "eleven_multilingual_v2", voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true, speed: vv?.speed ?? 1 } }),
      });
      if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    } else {
      const aiff = path.join(os.tmpdir(), `necx-vo-${id}.aiff`);
      execFileSync("say", ["-v", vv?.sayVoice ?? process.env.SAY_VOICE ?? "Samantha", "-r", "175", "-o", aiff, say]);
      execFileSync("afconvert", ["-f", "m4af", "-d", "aac", aiff, file]);
      rmSync(aiff, { force: true });
    }
  }
  return { file: rel, seconds: seconds(file), onset: 0 };
}

// voices every line with `voice`; if ElevenLabs can't finish and `fallback` is
// set, re-voices every line with the fallback so a video never mixes voices.
// Returns the provider actually used.
export async function voiceVideos(videos, voice, { fallback = null, log = console.warn } = {}) {
  mkdirSync(RUN, { recursive: true });
  let v = voice;
  if (v.provider === "elevenlabs") {
    const c = await credits(v.key);
    const need = charactersNeeded(videos, v);
    const short = c?.error ? c.error : c && c.left < need ? `${c.left.toLocaleString()} characters left, the plan needs ${need.toLocaleString()}` : null;
    if (short) {
      if (!fallback) throw new Error(`ElevenLabs can't voice this plan: ${short}`);
      log(`ElevenLabs can't voice this plan (${short}). Using ${fallback.provider} instead.`);
      v = fallback;
    }
  }
  const all = async () => {
    for (const video of videos) for (const s of video.scenes) if (s.vo && v.provider !== "none") s.audio = await synth(s.vo, video.voice, v);
  };
  try {
    await all();
  } catch (e) {
    if (v.provider !== "elevenlabs" || !fallback) throw e;
    log(`ElevenLabs failed (${e.message.slice(0, 160)}). Falling back to ${fallback.provider}.`);
    v = fallback;
    for (const video of videos) for (const s of video.scenes) delete s.audio;
    await all();
  }
  return v.provider;
}

// the prospect's homepage screenshot (URL or file) into public/run
export async function stageImages(videos, planDir = process.cwd()) {
  mkdirSync(RUN, { recursive: true });
  for (const v of videos) {
    for (const s of v.scenes) {
      if (s.type !== "website" || !s.image || s.image.startsWith("run/")) continue;
      const id = createHash("sha1").update(s.image).digest("hex").slice(0, 14);
      const ext = (s.image.split("?")[0].match(/\.(png|jpe?g|webp)$/i)?.[1] ?? "png").toLowerCase();
      const rel = `run/site-${id}.${ext}`;
      const file = path.join(HERE, "public", rel);
      if (!existsSync(file)) {
        if (/^https?:\/\//.test(s.image)) {
          const res = await fetch(s.image);
          if (!res.ok) throw new Error(`couldn't download ${s.image}: ${res.status}`);
          writeFileSync(file, Buffer.from(await res.arrayBuffer()));
        } else {
          copyFileSync(path.resolve(planDir, s.image), file);
        }
      }
      s.image = rel;
    }
  }
}

// ---- review script ---------------------------------------------------------------

export const lengthSeconds = (v) => +(timeline(v.scenes).total / 30).toFixed(1);

export function scriptMarkdown(v, provider) {
  const { cues, total } = timeline(v.scenes);
  const at = new Map(cues.map((c) => [c.scene, c.cue]));
  const r = v.recipient;
  const rows = v.scenes.map((s, i) => {
    const what = s.type === "screen" ? `${s.screen}: ${s.title ?? CATALOG[s.screen]?.title}` : s.type === "title" ? `For ${r.firstName} · ${s.topic ?? ""}` : s.headline ?? s.value ?? s.question ?? s.type;
    const t = at.has(s) ? (at.get(s) / 30).toFixed(1) + "s" : "";
    return `| ${i + 1} | ${t} | ${s.type} | ${String(what).replace(/\|/g, "/")} | ${(s.vo ?? "").replace(/\|/g, "/")} |`;
  });
  return [
    `# ${v.videoId}: ${r.firstName} ${r.lastName ?? ""}, ${r.title ?? ""} · ${r.org}`.replace(/\s+/g, " ").trim(),
    "",
    `Length: ${(total / 30).toFixed(1)} s · voice: ${provider} · screens personalised: ${v.personalizeScreens !== false ? "yes" : "no"}`,
    "",
    "| # | Voice at | Scene | On screen | Voiceover |",
    "|---|---|---|---|---|",
    ...rows,
    "",
    "Product screens are real VS360 captures with fictional client data. Only the agency name, title, initials and greeting are the prospect's.",
    "",
  ].join("\n");
}

// ---- render --------------------------------------------------------------------

let serveUrl = null;
async function remotion() {
  const { bundle } = await import(pathToFileURL(path.join(HERE, "node_modules/@remotion/bundler/dist/index.js")).href);
  const renderer = await import(pathToFileURL(path.join(HERE, "node_modules/@remotion/renderer/dist/index.js")).href);
  // bundle once per process; voice clips and site images are read from public/ at render time
  serveUrl ??= await bundle({ entryPoint: path.join(HERE, "src/index.js"), publicDir: path.join(HERE, "public") });
  return { ...renderer, serveUrl };
}

// The bundle holds a copy of public/ from when it was built; a long-running
// process (the render server) voices new lines later, so copy them in.
function syncAssets(v, url) {
  const pub = path.join(url, "public");
  if (!existsSync(pub)) return;
  const rels = v.scenes.flatMap((s) => [s.audio?.file, s.type === "website" ? s.image : null]).filter((r) => r?.startsWith("run/"));
  for (const rel of rels) {
    const dest = path.join(pub, rel);
    if (!existsSync(dest)) {
      mkdirSync(path.dirname(dest), { recursive: true });
      copyFileSync(path.join(HERE, "public", rel), dest);
    }
  }
}

// renders one (voiced) video into dir: <name>.mp4, thumbnail.png/.jpg, preview.gif, script.md, props.json
export async function renderVideo(v, dir, { provider, gif = true, video = true, name = v.videoId, onProgress } = {}) {
  const { renderMedia, renderStill, selectComposition, serveUrl: url } = await remotion();
  syncAssets(v, url);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "props.json"), JSON.stringify(v, null, 2) + "\n");
  writeFileSync(path.join(dir, "script.md"), scriptMarkdown(v, provider));
  const comp = await selectComposition({ serveUrl: url, id: "OutreachVideo", inputProps: v });
  const thumbProps = { ...v, thumbnail: true };
  const thumbComp = await selectComposition({ serveUrl: url, id: "OutreachVideo", inputProps: thumbProps });
  const still = Math.min(75, comp.durationInFrames - 1);
  await renderStill({ serveUrl: url, composition: thumbComp, inputProps: thumbProps, frame: still, output: path.join(dir, "thumbnail.png") });
  await renderStill({ serveUrl: url, composition: thumbComp, inputProps: thumbProps, frame: still, output: path.join(dir, "thumbnail.jpg"), imageFormat: "jpeg", jpegQuality: 82, scale: 0.5 });
  onProgress?.({ step: "thumbnail", progress: 0 });
  if (gif) {
    await renderMedia({ serveUrl: url, composition: thumbComp, inputProps: thumbProps, codec: "gif", frameRange: [0, Math.min(89, thumbComp.durationInFrames - 1)], everyNthFrame: 2, scale: 0.3, outputLocation: path.join(dir, "preview.gif") });
    onProgress?.({ step: "gif", progress: 0 });
  }
  if (video) {
    await renderMedia({
      serveUrl: url, composition: comp, inputProps: v, codec: "h264", crf: 20, outputLocation: path.join(dir, `${name}.mp4`),
      onProgress: ({ progress }) => onProgress?.({ step: "video", progress }),
    });
  }
  return { seconds: +(comp.durationInFrames / 30).toFixed(1) };
}
