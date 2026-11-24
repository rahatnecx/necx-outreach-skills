import { Easing, interpolate, spring } from "remotion";

const smooth = Easing.bezier(0.45, 0, 0.2, 1);
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

// Clamped, eased tween from v0 to v1 between frames f0 and f1.
export function tween(frame, f0, f1, v0 = 0, v1 = 1, easing = smooth) {
  if (f1 <= f0) return frame >= f1 ? v1 : v0;
  return interpolate(frame, [f0, f1], [v0, v1], { easing, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}

// Springy 0 → 1 starting at `delay`.
export function pop(frame, fps, delay = 0, config = { damping: 14, mass: 0.7 }) {
  return spring({ frame: frame - delay, fps, config });
}

// Entrance style: fade + rise + slight scale, driven by a 0 → 1 value.
export function enter(p, rise = 40) {
  return { opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * rise}px) scale(${0.94 + 0.06 * p})` };
}

// Characters of `text` revealed so far when typing starts at `start`.
export function typed(text, frame, start, charsPerFrame = 0.9) {
  const n = Math.max(0, Math.floor((frame - start) * charsPerFrame));
  return text.slice(0, n);
}

// Integer count-up.
export function count(frame, f0, f1, to) {
  return Math.round(tween(frame, f0, f1, 0, to, easeOut));
}
