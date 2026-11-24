# NECX Personalized Outreach Playbook
### Instructions for generating prioritized multi-thread emails + faceless Remotion video scripts

> **Who this is for:** an AI agent (Claude) with Firecrawl access, plus the SDR reviewing the output.
> **What it produces:** for one target organization, a ranked contact plan with To / CC / BCC, subject, body, send date, and a faceless Remotion video spec for every video email. Everything is grounded in verified organization facts and verified NECX features.
> **Golden rule:** every claim about the prospect needs a source URL. Every claim about NECX needs a necx.org or docs.necx.org URL that was fetched in this run. If you can't source a claim, leave it out.

---

## 0. Inputs (ask for anything missing before you start)

| Input | Required | Example |
|---|---|---|
| Organization name + website | Yes | The Shelter for Abused Women & Children, naplesshelter.org |
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

No presenter on camera. Each video uses on-screen text, NECX product screenshots, a voiceover (TTS or a recorded voice-only track) and burned-in captions. All videos render from one reusable Remotion composition driven by per-prospect props.

### 8.1 Technical defaults
- Composition id: `OutreachVideo`; 1920×1080; **30 fps**; `durationInFrames = seconds × 30`.
- Length: 60–90 s (A/B/F), 45–60 s (C); gatekeeper gets no video.
- Fonts and colors: NECX brand (pull from necx.org with Firecrawl `branding` format if not supplied).
- Audio: voiceover track per video plus a low music bed at −24 dB, ducked under the voice.
- Captions: always on (most viewers watch muted); generate from the voiceover script with `@remotion/captions` timing.
- Thumbnail: `npx remotion still OutreachVideo --frame=45` showing the title card with the person's first name. Export as a static PNG; no GIF.

### 8.2 Scene types (the only building blocks allowed)

| Scene type | What it shows | Props |
|---|---|---|
| `TitleCard` | "For <First name>, <Title> · <Org>" plus a one-line topic | `firstName`, `title`, `org`, `topic` |
| `WebsiteFrame` | Prospect's **public homepage** screenshot in a browser frame, slow zoom | `screenshotUrl` |
| `ProblemCard` | Bold pain line, 1–2 short lines of text | `headline`, `sub` |
| `ProductScreen` | NECX screenshot with a highlight box + zoom on the relevant area | `asset`, `highlight {x,y,w,h}`, `caption` |
| `StatCard` | One verified number (e.g., "67/67 manifest files · 0 failures" from the demo validator) | `value`, `label`, `sourceNote` |
| `CheckList` | 2–3 ticks appearing one by one | `items[]` |
| `PricingCard` | Core / Complete prices, "no per-user fees" | `tiers[]` |
| `CTACard` | The question from the email + sender name and email | `cta`, `senderName`, `senderEmail` |

### 8.3 Allowed visual assets
- **NECX:** screenshots from the NECX **demo agency** only. Known assets: `https://necx.org/__l5e/assets-v1/9b922f79-eb5d-45dd-989b-79229d02fdf0/shelter-overview.png` (bed board) and `https://necx.org/__l5e/assets-v1/f6f02a22-c625-4890-82e2-8c5f173412dc/sage-validator.png` (Sage Validator). Capture others from docs.necx.org guides with Firecrawl `screenshot` (Reports, Cases, Shelters, Hotline, Staff, Notes, Time).
- **Prospect:** the public homepage screenshot and the org's name as text. Nothing else.
- **Never:** photos of the prospect's buildings, staff, residents or events; maps; addresses; their logo reworked into NECX graphics; real client data; stock images of injured people or distress.

### 8.4 Storyboards by persona

**A. Reporting owner (75 s = 2250 frames)**

| # | Frames | Scene | On-screen text | Voiceover |
|---|---|---|---|---|
| 1 | 0–150 | TitleCard | "For <First>, <Title> · <Org>" | "<First>, this is a short video for you from <Sender> at NECX." |
| 2 | 150–300 | WebsiteFrame | — | "You're likely the person who brings <Org>'s <funder list> numbers together each cycle." |
| 3 | 300–900 | ProductScreen (Reports → grant setup) | "Upload the grant → questions built into intake" | "Upload the grant document and NECX generates that funder's questions. They're linked to intake, so advocates answer them as they work cases." |
| 4 | 900–1650 | ProductScreen (Sage Validator) + StatCard | "Checked like Sage, before export" | "At report time, the built-in validator runs the same checks Sage runs, then exports Sage-ready files." |
| 5 | 1650–1950 | CheckList | "AI fills cells · shows confidence · you approve" | "Every number traces back to its cases, and the AI never makes one up." |
| 6 | 1950–2250 | CTACard | "<CTA>" | "Send any export and we'll run it live in 30 minutes, or point me to the right person." |

**B. Operations sponsor (90 s = 2700 frames):** TitleCard → ProblemCard ("<n> programs, one live view") → ProductScreen (shelter overview: occupancy, waitlist, partner beds) → ProductScreen (past-expected-stay alert, check-in) → CheckList (role-based access · audit trail · families on check-in) → ProductScreen (Reports/CAPER) → CheckList (every module, one license · unlimited staff · live in 48–72 h) → CTACard.

