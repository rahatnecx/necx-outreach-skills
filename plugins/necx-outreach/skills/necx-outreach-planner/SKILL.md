---
name: "necx-outreach-planner"
description: "Plan NECX multi-thread outreach to a victim-services org: research it, rank employees, set To/CC/BCC, write emails and faceless Remotion video specs."
---

# NECX Outreach Planner

Use this skill when an NECX SDR wants to:
- plan outreach to a victim-services organization (DV shelter, sexual assault center, trafficking program, hotline, victim-witness unit, homeless services)
- rank an employee list
- decide To/CC/BCC
- write personalized cold emails or video emails
- produce faceless Remotion video specs

The output is a ranked contact plan with send dates, To/CC/BCC, subject, body, bumps, and a faceless Remotion storyboard + props JSON for every video email. Every prospect fact is backed by a fetched URL. Every NECX claim matches a necx.org or docs.necx.org page fetched in this run.

**Golden rule:** if you can't source a claim, leave it out.

## How to run it in Claude
- **Fetching:** use the Firecrawl tools: `firecrawl_scrape` with formats `markdown` and `links`, `onlyMainContent: true`, `waitFor: 3000`. Use `firecrawl_search` for searches and the `screenshot` format for the homepage. necx.org and docs.necx.org are JS-rendered, so plain WebFetch returns only metadata. If Firecrawl isn't connected, try WebFetch. If a page comes back empty, say so and ask the user to paste it.
- **Deliverable:** a Docs artifact when that type is available (one section per contact), otherwise a markdown file. A one-person request is answered in chat.
- **Rendering:** if the user asks to render the videos, hand the props JSON to the Remotion skills (`remotion:remotion-best-practices`, `remotion:remotion-create`, `remotion:remotion-render`).
- **Check-ins:** ask before starting only when org name/website or the employee list is missing. Otherwise state your assumptions and proceed.

---

## 0. Inputs (ask once for anything missing)

| Input | Required | Example |
|---|---|---|
| Organization name + website | Yes | The Shelter for Abused Women & Children, naplesshelter.org |
| Employee list (name + title) | Yes | Apollo, LinkedIn or ZoomInfo export |
| Prior emails already sent | If any | 4 emails to the CEO, Oct-Nov |
| Sender name, title, signature | Yes | Sheikh Tonmoy Ahmed, SDR, NECX Inc. |
| Sender + prospect timezones | Yes | Asia/Dhaka -> America/New_York |
| Earliest send date | Yes | 2026-12-02 |
| CRM BCC logging address | Optional | bcc@crm.example.com |

If there's no employee list, build one from the org's staff page or `people_company_search` and mark each person "unverified - from web".

## 1. Research the organization

### 1.1 Fetch
1. Homepage, then About, Programs/Services, Leadership/Staff, News/Press, Annual Report, Careers.
2. Separate searches:
   - `"<org>" news <current year>`
   - `"<org>" grant award`
   - `"<org>" ESG`
   - `"<org>" VOCA`
   - `"<org>" "<county>" Emergency Solutions Grant CAPER`
   - `"<org>" 990`
   - `"<org>" award OR honored OR named`
   - `"<CEO name>"` (current role check)
   - careers/hiring (data, IT or grants roles signal pain)
3. A screenshot of the public homepage only.

### 1.2 Org Fact Sheet (every row: fact, source URL, date)
- **Identity:** name, city/state, founded, service area
- **Programs:** shelters (count only, never addresses), hotline, outreach, transitional, legal, trafficking, children
- **Funding:** VOCA, FVPSA, STOP/VAWA, HUD ESG/CoC, state agency (FL DCF, TX HHSC...), county awards with $ + year + people served
- **Scale:** budget (990), beds, staff, people served
- **Recent events (12 months or less):** new program, award, expansion, leadership change
- **Reporting load:** funders. A VSP with HUD funding must use a comparable database, not HMIS.
- **Current system, if findable:** Apricot, Osnium, EmpowerDB, VelaTrack, spreadsheets, software named in job posts

**Fact rules:**
- Facts older than 24 months are background, not hooks.
- Never use survivor stories as hooks.
- Never mention a shelter location.
- Tag facts taken from the user's prior emails "from prior email - re-verify".

## 2. Refresh the NECX feature catalog (every run)

