// One personalised, faceless outreach video: on-screen text, real VS360
// screens with the prospect's agency in them, voiceover, burned-in captions and
// a music bed ducked under the voice. Everything comes from props (one video
// in the plan the necx-outreach-planner skill writes); see README.md.
import "@fontsource/poppins/latin-400.css";
import "@fontsource/poppins/latin-500.css";
import "@fontsource/poppins/latin-600.css";
import "@fontsource/poppins/latin-700.css";
import "@fontsource/poppins/latin-800.css";
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import {
  IconAlertTriangle, IconArrowBackUp, IconBrowser, IconChartBar, IconCheck, IconLayoutGrid, IconMail, IconPlayerPlayFilled, IconSparkles,
} from "@tabler/icons-react";
import { easeOut, enter, pop, tween } from "./anim";
import { C, FONT, GRAD_TEXT } from "./theme";
import { Background, Brand, Card, Headline, Kicker, Logo, Sub } from "./ui";
import { SH, SW, Screen, screenInfo } from "./Screen";
import { Tour } from "./Tour";
import { T, plan } from "./timeline";

const MODULE_LABEL = {
  dashboard: "Dashboard", cases: "Case management", referrals: "Case referrals", hotline: "24/7 hotline", shelters: "Shelter management",
  reports: "Grant reporting", voca: "VOCA reporting", hud: "HUD APR & CAPER", fvpsa: "FVPSA reporting", stop: "VAWA STOP reporting",
  hhsc: "Texas HHSC reporting", vclg: "Texas OAG VCLG", access: "Staff & access", calendar: "Calendar & time", notes: "Notes Center",
  drive: "NECX Drive", network: "Partner network", services: "Service catalog",
};

// ---- captions: each line in short phrases, timed by length -------------------
function phrases(text) {
  const parts = text.split(/(?<=[.,:;!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const p of parts) {
    const last = out[out.length - 1];
    if (last && last.length + p.length < 58 && !/[.!?]$/.test(last)) out[out.length - 1] = `${last} ${p}`;
    else out.push(p);
  }
  return out.flatMap((p) => {
    if (p.length <= 72) return [p];
    const words = p.split(" ");
    let a = "";
    while (words.length && a.length < p.length / 2) a += (a ? " " : "") + words.shift();
    return [a, words.join(" ")];
  });
}

function Captions({ lines }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const line = lines.find((l) => frame >= l.cue && frame <= l.cue + (l.seconds + 0.4) * fps);
  if (!line) return null;
  const chunks = phrases(line.text);
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const t = (frame - line.cue) / fps;
  let at = 0;
  let k = 0;
  for (; k < chunks.length - 1; k++) {
    at += (chunks[k].length / total) * line.seconds;
    if (t < at) break;
  }
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 30, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ maxWidth: 1600, padding: "12px 28px", borderRadius: 12, background: "rgba(7,13,18,0.88)", color: C.white, fontFamily: FONT, fontWeight: 600, fontSize: 36, lineHeight: 1.3, textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.35)" }}>
        {chunks[k]}
      </div>
    </div>
  );
}

// ---- scenes --------------------------------------------------------------------

// a tilted VS360 window with the prospect's agency in it
function AppWindow({ who, id = "dashboard", width = 900, style }) {
  const s = width / SW;
  return (
    <div style={{ width, height: SH * s, borderRadius: 18, overflow: "hidden", boxShadow: `0 50px 120px rgba(0,0,0,0.55), 0 0 0 2px ${C.primary}66`, ...style }}>
      <div style={{ width: SW, height: SH, transform: `scale(${s})`, transformOrigin: "0 0" }}>
        <Screen id={id} who={who} />
      </div>
    </div>
  );
}