**C. Admin/IT (50 s = 1500 frames, send only after a reply):** TitleCard → ProductScreen (Staff roles & sign-in verification) → ProductScreen (audit trail / referral consent field by field) → CheckList (tenant isolation · immutable audit trail · you own your data) → CTACard ("Security docs available under NDA").

**F. Executive (60 s = 1800 frames):** TitleCard (with one recognition line, if verified) → three 15-second blocks: Reporting (ProductScreen), Operations (ProductScreen), Cost (PricingCard + "typically an allowable grant expense") → CTACard ("If it's worth 30 minutes, reply. If not, thank you for the work you do.").

### 8.5 Props JSON (one per video, consumed by `OutreachVideo`)

```json
{
  "videoId": "the-shelter-romina-01",
  "fps": 30,
  "width": 1920,
  "height": 1080,
  "durationInFrames": 2250,
  "recipient": { "firstName": "Romina", "title": "Contracts & Reporting Manager", "org": "The Shelter for Abused Women & Children" },
  "voice": { "mode": "tts", "voiceId": "<chosen voice>", "pace": "calm" },
  "brand": { "primary": "#<from necx.org>", "font": "<from necx.org>" },
  "scenes": [
    { "type": "TitleCard", "from": 0, "duration": 150, "props": { "topic": "Funder reporting at The Shelter" },
      "vo": "Romina, this is a short video for you from Tonmoy at NECX." },
    { "type": "WebsiteFrame", "from": 150, "duration": 150, "props": { "screenshotUrl": "<firecrawl screenshot of public homepage>" },
      "vo": "You're likely the person who brings The Shelter's ESG, VOCA and FVPSA numbers together each cycle." },
    { "type": "ProductScreen", "from": 300, "duration": 600,
      "props": { "asset": "<docs.necx.org/guides/reports screenshot>", "highlight": { "x": 0.1, "y": 0.2, "w": 0.5, "h": 0.3 }, "caption": "Upload the grant → questions built into intake" },
      "vo": "Upload the grant document and NECX generates that funder's questions..." },
    { "type": "ProductScreen", "from": 900, "duration": 750,
      "props": { "asset": "https://necx.org/__l5e/assets-v1/f6f02a22-c625-4890-82e2-8c5f173412dc/sage-validator.png", "caption": "Checked like Sage, before export" },
      "vo": "At report time, the built-in validator runs the same checks Sage runs..." },
    { "type": "CheckList", "from": 1650, "duration": 300,
      "props": { "items": ["AI fills cells", "Shows confidence", "You approve"] },
      "vo": "Every number traces back to its cases, and the AI never makes one up." },
    { "type": "CTACard", "from": 1950, "duration": 300,
      "props": { "cta": "Send any export: we'll run it live in 30 min", "senderName": "Tonmoy Ahmed", "senderEmail": "stahmed@necx.org" },
      "vo": "Send any export and we'll run it live in 30 minutes, or point me to the right person." }
  ],
  "captions": true,
  "music": { "track": "<license-free bed>", "volumeDb": -24 },
  "thumbnailFrame": 45,
  "sources": ["https://necx.org/", "https://necx.org/shelter-management", "https://docs.necx.org/"]
}
```

**Voiceover rules:** about 140–150 words per minute (a 75 s video ≈ 180 words max). Every scene's `vo` must fit its duration (words ÷ 2.4 ≤ seconds). Write in second person, calm and plain. Never say "I" as if on camera. Say "this video" or "I put this together."

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
<storyboard table>
<props JSON>

## After a reply
<CFO / end-user intro plan>

## QA results
<checklist with ticks>

## Sources
<list of fetched URLs>
```

---

## 11. Worked example (abridged): The Shelter for Abused Women & Children, Naples FL

- **Signals:** CEO Linda Oberhaus named to 2026 IMPACT 50 (naplesshelter.org/?p=44302); ESG PY2024 $117,401, 370 people (from prior email, re-verify); DCF 35-day trafficking program, July (from prior email, re-verify). CEO had 4 unanswered emails.
- **Ranking:** 1 Romina Dellepere (A, Contracts & Reporting) → 2 Alexis Rhodes (A, Program Quality) → 3 Dan Bennewitz (B, COO) → 4 Jean Witthoft (C, CAO, text only) → 5 Angie Romak (G, routing note) → 6 Linda Oberhaus (F, final video). Warm only: Timothy Barone (D, CFO), Sarah Sepanik (E, Residential Manager). Flagged: two "Chief Development Officer" records (Cyndi Fields / Lauren McDermott). Excluded: development, events, HR, legal, thrift store, therapists, advocates, board.
- **Schedule:** Dec 2, Dec 3, Dec 7, bump Dec 9, Dec 10, Dec 15, Jan 5 (avoids Thanksgiving week and Giving Tuesday, Dec 1).
- **Correction applied:** the prior email's "address is never shown" was replaced with "protected by role-based access and an audit trail."
