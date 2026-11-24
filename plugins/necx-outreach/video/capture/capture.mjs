// Captures the REAL VS360 dashboard (vs360-webapp develop) for the Dashboard ad.
//
//   npm run capture:dashboard
//
// Starts Vite rooted at ../vs360-webapp with the app's own config (icons alias,
// envDir, Tailwind/PostCSS), serves capture/harness.jsx at /__capture,
// and swaps every src/services/* module — plus the socket and hotline-live
// contexts — for stubs answered from capture/fixtures.js (fictional
// data). Nothing in vs360-webapp is modified or contacted on a network.
// Writes public/dashboard/<kind>-top.jpg (viewport), <kind>-full.jpg (whole
// page) and manifest.json (widget boxes, page height) at 1440px wide, 2×.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const AD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// VS360_ROOT points at another checkout (e.g. a git worktree of a feature branch)
const VS = path.resolve(process.env.VS360_ROOT ?? path.join(AD, "../../../../../vs360-webapp"));
if (!existsSync(path.join(VS, "src/layouts/PrivateLayout.jsx"))) {
  console.error(`vs360-webapp not found at ${VS}. Set VS360_ROOT to a vs360-webapp checkout (with npm install done).`);
  process.exit(1);
}
const OUT = path.join(AD, "public", process.argv[2] === "dashboard" || !process.argv[2] ? "dashboard" : process.argv[2] === "probe" ? "probe" : process.argv[2] === "slots" ? "screens" : process.argv[2]);
const PORT = 5198;
const DEBUG_PORT = 9334;
const W = 1440;
const H = 900;
const CHROME = path.join(AD, "node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell");
const FIXTURES = path.join(AD, "capture/fixtures.js");
const TITLES = ["^Good ", "Total Cases", "New Cases", "Resolved This Month", "Avg Response Time", "Total Active Cases", "Quick Note", "Shelter Overview", "Hotline", "Cases Needing Attention", "Team Overview", "Recent Activity", "Upcoming Follow-ups", "Case Notes", "Analytics & Insights"];

mkdirSync(OUT, { recursive: true });
process.chdir(VS); // Tailwind resolves its content globs from the cwd

const { createServer } = await import(pathToFileURL(path.join(VS, "node_modules/vite/dist/node/index.js")).href);
const react = (await import(pathToFileURL(path.join(VS, "node_modules/@vitejs/plugin-react/dist/index.js")).href)).default;

const exportNames = (src) => {
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z0-9_$]+)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) for (const part of m[1].split(",")) {
    const n = part.trim().split(/\s+as\s+/).pop()?.trim();
    if (n && n !== "default") names.add(n);
  }
  return [...names];
};

