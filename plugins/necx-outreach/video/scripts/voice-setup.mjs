// Saves an ElevenLabs API key for the outreach videos, for when the plugin's
// settings prompt isn't available. Run it in your own terminal (the key is
// typed hidden and never enters the Claude chat):
//
//   node <plugin>/video/scripts/voice-setup.mjs
//
// Checks the key with ElevenLabs, shows the credits left, and writes
// ~/.config/necx-outreach/voice.env (readable only by you).
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

function ask(question, hidden) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = (s) => rl.output.write(s.includes(question) ? s : "");
    rl.question(question, (a) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(a.trim());
    });
  });
}

if (!process.stdin.isTTY) {
  console.error("Run this in your own terminal: it asks for the key with hidden input.");
  process.exit(1);
}
const key = await ask("ElevenLabs API key (hidden): ", true);
if (!key) process.exit(1);
const res = await fetch("https://api.elevenlabs.io/v1/user/subscription", { headers: { "xi-api-key": key } });
if (!res.ok) {
  console.error(`ElevenLabs rejected the key (${res.status}). Nothing saved.`);
  process.exit(1);
}
const sub = await res.json();
const voice = await ask("Voice ID (Enter for the NECX default, Sarah): ", false);
const dir = path.join(os.homedir(), ".config", "necx-outreach");
const file = path.join(dir, "voice.env");
mkdirSync(dir, { recursive: true, mode: 0o700 });
writeFileSync(file, `# source: voice-setup.mjs\nELEVENLABS_API_KEY=${key}\n${voice ? `ELEVENLABS_VOICE=${voice}\n` : ""}`, { mode: 0o600 });
chmodSync(file, 0o600);
const left = (sub.character_limit ?? 0) - (sub.character_count ?? 0);
console.log(`Saved to ${file}. Plan: ${sub.tier ?? "?"} · ${left.toLocaleString()} characters left (a 60-90 s video uses about 900-1,400).`);
