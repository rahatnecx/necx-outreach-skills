---
name: "necx-outreach-video"
description: "Build the full NECX outreach package for a victim-services agency: a personalized video and a role-based email sequence for every employee, one semi-personalized agency-wide video covering all of NECX, a send schedule, and structured output (folders per agency and person, outreach.json, outreach.md, CRM-ready CSV, safe video-email HTML). Emails pass an enforced humanizer check. Works in Claude Code, Claude Desktop and Cowork (renders on the user's computer), and in claude.ai through the NECX Video connector. Use after necx-outreach-planner, or when asked for outreach emails, sequences or personalized videos."
---

# NECX Outreach: emails, sequences and videos

For one agency, you produce:

| Output | What it is |
|---|---|
| **A video per employee** | Their own script for their role. Real VS360 screens show **their agency, title and initials**, and the dashboard greets them by first name. Gatekeepers get no video. |
| **An agency-wide video** | "A short video for the team at <Agency>". All of NECX, adapted to the agency's programs and funders, with their name in every screen. |
| **An email sequence per employee** | A video email, bump, new-angle follow-up and break-up, written from their role, the agency's facts and NECX features, and humanized. |
| **A send schedule** | Every email across all contacts, with send times in the prospect's timezone. |
| **Structured files** | `<videos folder>/<Agency>/` holds `outreach.json`, `outreach.md`, `sequence.csv`, `HOW-TO-SEND.md`, `00. Agency video (whole team)/`, and one `NN. Person (Title)/` folder per contact with the video, thumbnail, GIF and `email-NN-<type>.html/.txt`. |

## Step 0: setup, always first (ask once)

- **With the connector** (tool `get_setup` exists), call `get_setup`. Then:
  - **Sender missing:** ask the user for their **name, designation (title) and NECX email**, then call `save_profile`. It's saved on this computer, so it's asked only once.
  - **No ElevenLabs key, or the check failed:** tell the user the videos need it, and call `setup_voice`. It opens a private page in their browser where they paste the key. **Never ask for the key in the chat, and never accept it there.** If they paste a key into the chat anyway, don't use or repeat it; tell them to revoke it in ElevenLabs and enter a new one on the setup page. Wait until they say the page shows "Saved", then call `get_setup` again to confirm.
  - **Credits short** (about 900–1,400 characters per video): say so, and offer the review voice now and the real voice after a top-up.
- **Without the connector** (claude.ai web): ask for name, designation and email in the chat. The ElevenLabs key isn't needed here; the hosted server or the user's own Claude Desktop handles voice.

## Step 1: inputs

Use the necx-outreach-planner output: the org fact sheet (with source URLs), the ranked contacts with persona buckets A–G, waves and To/CC/BCC, and the NECX feature catalog verified this run. If you only have an agency and a list of people, do the planner's research first (Firecrawl), at least the org facts, programs, funders and each person's role.

Write the plan JSON (format below) to `<agency-slug>-outreach.json` in the user's working folder.

## Step 2: write it, one person at a time

For each contact, from **their role + one sourced agency fact + NECX features that fix their problem**:

1. **Video** (personas A, B, C-after-reply, F): scenes per *Video rules*. G gets `"video": null`.
2. **Email sequence** per *Sequence rules*. Each email gets a different angle, and no two contacts get the same text.
3. **Agency-wide video:** set `"agencyVideo": { "enabled": true }`. Scenes are built automatically from the agency's `programs` and `funders` (or write your own). Add one `agency-video` email: to the general inbox, or as the executive's final touch, or the warm intro a champion forwards.

## Step 3: humanize every email (mandatory)

- **If the `humanizer` skill is available** (for example `humanizer:humanizer`), invoke it on every subject and body before validating, and keep its rewrite.
- **Then apply `humanizer.md`** (next to this file) yourself, either way.
- **The tools enforce it.** `preview_plan`, `save_outreach` and `render_videos` reject any email with AI-sounding phrases ("delve", "seamless", "in today's…", "hope this finds you well", "touch base"…), em/en dashes, exclamation marks, emoji, ALL-CAPS, raw links, or the wrong length. Fix every PROBLEM, rewriting each one plainly. Don't just delete the flagged word.

## Step 4: check, show, produce

