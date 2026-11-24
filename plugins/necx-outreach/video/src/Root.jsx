import { Composition } from "remotion";
import { OutreachVideo } from "./OutreachVideo";
import { FPS, plan } from "./timeline";
import EXAMPLE from "../example-plan.json";
import { ScreenCheck, checkSize } from "./ScreenCheck";

// Studio preview uses the first video of example-plan.json; renders pass a
// video from the plan as inputProps (scripts/render.mjs).
const preview = { sender: EXAMPLE.sender, ...EXAMPLE.defaults, ...EXAMPLE.videos[0] };

export const Root = () => (
  <>
  <Composition
    id="OutreachVideo"
    component={OutreachVideo}
    fps={FPS}
    width={1920}
    height={1080}
    durationInFrames={300}
    defaultProps={preview}
    calculateMetadata={({ props }) => ({ durationInFrames: plan(props.scenes ?? []).total })}
  />
  <Composition id="ScreenCheck" component={ScreenCheck} fps={FPS} durationInFrames={1} {...checkSize()} defaultProps={{ recipient: preview.recipient }} />
  </>
);