function TitleScene({ scene, v }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const r = v.recipient;
  const tag = pop(frame, fps, 2);
  const win = pop(frame, fps, 24, { damping: 16 });
  const agency = v.kind === "agency";
  const big = agency ? r.org : r.firstName;
  // long agency names shrink to fit the left column
  const bigSize = agency ? Math.max(62, Math.min(130, Math.round(1500 / Math.max(11, big.length)))) : 150;
  const sub = agency ? "" : [r.title, r.org].filter(Boolean).join(" · ");
  return (
    <AbsoluteFill>
      <Background />
      <div style={{ position: "absolute", left: 110, top: 70, display: "flex", alignItems: "center", gap: 14 }}>
        <Logo size={52} white />
        <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 30, letterSpacing: 3, color: C.white }}>NECX</span>
      </div>
      <div style={{ position: "absolute", left: 110, top: 250, width: 760, display: "flex", flexDirection: "column", gap: 26 }}>
        <div style={{ transform: `scale(${tag})`, transformOrigin: "left center", opacity: Math.min(1, tag * 1.5) }}>
          <Kicker icon={IconPlayerPlayFilled}>{agency ? "A short video for the team at" : "A short video for"}</Kicker>
        </div>
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: bigSize, lineHeight: 1.05, letterSpacing: -bigSize * 0.026, ...GRAD_TEXT, ...enter(pop(frame, fps, 8), 40) }}>{big}</div>
        {sub ? <Sub delay={18} size={38} color={C.text}>{sub}</Sub> : null}
        {scene.topic ? (
          <div style={{ marginTop: 18, ...enter(pop(frame, fps, 30), 20) }}>
            <div style={{ width: 70, height: 5, borderRadius: 4, background: C.primary, marginBottom: 22 }} />
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 44, lineHeight: 1.2, color: C.white }}>{scene.topic}</div>
          </div>
        ) : null}
        {v.sender?.name ? <Sub delay={40} size={26}>From {v.sender.name} at NECX</Sub> : null}
      </div>
      {v.personalizeScreens !== false ? (
        <div style={{ position: "absolute", right: 80, top: 250, opacity: Math.min(1, win * 1.3), transform: `perspective(2200px) rotateY(-9deg) rotateX(3deg) translateX(${(1 - win) * 120}px)`, transformOrigin: "100% 50%" }}>
          <AppWindow who={r} width={940} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

function ProblemScene({ scene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Background />
      <Brand />
      <div style={{ position: "absolute", left: 110, top: 70 }}><Kicker icon={IconAlertTriangle}>{scene.kicker ?? "Sound familiar?"}</Kicker></div>
      <div style={{ position: "absolute", left: 110, right: 110, top: 140 }}>
        <Headline size={68} delay={4} stagger={3} text={scene.headline} />
      </div>
      <div style={{ position: "absolute", left: 110, right: 110, top: 420, display: "flex", flexDirection: "column", gap: 22 }}>
        {(scene.lines ?? []).slice(0, 3).map((line, k) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 24, padding: "24px 34px", borderRadius: 22, background: "rgba(12,20,26,0.9)", border: "1.5px solid rgba(255,155,155,0.4)", ...enter(pop(frame, fps, 24 + k * 14), 26) }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: "rgba(250,112,112,0.16)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><IconAlertTriangle size={34} color="#ff9b9b" /></div>
            <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 36, color: C.white, lineHeight: 1.3 }}>{line}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

// the prospect's public homepage, slowly zooming (text and layout only)
function WebsiteScene({ scene, v }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const z = 1 + 0.08 * tween(frame, 0, durationInFrames);
  return (
    <AbsoluteFill>
      <Background />
      <Brand />
      <div style={{ position: "absolute", left: 110, top: 50 }}><Kicker icon={IconBrowser}>{scene.kicker ?? v.recipient.org}</Kicker></div>
      <div style={{ position: "absolute", left: 210, top: 120, width: 1500, height: 840, borderRadius: 18, overflow: "hidden", background: "#fff", boxShadow: "0 50px 120px rgba(0,0,0,0.55)" }}>
        <div style={{ height: 44, background: "#e9eef2", display: "flex", alignItems: "center", gap: 10, padding: "0 18px" }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{ width: 14, height: 14, borderRadius: 99, background: c }} />)}
          <span style={{ marginLeft: 18, fontFamily: FONT, fontSize: 18, color: "#5f7180" }}>{scene.url ?? ""}</span>
        </div>
        <div style={{ width: "100%", height: 796, overflow: "hidden" }}>
          <Img src={staticFile(scene.image)} style={{ width: "100%", transform: `scale(${z})`, transformOrigin: "50% 0" }} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

function TourScene({ block, v }) {
  const frame = useCurrentFrame();
  let start = 0;
  let i = 0;
  for (; i < block.shots.length - 1; i++) {
    if (frame < start + block.shots[i].frames) break;
    start += block.shots[i].frames;
  }
  const local = frame - start;
  const sc = block.shots[i].scene;
  const info = screenInfo(sc.screen) ?? {};
  const title = sc.title ?? info.title;
  const body = sc.body ?? info.body;
  const scale = 1240 / SW;
  const textIn = tween(local, 4, 16, 0, 1, easeOut);
  const textOut = 1 - tween(local, block.shots[i].frames - 8, block.shots[i].frames);
  const shots = block.shots.map((x) => ({ id: x.scene.screen, frames: x.frames, target: x.scene.target, zoom: x.scene.zoom ?? screenInfo(x.scene.screen)?.zoom ?? undefined, label: x.scene.label }));
  return (
    <AbsoluteFill>
      <Background />
      <div style={{ position: "absolute", left: 76, top: 40 }}><Kicker icon={IconLayoutGrid}>{sc.kicker ?? MODULE_LABEL[info.module] ?? "NECX"}</Kicker></div>
      <Brand />
      <div style={{ position: "absolute", left: 70, top: 96, width: SW * scale, height: SH * scale, borderRadius: 14, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.45)" }}>
        <div style={{ width: SW, height: SH, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
          <Tour shots={shots} who={v.personalizeScreens !== false ? v.recipient : null} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 70 + SW * scale + 48, right: 64, top: 96, height: SH * scale, display: "flex", flexDirection: "column", justifyContent: "center", gap: 20, opacity: textIn * textOut, transform: `translateY(${(1 - textIn) * 24}px)` }}>
        {block.shots.length > 1 ? (
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 22, letterSpacing: 3, color: C.dim }}>
            {String(i + 1).padStart(2, "0")} <span style={{ color: C.faint }}>/ {String(block.shots.length).padStart(2, "0")}</span>
          </div>
        ) : null}
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 44, lineHeight: 1.1, letterSpacing: -0.5, ...GRAD_TEXT }}>{title}</div>
        <div style={{ width: 64, height: 4, borderRadius: 4, background: C.primary }} />
        <div style={{ fontFamily: FONT, fontSize: 25, lineHeight: 1.5, color: C.text }}>{body}</div>
      </div>
      {block.shots.length > 1 ? (
        <div style={{ position: "absolute", left: 70, width: SW * scale, top: 96 + SH * scale + 22, display: "flex", gap: 6 }}>
          {block.shots.map((s, k) => {
            const fill = k < i ? 1 : k > i ? 0 : Math.min(1, local / s.frames);
            return (
              <div key={k} style={{ flex: 1, height: 6, borderRadius: 6, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
                <div style={{ width: `${fill * 100}%`, height: "100%", background: C.primary }} />
              </div>
            );
          })}
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

function ChecklistScene({ scene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = (scene.items ?? []).slice(0, 4);
  return (
    <AbsoluteFill>
      <Background />
      <Brand />
      <div style={{ position: "absolute", left: 110, top: 70 }}><Kicker icon={IconSparkles}>{scene.kicker ?? "What changes"}</Kicker></div>
      <div style={{ position: "absolute", left: 110, right: 110, top: 140 }}>
        <Headline size={64} delay={4} stagger={3} text={scene.headline} />
      </div>
      <div style={{ position: "absolute", left: 110, right: 110, top: 360, display: "grid", gridTemplateColumns: `repeat(${Math.min(items.length, 2)}, 1fr)`, gap: 26 }}>
        {items.map((t, k) => (
          <Card key={k} p={pop(frame, fps, 18 + k * 12)} style={{ display: "flex", alignItems: "center", gap: 22, padding: "32px 34px" }}>
            <div style={{ width: 64, height: 64, borderRadius: 99, background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><IconCheck size={38} color={C.secondary} stroke={3} /></div>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 34, lineHeight: 1.25, color: C.white }}>{t}</span>
          </Card>
        ))}
      </div>
    </AbsoluteFill>
  );
}

function StatScene({ scene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, 6, { damping: 12 });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <Background />
      <Brand />
      <div style={{ position: "absolute", left: 110, top: 70 }}><Kicker icon={IconChartBar}>{scene.kicker ?? "By the numbers"}</Kicker></div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, marginTop: -40 }}>
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 200, lineHeight: 1, letterSpacing: -6, transform: `scale(${p})`, ...GRAD_TEXT }}>{scene.value}</div>
        <Sub center delay={14} size={44} color={C.white} style={{ fontWeight: 700, maxWidth: 1400 }}>{scene.label}</Sub>
        {scene.source ? <Sub center delay={24} size={22} color={C.faint}>Source: {scene.source}</Sub> : null}
      </div>
    </AbsoluteFill>
  );
}

function CtaScene({ scene, v }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, 0, { damping: 12 });
  const btn = pop(frame, fps, 30);
  const pulse = 1 + Math.sin(frame / 6) * 0.025 * tween(frame, 40, 50);
  const s = v.sender ?? {};
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <Background />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 30, marginTop: -60, padding: "0 140px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, transform: `scale(${p})` }}>
          <Logo size={96} white />
          <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 80, letterSpacing: 6, ...GRAD_TEXT }}>NECX</span>
        </div>
        <Headline center size={64} delay={8} text={scene.headline ?? "See it with *your* *own* *data.*"} />
        {scene.question ? <Sub center delay={20} size={34} color={C.text} style={{ maxWidth: 1400 }}>{scene.question}</Sub> : null}
        <div style={{ transform: `scale(${btn * pulse})`, opacity: btn, display: "flex", alignItems: "center", gap: 16, padding: "22px 44px", borderRadius: 999, background: `linear-gradient(90deg, ${C.primaryBright}, ${C.primary})`, boxShadow: `0 20px 60px ${C.primary}77`, fontFamily: FONT, fontWeight: 700, fontSize: 36, color: C.secondary }}>
          <IconArrowBackUp size={38} stroke={3} /> {scene.button ?? "Just reply to this email"}
        </div>
        {s.name || s.email ? (
          <div style={{ display: "flex", alignItems: "center", gap: 14, opacity: tween(frame, 44, 58), fontFamily: FONT, fontWeight: 700, fontSize: 36, color: C.white }}>
            <IconMail size={38} color={C.primaryBright} />
            <span>{s.name}</span>
            {s.title ? <span style={{ color: C.dim, fontWeight: 500 }}>· {s.title}</span> : null}
            {s.email ? <span style={{ color: C.primaryBright, fontWeight: 600 }}>· {s.email}</span> : null}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
}

// ---- assembly ----------------------------------------------------------------

function Soundtrack({ lines }) {
  const { durationInFrames, fps } = useVideoConfig();
  const ranges = lines.map((l) => [l.cue, l.cue + Math.ceil(l.seconds * fps)]);
  const volume = (f) => {
    let duck = 0;
    for (const [a, b] of ranges) {
      const d = f < a ? a - f : f > b ? f - b : 0;
      duck = Math.max(duck, 1 - Math.min(1, d / 6));
    }
    const edge = Math.min(1, f / 10, (durationInFrames - f) / (1.5 * fps));
    return 0.42 * edge * (1 - 0.72 * duck);
  };
  return <Audio src={staticFile("music/necx-outreach.m4a")} volume={volume} loop />;
}

const VIEWS = { title: TitleScene, problem: ProblemScene, website: WebsiteScene, checklist: ChecklistScene, stat: StatScene, cta: CtaScene };

// thumbnail: a clean title frame with a play button (for the email)
function PlayBadge() {
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 1960 - 80 - 470 - 95 - 40, top: 250 + 294 - 95, width: 190, height: 190, borderRadius: 999, background: "rgba(7,13,18,0.55)", border: "5px solid rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.45)" }}>
        <IconPlayerPlayFilled size={96} color="#fff" style={{ marginLeft: 12 }} />
      </div>
    </AbsoluteFill>
  );
}

