# NECX outreach video

One personalized, faceless video per prospect, rendered with [Remotion](https://www.remotion.dev) from the plan JSON that the `necx-outreach-planner` skill writes. The `necx-outreach-video` skill drives it; you rarely need to run anything by hand.

What the prospect sees:
- **A title card** for them by first name, with their title and agency.
- **Real VS360 screens** (captured from vs360-webapp, fictional client data) carrying their agency name, title and initials in the app header. The dashboard says "Good afternoon, <First>".
- **The product walkthrough:** a guided tour with cursor, highlight and zoom, using verified feature copy.
- **Sound and captions:** voiceover, burned-in captions, and a music bed ducked under the voice.
- **A reply CTA** with the sender's name and email.

## Connectors (how Claude renders)

| | Started by | Runs on | Output |
|---|---|---|---|
| `server/local.mjs` | the plugin's `.mcp.json`, automatically (Claude Code, Desktop, Cowork) | the user's computer | files in `~/NECX Outreach Videos/<videoId>/` (or the folder set in plugin settings) |
| `server/server.mjs` | you, on a host (`Dockerfile`) | a NECX server | hosted watch page + MP4/thumbnail/GIF links (for claude.ai on the web) |

Both expose `list_screens`, `preview_plan`, `render_videos` and `get_render_status`. The local one adds `setup_voice` (a localhost page for the ElevenLabs key) and `open_videos_folder`.

**Local connector details:**
- `server/start.sh` finds Node 18+ even without a shell PATH, or downloads one to `~/.necx-outreach/node`.
- `local.mjs` has no npm dependencies, so it answers immediately and runs `npm install` in the background on first use. Jobs persist in `~/.necx-outreach/jobs`.

**Hosted connector:**
```bash
docker build -t necx-video .
docker run -d -p 8080:8080 -v necx-video-data:/data \
  -e PUBLIC_URL=https://video.example.org -e ACCESS_TOKENS=$(openssl rand -hex 24) \
  -e ELEVENLABS_API_KEY=... necx-video
```
Put HTTPS in front (Caddy or nginx), then add `https://video.example.org/mcp/<token>` in claude.ai → Settings → Connectors → Add custom connector.

## Render from the command line

```bash
node scripts/render.mjs plan.json --dry-run        # validate, print each video's script and length
node scripts/render.mjs plan.json --out ./necx-outreach-videos
node scripts/render.mjs plan.json --only riverbend-priya-01 --voice say
```

For each video, `<out>/<videoId>/` gets:

| File | What it is |
|---|---|
| `<videoId>.mp4` | 1920×1080 H.264 with AAC audio |
| `thumbnail.png`, `thumbnail.jpg` | Title frame with a play button, for the email |
| `preview.gif` | First 3 seconds, small, for inline email |
| `script.md` | Scenes, voice timing and voiceover, for review |
| `props.json` | Exactly what was rendered |

**First run:** `npm install` runs automatically (Node 18+), and Remotion downloads its headless Chrome.

**Speed:** a 60-second video takes 1–3 minutes on an Apple-silicon Mac.

**Voice** (`--voice auto | elevenlabs | say | none`):
- **Setting the key:** Claude Code asks for it in the plugin settings (`/plugin` → necx-outreach → Configure; kept in the system keychain). A SessionStart hook (`scripts/sync-voice-key.mjs`) copies it to `~/.config/necx-outreach/voice.env`, readable only by you, because Claude Code doesn't pass plugin secrets to Bash commands. Without Claude Code, run `node scripts/voice-setup.mjs` in a terminal.
- **auto:** ElevenLabs if a key is found there, or in `ELEVENLABS_API_KEY` / `./.env` / this folder's `.env` / `NECX_ENV_FILE`. Otherwise the macOS `say` voice. Otherwise captions only.
- **Credits:** `--check-voice` shows the credits left and what the plan needs. A render that ElevenLabs can't finish falls back before spending anything.
- **Fallback:** if ElevenLabs fails (quota, network), every line is re-voiced with the fallback, so one video never mixes voices.
- **Cache:** clips are cached in `public/run/` by text.

**Preview:** `npm run studio` opens Remotion Studio with `example-plan.json`.

## Plan format

See `example-plan.json`, and the `necx-outreach-video` skill for the full field list and writing rules. Scene types:

| Type | Shows | Fields |
|---|---|---|
| `title` | Their first name, title · agency, topic, a VS360 window with their agency | `topic`, `vo` |
| `problem` | Pain headline plus up to 2 lines | `headline` (`*word*` = brand color), `lines`, `vo` |
| `website` | Their public homepage screenshot, slow zoom | `image` (URL or file), `url`, `vo` |
| `screen` | A catalog screen in a guided tour (consecutive screens = one tour) | `screen`, `vo`, optional `title` / `body` / `label` / `target` / `zoom` |
| `checklist` | 2–4 ticks | `headline`, `items`, `vo` |
| `stat` | One verified number | `value`, `label`, `source`, `vo` |
| `cta` | Their question, a "reply" button, sender name and email | `question`, optional `headline` / `button`, `vo` |

Every scene lasts as long as its voiceover. There are no frame numbers to manage.

## How personalization works

- **Where the identity sits:** `public/screens/slots.json` holds the position and computed text style of the signed-in agency, role, initials and greeting. These were measured in the real vs360-webapp layout (`capture/plan-slots.mjs`, Poppins 12px/600 header, 24px/700 greeting).
- **Patching:** `src/Screen.jsx` reads the colors under each spot from the screenshot itself, so screens dimmed by an open dialog still match. It widens the patch to the demo text actually present, which handles screens captured as other users. Then it writes the prospect's details in the same font. Long agency names shrink, then truncate.
- **Skipped screens:** where the header is covered (drawer, live-call bar) or blurred behind a dialog, the screen is left as captured.
- **QA:** `npx remotion still src/index.js ScreenCheck out/screen-check.png` renders every screen's personalized header in one image. Check it after changing screens.

## Maintainers: refreshing screens

The screens come from the real vs360-webapp via the capture tooling in `necx-advertisement-video` (`capture-vs360/`). A copy lives in `capture/`.

```bash
# re-measure the header/greeting positions from vs360-webapp (needs its npm install)
VS360_ROOT=../vs360-webapp npm run capture -- slots

# re-copy the screen set + verified copy from necx-advertisement-video (macOS: uses sips)
AD_ROOT=../necx-advertisement-video npm run screens
```

- **Choosing screens:** `scripts/screens.mjs` lists the screens shipped, by id and module. It writes `public/screens/catalog.json` and the skill's `screens.md`, so the skill and the renderer never drift.
- **Other plans:** `capture/capture.mjs <plan>` runs any `capture/plan-<name>.mjs`, using the same harness and fixtures as the ad project. vs360-webapp itself is never modified and makes no network calls.