Fetch:
- https://necx.org/
- https://necx.org/grant-reporting
- https://necx.org/case-management
- https://necx.org/shelter-management
- https://necx.org/hotline-management
- https://necx.org/referrals
- https://necx.org/regional-network
- https://necx.org/pricing-onboarding
- https://docs.necx.org/ (guides at /guides/<module>, tour at /tour)

The live page wins over this baseline. Report any changes.

### Baseline catalog (verified 2026-11-24)

| Module / claim | Approved wording | Source |
|---|---|---|
| HUD status | Comparable database on HUD's official list of validated vendors; CoC APR & ESG CAPER validated in Sage. HUD does not certify or endorse software. | necx.org |
| Sage Validator | Runs the same manifest, row-count and cross-file checks as HUD's Sage portal before export; Sage-ready CSVs | /shelter-management |
| HMIS | VSPs are barred from HMIS and must use a comparable database; NECX is one | /shelter-management |
| Grant reporting | Upload grant document -> AI generates funder questions -> linked questionnaires fill as staff work cases -> report in seconds | necx.org |
| Report streams | VOCA (PMT), FVPSA, STOP/VAWA, HUD, Texas HHSC DAL7, Texas OAG VCLG, and many more | necx.org, docs |
| AI safeguards | AI only fills cells, shows confidence, waits for approval; validator flags conflicts; never fabricates; every datapoint traces to its case | necx.org |
| Case management | One record per client, first call to closure; many services per person; hard wall between internal notes and client-visible content | necx.org, docs /guides/cases |
| Shelter & bed board | Live by location, room, bed; check-in/out, transfers, incidents, waitlist, partner bed requests; past-expected-stay alert; walk-in check-in creates the client record, families included | /shelter-management, docs /guides/shelters |
| Location confidentiality | Shelter addresses and client whereabouts protected by role-based access and a full audit trail | /shelter-management |
| Hotline | Browser softphone, live transcripts, AI call notes, SMS, callbacks, missed calls; every call wraps into a case, callback or referral | necx.org, docs /guides/hotline |
| Referrals | Consent-gated field by field; nothing shared by default; access audited; works with prosecutor victim-witness offices | /referrals |
| Staff time | Hours attribute to grants automatically; Staff Time Report | necx.org, docs /guides/time |
| Other modules | E-signature, NECX Drive, calendar & court dates, team & partner chat, public inquiries, optional client portal | necx.org |
| Security | Tenant isolation, encrypted transport, role-based access, immutable audit trail; security docs under NDA | necx.org |
| Data ownership | Agency owns its data; NECX helps you take it if you leave | necx.org |
| Pricing | Core $9,600/yr; Complete $14,400/yr; no per-user fees; no setup fees; coalition/regional pricing | necx.org |
| Grant-allowable | Licenses typically allowable grant expenses; NECX helps budget into next application | necx.org |
| Onboarding | Named implementation specialist; migration, questionnaires, training; most agencies live in 48-72 hours | necx.org |
| Modular | Base = case management & intake; all modules included, on/off anytime | necx.org |
| Demo | 30 min live; bring any export (CSV, XLSX, photos of paper forms); watch the report build | necx.org |
| Self-serve tour | NECX Bot tours a demo agency; no sign-up | docs.necx.org |
| Proof | Peace in the Home Family Services, Virginia Victim Assistance Network, Tennessee Voices for Victims, Suited for Success; advisor Kathryn Turman (co-created FBI Victim Services Division) | necx.org |

### Banned claims
- "HUD-certified" or "HUD-approved" (use the validated-vendor wording)
- "a confidential address is never shown" (use the role-based access + audit trail wording)
- "zero errors", "guaranteed compliance", "audit-proof"
- Any customer, number, integration or report type not on a fetched page

## 3. Clean and classify the employee list

### Clean
1. Dedupe on name + title.
2. Two people with the same C-level title means flag both "verify title" and use neither as primary until resolved.
3. Flag missing emails (for example "Access email").
4. Move board members and volunteers to a do-not-contact list.

### Persona buckets (title keywords)