1. `preview_plan` (connector) or `render.mjs <plan> --dry-run` (local command). Fix until there are no problems.
2. Show the user a summary: a contacts table (rank, name, persona, wave, video yes/no, number of emails), the send schedule, then each person's emails and video script. Apply their edits and re-check.
3. Produce:
   - Everything: `render_videos`. It saves all emails and files first, then renders. Poll `get_render_status` about once a minute and tell the user it takes about 2 minutes per video; the first run also does a one-time setup.
   - Emails only: `save_outreach`.
4. Report the agency folder and what's in it. Offer `open_videos_folder`.
5. **Hosting:** email can't carry video. The user uploads each `video.mp4` (Drive "anyone with the link", Vimeo, Loom, YouTube unlisted), then tells you the link. Call `set_video_link` (org, person, videoUrl, optional hosted thumbnailUrl); it rewrites that person's emails and the CSV. On the hosted connector, links are filled in automatically, and `get_outreach` returns the emails and CSV.

### Render path
1. **Connector tools present** (`get_setup`, `preview_plan`, `render_videos`…): use them.
   - **Local version:** has `setup_voice`, renders on this computer, and saves to `~/NECX Outreach Videos/<Agency>/`.
   - **Hosted version:** links start with https.
2. **Claude Code without the tools**, but with `${CLAUDE_PLUGIN_ROOT}/video` present: run `node "${CLAUDE_PLUGIN_ROOT}/video/scripts/render.mjs" <plan.json> [--dry-run | --check-voice | --out <dir>]`. The output goes to the same agency/person folders.
3. **Neither:** give the plan JSON and the emails as text. It renders in Claude Desktop, Cowork or Claude Code with the necx-outreach plugin.

## Sequence rules

Times are in the prospect's timezone, Tue–Thu 9:00–11:00, avoiding holidays and the playbook's blackout dates. Wave 1 is at most 3 people. Two people at one agency never get emails on the same day. The executive (F) comes last.

| Persona | Sequence (day) |
|---|---|
| A, B (champions) | 1 `video` (day 0) → 2 `bump` (day 2, same thread, no subject) → 3 `text` new angle with a different NECX feature (day 7) → 4 `breakup` (day 14) |
| C (admin/IT) | 1 `text` (only after a champion replies) → 2 `bump` (day 3); video only after a reply |
| D, E (finance, residential) | warm only: one `text` the champion can forward |
| F (executive) | 1 `video` or `agency-video` (last wave, day 10+), referencing what the team saw → 2 `breakup` (day 7 later) |
| G (gatekeeper) | 1 `text` routing note: "who owns X?" |

**Every email:**
- Plain and warm. First name greeting. One pain, one proof, one question.
- 60–120 words (bump ≤ 60, break-up ≤ 80).
- Subject 3–8 words, specific, sentence case, no "Re:" on a new email.
- No links in the text; the only link is the video.

**Video emails:** put a line containing only `[VIDEO]` where the thumbnail goes, usually after the sentence that introduces the video ("I recorded a one-minute video showing…"). The tools turn it into a linked thumbnail with a "▶ Watch the 60-second video" text link under it (HTML), or "Watch the 60-second video: <link>" (plain text). Never embed a player, iframe, GIF-only image or attachment. Those break in Outlook and trip DV agencies' mail filters (Proofpoint, Mimecast).

**Signature:** added automatically: two lines, name and title, NECX.

## Video rules

- **Length:** 45–90 s (measured from the voiceover). A/B/F: title → problem → 3–5 screens → checklist → cta. Agency video: built automatically, about 75–90 s.
- **Voiceover:**
  - Second person, calm, one idea per scene, at most about 30 words.
  - Say the first name in the title line (the agency name for the agency video). "I put this together"; never speak as if on camera.
- **Claims:** only a screen's verified copy (`screens.md` / `list_screens`) or a necx.org / docs.necx.org page fetched this run. No banned claims.
- **Prospect content:** only their name, title and agency as text, plus their public homepage screenshot (`website` scene). Never buildings, staff photos, residents, addresses, logos or survivor stories.
- **One person, one script:** the tools reject two contacts with the same screen order or more than one shared voiceover line. (The agency video is exempt.)

