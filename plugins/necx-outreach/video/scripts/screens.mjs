// Maintainer tool: rebuilds public/screens/ (the real VS360 screens the outreach
// videos use) from the necx-advertisement-video project, where every screen was
// captured from the real vs360-webapp with fictional data (capture-vs360/).
//
//   AD_ROOT=../necx-advertisement-video npm run screens
//
// For each screen in LIST it copies the 2x JPEG (re-encoded smaller with macOS
// `sips`), and takes the verified on-screen copy (title, body, voiceover line)
// and highlight box from that video's src/<set>/script.js. Writes
// public/screens/catalog.json, which the skill reads to pick screens per persona.
// Sales users never run this; the screens ship in the plugin.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AD = path.resolve(process.env.AD_ROOT ?? path.join(HERE, "../../../../../necx-advertisement-video"));
const OUT = path.join(HERE, "public/screens");
if (!existsSync(path.join(AD, "src"))) {
  console.error(`necx-advertisement-video not found at ${AD}. Set AD_ROOT.`);
  process.exit(1);
}

// [id, module, "set/src"] — module groups screens for the skill's persona picks
const LIST = [
  // the dashboard has no tour copy in the ad project; written from what the screen shows
  ["dashboard", "dashboard", "why/dashboard", { title: "Your day at a glance", body: "Caseload, shelter beds, the hotline and what needs attention, the moment staff sign in.", vo: null, target: { x: 96, y: 204, w: 1328, h: 124 }, zoom: 1.0 }],
  ["cases-overview", "cases", "cases/overview"],
  ["cases-consent", "cases", "cases/demo-consent"],
  ["cases-documents", "cases", "cases/tab-documents"],
  ["cases-notes", "cases", "cases/tab-notes"],
  ["cases-chat", "cases", "cases/tab-chat"],
  ["cases-staff", "cases", "cases/staff"],
  ["cases-partners", "cases", "cases/partners"],
  ["cases-preassessment", "cases", "cases/send-pre"],
  ["referral-sharing", "referrals", "why/refer-sharing"],
  ["hotline-command", "hotline", "hotline/command"],
  ["hotline-callbacks", "hotline", "hotline/callbacks"],
  ["hotline-missed", "hotline", "hotline/missed"],
  ["hotline-log", "hotline", "hotline/log"],
  ["hotline-analytics", "hotline", "hotline/analytics"],
  ["hotline-roles", "hotline", "hotline/roles"],
  ["shelter-board", "shelters", "shelters/board"],
  ["shelter-checkin", "shelters", "shelters/assign"],
  ["shelter-waitlist", "shelters", "shelters/waitlist"],
  ["shelter-rollcall", "shelters", "shelters/rollcall"],
  ["shelter-transfer", "shelters", "shelters/transfer"],
  ["shelter-partners", "shelters", "shelters/partners"],
  ["shelter-app-requests", "shelters", "shelters/mobile"],
  ["shelter-incidents", "shelters", "shelters/incidents"],
  ["reports-library", "reports", "reports/library"],
  ["reports-grants", "reports", "reports/grants"],
  ["reports-case-grant", "reports", "reports/case-grant"],
  ["reports-grant-form", "reports", "reports/grant-form"],
  ["reports-staff-hours", "reports", "reports/staff-hours"],
  ["ai-builder", "reports", "reports/builder-landing"],
  ["ai-report", "reports", "reports/ai-report"],
  ["ai-accuracy", "reports", "reports/accuracy"],
  ["board-charts", "reports", "board/board-charts"],
  ["voca-ready", "voca", "reports/voca"],
  ["voca-log-service", "voca", "voca/log-service"],
  ["voca-generate", "voca", "voca/validator"],
  ["voca-sheet", "voca", "voca/sheet"],
  ["voca-reminders", "voca", "voca/reminders"],
  ["hud-projects", "hud", "hud/projects"],
  ["hud-rollcall", "hud", "hud/rollcall"],
  ["hud-missing", "hud", "hud/missing"],
  ["hud-sage-ready", "hud", "hud/sage-ready"],
  ["hud-sage-rules", "hud", "hud/sage-rules"],
  ["fvpsa-report", "fvpsa", "reports/fvpsa-c"],
  ["fvpsa-explain", "fvpsa", "fvpsa/explain"],
  ["fvpsa-quality", "fvpsa", "fvpsa/quality"],
  ["stop-home", "stop", "stop/vawa-home"],
  ["stop-victims", "stop", "stop/vs-1"],
  ["stop-legal", "stop", "stop/case-legal"],
  ["stop-quality", "stop", "stop/quality"],
  ["hhsc-generate", "hhsc", "hhsc/ready"],
  ["hhsc-files", "hhsc", "hhsc/files"],
  ["hhsc-hotline", "hhsc", "hhsc/hotline-hhsc"],
  ["vclg-quality", "vclg", "vclg/quality"],
  ["vclg-signoff", "vclg", "vclg/signoff"],
  ["staff-roles", "access", "staff/roles"],
  ["staff-role-actions", "access", "staff/role-cases"],
  ["staff-team", "access", "staff/staff"],
  ["staff-offboard", "access", "staff/edit-user"],
  ["calendar-month", "calendar", "calendar/month"],
  ["calendar-court", "calendar", "calendar/court-notify"],
  ["time-hours", "calendar", "calendar/hours"],
  ["notes-list", "notes", "notes/list"],
  ["drive", "drive", "drive/my"],
  ["drive-links", "drive", "drive/link"],
  ["network", "network", "connect/directory"],
  ["network-chat", "network", "connect/agency-chat"],
  ["services-catalog", "services", "services/grid"],
];