const stubs = {
  name: "necx-dashboard-stubs",
  enforce: "pre",
  load(id) {
    const file = id.split("?")[0];
    if (id.includes("?real")) return null; // the untouched module, for pure helpers
    if (file.startsWith(path.join(VS, "src/services/")) && /\.(js|jsx|ts)$/.test(file)) {
      const service = path.basename(file).replace(/\.(js|jsx|ts)$/, "");
      const names = exportNames(readFileSync(file, "utf8"));
      // API calls are answered from fixtures; pure helpers (e.g. transform…) stay real
      const isApi = (n) => /^(get|list|create|update|delete|send|post|patch|put|mark|restore|assign|upload|fetch|search|add|remove|start|stop|generate|toggle|accept|reject|invite|link|tag|save|submit|edit|approve|resolve|refer|sign|request|cancel|archive|download|complete|check|verify|validate|run|export|import|move|rename|share|unlink|untag|set|preview)/i.test(n);
      // socket-style subscriptions must hand back an unsubscribe function synchronously
      const isSub = (n) => /^(register|unregister|subscribe|unsubscribe|listen|on[A-Z]|off[A-Z])/.test(n);
      const subs = names.filter(isSub);
      const helpers = names.filter((n) => !isApi(n) && !isSub(n));
      return [
        `import { fixture, override } from "/@fs${FIXTURES}";`,
        helpers.length ? `import * as __real from "/@fs${file}?real";` : "",
        // helpers stay real unless fixtures override them (e.g. API factories like federalReportsApi)
        ...helpers.map((n) => `export const ${n} = override(${JSON.stringify(service)}, ${JSON.stringify(n)}) ?? __real.${n};`),
        ...subs.map((n) => `export const ${n} = () => () => {};`),
        ...names.filter((n) => isApi(n) && !isSub(n)).map((n) => `export const ${n} = (...a) => fixture(${JSON.stringify(service)}, ${JSON.stringify(n)}, a);`),
        // callable too: some default exports are factories (services/axios: createAxiosInstance(baseURL))
        `export default new Proxy(function () {}, { get: (_, k) => (/^(register|unregister|subscribe|on[A-Z]|off[A-Z])/.test(String(k)) ? () => () => {} : (...a) => fixture(${JSON.stringify(service)}, String(k), a)), apply: () => new Proxy({}, { get: (_, m) => (...a) => fixture(${JSON.stringify(service)}, "http." + String(m), a) }) });`,
      ].join("\n");
    }
    if (file === path.join(VS, "src/context/SocketContext.jsx")) {
      return `import { createContext } from "react";
export const SocketContext = createContext(null);
const api = new Proxy({}, { get: (_, k) => (k === "socket" ? null : k === "isConnected" ? false : () => () => {}) }); // register* calls return an unsubscribe
export const SocketProvider = ({ children }) => children;
export const useSocket = () => api;
export default SocketContext;`;
    }
    if (file === path.join(VS, "src/context/HotlineLiveContext.jsx") && !process.env.REAL_HOTLINE) {
      return `const api = new Proxy({}, { get: () => () => {} });
export const HotlineLiveProvider = ({ children }) => children;
export const useHotlineLive = () => api;`;
    }
    return null;
  },
};

const HTML = `<!doctype html><html><head><meta charset="utf-8" /><style>html,body{margin:0}</style></head>
<body><div id="root"></div><script type="module" src="/@fs${path.join(AD, "capture/harness.jsx")}"></script></body></html>`;

const server = await createServer({
  root: VS,
  configFile: false,
  envDir: path.join(VS, "configs"),
  logLevel: "warn",
  plugins: [
    stubs,
    react(),
    {
      name: "necx-capture-page",
      configureServer(srv) {
        srv.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith("/__capture")) return next();
          res.setHeader("Content-Type", "text/html");
          res.end(await srv.transformIndexHtml(req.url, HTML));
        });
      },
    },
  ],
  resolve: {
    alias: [
      { find: "@tabler/icons-react", replacement: "@tabler/icons-react/dist/esm/icons/index.mjs" },
      // vs360's installed node_modules lags its package.json; borrow this one from the ad project
      { find: /^libphonenumber-js(.*)$/, replacement: path.join(AD, "node_modules/libphonenumber-js") + "$1" },
      { find: /^react-textarea-autosize$/, replacement: path.join(AD, "capture/autosize-shim.jsx") },
      { find: /^flag-icons(.*)$/, replacement: path.join(AD, "node_modules/flag-icons") + "$1" },
    ],
    dedupe: ["react", "react-dom", "react-redux", "@mantine/core", "@mantine/hooks", "@tanstack/react-query", "react-router-dom"],
  },
  server: { port: PORT, strictPort: true, fs: { allow: [VS, AD] } },
});
await server.listen();
if (process.env.SERVE_ONLY) {
  console.log(`serving http://localhost:${PORT}/__capture`);
  await new Promise(() => {});
}

// a throwaway Chrome profile, removed again when the capture ends
const PROFILE = mkdtempSync(path.join(tmpdir(), "necx-dash-"));
const dropProfile = () => rmSync(PROFILE, { recursive: true, force: true });
process.on("exit", dropProfile);
const chrome = spawn(CHROME, [
  "--headless",
  `--remote-debugging-port=${DEBUG_PORT}`,
  `--window-size=${W},${H}`,
  "--hide-scrollbars",
  "--no-first-run",
  "--font-render-hinting=none",
  `--user-data-dir=${PROFILE}`,
  "about:blank",
]);

