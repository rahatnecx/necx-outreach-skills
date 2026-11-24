# NECX Personalized Outreach Playbook
### Instructions for generating prioritized multi-thread emails + faceless Remotion video scripts

> **Who this is for:** an AI agent (Claude) with Firecrawl access, plus the SDR reviewing the output.
> **What it produces:** for one target organization, a ranked contact plan with To / CC / BCC, subject, body, send date, and a personalized video plan for every video email (real VS360 screens showing the prospect's agency, rendered by the necx-outreach-video skill). Everything is grounded in verified organization facts and verified NECX features.
> **Golden rule:** every claim about the prospect needs a source URL. Every claim about NECX needs a necx.org or docs.necx.org URL that was fetched in this run. If you can't source a claim, leave it out.

---

## 0. Inputs (ask for anything missing before you start)

| Input | Required | Example |
|---|---|---|
| Organization name + website | Yes | Riverbend Family Shelter, riverbend.example.org |
| Employee list (pasted or a file: name + title) | Yes | Apollo, LinkedIn or ZoomInfo export |
| Prior emails already sent (full thread) | If any | 4 emails to the CEO, Oct–Nov |
| Sender name, title, signature | Yes | Sheikh Tonmoy Ahmed, SDR, NECX Inc. |
| Sender timezone + prospect timezone | Yes | Asia/Dhaka → America/New_York |
| Earliest send date | Yes | 2026-12-02 |
| Video tool | Default | Remotion, faceless (no presenter on camera) |
| CRM BCC logging address | Optional | `bcc@crm.example.com` |

If no employee list is provided, use `people_company_search` (Firecrawl) or the org's staff/leadership page to build one. Mark anything found this way as **"unverified – from web."**

---

## 1. Research the organization (Firecrawl)

### 1.1 Pages to fetch
Use `firecrawl_scrape` (formats: `markdown`, `links`; `onlyMainContent: true`; `waitFor: 3000`). Many sites are JS-rendered and plain fetch returns only metadata, so always use Firecrawl.

1. Homepage, then follow links to: **About, Programs/Services, Leadership/Staff, News/Press, Annual Report, Careers, Contact.**
2. `firecrawl_search` queries. Run each one separately, not combined:
   - `"<org name>" news 2026` (or the current year)
   - `"<org name>" grant award` / `"<org name>" ESG` / `"<org name>" VOCA`
   - `"<org name>" "<county>" Emergency Solutions Grant CAPER` (county action plans list subrecipient $ and people served)
   - `"<org name>" 990` (ProPublica Nonprofit Explorer gives budget size)
   - `"<org name>" award OR honored OR named` (recognition hooks)
   - `"<CEO name>"` (current role check: confirm they still hold it)
   - Careers page or `"<org name>" hiring` (data/IT/grants roles signal pain)
3. Firecrawl `screenshot` of the **public homepage only.** It's used in the video's opening scene.

### 1.2 Build the Org Fact Sheet
Output a table. Every row needs a URL and the date it was published or fetched.

| Fact type | What to capture |
|---|---|
| Identity | Legal name, city/state, year founded, service area |
| Programs | Emergency shelter(s) (count only, **never addresses**), hotline, outreach, transitional housing, legal, trafficking, children's services |
| Funding signals | VOCA, FVPSA, STOP/VAWA, HUD ESG/CoC, state agency (e.g., FL DCF, TX HHSC), county awards: amount + year + people served |
| Scale | Budget (990), beds, staff count, people served |
| Recent events (≤ 12 months) | New program, award, expansion, leadership change, new building, merger |
| Reporting load | Which funders, with HUD → comparable-database requirement (VSPs can't use HMIS) |
| Current system (if findable) | Mentions of Apricot, Osnium, EmpowerDB, VelaTrack, Empower, spreadsheets, job posts naming software |

**Fact rules**
- A fact older than 24 months is "background," not a hook.
- Never use survivor stories, client names, or anything from a client testimonial as a sales hook.
- Never mention, display or infer a shelter's physical location, even if it appears online.
- If a figure came from the user's prior emails rather than a page you fetched, tag it **"from prior email – re-verify."**

---

## 2. Refresh the NECX feature catalog

### 2.1 Fetch these every run (features change)
- https://necx.org/
- https://necx.org/grant-reporting
- https://necx.org/case-management
- https://necx.org/shelter-management
- https://necx.org/hotline-management
- https://necx.org/referrals
- https://necx.org/regional-network
- https://necx.org/pricing-onboarding
- https://docs.necx.org/ (module guide index; tour at `/tour`; guides at `/guides/<module>`)

If a live page contradicts the baseline below, **the live page wins.** Note the change in the output.

### 2.2 Baseline catalog (verified 2026-11-24)

| Module / claim | Approved wording (paraphrase OK, meaning must match) | Source |
|---|---|---|
| HUD status | Comparable database on HUD's official list of validated vendors; CoC APR & ESG CAPER validated in Sage. HUD does **not** "certify" or endorse software. | necx.org |
| Sage Validator | Runs the same manifest, row-count and cross-file checks as HUD's Sage portal before export; exports Sage-ready CSVs | /shelter-management |
| HMIS | VSPs are barred from entering client data in HMIS and must use a comparable database; NECX is one | /shelter-management |
| Grant reporting | Upload the grant document → AI generates the funder's reporting questions → linked questionnaires fill as staff work cases → report in seconds | necx.org |
| Report streams | VOCA (PMT), FVPSA, STOP/VAWA, HUD, Texas HHSC DAL7, Texas OAG VCLG, "and many more" | necx.org, docs.necx.org |
| AI safeguards | AI only fills cells, shows confidence, waits for approval; validator flags conflicts; never fabricates; every datapoint traces to its case | necx.org |
| Case management & intake | One record per client from first call to closure; many services per person; hard wall between internal notes and client-visible content | necx.org, docs /guides/cases |
| Shelter & bed board | Live availability by location, room and bed; check-in/out, transfers, incidents, waitlist, partner bed requests; alert for clients past expected stay; walk-in check-in creates the client record, families included | /shelter-management, docs /guides/shelters |
| Location confidentiality | Shelter addresses and client whereabouts protected by **role-based access and a full audit trail** | /shelter-management |
| Hotline | Browser softphone, live transcripts, AI call notes, SMS, callbacks, missed calls; every call wraps into a case, callback or referral | necx.org, docs /guides/hotline |
| Referrals | Consent-gated field by field; nothing shared by default; every access audited; works with prosecutor victim-witness offices | /referrals |
| Staff time | Hours attribute to grants automatically; feeds Staff Time Report | necx.org, docs /guides/time |
| Other modules | E-signature, NECX Drive, calendar & court dates, team & partner chat, public inquiries, optional client portal | necx.org |
| Security | Tenant isolation, encrypted transport, role-based access, immutable audit trail; security docs under NDA | necx.org |
| Data ownership | Agency owns its data; NECX helps you take it with you if you leave | necx.org |
| Pricing | Core $9,600/yr; Complete $14,400/yr (every module, all funder report streams); no per-user fees; no setup fees; coalition/regional pricing | necx.org |
| Grant-allowable | Software licenses are typically allowable grant expenses; NECX helps budget it into the next application | necx.org |
| Onboarding | Named implementation specialist; handles migration, configures questionnaires, trains staff; most agencies live in 48–72 hours | necx.org, /pricing-onboarding |
| Modular | Base = case management & intake; all other modules included, on/off anytime | necx.org |
| Demo offer | 30 min live; bring any export (CSV, XLSX, even photos of paper forms); watch the report build | necx.org |
| Self-serve tour | NECX Bot tours a demo agency; no sign-up | docs.necx.org |
| Proof | Peace in the Home Family Services, Virginia Victim Assistance Network, Tennessee Voices for Victims, Suited for Success; advisor Kathryn Turman (co-created FBI Victim Services Division) | necx.org |

### 2.3 Banned claims
- "HUD-certified" or "HUD-approved" (say "on HUD's list of validated comparable database vendors").
- "A confidential location's address is never shown" (say "protected by role-based access and an audit trail").
- "Zero errors," "guaranteed compliance," "audit-proof."
- Any customer name, number or outcome not on necx.org.
- Any integration or report type not listed on a fetched page.

---

## 3. Clean and classify the employee list

### 3.1 Clean
1. **Dedupe** on normalized name and title. Exports often repeat blocks.
2. **Flag conflicts.** Two people with the same C-level title (e.g., two Chief Development Officers) means one record is probably stale. Mark both "verify title" and pick neither as a primary contact until it's resolved.
3. **Flag missing emails** ("Access email," blank). They need verification before sending.
4. Strip board members, volunteers and "Member Board of Trustees" into a separate do-not-contact list.

### 3.2 Persona buckets (match on title keywords, case-insensitive)

| Bucket | Title keywords | Typical NECX pain | Lead module |
|---|---|---|---|
| **A. Reporting owner** | contracts, reporting, grants manager, compliance, data, QA, quality, program quality, evaluation, HMIS, outcomes | Quarter-end assembly, multiple funder formats, CAPER/APR, monitor questions | Grant reporting + Sage Validator |
| **B. Operations sponsor** | COO, chief operating, director of operations, chief program officer, VP programs, director of programs | Disconnected tools, beds/waitlist visibility, staff time, rollout risk | Bed board + modular platform + onboarding |
| **C. Admin / IT / security** | chief administrative, CAO, IT, technology, systems, administration director | Security, data ownership, access control, vendor risk | Security, audit trail, data ownership |
| **D. Finance** | CFO, finance director, controller, accounting | Cost, grant-allowable spend, staff time allocation | Pricing, grant-allowable, staff time |
| **E. Program managers / end users** | residential manager, shelter manager, hotline manager, outreach manager, case management supervisor, specialized services manager | Daily workflow | Bed board / hotline / case management |
| **F. Executive** | CEO, executive director, president | Mission, funding protection, staff capacity | One-minute summary across modules |
| **G. Gatekeeper** | executive assistant, office manager, administrative assistant (to the CEO) | — | None: routing question only |
| **X. Exclude** | development, fundraising, events, marketing, HR, legal director, thrift/retail store, therapist, advocate, counselor, child advocate, immigration specialist, trainer, coach, board, volunteer | — | Do not cold-contact |

**Why exclude frontline staff:** cold-pitching software to direct-service staff at a DV or trafficking agency comes across badly, and they don't decide on systems.

### 3.3 Priority score (0–100)

| Factor | Points |
|---|---|
| Owns the pain NECX solves best (Bucket A = 30, B = 25, C = 15, D = 10, E = 10, F = 10) | up to 30 |
| Decision authority (C-level 20, director 15, manager 10, specialist 5) | up to 20 |
| Fit to a fetched org signal (e.g., org has HUD ESG → Bucket A +20; new shelter program → Bucket B +20) | up to 20 |
| Not yet contacted (fresh) = 15; contacted ≤ 2 times = 8; ≥ 3 times = 0 | up to 15 |
| Title verified and email available = 15; one missing = 7; both = 0 | up to 15 |

Then apply these order rules:
- **Cold wave (max 3 people):** the top-scoring A, then the top-scoring B, with A always first. Add a second A as an alternate if one exists.
- **Wave 2 (max 2):** C (admin/IT) and G (gatekeeper, routing note only).
- **Executive last:** F is contacted after waves 1–2. If F has already had 3 or more unanswered touches, send one final "last note" only.
- **Warm only:** D and E are never cold. They come in via the champion after someone replies.
- **Cap:** never more than 5 cold contacts at one organization within 6 weeks.

---

## 4. To / CC / BCC rules

| Situation | To | CC | BCC |
|---|---|---|---|
| Any cold email | The one person | **None.** Never CC a colleague, the CEO or their assistant | CRM logging address only |
| Bump / follow-up | Same person, reply in the same thread | None | CRM |
| Gatekeeper routing note | The assistant | None (never CC the executive) | CRM |
| After a reply (warm intro) | New stakeholder | The person who replied (the champion), with their OK | CRM |
| Prospect asks to loop someone in | The prospect | Whoever they named | CRM |
| Final "last note" to the executive | Executive | None. Mention team members only if they actually replied | CRM |

Never put multiple prospects in To. Never use BCC to blast several prospects at once.

---

## 5. Cadence and timing

- **Spacing:** 1–2 business days between people in wave 1; a bump to the primary on day 5–6; wave 2 on day 6–9; the executive 2–4 weeks after wave 1 starts.
- **Send time:** 8:30 am in the prospect's timezone, as a scheduled send. Convert from the sender's timezone (Dhaka 7:30 pm = 8:30 am ET).
- **Blackout dates:** US federal holidays; Thanksgiving week; Giving Tuesday and the day before (the Tuesday after Thanksgiving); Dec 24 – Jan 1; the org's own gala or major fundraiser date, if found in research.
- **Good windows:** 4–8 weeks before a known funder reporting deadline, right after a public award or program launch, at the start of a fiscal year.
- **Stop rule:** any reply from anyone pauses every other thread at that org.
- **Cool-down:** after the final executive note, 90 days of silence unless someone replies.
- **New threads:** never pile new outreach onto an old unanswered thread. Use a new subject.

---

## 6. Persona → message matrix

Each email covers **one** pain and **one** NECX proof point, and asks **one** low-friction question.

| Bucket | Hook (from fact sheet) | Pain line | NECX proof (from catalog) | CTA |
|---|---|---|---|---|
| A | Their HUD/VOCA/FVPSA awards, people served | "Pulling ESG, VOCA and FVPSA numbers into each funder's format" | Grant document → questions built into intake; Sage Validator; datapoint traces to case | "Send any export and I'll run it live in 30 min, or point me to the right person." |
| A (quality) | Same funders | "A field skipped at intake becomes a blank on a report weeks later" | Funder questions inside intake; audit trail; validator flags conflicts | "Worth 30 min with a sample of your data? Or I can send the self-guided tour." |
| B | New program, expansion, award | "Beds, waitlist and programs across separate tools" | Live bed board, waitlist, partner beds, past-stay alert, check-in creates record; all modules in one license; live in 48–72 h | "Worth a 30-minute look?" |
| C | Org size, data sensitivity | "Who owns case-data systems?" | Comparable database on HUD's list; tenant isolation; immutable audit trail; agency owns its data; security docs under NDA | "Is that you? If not, a name helps." |
| F | Recognition, mission milestone | "Three things in one minute" | Reporting + operations + cost (pricing, grant-allowable) | "If it's worth 30 minutes, reply. If not, thank you for the work you do." |
| G | — | "I don't want to keep filling [Exec]'s inbox" | None | "Who looks after reporting or data systems?" |

---

## 7. Email writing rules

**Subject**
- 4–9 words, specific to the person's job or the org's signal. Sentence case, no clickbait, no "Re:" on a new thread.
- Video emails can include the length: "A 75-second video on The Shelter's ESG CAPER."

**Body**
- 60–120 words (gatekeeper ≤ 60). Plain text, short paragraphs.
- Structure: personal line (their role or the org signal) → one pain → video thumbnail line (video emails only) → one or two NECX proof sentences → one question.
- Exactly **one link** per email (the video, or nothing). No attachments. Two-line signature (name, title, company). DV agencies often run Proofpoint or Mimecast, which rewrite and scan links.
- Up to 3 bullets max, only for the operations persona.
- If prior emails exist, don't repeat their pitch. Fix any banned claim they made by using the correct wording.
- Tone: warm, respectful, plain. Never use: "touch base," "circle back," "hope this finds you well," "revolutionary," "game-changing," "quick call," "just following up."
- Never mention survivors' experiences, never use a shelter's location, and never imply the org is failing.

**Video thumbnail line** (placeholder for the SDR's tool):
`[Video thumbnail: "<First name>, <topic> (<length>)"]`

**Bump template** (text only, same thread):
> Hi <First>, I wanted to make sure the video reached you. If <topic> sits with someone else at <Org>, a name is all I need. Thanks, <Sender>

---

## 8. Faceless Remotion video spec

No presenter on camera. Videos are on-screen text, **real VS360 screens** (captured from the product with fictional client data) and the prospect's public homepage, plus voiceover, burned-in captions and a ducked music bed. One composition (`OutreachVideo`, 1920x1080, 30 fps, in the plugin's `video/` folder) renders every video from a plan. Timing follows the voiceover, so you don't count frames.

**One person, one script.** Every contact gets their own video, written from three things: their role (what they own and what it costs them), a sourced fact about their org (funders, programs, beds, hotline, news), and the email it goes with. Two people at the same agency must differ in topic, problem, screens and question. The renderer rejects plans that repeat screens in the same order or reuse voiceover lines across contacts.

Personalization is built in. On every VS360 screen the app header shows **the prospect's agency, their title and their initials**, and the dashboard says "Good afternoon, <First>".

### 8.1 Defaults
- Length: 60-90 s for A/B/F, 45-60 s for C. The gatekeeper gets no video.
- Captions always on. Voice: ElevenLabs when a key is set, otherwise the macOS voice (review only).
- Thumbnail: the title card with a play button and the first name (`thumbnail.jpg`), plus a 3 s `preview.gif`.

### 8.2 Scene types (only these)
- **title:** "A short video for <First>", their title and agency, and `topic`, beside a VS360 window carrying their agency name.
- **website:** the prospect's public homepage screenshot (`image` = Firecrawl screenshot URL), slow zoom.
- **problem:** `headline` (wrap words in *stars* for the brand color) plus up to 2 `lines`.
- **screen:** a real VS360 screen by catalog id (`necx-outreach-video/screens.md`), with verified title/body, highlight and zoom. Consecutive screens become one guided tour.
- **checklist:** `headline` plus 2-4 `items`.
- **stat:** one verified `value` plus `label` and `source`.
- **cta:** the email's `question`; the sender name and email are added automatically.

### 8.3 Allowed assets
- **NECX:** only screens from the catalog. Their default title/body are verified copy; override them only with claims verified on necx.org or docs.necx.org in this run.
- **Prospect:** the public homepage screenshot, and their name, title and agency as text.
- **Never:** their buildings, staff, residents, events, maps, addresses, reworked logos, real client data, or distress imagery.

### 8.4 Storyboards (screen ids from the catalog)

**A. Reporting owner (~75 s):** title -> problem (the cycle they rebuild by hand) -> screen `dashboard` -> screen `reports-case-grant` -> screen(s) for their funders (`voca-ready`, `hud-sage-ready`, `fvpsa-report`, `stop-home`, `hhsc-generate`, `vclg-signoff`) -> screen `fvpsa-explain` or `ai-accuracy` -> checklist -> cta.

**B. Operations (~90 s):** title -> problem ("<n> programs, one live view") -> screen `dashboard` -> `shelter-board` -> `shelter-waitlist` or `hotline-command` -> `referral-sharing` -> checklist (role-based access · audit trail · one license, unlimited staff) -> cta.

**C. Admin/IT (~50 s, after a reply only):** title -> screen `staff-roles` -> `staff-role-actions` -> `cases-consent` -> checklist (tenant isolation · audit trail · you own your data) -> cta (security docs under NDA).

**F. Executive (~60 s):** title (verified recognition line in `topic`) -> screen `dashboard` -> one reporting screen -> `board-charts` -> stat (pricing or go-live, verified) -> cta.

### 8.5 Plan JSON (one file per org, one entry per video)
```json
{
  "sender": { "name": "", "title": "Partnerships, NECX", "email": "<name>@necx.org" },
  "defaults": { "voice": { "provider": "auto" }, "music": true, "captions": true, "personalizeScreens": true },
  "videos": [
    {
      "videoId": "<org>-<first>-01", "persona": "A",
      "recipient": { "firstName": "", "lastName": "", "title": "", "org": "" },
      "scenes": [
        { "type": "title", "topic": "", "vo": "<First>, I put this short video together for you, about ..." },
        { "type": "problem", "headline": "", "lines": [""], "vo": "" },
        { "type": "screen", "screen": "dashboard", "vo": "" },
        { "type": "screen", "screen": "reports-case-grant", "vo": "" },
        { "type": "checklist", "headline": "", "items": ["", "", ""], "vo": "" },
        { "type": "cta", "question": "", "vo": "" }
      ],
      "sources": []
    }
  ]
}
```

**Voiceover:**
- About 150 words per minute. One idea per scene, at most about 30 words.
- Second person, calm and plain.
- Say "I put this together", never as if on camera.

---

## 9. QA checklist (run before output)

- [ ] Every org fact has a URL + date; prior-email facts tagged "re-verify."
- [ ] Every NECX claim matches the live catalog; no banned claims.
- [ ] Employee list deduped; conflicting titles flagged; excluded roles not contacted.
- [ ] Wave 1 ≤ 3 people, total cold ≤ 5; executive is last.
- [ ] Every cold email: single To, no CC, BCC = CRM only.
- [ ] No send date on a blackout date; send time converted to the prospect's timezone.
- [ ] Each email: one pain, one proof, one question, one link, ≤ 120 words.
- [ ] Each video: frames add up to `durationInFrames`; VO word count fits each scene; captions on; only allowed assets.
- [ ] No shelter address, building photo, resident or survivor story anywhere.
- [ ] Prior-thread mistakes corrected in the new copy.

---

## 10. Output format (return exactly this structure)

```markdown
# <Org> — Outreach Plan (<date>)

## Org fact sheet
| Fact | Detail | Source | Date |

## NECX catalog changes since baseline
(none / list)

## Contact ranking
| Rank | Name | Title | Bucket | Score | Wave | Status (verify title/email) |
Excluded: <names + reason>

## Send schedule
| # | Send (prospect TZ) | To | CC | BCC | Format | Subject |

## Emails
### <#>. <Name> — <Title>
**To / CC / BCC / Send:** …
**Subject:** …
<body>
**Bump (date):** …

### Video spec — <Name>
<storyboard table: # | scene | screen/on-screen | voiceover>
(the full plan JSON for all videos goes in one block at the end, ready for the necx-outreach-video skill)

## After a reply
<CFO / end-user intro plan>

## QA results
<checklist with ticks>

## Sources
<list of fetched URLs>
```

---

## 11. Worked example (abridged): a domestic-violence shelter in Florida (anonymized)

- **Signals:** the CEO was named to a regional leadership list (cite the agency's news post); ESG award amount and people served (from a prior email, re-verify); a new state-funded trafficking program (from a prior email, re-verify). The CEO had several unanswered emails.
- **Ranking:** 1 Contracts & Reporting Manager (A) → 2 Program Quality Specialist (A) → 3 COO (B) → 4 Chief Administrative Officer (C, text only) → 5 Executive Assistant to the CEO (G, routing note) → 6 CEO (F, final video). Warm only: CFO (D), Residential Manager (E). Flagged: two records with the title "Chief Development Officer". Excluded: development, events, HR, legal, thrift store, therapists, advocates, board.
- **Schedule:** Dec 2, Dec 3, Dec 7, bump Dec 9, Dec 10, Dec 15, Jan 5 (avoids Thanksgiving week and Giving Tuesday, Dec 1).
- **Correction applied:** the prior email's "address is never shown" was replaced with "protected by role-based access and an audit trail."