| Role | Title topic | Problem | Screens | CTA question |
|---|---|---|---|---|
| Grants / reporting (A) | "<their funders> without the quarter-end scramble" | their funders, numbers rebuilt by hand | `reports-case-grant` + their funders (`voca-ready`, `fvpsa-report`, `hud-sage-ready`, `stop-home`, `hhsc-generate`, `vclg-signoff`) + `fvpsa-explain` / `ai-accuracy` | "See last quarter's <funder> report built this way?" |
| Shelter / programs (B) | "Every bed at <Org>, live" | whiteboard beds, spreadsheet waitlist | `dashboard`, `shelter-board`, `shelter-waitlist`, `referral-sharing` | "A 20-minute look with your room layout?" |
| Hotline lead (B) | "<Org>'s hotline, first ring to case file" | paper logs, missed callbacks | `hotline-command`, `hotline-callbacks`, `hotline-log`, `cases-overview` | "See a call become a case?" |
| Case management (B) | "One file per client at <Org>" | survivors repeating their story | `cases-overview`, `cases-documents`, `cases-consent`, `referral-sharing` | "Walk through one of your intake flows?" |
| Admin / IT (C) | "How NECX protects <Org>'s data" | access sprawl, staff turnover | `staff-roles`, `staff-role-actions`, `hotline-roles`, `staff-offboard` | "Want the security docs under NDA?" |
| Executive (F) | a verified recognition line | cost of the patchwork | `dashboard`, one reporting screen, `board-charts` | "Worth 30 minutes for your team?" |

The dashboard greeting ("Good afternoon, <First>") is the most personal shot; use `dashboard` early when it fits. Screens opened behind a blurred dialog (`shelter-checkin`, `shelter-rollcall`, `shelter-transfer`, `hud-rollcall`) can't show their name.

## Plan format

```json
{
  "sender": { "name": "", "title": "", "email": "" },
  "org": {
    "name": "", "website": "", "timezone": "America/Chicago",
    "programs": ["shelter", "hotline", "legal", "housing", "counseling"],
    "funders": ["VOCA", "FVPSA", "HUD", "ESG", "VAWA", "HHSC", "VCLG"],
    "facts": [{ "fact": "", "source": "https://..." }]
  },
  "defaults": { "music": true, "captions": true, "personalizeScreens": true },
  "agencyVideo": { "enabled": true, "topic": "(optional)", "scenes": "(optional, else built from programs + funders)",
                   "emails": [{ "step": 1, "type": "agency-video", "sendAt": "YYYY-MM-DD HH:MM", "to": "", "subject": "", "body": "...\n\n[VIDEO]\n\n...?" }] },
  "contacts": [
    {
      "firstName": "", "lastName": "", "title": "", "email": "", "persona": "A", "rank": 1, "wave": 1,
      "sources": ["https://..."],
      "video": { "scenes": [
        { "type": "title", "topic": "", "vo": "<First>, I put this short video together for you, about ..." },
        { "type": "problem", "headline": "<*star* words get the brand color>", "lines": [""], "vo": "" },
        { "type": "screen", "screen": "<catalog id>", "vo": "", "label": "(optional callout)" },
        { "type": "checklist", "headline": "", "items": ["", "", ""], "vo": "" },
        { "type": "cta", "question": "", "vo": "" }
      ] },
      "emails": [
        { "step": 1, "type": "video", "sendAt": "YYYY-MM-DD HH:MM", "cc": [], "bcc": ["<CRM BCC>"], "subject": "", "body": "Hi <First>,\n\n...\n\n[VIDEO]\n\n...?" },
        { "step": 2, "type": "bump", "sendAt": "", "body": "" },
        { "step": 3, "type": "text", "sendAt": "", "subject": "", "body": "" },
        { "step": 4, "type": "breakup", "sendAt": "", "subject": "", "body": "" }
      ]
    }
  ]
}
```

- **Scene types:** `title`, `problem`, `website` (`image` = homepage screenshot URL), `screen`, `checklist`, `stat` (`value`, `label`, `source`), `cta`. Consecutive screens become one guided tour.
- **Example:** `${CLAUDE_PLUGIN_ROOT}/video/example-plan.json` shows a fictional agency with a grants manager, a shelter director, a gatekeeper and the agency video. Read it for the shape, never the words.
- **Screen catalog:** `screens.md` next to this file, or the `list_screens` tool.

## Voice (local)

- **Default:** ElevenLabs when a key is set (`setup_voice`, the plugin settings, or `ELEVENLABS_API_KEY`).
- **Without a key:** the macOS voice (review only), otherwise captions only. The renderer checks credits before starting and never mixes voices in one video.
- **Pronunciation:** NECX, VOCA, FVPSA, HUD and the other acronyms are spoken correctly.
- **Always tell the user which voice was used.**
