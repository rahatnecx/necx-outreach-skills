// Measures where the demo agency's identity appears in the REAL vs360-webapp
// layout (header agency name, role, avatar initials, dashboard greeting), with
// the computed text style, so the video can write the prospect's agency and
// name into the same spots. Writes public/screens/slots.json.
//
//   VS360_ROOT=../vs360-webapp npm run capture -- slots
import { writeFileSync } from "node:fs";
import path from "node:path";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const measure = () => {
  const find = (m) => {
    const hits = [...document.querySelectorAll("body *")].filter((n) => {
      const t = (n.textContent || "").trim();
      const r = n.getBoundingClientRect();
      return r.width > 0 && m(t) && ![...n.children].some((c) => m((c.textContent || "").trim()));
    });
    return hits[0] ?? null;
  };
  // the text's own box (a Range hugs the glyphs; the element may be wider)
  const textBox = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    return { x: +r.left.toFixed(1), y: +r.top.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
  };
  const style = (el) => {
    const s = getComputedStyle(el);
    return { fontSize: parseFloat(s.fontSize), fontWeight: +s.fontWeight, letterSpacing: s.letterSpacing === "normal" ? 0 : parseFloat(s.letterSpacing), textTransform: s.textTransform, color: s.color, fontFamily: s.fontFamily };
  };
  const slot = (el) => (el ? { box: textBox(el), style: style(el), text: el.textContent.trim() } : null);
  const agency = find((t) => t === "Harbor Light Victim Center");
  const role = find((t) => /^case manager$/i.test(t));
  const initials = find((t) => t === "ML" || t === "M L");
  const greeting = find((t) => /^Good (morning|afternoon|evening), Maria$/.test(t));
  // the header block that holds agency | role, so the overlay can repaint it whole
  let group = agency;
  while (group && role && !group.contains(role)) group = group.parentElement;
  const g = group?.getBoundingClientRect();
  return {
    agency: slot(agency),
    role: slot(role),
    initials: slot(initials),
    greeting: slot(greeting),
    headerGroup: g ? { x: Math.round(g.left), y: Math.round(g.top), w: Math.round(g.width), h: Math.round(g.height) } : null,
  };
};

export async function run({ evaluate, metrics, shot, W, H, OUT_ROOT }) {
  await metrics(H);
  await evaluate(`window.__render("caseWorker", "/dashboard")`);
  await wait(1500);
  const slots = await evaluate(`(${measure})()`);
  const out = path.join(OUT_ROOT, "screens", "slots.json");
  writeFileSync(out, JSON.stringify({ width: W, height: H, demo: { agency: "Harbor Light Victim Center", role: "Case Manager", initials: "ML", firstName: "Maria" }, ...slots }, null, 2) + "\n");
  console.log(JSON.stringify(slots, null, 2));
}