async function json(url) {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`no response from ${url}`);
}
const page = (await json(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).find((p) => p.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let seq = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  } else if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") {
    console.log("  [log]", msg.params.entry.text.slice(0, 300), msg.params.entry.url ?? "");
  } else if (msg.method === "Debugger.paused") {
    // a hung page (see plan steps that pause it): where the main thread is stuck
    console.log("  [paused]\n" + msg.params.callFrames.slice(0, 25).map((f) => `    ${f.functionName || "(anon)"}  ${f.url.split("/").slice(-2).join("/").split("?")[0]}:${f.location.lineNumber + 1}`).join("\n"));
  } else if (msg.method === "Runtime.exceptionThrown") {
    console.log("  [page exception]", (msg.params.exceptionDetails.exception?.description ?? "").split("\n").slice(0, 4).join(" | ").slice(0, 600));
  } else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
    console.log("  [page error]", msg.params.args.map((a) => a.value ?? a.description).join(" ").slice(0, 300));
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  // never hang the run on a busy page
  const r = await Promise.race([
    send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }),
    new Promise((_, rej) => setTimeout(() => rej(new Error(`evaluate timed out: ${expression.slice(0, 80)}`)), 30000)),
  ]);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};
const metrics = (height) => send("Emulation.setDeviceMetricsOverride", { width: W, height, deviceScaleFactor: 2, mobile: false });
const shot = async (file) => {
  const { data } = await send("Page.captureScreenshot", { format: "jpeg", quality: 92, captureBeyondViewport: false });
  writeFileSync(path.join(OUT, file), Buffer.from(data, "base64"));
  console.log(`  ✓ ${file}`);
};

await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
await metrics(H);
await send("Page.navigate", { url: `http://localhost:${PORT}/__capture` });
for (let i = 0; i < 1800; i++) {
  try {
    if (await evaluate("window.__ready === true && document.fonts.status === 'loaded'")) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 100));
}
await new Promise((r) => setTimeout(r, 1500));
await evaluate("window.__stale = true");
await send("Page.reload", {}); // settle Vite's first-load dependency optimisation
for (let i = 0; i < 1800; i++) {
  try {
    if (await evaluate("!window.__stale && window.__ready === true && document.fonts.status === 'loaded'")) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 100));
}

const MODE = process.argv[2] ?? "dashboard";
if (MODE === "dashboard") {
  const manifest = { width: W, viewportHeight: H, shots: {} };
  for (const kind of ["caseWorker", "admin"]) {
    console.log(`▶ ${kind}`);
    await metrics(H);
    await evaluate(`window.__render(${JSON.stringify(kind)})`);
    await shot(`${kind}-top.jpg`);
    const height = await evaluate("document.documentElement.scrollHeight");
    await metrics(height);
    await new Promise((r) => setTimeout(r, 700));
    await shot(`${kind}-full.jpg`);
    const rects = await evaluate(`window.__rects(${JSON.stringify(TITLES)})`);
    manifest.shots[kind] = { height, rects };
    console.log(`    height ${height}px · ${Object.keys(rects).join(", ")}`);
  }
  writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
} else if (MODE === "probe") {
  // npm run capture:probe -- /case-view-2 caseWorker : list the service calls a page makes
  await metrics(H);
  await evaluate(`window.__render(${JSON.stringify(process.argv[4] ?? "caseWorker")}, ${JSON.stringify(process.argv[3] ?? "/dashboard")})`);
  await new Promise((r) => setTimeout(r, 1500));
  const calls = await evaluate("window.__calls");
  const seen = new Map();
  for (const c of calls) seen.set(c.call, c);
  for (const c of seen.values()) console.log(`${c.stubbed ? "  ·" : "  ✓"} ${c.call}  ${c.args}`);
  await shot("probe.jpg");
} else {
  const { run } = await import(pathToFileURL(path.join(AD, `capture/plan-${MODE}.mjs`)).href);
  await run({ evaluate, send, metrics, shot, W, H, OUT_ROOT: path.join(AD, "public") });
}

ws.close();
chrome.kill();
await server.close();
await new Promise((r) => setTimeout(r, 500)); // let Chrome let go of its profile
process.exit(0);
