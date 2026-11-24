// Real VS360 screens (captured from vs360-webapp with fictional data), shown
// with the prospect's identity written into the places the app shows the
// signed-in agency and user: the header's agency name and role, the avatar
// initials, and the dashboard greeting. Positions and text styles come from the
// real layout (capture/plan-slots.mjs → public/screens/slots.json); the colours
// under each spot are read from the screenshot itself, so dimmed screens
// (a dialog open) still match.
import { useEffect, useState } from "react";
import { Img, continueRender, delayRender, staticFile } from "remotion";
import CATALOG from "../public/screens/catalog.json";
import SLOTS from "../public/screens/slots.json";

export const SW = CATALOG.width; // 1440
export const SH = CATALOG.height; // 900
export const screenInfo = (id) => CATALOG.screens[id];
export const screenSrc = (id) => staticFile(`screens/${id}.jpg`);

const FONT = "Poppins, sans-serif";
const samples = new Map(); // src → Promise<colours>, shared by every frame

const ring = (b, pad) => ({ x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 });
const lum = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const css = (c) => `rgb(${c.map(Math.round).join(",")})`;

// background = median of the pixels on a ring just outside the text box;
// foreground = the pixel inside the box that differs most from it
function readColours(img) {
  const k = img.naturalWidth / SW;
  const cv = document.createElement("canvas");
  cv.width = img.naturalWidth;
  cv.height = img.naturalHeight;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const px = (x, y) => {
    const d = ctx.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data;
    return [d[0], d[1], d[2]];
  };
  const colours = (box, pad = 3) => {
    const r = ring(box, pad);
    const edge = [];
    for (let x = r.x; x <= r.x + r.w; x += 2) edge.push(px(x, r.y), px(x, r.y + r.h));
    for (let y = r.y; y <= r.y + r.h; y += 2) edge.push(px(r.x, y), px(r.x + r.w, y));
    const med = [0, 1, 2].map((i) => edge.map((p) => p[i]).sort((a, b) => a - b)[edge.length >> 1]);
    let fg = med;
    for (let y = box.y + 2; y < box.y + box.h - 2; y += 1) for (let x = box.x + 1; x < box.x + box.w - 1; x += 1) {
      const p = px(x, y);
      if (dist(p, med) > dist(fg, med)) fg = p;
    }
    // a flat ring (no text crossing it) is what makes a safe patch
    const flat = edge.filter((p) => dist(p, med) < 18).length / edge.length;
    return { bg: med, fg, ok: flat > 0.85 && dist(fg, med) > 60 };
  };
  // Screens captured as another user/agency have longer or shorter text in the
  // same spot: widen the box column by column while text pixels continue, and
  // stop at a clean gap or where the background itself changes.
  const widen = (box, bg, maxLeft, maxRight) => {
    const col = (x) => {
      let dirty = 0;
      let n = 0;
      for (let y = box.y + 1; y < box.y + box.h - 1; y += 1, n++) if (dist(px(x, y), bg) > 60) dirty++;
      return dirty / Math.max(1, n);
    };
    const side = (from, step, limit) => {
      let edge = from;
      let clean = 0;
      for (let x = from; step < 0 ? x >= from - limit : x <= from + limit; x += step) {
        const d = col(x);
        if (d > 0.6) break; // a different surface (button, avatar edge)
        if (d > 0) {
          edge = x;
          clean = 0;
        } else if (++clean >= 9) break;
      }
      return edge;
    };
    const left = side(box.x, -1, maxLeft);
    const right = side(box.x + box.w, 1, maxRight);
    return { x: left - 1, y: box.y, w: right - left + 2, h: box.h };
  };
  const out = {};
  // measure, widen to the text really there, then re-check the widened box
  const slot = (box, pad, maxLeft, maxRight) => {
    const first = colours(box, pad);
    if (dist(first.fg, first.bg) <= 60) return first;
    const wide = widen(box, first.bg, maxLeft, maxRight);
    return { ...colours(wide, pad), box: wide };
  };
  if (SLOTS.headerGroup) out.header = slot(SLOTS.headerGroup, 3, 480, 4);
  if (SLOTS.initials) out.initials = slot(SLOTS.initials.box, 2, 8, 8);
  if (SLOTS.greeting) out.greeting = colours(SLOTS.greeting.box, 4);
  // the header only counts on screens that have the app header (dark-ish bar)
  if (out.header && lum(out.header.bg) > 0.75) out.header.ok = false;
  if (out.initials && lum(out.initials.bg) > 0.75) out.initials.ok = false;
  if (out.greeting && lum(out.greeting.bg) < 0.75) out.greeting.ok = false;
  return out;
}

