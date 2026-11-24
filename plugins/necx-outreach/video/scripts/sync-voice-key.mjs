// SessionStart hook. Claude Code keeps the ElevenLabs key the user entered in
// the plugin's settings (userConfig, system keychain) and hands it only to
// hooks, as CLAUDE_PLUGIN_OPTION_ELEVENLABS_API_KEY; commands run through Bash
// never see it. This copies it to a file only the user can read, which
// render.mjs loads. Prints nothing: hook output would land in the chat.
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

try {
  const dir = path.join(os.homedir(), ".config", "necx-outreach");
  const file = path.join(dir, "voice.env");
  const key = (process.env.CLAUDE_PLUGIN_OPTION_ELEVENLABS_API_KEY ?? "").trim();
  const voice = (process.env.CLAUDE_PLUGIN_OPTION_ELEVENLABS_VOICE_ID ?? "").trim();
  const ours = existsSync(file) && readFileSync(file, "utf8").includes("# source: plugin settings");
  if (!key) {
    // the key was cleared in the plugin settings: drop the copy we made (not a manually saved one)
    if (ours) rmSync(file, { force: true });
  } else if (/^[A-Za-z0-9_-]{16,128}$/.test(key)) {
    const body = `# source: plugin settings (written by the necx-outreach SessionStart hook)\nELEVENLABS_API_KEY=${key}\n${voice ? `ELEVENLABS_VOICE=${voice}\n` : ""}`;
    if (!existsSync(file) || readFileSync(file, "utf8") !== body) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      writeFileSync(file, body, { mode: 0o600 });
      chmodSync(file, 0o600);
    }
  }
} catch {
  // never block a session over this
}
process.exit(0);