| Bucket | Keywords | Pain | Lead module |
|---|---|---|---|
| A Reporting owner | contracts, reporting, grants manager, compliance, data, QA, quality, evaluation, HMIS, outcomes | Quarter-end assembly, funder formats, CAPER/APR | Grant reporting + Sage Validator |
| B Operations sponsor | COO, chief operating, director of operations, chief program officer, VP/director of programs | Disconnected tools, beds/waitlist, rollout risk | Bed board + modular + onboarding |
| C Admin/IT | chief administrative, CAO, IT, technology, systems, administration director | Security, data ownership, access | Security, audit trail, data ownership |
| D Finance | CFO, finance director, controller | Cost, grant-allowable, staff time | Pricing, staff time |
| E Program managers | residential/shelter/hotline/outreach manager, case management supervisor, specialized services manager | Daily workflow | Bed board / hotline / cases |
| F Executive | CEO, executive director, president | Mission, funding, capacity | One-minute summary |
| G Gatekeeper | executive assistant, office manager | - | Routing question only |
| X Exclude | development, fundraising, events, marketing, HR, legal, thrift/retail, therapist, advocate, counselor, trainer, coach, board, volunteer | - | Never cold-contact |

### Priority score (0-100)
- **Pain owned (up to 30):** A 30, B 25, C 15, D/E/F 10
- **Authority (up to 20):** C-level 20, director 15, manager 10, specialist 5
- **Fit to a fetched org signal (up to 20):** e.g., HUD ESG -> A +20; new program -> B +20
- **Freshness (up to 15):** never contacted 15; contacted 1-2 times 8; 3 or more 0
- **Data quality (up to 15):** title verified + email 15; one missing 7; both 0

**Waves:**
- **Wave 1:** max 3 people. Top A first, then top B, plus a second A if one exists.
- **Wave 2:** C, then G (routing note only).
- **Executive (F):** last. If they already have 3 or more unanswered touches, send one final "last note" only.
- **D and E:** only through a champion after a reply.
- **Cap:** max 5 cold contacts per org in 6 weeks.

## 4. To / CC / BCC

| Situation | To | CC | BCC |
|---|---|---|---|
| Cold email | The one person | None | CRM only |
| Bump | Same person, same thread | None | CRM |
| Gatekeeper note | Assistant | None (never the executive) | CRM |
| Warm intro after a reply | New stakeholder | Champion, with their OK | CRM |
| Prospect asks to loop someone in | Prospect | Whoever they named | CRM |
| Final executive note | Executive | None; mention team only if they replied | CRM |

Never put multiple prospects in To, and never BCC-blast prospects.

## 5. Cadence
- **Spacing:** 1-2 business days between wave-1 people; bump the primary on day 5-6; wave 2 on day 6-9; executive 2-4 weeks after wave 1 starts.
- **Send time:** 8:30 am in the prospect's timezone, scheduled (Dhaka 7:30 pm = 8:30 am ET).
- **Blackout dates:** US federal holidays, Thanksgiving week, Giving Tuesday and the day before, Dec 24-Jan 1, and the org's gala date.
- **Good windows:** 4-8 weeks before a reporting deadline, right after an award or launch, at fiscal-year start.
- **Stop and cool-down:** any reply pauses every thread. After the final executive note, 90 days of silence. Always use new threads with new subjects, never old unanswered ones.

## 6. Persona -> message matrix

| Bucket | Hook | Pain line | NECX proof | CTA |
|---|---|---|---|---|
| A | Their HUD/VOCA/FVPSA awards | Pulling numbers into each funder's format | Grant document -> intake questions; Sage Validator; datapoint traces to case | "Send any export and I'll run it live in 30 min, or point me to the right person." |
| A quality | Same funders | A skipped intake field becomes a blank report weeks later | Questions inside intake; audit trail; validator flags conflicts | "30 min with a sample of your data, or the self-guided tour?" |
| B | New program, expansion | Beds, waitlist and programs across separate tools | Live bed board, waitlist, partner beds, past-stay alert, check-in creates record; one license; live in 48-72 h | "Worth a 30-minute look?" |
| C | Size, data sensitivity | Who owns case-data systems? | HUD validated-vendor list; tenant isolation; immutable audit trail; agency owns data; NDA security docs | "Is that you? If not, a name helps." |
| F | Recognition | Three things in one minute | Reporting + operations + cost (pricing, grant-allowable) | "If it's worth 30 minutes, reply. If not, thank you for the work you do." |
| G | - | I don't want to keep filling <Exec>'s inbox | None | "Who looks after reporting or data systems?" |