function sample(src) {
  if (!samples.has(src)) {
    samples.set(
      src,
      Promise.all([document.fonts.load(`600 12px ${FONT}`), document.fonts.load(`700 24px ${FONT}`)])
        .catch(() => null)
        .then(
          () =>
            new Promise((resolve) => {
              const img = new Image();
              img.onload = () => {
                try {
                  resolve(readColours(img));
                } catch {
                  resolve({});
                }
              };
              img.onerror = () => resolve({});
              img.src = src;
            }),
        ),
    );
  }
  return samples.get(src);
}

let measurer;
function textWidth(text, size, weight) {
  measurer ??= document.createElement("canvas").getContext("2d");
  measurer.font = `${weight} ${size}px ${FONT}`;
  return measurer.measureText(text).width;
}
// biggest size (down to min) that fits; then trim with an ellipsis
function fit(text, size, weight, max, min = size * 0.75) {
  let s = size;
  while (s > min && textWidth(text, s, weight) > max) s -= 0.25;
  let t = text;
  while (t.length > 4 && textWidth(t, s, weight) > max) t = t.slice(0, -2).trimEnd() + "…";
  if (t !== text && !t.endsWith("…")) t += "…";
  return { text: t, size: s };
}

const initialsOf = (r) => [r.firstName, r.lastName].filter(Boolean).map((n) => n.trim()[0]?.toUpperCase()).filter(Boolean).join(" ");

function Personal({ id, who, colours }) {
  const out = [];
  const h = colours.header;
  if (h?.ok && who.org && SLOTS.agency && SLOTS.role) {
    const g = h.box ?? SLOTS.headerGroup;
    const st = SLOTS.agency.style;
    const role = (who.title || SLOTS.role.text).toUpperCase();
    const sep = "  |  ";
    const max = g.w + 6;
    const roleFit = fit(role, st.fontSize, st.fontWeight, max * 0.45);
    const orgFit = fit(who.org, roleFit.size, st.fontWeight, max - textWidth(sep + roleFit.text, roleFit.size, st.fontWeight));
    const r = ring(g, 3);
    out.push(
      <div key="hdr" style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, background: css(h.bg), display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 3, boxSizing: "border-box", whiteSpace: "pre", fontFamily: FONT, fontWeight: st.fontWeight, fontSize: orgFit.size, color: css(h.fg) }}>
        {orgFit.text}
        {sep}
        {roleFit.text}
      </div>,
    );
  }
  const ini = colours.initials;
  const letters = initialsOf(who);
  if (ini?.ok && letters && SLOTS.initials) {
    const b = ini.box ?? SLOTS.initials.box;
    const r = ring(b, 2);
    out.push(
      <div key="ini" style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, background: css(ini.bg), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: SLOTS.initials.style.fontWeight, fontSize: SLOTS.initials.style.fontSize, color: css(ini.fg), whiteSpace: "pre" }}>
        {letters}
      </div>,
    );
  }
  const gr = colours.greeting;
  if (id === "dashboard" && gr?.ok && who.firstName && SLOTS.greeting) {
    const b = SLOTS.greeting.box;
    const st = SLOTS.greeting.style;
    const daypart = SLOTS.greeting.text.match(/^Good (\w+)/)?.[1] ?? "morning";
    const text = `Good ${daypart}, ${who.firstName}`;
    const r = ring(b, 4);
    const w = Math.max(r.w, textWidth(text, st.fontSize, st.fontWeight) + 12);
    out.push(
      <div key="greet" style={{ position: "absolute", left: r.x, top: r.y, width: w, height: r.h, background: css(gr.bg), display: "flex", alignItems: "center", paddingLeft: 4, boxSizing: "border-box", whiteSpace: "pre", fontFamily: FONT, fontWeight: st.fontWeight, fontSize: st.fontSize, color: st.color }}>
        {text}
      </div>,
    );
  }
  return <>{out}</>;
}

// One screen at 1440×900, personalised when `who` is given.
export function Screen({ id, who }) {
  const src = screenSrc(id);
  const [colours, setColours] = useState(null);
  const [handle] = useState(() => (who ? delayRender(`read ${id}`) : null));
  useEffect(() => {
    if (!who) return;
    let live = true;
    sample(src).then((c) => {
      if (live) setColours(c);
      continueRender(handle);
    });
    return () => {
      live = false;
    };
  }, [src]);
  return (
    <div style={{ position: "relative", width: SW, height: SH }}>
      <Img src={src} style={{ width: SW, height: SH, display: "block" }} />
      {who && colours ? <Personal id={id} who={who} colours={colours} /> : null}
    </div>
  );
}
