// Scene timing for one outreach video, shared by the composition and the
// renderer. Every scene lasts as long as its voiceover (plus a little air);
// consecutive `screen` scenes form one guided tour of the product.
export const FPS = 30;
export const T = 12; // crossfade between blocks
export const LEAD = 12; // frames into a scene before its line starts

const MIN = { title: 150, problem: 150, website: 120, screen: 96, checklist: 150, stat: 120, cta: 210 };
const TAIL = { title: 0.9, problem: 0.7, website: 0.6, screen: 0.4, checklist: 0.8, stat: 0.8, cta: 2.2 };

// about 150 spoken words a minute when there's no audio to measure
export const estimateSeconds = (text) => (text ? text.trim().split(/\s+/).length / 2.5 : 0);

export function sceneFrames(scene) {
  const seconds = scene.audio?.seconds ?? estimateSeconds(scene.vo);
  return Math.max(MIN[scene.type] ?? 120, LEAD + Math.ceil((seconds + (TAIL[scene.type] ?? 0.6)) * FPS));
}

// [{ kind: "tour" | <type>, scenes, frames, from }] plus each scene's voice cue
export function plan(scenes) {
  const blocks = [];
  for (const s of scenes) {
    const last = blocks[blocks.length - 1];
    if (s.type === "screen" && last?.kind === "tour") last.scenes.push(s);
    else blocks.push({ kind: s.type === "screen" ? "tour" : s.type, scenes: [s] });
  }
  let at = 0;
  const cues = [];
  for (const b of blocks) {
    b.from = at;
    b.shots = b.scenes.map((s) => ({ scene: s, frames: sceneFrames(s) }));
    b.frames = b.shots.reduce((n, x) => n + x.frames, 0);
    let off = 0;
    for (const x of b.shots) {
      if (x.scene.vo) cues.push({ scene: x.scene, cue: at + off + LEAD + (b.kind === "title" ? 8 : 0) });
      off += x.frames;
    }
    at += b.frames - T;
  }
  const total = Math.max(1, at + T);
  return { blocks, cues, total };
}