export function OutreachVideo(props) {
  const { blocks, cues } = plan(props.scenes ?? []);
  const lines = cues.map(({ scene, cue }) => ({
    cue,
    seconds: scene.audio?.seconds ?? scene.vo.split(/\s+/).length / 2.5,
    text: scene.caption ?? scene.vo,
    file: scene.audio?.file,
    start: Math.max(0, cue - Math.round((scene.audio?.onset ?? 0) * 30)),
  }));
  return (
    <AbsoluteFill style={{ background: C.secondaryDeep }}>
      <TransitionSeries>
        {blocks.flatMap((b, i) => {
          const View = b.kind === "tour" ? null : VIEWS[b.kind];
          const seq = (
            <TransitionSeries.Sequence key={`s-${i}`} durationInFrames={b.frames}>
              {b.kind === "tour" ? <TourScene block={b} v={props} /> : View ? <View scene={b.scenes[0]} v={props} /> : null}
            </TransitionSeries.Sequence>
          );
          return i === 0 ? [seq] : [<TransitionSeries.Transition key={`t-${i}`} presentation={fade()} timing={linearTiming({ durationInFrames: T })} />, seq];
        })}
      </TransitionSeries>
      {props.thumbnail ? <PlayBadge /> : null}
      {props.captions !== false && !props.thumbnail ? <Captions lines={lines} /> : null}
      {props.music !== false && !props.thumbnail ? <Soundtrack lines={lines} /> : null}
      {props.thumbnail
        ? null
        : lines.filter((l) => l.file).map((l, k) => (
            <Sequence key={k} from={l.start} layout="none">
              <Audio src={staticFile(l.file)} />
            </Sequence>
          ))}
    </AbsoluteFill>
  );
}
