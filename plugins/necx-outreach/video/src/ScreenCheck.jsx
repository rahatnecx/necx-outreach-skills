// QA sheet: the personalised header (and greeting) of every catalog screen in
// one image, to spot screens where the overlay doesn't fit.
//   npx remotion still src/index.js ScreenCheck out/screen-check.png
import CATALOG from "../public/screens/catalog.json";
import { Screen } from "./Screen";

const W = 620;
const H = 64;
export const CHECK_COLS = 3;
export const checkSize = () => {
  const n = Object.keys(CATALOG.screens).length;
  return { width: CHECK_COLS * (W + 10) + 10, height: Math.ceil(n / CHECK_COLS) * (H + 26) + 10 };
};

export function ScreenCheck({ recipient }) {
  return (
    <div style={{ background: "#222", width: "100%", height: "100%", display: "flex", flexWrap: "wrap", gap: 10, padding: 10, alignContent: "flex-start", boxSizing: "border-box" }}>
      {Object.keys(CATALOG.screens).map((id) => (
        <div key={id} style={{ width: W }}>
          <div style={{ color: "#ddd", font: "14px sans-serif", height: 16 }}>{id}</div>
          <div style={{ width: W, height: H, overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", left: W - 1440 }}>
              <Screen id={id} who={recipient} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
