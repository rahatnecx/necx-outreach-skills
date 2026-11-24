# NECX Outreach

The single source of truth for NECX's personalized multi-thread outreach to victim-services agencies:

- research the organization
- rank the employee list
- decide To / CC / BCC
- write subjects and bodies from verified NECX features
- render a personalized video per contact: real VS360 screens that show the prospect's agency and name, with voiceover and captions

> **Private repo.** Contains the internal sales process and pricing notes. Never commit real prospect emails, employee exports or CRM data.

## What's inside

| Path | What it is | Used by |
|---|---|---|
| `playbook/necx-outreach-playbook.md` | Master rulebook | Everyone; the ChatGPT Knowledge file |
| `plugins/necx-outreach/skills/necx-outreach-planner/SKILL.md` | Claude skill: research, ranking, emails, video plans | Claude (web/desktop) + Claude Code |
| `plugins/necx-outreach/skills/necx-outreach-video/` | Claude skill: renders the videos; `screens.md` = screen catalog | Claude Code |
| `plugins/necx-outreach/video/` | Remotion project: renderer, real VS360 screens, capture tools | Claude Code (Node 18+) |
| `plugins/necx-outreach/.claude-plugin/plugin.json` | Claude plugin manifest | Claude Code / org provisioning |
| `.claude-plugin/marketplace.json` | Marketplace manifest | `/plugin marketplace add` in Claude Code |
| `chatgpt/custom-gpt-setup.md` | GPT setup steps + Instructions block | ChatGPT |
| `examples/` | Reference outputs (role-based, no private data) | Training new SDRs |
| `scripts/check.py` | Linter: banned claims, size limits, frontmatter | CI + local |
| `.github/workflows/` | CI check on every PR; builds the skill zip on each release | GitHub Actions |

## Install / use

### Claude Code
```
/plugin marketplace add <your-org>/necx-outreach
/plugin install necx-outreach@necx-outreach
```
Update later with `/plugin marketplace update necx-outreach`.

### Claude (web / desktop)
1. Download `necx-outreach-planner.zip` from the latest **GitHub Release** (built automatically).
2. **Team/Enterprise:** an admin provisions it under **Organization settings → Plugins & skills**, so everyone gets the approved version.
3. **Personal plans:** upload it under **Customize → Skills**.
4. Connect **Firecrawl** in Claude. The skill needs it to read JS-rendered sites like necx.org.

Then ask: *"Plan outreach for naplesshelter.org"* and attach the employee list.

### Personalized videos
Ask *"Render the videos"* after a plan. Every contact gets their own video: real VS360 screens showing **their agency, title and initials**, a first-name greeting, voiceover and captions, plus an email thumbnail and GIF.

| Where | How it renders |
|---|---|
| Claude Code, Claude Desktop, Cowork | **Automatically on your computer.** The plugin starts the NECX Video connector locally, and videos land in *~/NECX Outreach Videos*. The first render installs the video tools (about a minute). |
| claude.ai in a web browser | Needs the hosted NECX Video connector (`plugins/necx-outreach/video/server/server.mjs`, Dockerfile included) added under Settings → Connectors. Until then, web chat writes the scripts, and you render them in Desktop or Cowork. |

**Voice:** enter your ElevenLabs key when the plugin asks. If it didn't ask, Claude opens a private page in your browser for it (`setup_voice`). Without a key, videos use the macOS voice, which is for review only. See `plugins/necx-outreach/video/README.md`.

### ChatGPT
Follow `chatgpt/custom-gpt-setup.md`: paste the Instructions block and upload `playbook/necx-outreach-playbook.md` as Knowledge. ChatGPT can't pull from GitHub, so the GPT owner re-uploads both after every release.

> OpenAI is retiring custom GPTs in favor of ChatGPT plugins. If your workspace offers plugins, build it there with the same two files.

## How to change something

1. Branch: `git checkout -b <short-description>`
2. Edit **`playbook/` first**, then mirror the change into `SKILL.md` and the GPT Instructions block if it affects them.
3. Run `python scripts/check.py`. It must pass.
4. Add a line to `CHANGELOG.md` (date, change, source URL).
5. Open a PR. One approval from the messaging owner is required. CI runs the check.
6. After merge, tag a release: `git tag v1.2.0 && git push --tags`. The release workflow attaches the skill zip.
7. Announce it in the team channel. The ChatGPT owner re-uploads.

### Rules for changes
- Every change to an NECX claim needs a **necx.org or docs.necx.org link** in the PR description.
- Re-verify the feature catalog **monthly**, and update the "verified" date in the playbook and SKILL.md.
- Banned claims are listed in `scripts/check.py`. Add new ones there, not just in prose.

## Versioning
Use semantic versioning on tags: **major** for a new workflow or output format, **minor** for new features, personas or rules, **patch** for wording fixes and price/date updates. Keep `version` in `plugin.json` in sync with the tag.

## Owners
- Messaging / approvals: _<name>_
- Repo maintainer: _<name>_
- ChatGPT GPT owner: _<name>_
# necx-outreach-skills