## 7. Email rules

**Subject:** 4-9 words, specific, sentence case. No "Re:" on a new thread. Video emails can include the length.

**Body:**
- 60-120 words (gatekeeper 60 max), plain text.
- Order: personal line -> one pain -> thumbnail line (video emails only) -> 1-2 proof sentences -> one question.
- Exactly one link (the video) or none. No attachments. Two-line signature. DV agencies often run Proofpoint/Mimecast.
- Up to 3 bullets, operations persona only.
- Don't repeat earlier pitches. Correct any banned claims from them.
- Warm, plain tone. Never: "touch base", "circle back", "hope this finds you well", "game-changing", "quick call", "just following up".
- Never survivor stories or locations, and never imply the org is failing.

**Thumbnail line:** `[Video thumbnail: "<First>, <topic> (<length>)"]`

**Bump:** "Hi <First>, I wanted to make sure the video reached you. If <topic> sits with someone else at <Org>, a name is all I need. Thanks, <Sender>"

## 8. Faceless Remotion video spec

No presenter on camera. Videos are on-screen text, NECX demo screenshots, voiceover (TTS or voice-only) and burned-in captions. Everything renders from one reusable composition driven by per-prospect props.

### Technical defaults
- Composition `OutreachVideo`, 1920x1080, 30 fps, durationInFrames = seconds x 30.
- Length: 60-90 s for A/B/F, 45-60 s for C. The gatekeeper gets no video.
- Brand fonts and colors from necx.org (Firecrawl `branding` format).
- Voiceover plus a music bed at -24 dB, ducked under the voice.
- Captions always on, timed with `@remotion/captions`.
- Thumbnail: `npx remotion still OutreachVideo --frame=45`, static PNG with the first name.

### Scene types (only these)
- **TitleCard:** "For <First>, <Title> · <Org>" plus topic.
- **WebsiteFrame:** the prospect's public homepage screenshot, slow zoom.
- **ProblemCard:** pain headline plus 1-2 lines.
- **ProductScreen:** NECX screenshot, highlight box + zoom, caption.
- **StatCard:** one verified number, with a source note.
- **CheckList:** 2-3 ticks.
- **PricingCard:** Core/Complete, no per-user fees.
- **CTACard:** the email's question plus sender name and email.

### Allowed assets
- **NECX:** demo-agency screenshots only. Known assets: https://necx.org/__l5e/assets-v1/9b922f79-eb5d-45dd-989b-79229d02fdf0/shelter-overview.png and https://necx.org/__l5e/assets-v1/f6f02a22-c625-4890-82e2-8c5f173412dc/sage-validator.png. Capture others from docs.necx.org/guides/* (Reports, Cases, Shelters, Hotline, Staff, Notes, Time).
- **Prospect:** the public homepage screenshot and the org name as text only.
- **Never:** their buildings, staff, residents, events, maps, addresses, reworked logos, real client data, or distress imagery.

### Storyboards

**A. Reporting owner (75 s = 2250 frames)**

| # | Frames | Scene | On-screen | Voiceover |
|---|---|---|---|---|
| 1 | 0-150 | TitleCard | For <First>, <Title> · <Org> | "<First>, this is a short video for you from <Sender> at NECX." |
| 2 | 150-300 | WebsiteFrame | - | "You're likely the person who brings <Org>'s <funders> numbers together each cycle." |
| 3 | 300-900 | ProductScreen (grant setup) | Upload the grant -> questions built into intake | "Upload the grant document and NECX generates that funder's questions, linked to intake, so advocates answer them as they work cases." |
| 4 | 900-1650 | ProductScreen (Sage Validator) + StatCard | Checked like Sage, before export | "At report time the built-in validator runs the same checks Sage runs, then exports Sage-ready files." |
| 5 | 1650-1950 | CheckList | AI fills cells · shows confidence · you approve | "Every number traces back to its cases, and the AI never makes one up." |
| 6 | 1950-2250 | CTACard | <CTA> | "Send any export and we'll run it live in 30 minutes, or point me to the right person." |

