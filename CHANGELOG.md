# Changelog

All notable changes to the playbook, skill and GPT instructions.
Format: date · version · change · source.

## v1.3.0 — 2026-11-24
- **Full outreach package per agency.** For every contact: a role-based email sequence (video → bump → new angle → break-up; routing note for gatekeepers) plus their personalized video. Plus one **agency-wide video**, semi-personalized ("for the team at <Agency>", agency name, initials and "Good afternoon, team" in every screen), whose screens adapt to the agency's programs and funders.
- **Output is organized per agency, then per person:** `<Agency>/NN. Person (Title)/` with the video, thumbnail, GIF and `email-NN-<type>.html/.txt`, and at the agency level `outreach.json`, `outreach.md`, `sequence.csv` (CRM import) and `HOW-TO-SEND.md`.
- **Humanizer, enforced.** The tools reject emails with AI-stock words and clichés, em/en dashes, exclamation marks, emoji, ALL-CAPS, links in the body, the wrong video placement or over-length copy. The skill runs the `humanizer` skill when installed, plus a bundled `humanizer.md`.
- **Safe video embedding:** a linked static thumbnail plus a text link, in table-based HTML that works in Outlook and Gmail, with a plain-text twin. No players, iframes, scripts or attachments. `set_video_link` fills hosting links in after upload.
- **Setup asked once:** `get_setup` / `save_profile` save the sender's name, designation and email on the computer; the ElevenLabs key goes through `setup_voice` (browser page) or the plugin settings.
- Fix: the pipeline runs Remotion's CLI with the running Node, so renders work even without `node` on PATH.

## v1.2.1 — 2026-11-24
- Repo made public. The worked example and sample prompts no longer name a real agency or its staff: they use roles and a fictional `riverbend.example.org`. The README now states the public-repo rules.

## v1.2.0 — 2026-11-24
- NECX Video connector, local: the plugin starts a video renderer on the user's own computer automatically (`.mcp.json` → `video/server/start.sh` → `video/server/local.mjs`). It works in Claude Code, Claude Desktop and Cowork; Cowork's own code sandbox can't render, but plugin connectors run on the user's machine.
  - Tools: list_screens, preview_plan, render_videos, get_render_status, setup_voice, open_videos_folder.
  - No npm dependencies to start. It finds Node 18+ (nvm, Homebrew, Volta, fnm, system) or downloads a private copy, installs the video tools in the background on first use, and saves videos to *~/NECX Outreach Videos* (configurable).
  - `setup_voice` opens a private localhost page to enter the ElevenLabs key, so the key never passes through the chat. The plugin settings key is passed to the connector directly.
- NECX Video connector, hosted (`video/server/server.mjs` + `Dockerfile`): the same tools over HTTP for claude.ai in a web browser, with unguessable watch pages, MP4, thumbnail and GIF links. Not deployed yet; it needs a host.
- `video/scripts/pipeline.mjs`: one shared validate/voice/render pipeline for the command line and both connectors.
- The video skill picks the connector, then the local command, then plan-only. The release ships `necx-outreach-video.zip` alongside the planner zip.

## v1.1.0 — 2026-11-24
- New skill `necx-outreach-video`: renders one personalized, faceless video per contact (MP4 1920×1080, email thumbnail with play button, 3 s GIF preview, review script) from the planner's plan JSON. Lives in `plugins/necx-outreach/video/` (Remotion).
- Real VS360 screens: 68 screens captured from vs360-webapp with fictional client data, with verified on-screen copy, taken from the necx-advertisement-video captures. On every screen the app header shows the prospect's agency, title and initials, and the dashboard greets them by first name. Header positions and text styles were measured from the real vs360-webapp layout (`video/capture/plan-slots.mjs`).
- Voice: ElevenLabs when a key is set, falling back to the macOS voice (all lines together), then to captions only. NECX and funder acronym pronunciations built in.
- Video spec (playbook §8, planner skill §8, GPT step 8) rewritten to the renderer's plan format: scene types title / problem / website / screen / checklist / stat / cta; screens by catalog id; timing follows the voiceover.
- `scripts/check.py` lints the new skill and skips `node_modules`.
- One person, one script: the renderer rejects plans where two contacts share the same screen sequence or more than one voiceover line, requires the first name in the title line, and warns when the org is never named or sources are missing. The video skill has a role-by-role table (grants, shelter, hotline, case management, admin/IT, executive). The example plan shows two roles at one fictional agency.
- The plugin asks for an ElevenLabs API key (and optional voice, sender name, title and email) through Claude Code's plugin settings. The key is stored in the system keychain, and a SessionStart hook copies it to `~/.config/necx-outreach/voice.env` (mode 600) for the renderer. Manual alternative: `video/scripts/voice-setup.mjs` (hidden input, validated with ElevenLabs).
- The renderer checks ElevenLabs credits against the plan before generating audio (`--check-voice` reports both) and falls back to the macOS voice for review if they run short.

## v1.0.0 — 2026-11-24
- Initial playbook: research steps, NECX feature catalog (verified 2026-11-24), banned claims, persona buckets, 0–100 priority score, To/CC/BCC rules, cadence and blackout dates, email rules, faceless Remotion video spec, QA checklist, output format.
- Claude skill `necx-outreach-planner` and Claude Code plugin/marketplace manifests.
- ChatGPT Custom GPT setup + Instructions block (about 4,750 characters).
- Correction: "a confidential location's address is never shown" replaced with "protected by role-based access and a full audit trail". Source: https://necx.org/shelter-management
- Sources: https://necx.org/, https://necx.org/shelter-management, https://docs.necx.org/
