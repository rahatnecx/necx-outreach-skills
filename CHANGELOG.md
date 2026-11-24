# Changelog

All notable changes to the playbook, skill and GPT instructions.
Format: date · version · change · source.

## v1.1.0 — 2026-11-24
- New skill `necx-outreach-video`: renders one personalized, faceless video per contact (MP4 1920×1080, email thumbnail with play button, 3 s GIF preview, review script) from the planner's plan JSON. Lives in `plugins/necx-outreach/video/` (Remotion).
- Real VS360 screens: 68 screens captured from vs360-webapp with fictional client data, with verified on-screen copy, taken from the necx-advertisement-video captures. On every screen the app header shows the prospect's agency, title and initials, and the dashboard greets them by first name. Header positions and text styles were measured from the real vs360-webapp layout (`video/capture/plan-slots.mjs`).
- Voice: ElevenLabs when a key is set, falling back to the macOS voice (all lines together), then to captions only. NECX and funder acronym pronunciations built in.
- Video spec (playbook §8, planner skill §8, GPT step 8) rewritten to the renderer's plan format: scene types title / problem / website / screen / checklist / stat / cta; screens by catalog id; timing follows the voiceover.
- `scripts/check.py` lints the new skill and skips `node_modules`.

## v1.0.0 — 2026-11-24
- Initial playbook: research steps, NECX feature catalog (verified 2026-11-24), banned claims, persona buckets, 0–100 priority score, To/CC/BCC rules, cadence and blackout dates, email rules, faceless Remotion video spec, QA checklist, output format.
- Claude skill `necx-outreach-planner` and Claude Code plugin/marketplace manifests.
- ChatGPT Custom GPT setup + Instructions block (about 4,750 characters).
- Correction: "a confidential location's address is never shown" replaced with "protected by role-based access and a full audit trail". Source: https://necx.org/shelter-management
- Sources: https://necx.org/, https://necx.org/shelter-management, https://docs.necx.org/