**B. Operations (90 s):** TitleCard -> ProblemCard ("<n> programs, one live view") -> ProductScreen (shelter overview) -> ProductScreen (past-stay alert, check-in) -> CheckList (role-based access · audit trail · families on check-in) -> ProductScreen (Reports/CAPER) -> CheckList (one license · unlimited staff · live in 48-72 h) -> CTACard.

**C. Admin/IT (50 s, after a reply only):** TitleCard -> ProductScreen (Staff roles, sign-in verification) -> ProductScreen (audit trail / field-by-field consent) -> CheckList (tenant isolation · immutable audit trail · you own your data) -> CTACard (security docs under NDA).

**F. Executive (60 s):** TitleCard (verified recognition line) -> 15 s Reporting -> 15 s Operations -> 15 s Cost (PricingCard + grant-allowable) -> CTACard.

### Props JSON (one per video)
```json
{
  "videoId": "<org>-<first>-01", "fps": 30, "width": 1920, "height": 1080, "durationInFrames": 2250,
  "recipient": { "firstName": "", "title": "", "org": "" },
  "voice": { "mode": "tts", "voiceId": "", "pace": "calm" },
  "brand": { "primary": "", "font": "" },
  "scenes": [
    { "type": "TitleCard", "from": 0, "duration": 150, "props": { "topic": "" }, "vo": "" },
    { "type": "WebsiteFrame", "from": 150, "duration": 150, "props": { "screenshotUrl": "" }, "vo": "" },
    { "type": "ProductScreen", "from": 300, "duration": 600, "props": { "asset": "", "highlight": { "x": 0, "y": 0, "w": 0, "h": 0 }, "caption": "" }, "vo": "" },
    { "type": "CTACard", "from": 1950, "duration": 300, "props": { "cta": "", "senderName": "", "senderEmail": "" }, "vo": "" }
  ],
  "captions": true, "music": { "track": "", "volumeDb": -24 }, "thumbnailFrame": 45, "sources": []
}
```

**Voiceover:**
- About 145 words per minute. Each scene's word count divided by 2.4 must be no more than its seconds.
- Second person, calm and plain.
- Say "I put this together", never as if on camera.

## 9. QA checklist
- [ ] Org facts have URL + date; prior-email facts tagged re-verify
- [ ] NECX claims match the live catalog; no banned claims
- [ ] List deduped; conflicting titles flagged; excluded roles untouched
- [ ] Wave 1 at most 3, total cold at most 5; executive last
- [ ] Cold emails: one To, no CC, CRM-only BCC
- [ ] No blackout dates; times converted to prospect timezone
- [ ] Emails: one pain, one proof, one question, one link, 120 words or fewer
- [ ] Videos: frames sum correctly; VO fits each scene; captions on; allowed assets only
- [ ] No addresses, building photos, residents or survivor stories
- [ ] Prior-thread mistakes corrected

## 10. Output format
```markdown
# <Org> - Outreach Plan (<date>)
## Org fact sheet
| Fact | Detail | Source | Date |
## NECX catalog changes since baseline
## Contact ranking
| Rank | Name | Title | Bucket | Score | Wave | Verify |
Excluded: <names + reason>
## Send schedule
| # | Send (prospect TZ) | To | CC | BCC | Format | Subject |
## Emails
### <#>. <Name> - <Title>
**To / CC / BCC / Send:** ...
**Subject:** ...
<body>
**Bump (date):** ...
### Video spec - <Name>
<storyboard table>
<props JSON>
## After a reply
## QA results
## Sources
```

## 11. Worked example (abridged)
The Shelter for Abused Women & Children, Naples FL.
- **Signals:** CEO Linda Oberhaus on the 2026 IMPACT 50 (naplesshelter.org/?p=44302); ESG PY2024 $117,401 / 370 people and the DCF 35-day trafficking program (both from prior email, re-verify).
- **Ranking:** Romina Dellepere (A) -> Alexis Rhodes (A) -> Dan Bennewitz (B) -> Jean Witthoft (C, text only) -> Angie Romak (G) -> Linda Oberhaus (F, final). Warm only: Timothy Barone (CFO), Sarah Sepanik (Residential Manager). Flagged: two Chief Development Officer records.
- **Schedule:** Dec 2, 3, 7, bump Dec 9, Dec 10, Dec 15, Jan 5.
- **Correction:** replaced "address is never shown" with "protected by role-based access and an audit trail".