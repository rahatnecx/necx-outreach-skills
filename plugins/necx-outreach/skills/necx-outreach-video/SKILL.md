---
name: "necx-outreach-video"
description: "Render personalized NECX outreach videos (MP4, email thumbnail, GIF preview) for prospects at victim-services agencies, using real VS360 screens that show the prospect's agency name and their own name. Use after necx-outreach-planner, or when asked to make, render or preview a personalized video for a contact."
---

# NECX Outreach Video

Turns the video plan for each contact into a finished, personalized, faceless video:

- **Title card:** "A short video for <First>", their title and agency, and the topic, next to a VS360 window with their agency in it.
- **Real VS360 screens:** captured from vs360-webapp with fictional client data. On every screen the app header shows **the prospect's agency name, their title and their initials**, and the dashboard greets them by first name ("Good afternoon, Priya").
- **Narration and polish:** voiceover, burned-in captions, and a music bed ducked under the voice.
- **Outputs:** an MP4 (1920×1080), a `thumbnail.png` / `thumbnail.jpg` with a play button for the email, a 3-second `preview.gif`, and `script.md` for review.

It needs **Claude Code with the necx-outreach plugin installed**, plus Node 18+. It can't run on claude.ai or in ChatGPT. There, deliver the plan JSON and say it renders in Claude Code.

## Where things are

The video project is the plugin's `video/` folder, two levels up from this file: `<plugin root>/video` (`${CLAUDE_PLUGIN_ROOT}/video`). Everything below runs from there.

- `screens.md` (next to this file): the screen catalog, with ids, modules and default copy. Read it before choosing screens.
- `video/example-plan.json`: a complete, valid plan.
- `video/README.md`: details, plus the maintainer tools for refreshing screens.

## Steps

1. **Get the plan.** Use the per-contact video specs from necx-outreach-planner (section 8). If you only have a contact, write the plan yourself using the rules below. Save it as `<org-slug>-videos.json` in the user's working folder, not inside the plugin.
2. **Dry run.** Run `node "${CLAUDE_PLUGIN_ROOT}/video/scripts/render.mjs" <plan.json> --dry-run`. This validates the plan and prints each video's script and timing without rendering. Fix any "Plan problems" it reports.
3. **Show the user the script table** (scenes, voiceover, length). Fix anything they change.
4. **Render.** Run `node "${CLAUDE_PLUGIN_ROOT}/video/scripts/render.mjs" <plan.json> --out ./necx-outreach-videos`.
   - The first run installs dependencies (about a minute).
   - Each video takes 1–3 minutes. Use a long timeout, or run it in the background.
   - Add `--only <videoId>` to re-render one video.
5. **Check before handing over.**
   - Look at `thumbnail.png` for each video.
   - Extract one mid-video frame with `npx remotion ffmpeg -ss 20 -i <mp4> -frames:v 1 frame.png`, run from `video/`.
   - Confirm the header shows the prospect's agency, and that captions read correctly.
6. **Report** the output folder, each video's length, and the voice used. Remind the user:
   - Send the video as a link (hosted MP4 or landing page) with `thumbnail.jpg` or `preview.gif` inline. Never attach it; DV agencies' mail filters strip attachments.
   - Gatekeepers get no video.

## Voice
- `--voice auto` (default): ElevenLabs if `ELEVENLABS_API_KEY` is set (environment, `video/.env`, `./.env`, or the file named by `NECX_ENV_FILE`). Otherwise the macOS voice. Otherwise captions only.
  - If ElevenLabs fails (no credits, network), every line falls back together, so a video never mixes voices.
- `--voice elevenlabs | say | none` forces one. A plan can set `"voice": {"voiceId": "...", "speed": 1}` (ElevenLabs) or `{"sayVoice": "Samantha"}` (macOS).
- Pronunciations for NECX, VOCA, FVPSA, HUD and other acronyms are built in.
- Tell the user which voice was used. The macOS voice is fine for review; use ElevenLabs for sends.

## Plan format

```json
{
  "sender": { "name": "<SDR name>", "title": "Partnerships, NECX", "email": "<name>@necx.org" },
  "defaults": { "voice": { "provider": "auto" }, "music": true, "captions": true, "personalizeScreens": true },
  "videos": [
    {
      "videoId": "<org>-<first>-01",
      "persona": "A",
      "recipient": { "firstName": "", "lastName": "", "title": "", "org": "" },
      "scenes": [
        { "type": "title", "topic": "<4-8 words>", "vo": "<First>, I put this short video together for you, about ..." },
        { "type": "problem", "headline": "<pain, *star* words get the brand color>", "lines": ["<= 2 short lines"], "vo": "" },
        { "type": "website", "image": "<homepage screenshot URL or file>", "url": "<their domain>", "vo": "" },
        { "type": "screen", "screen": "<catalog id>", "vo": "", "title": "(optional)", "body": "(optional)", "label": "(optional callout)", "target": {"x":0,"y":0,"w":0,"h":0}, "zoom": 1.2 },
        { "type": "checklist", "headline": "", "items": ["2-4 short ticks"], "vo": "" },
        { "type": "stat", "value": "48-72 h", "label": "", "source": "necx.org", "vo": "" },
        { "type": "cta", "question": "<the email's one question>", "headline": "(optional)", "button": "(optional)", "vo": "" }
      ]
    }
  ]
}
```

**How scenes behave:**
- Scenes play in order, and each lasts as long as its voiceover.
- Consecutive `screen` scenes become one guided tour: a cursor, a highlight on the screen's default target, a slow zoom, and a progress bar.
- `target` and `zoom` override the defaults, in 1440×900 screen coordinates.
- `videoId` must be lowercase letters, digits and dashes.

## Writing rules (from the playbook)
- **Length:** 45–90 s. The renderer measures it; the dry run prints it. For A/B/F, a typical video is title → problem → 3–5 screens → checklist → CTA.
- **Voiceover:** second person, calm and plain. "I put this together"; never speak as if on camera.
  - One idea per scene, at most about 30 words.
  - Say the first name once (title) and the agency once or twice.
- **Claims:** every NECX claim must match a screen's verified copy in `screens.md`, or a necx.org / docs.necx.org page fetched in this run. No banned claims (see the playbook).
- **Prospect content:** only their public homepage screenshot (`website` scene) and their name, title and agency as text. Never their buildings, staff photos, residents, addresses, logos or survivor stories.
- **Screen picks by persona:**
  - **A, reporting owner:** `reports-library`, `reports-case-grant`, `voca-ready`, `hud-sage-ready`, `fvpsa-explain`, `stop-home`, `hhsc-generate`, `vclg-signoff`, `ai-accuracy`. Pick their funders.
  - **B, operations:** `dashboard`, `cases-overview`, `shelter-board`, `shelter-waitlist`, `hotline-command`, `referral-sharing`, `cases-documents`.
  - **C, admin/IT:** `staff-roles`, `staff-role-actions`, `hotline-roles`, `staff-offboard`, `cases-consent`.
  - **F, executive:** `dashboard`, then one reporting screen, `board-charts` or `ai-report`, and one operations screen.
- **Personalization:** the dashboard greeting is the most personal shot ("Good afternoon, <First>"). Use `dashboard` early when it fits.
  - A few screens opened behind a blurred dialog can't be personalized (`shelter-checkin`, `shelter-rollcall`, `shelter-transfer`, `hud-rollcall`). Their header is unreadable, so they're safe but not personal.
