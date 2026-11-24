// Capture-only stand-in for react-textarea-autosize: its resize loop hangs
// headless Chrome on the VCLG grant profile. Rows are sized from the text
// once, so the screen looks the same as the real auto-growing box.
import { forwardRef } from "react";
const TextareaAutosize = forwardRef(({ minRows = 1, maxRows, cacheMeasurements, onHeightChange, style, ...props }, ref) => {
  const text = String(props.value ?? props.defaultValue ?? "");
  const lines = text.split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / 95)), 0);
  const rows = Math.max(minRows, Math.min(maxRows ?? 99, lines));
  return <textarea ref={ref} rows={rows} style={{ ...style, height: undefined }} {...props} />;
});
export default TextareaAutosize;