// pull { src, target: R(x,y,w,h) | "text", zoom, title, body, vo } blocks out of a
// script.js; text targets resolve through that set's capture manifest
function shotsOf(set) {
  const mf = path.join(AD, "public", set, "manifest.json");
  const manifest = existsSync(mf) ? JSON.parse(readFileSync(mf, "utf8")) : {};
  const file = path.join(AD, "src", set, "script.js");
  if (!existsSync(file)) return {};
  const text = readFileSync(file, "utf8");
  const out = {};
  for (const m of text.matchAll(/\{[^{}]*?src:\s*"([^"]+)"[^{}]*?\}/g)) {
    const blk = m[0];
    const str = (k) => blk.match(new RegExp(`${k}:\\s*"((?:[^"\\\\]|\\\\.)*)"`))?.[1]?.replace(/\\"/g, '"') ?? null;
    const r = blk.match(/target:\s*R\(([^)]*)\)/);
    const named = blk.match(/target:\s*"([^"]+)"/)?.[1];
    const box = named ? (manifest.shots ?? manifest)[m[1]]?.targets?.[named] : null;
    const z = blk.match(/zoom:\s*([\d.]+)/);
    out[m[1]] ??= {
      title: str("title"),
      body: str("body"),
      vo: str("vo"),
      target: r ? Object.fromEntries(r[1].split(",").map((v, i) => [["x", "y", "w", "h"][i], +v])) : box ?? null,
      zoom: z ? +z[1] : null,
    };
  }
  return out;
}

mkdirSync(OUT, { recursive: true });
const cache = {};
const catalog = { width: 1440, height: 900, screens: {} };
for (const [id, module, ref, manual] of LIST) {
  const [set, src] = ref.split("/");
  const jpg = path.join(AD, "public", set, `${src}.jpg`);
  if (!existsSync(jpg)) {
    console.log(`  ✗ ${id}: ${ref}.jpg missing`);
    continue;
  }
  cache[set] ??= shotsOf(set);
  const s = manual ?? cache[set][src] ?? {};
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "72", "-Z", "2160", jpg, "--out", path.join(OUT, `${id}.jpg`)], { stdio: "ignore" });
  catalog.screens[id] = { module, title: s.title, body: s.body, vo: s.vo, target: s.target, zoom: s.zoom, from: ref };
  console.log(`  ✓ ${id}  ${s.title ?? "(no copy)"}`);
}
writeFileSync(path.join(OUT, "catalog.json"), JSON.stringify(catalog, null, 2) + "\n");
console.log(`${Object.keys(catalog.screens).length} screens → public/screens/catalog.json`);

// the skill's screen reference, generated so it never drifts from the catalog
const SKILL_REF = path.join(HERE, "../skills/necx-outreach-video/screens.md");
const rows = Object.entries(catalog.screens).map(([id, s]) => `| \`${id}\` | ${s.module} | ${s.title ?? ""} | ${(s.body ?? "").replace(/\|/g, "/")} |`);
mkdirSync(path.dirname(SKILL_REF), { recursive: true });
writeFileSync(
  SKILL_REF,
  [
    "# Screen catalog (generated by `npm run screens`; don't edit by hand)",
    "",
    "Real VS360 web-app screens captured from vs360-webapp with fictional client data. Use the id as `screen` in a `screen` scene. Title and body are verified copy and are shown by default; override them only with claims you verified on necx.org or docs.necx.org.",
    "",
    "| id | module | default title | default body |",
    "|---|---|---|---|",
    ...rows,
    "",
  ].join("\n"),
);
console.log(`screen reference → ${path.relative(HERE, SKILL_REF)}`);
