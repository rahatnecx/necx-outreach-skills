// Brand pieces from necx-advertisement-video (src/components/ui.jsx).
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { enter, pop, tween } from "./anim";
import { C, FONT, GRAD_TEXT } from "./theme";

// secondary navy with drifting primary-teal light, a slow dot grid and a vignette
export function Background({ accent = C.primary }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = frame / 30;
  const size = Math.max(width, height);
  const blobs = [
    { x: 0.16 + Math.sin(t / 3) * 0.05, y: 0.18 + Math.cos(t / 4) * 0.04, s: 0.8, c: accent, o: 0.2 },
    { x: 0.86 + Math.cos(t / 3.5) * 0.05, y: 0.8 + Math.sin(t / 3) * 0.05, s: 0.75, c: C.primary, o: 0.18 },
    { x: 0.6 + Math.sin(t / 5) * 0.06, y: 0.06, s: 0.5, c: C.primaryBright, o: 0.08 },
  ];
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 0%, ${C.secondaryMid} 0%, ${C.secondary} 50%, ${C.secondaryDeep} 100%)` }}>
      {blobs.map((b, i) => (
        <div key={i} style={{ position: "absolute", left: b.x * width - (b.s * size) / 2, top: b.y * height - (b.s * size) / 2, width: b.s * size, height: b.s * size, borderRadius: "50%", background: `radial-gradient(circle, ${b.c} 0%, transparent 62%)`, opacity: b.o }} />
      ))}
      <AbsoluteFill
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1.4px, transparent 1.6px)",
          backgroundSize: "44px 44px",
          backgroundPosition: `${frame * 0.25}px ${frame * 0.12}px`,
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />
      <AbsoluteFill style={{ boxShadow: "inset 0 0 260px rgba(0,0,0,0.5)" }} />
    </AbsoluteFill>
  );
}

export const Logo = ({ size = 120, white = false, style }) => <Img src={staticFile(white ? "logo-white.png" : "logo.png")} style={{ width: size, height: size, ...style }} />;

export const Brand = () => (
  <div style={{ position: "absolute", right: 64, top: 34, display: "flex", alignItems: "center", gap: 10 }}>
    <Logo size={40} white />
    <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 24, letterSpacing: 2, color: C.white }}>NECX</span>
  </div>
);

export const Kicker = ({ children, icon: Icon }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: FONT, fontWeight: 700, fontSize: 22, letterSpacing: 4, color: C.primaryBright, textTransform: "uppercase" }}>
    {Icon ? <Icon size={26} /> : null} {children}
  </div>
);

export const Card = ({ children, style, p = 1 }) => (
  <div style={{ borderRadius: 22, background: "rgba(255,255,255,0.055)", border: `1.5px solid ${C.primary}55`, padding: "26px 30px", ...enter(p, 22), ...style }}>{children}</div>
);

// words spring in one after another; *starred* words get the brand gradient
export function Headline({ text, size = 72, delay = 0, stagger = 3, center = false, weight = 800, color = C.white, lineHeight = 1.12 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ fontFamily: FONT, fontSize: size, fontWeight: weight, lineHeight, letterSpacing: -size * 0.02, color, display: "flex", flexWrap: "wrap", justifyContent: center ? "center" : "flex-start", textAlign: center ? "center" : "left", columnGap: size * 0.26 }}>
      {text.split(" ").map((raw, i) => {
        const hl = raw.startsWith("*");
        const p = pop(frame, fps, delay + i * stagger, { damping: 15, mass: 0.6 });
        return (
          <span key={i} style={{ display: "inline-block", opacity: Math.min(1, p * 1.5), transform: `translateY(${(1 - p) * size * 0.55}px)`, ...(hl ? GRAD_TEXT : null) }}>
            {raw.replace(/\*/g, "")}
          </span>
        );
      })}
    </div>
  );
}

export function Sub({ children, size = 30, delay = 0, center = false, color = C.dim, style }) {
  const frame = useCurrentFrame();
  const p = tween(frame, delay, delay + 14);
  return <div style={{ fontFamily: FONT, fontSize: size, fontWeight: 400, lineHeight: 1.45, color, textAlign: center ? "center" : "left", opacity: p, transform: `translateY(${(1 - p) * 16}px)`, ...style }}>{children}</div>;
}
