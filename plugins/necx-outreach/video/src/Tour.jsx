// Guided tour over real VS360 screens: crossfade between shots, a cursor that
// glides to the target and clicks, a slow camera push, a spotlight ring and an
// optional label. From necx-advertisement-video's ScreenTour, drawing each
// shot through <Screen> so the prospect's identity shows in the app.
import { useCurrentFrame } from "remotion";
import { easeOut, tween } from "./anim";
import { C, FONT } from "./theme";
import { SH, SW, Screen, screenInfo } from "./Screen";

const FADE = 10;
const MOVE = [4, 16];
const CLICK = 16;

const rectFor = (shot) => shot.target ?? screenInfo(shot.id)?.target ?? { x: SW / 2 - 100, y: SH / 2 - 40, w: 200, h: 80 };

function camera(shot, local) {
  const r = rectFor(shot);
  const fx = r.x + r.w / 2;
  const fy = r.y + r.h / 2;
  const z0 = Math.max(1, Math.min(shot.zoom ?? 1.25, (0.9 * SW) / (r.w + 24), (0.86 * SH) / (r.h + 24)));
  const p = tween(local, CLICK, shot.frames - 4);
  const z = 1 + (z0 - 1) * p;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const tx = clamp((SW / 2 - fx) * p, -(SW - fx) * (z - 1), fx * (z - 1));
  const ty = clamp((SH / 2 - fy) * p, -(SH - fy) * (z - 1), fy * (z - 1));
  const project = (x, y) => [fx + (x - fx) * z + tx, fy + (y - fy) * z + ty];
  return { r, fx, fy, z, tx, ty, project };
}

function Cursor({ x, y, click }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, pointerEvents: "none" }}>
      {click > 0 && click < 1 ? <div style={{ position: "absolute", left: -28, top: -28, width: 56, height: 56, borderRadius: 99, border: `4px solid ${C.primary}`, opacity: 1 - click, transform: `scale(${0.4 + click * 1.2})` }} /> : null}
      <svg width="34" height="40" viewBox="0 0 24 28" style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.35))" }}>
        <path d="M2 2 L2 22 L7.5 17 L11 25 L14.5 23.5 L11 15.8 L18.5 15.8 Z" fill="#111" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function Shot({ shot, local, cursorFrom, who }) {
  const cam = camera(shot, local);
  const { r, project } = cam;
  const [x0, y0] = project(r.x, r.y);
  const [x1, y1] = project(r.x + r.w, r.y + r.h);
  const ring = tween(local, CLICK, CLICK + 8);
  const label = tween(local, CLICK + 6, CLICK + 14, 0, 1, easeOut);
  const pulse = 0.5 + 0.5 * Math.sin(local / 5);
  const m = tween(local, MOVE[0], MOVE[1], 0, 1, easeOut);
  const [tcx, tcy] = project(r.x + Math.min(r.w / 2, 60), r.y + r.h / 2);
  const cx = cursorFrom[0] + (tcx - cursorFrom[0]) * m;
  const cy = cursorFrom[1] + (tcy - cursorFrom[1]) * m;
  const click = local >= CLICK ? (local - CLICK) / 10 : 0;
  const below = y1 + 86 < SH;
  const lx = Math.max(16, Math.min(SW - 16 - 560, x0));
  const ly = Math.max(16, Math.min(SH - 76, below ? y1 + 18 : y0 - 18 - 58));
  return (
    <>
      <div style={{ position: "absolute", inset: 0, transformOrigin: `${cam.fx}px ${cam.fy}px`, transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.z})` }}>
        <Screen id={shot.id} who={who} />
      </div>
      <div style={{ position: "absolute", left: x0 - 8, top: y0 - 8, width: x1 - x0 + 16, height: y1 - y0 + 16, borderRadius: 14, border: `4px solid ${C.primary}`, boxShadow: `0 0 0 9999px rgba(12,20,26,${0.38 * ring}), 0 0 ${18 + 14 * pulse}px ${C.primary}`, opacity: ring }} />
      {shot.label ? (
        <div style={{ position: "absolute", left: lx, top: ly, maxWidth: 560, padding: "12px 22px", borderRadius: 14, background: C.secondary, color: C.white, fontFamily: FONT, fontWeight: 700, fontSize: 30, lineHeight: 1.2, boxShadow: "0 16px 40px rgba(0,0,0,0.35)", borderLeft: `6px solid ${C.primary}`, opacity: label, transform: `translateY(${(1 - label) * 12}px)` }}>
          {shot.label}
        </div>
      ) : null}
      <Cursor x={cx} y={cy} click={click} />
    </>
  );
}

// shots: [{ id, frames, target?, zoom?, label? }]
export function Tour({ shots, who }) {
  const frame = useCurrentFrame();
  let start = 0;
  let i = 0;
  for (; i < shots.length - 1; i++) {
    if (frame < start + shots[i].frames) break;
    start += shots[i].frames;
  }
  const local = frame - start;
  const prev = i > 0 ? shots[i - 1] : null;
  let cursorFrom = [SW * 0.55, SH * 0.82];
  if (prev) {
    const pr = rectFor(prev);
    cursorFrom = camera(prev, prev.frames).project(pr.x + Math.min(pr.w / 2, 60), pr.y + pr.h / 2);
  }
  const fadeIn = i === 0 ? 1 : tween(local, 0, FADE);
  return (
    <div style={{ position: "relative", width: SW, height: SH, overflow: "hidden", background: "#fff" }}>
      {prev && local < FADE ? (
        <div style={{ position: "absolute", inset: 0 }}>
          <Shot shot={prev} local={prev.frames + local} cursorFrom={cursorFrom} who={who} />
        </div>
      ) : null}
      <div style={{ position: "absolute", inset: 0, opacity: fadeIn }}>
        <Shot shot={shots[i]} local={local} cursorFrom={cursorFrom} who={who} />
      </div>
    </div>
  );
}
