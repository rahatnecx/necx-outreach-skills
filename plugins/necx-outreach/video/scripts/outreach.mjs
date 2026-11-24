// The whole outreach for one agency, as structured data and files:
//   normalizeOutreach(raw)   plan JSON → { sender, org, contacts[], agency, videos[] }
//   lintEmail(...)           the enforced "humanizer" + deliverability rules
//   writeOutreach(o, dir)    <Agency>/outreach.json, outreach.md, sequence.csv,
//                            and per contact: email-NN-<type>.html / .txt
//   emailHtml / emailText    standard, low-risk video email (linked thumbnail + text link)
//
// Plan format (a "videos": [...] list from v1.1 is still accepted):
// {
//   "sender": { "name", "title", "email" },
//   "org": { "name", "website", "timezone", "programs": ["shelter","hotline",...],
//            "funders": ["VOCA","FVPSA",...], "facts": [{ "fact", "source" }] },
//   "defaults": { "music", "captions", "personalizeScreens", "voice" },
//   "agencyVideo": { "enabled": true, "topic"?, "scenes"?, "emails"?: [...] },
//   "contacts": [{ "firstName", "lastName", "title", "email", "persona", "rank", "wave",
//                  "video": { "scenes": [...] } | null,
//                  "emails": [{ "step", "type": "video|text|bump|breakup", "sendAt",
//                               "to", "cc", "bcc", "subject", "body" }],
//                  "sources": [] }]
// }
// In an email body, a line containing only [VIDEO] is where the thumbnail goes.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CATALOG = JSON.parse(readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../public/screens/catalog.json"), "utf8")).screens;

const slug = (s) => String(s ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
export const folderName = (s) => String(s ?? "").replace(/[\/\\:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 90) || "Untitled";
const orgInitials = (org) => {
  const w = String(org ?? "").split(/\s+/).filter((x) => x.length > 2 && !/^(the|and|for|of)$/i.test(x));
  return w.slice(0, 2).map((x) => x[0].toUpperCase()).join(" ") || "N";
};

// ---- agency-wide video: all of NECX, adapted to what the agency runs -------------
const AGENCY_SCREENS = [
  ["dashboard", () => true, (o) => `Here's NECX with ${o.name}'s name on it: cases, beds, the hotline and what needs attention, the moment your team signs in.`],
  ["cases-overview", () => true],
  ["referral-sharing", () => true],
  ["hotline-command", (o) => o.programs.includes("hotline")],
  ["shelter-board", (o) => o.programs.includes("shelter")],
  ["cases-documents", () => true],
  ["reports-library", () => true],
  ["voca-ready", (o) => o.funders.includes("VOCA")],
  ["hud-sage-ready", (o) => o.funders.some((f) => /^(HUD|ESG|COC|HMIS)$/.test(f))],
  ["fvpsa-report", (o) => o.funders.includes("FVPSA")],
  ["stop-home", (o) => o.funders.some((f) => /^(VAWA|STOP)$/.test(f))],
  ["hhsc-generate", (o) => o.funders.includes("HHSC")],
  ["vclg-signoff", (o) => o.funders.some((f) => /^(VCLG|OAG)$/.test(f))],
  ["staff-roles", () => true],
];
function agencyScenes(o, sender, topic) {
    // about 75-90 s: the core screens plus what this agency runs and who funds it
  const screens = AGENCY_SCREENS.filter(([, when]) => when(o)).slice(0, 7);
  const funderLine = o.funders.length ? `, including ${o.funders.slice(0, 3).join(", ")}` : "";
  return [
    { type: "title", topic: topic ?? `Everything ${o.name} runs, in one place`, vo: `This is a short video for the team at ${o.name}${sender?.name ? `, from ${sender.name} at NECX` : ""}.` },
    { type: "problem", headline: "Cases, beds, calls and *grant reports* in five different tools.", lines: ["Survivors repeat their story to every program", "Reports get rebuilt by hand every quarter"], vo: `Most agencies like ${o.name} juggle a case database, a bed-board spreadsheet, a hotline log and a separate tool for every funder report.` },
    ...screens.map(([id, , line]) => ({ type: "screen", screen: id, vo: line ? line(o) : CATALOG[id]?.vo ?? CATALOG[id]?.body })),
    { type: "checklist", headline: "Easy to *start.* Easy to *grow.*", items: ["Live in 48–72 hours", "Unlimited staff", "No per-user fees", `Every funder report${funderLine}`], vo: "Most agencies are live in forty-eight to seventy-two hours, with unlimited staff and no per-user fees." },
    { type: "cta", question: `Would a 20-minute walkthrough with ${o.name}'s own programs help?`, vo: `Would a twenty-minute walkthrough with ${o.name}'s own programs help? Just reply to this email.` },
  ];
}

// ---- normalize -------------------------------------------------------------------
export function normalizeOutreach(raw) {
  const plan = Array.isArray(raw) ? { videos: raw } : raw ?? {};
  const defaults = plan.defaults ?? {};
  const sender = plan.sender ?? {};
  // v1.1 format: a bare list of videos
  if (!plan.contacts && plan.videos) {
    const orgName = plan.org?.name ?? plan.videos[0]?.recipient?.org ?? "Agency";
    plan.org = { name: orgName, ...(plan.org ?? {}) };
    plan.contacts = plan.videos.map((v) => ({ ...v.recipient, persona: v.persona, sources: v.sources, emails: v.emails ?? [], video: v }));
  }
  const org = { name: "", website: "", timezone: "", programs: [], funders: [], facts: [], ...(plan.org ?? {}) };
  org.programs = (org.programs ?? []).map((p) => String(p).toLowerCase());
  org.funders = (org.funders ?? []).map((f) => String(f).toUpperCase());
  org.folder = folderName(org.name);
  const contacts = (plan.contacts ?? []).map((c, i) => {
    const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
    const rank = c.rank ?? i + 1;
    const contact = {
      ...c,
      rank,
      name,
      folder: folderName(`${String(rank).padStart(2, "0")}. ${name}${c.title ? ` (${c.title})` : ""}`),
      emails: (c.emails ?? []).map((e, k) => ({ step: e.step ?? k + 1, ...e })),
    };
    if (c.video && /^g$/i.test(c.persona ?? "")) contact.videoBlocked = true;
    if (c.video) {
      contact.video = {
        ...defaults,
        sender,
        ...c.video,
        videoId: c.video.videoId ?? `${slug(org.name)}-${slug(c.firstName)}-${slug(c.lastName) || "x"}`.slice(0, 80),
        persona: c.persona ?? c.video.persona,
        sources: c.sources ?? c.video.sources,
        recipient: { firstName: c.firstName, lastName: c.lastName, title: c.title, org: org.name, ...(c.video.recipient ?? {}) },
        folder: path.join(org.folder, contact.folder),
      };
    }
    return contact;
  });
  let agency = null;
  const av = plan.agencyVideo;
  if (av && av.enabled !== false) {
    agency = {
      name: `${org.name} team`,
      folder: folderName("00. Agency video (whole team)"),
      emails: (av.emails ?? []).map((e, k) => ({ step: e.step ?? k + 1, ...e })),
      video: {
        ...defaults,
        sender,
        kind: "agency",
        videoId: av.videoId ?? `${slug(org.name)}-agency`,
        recipient: { org: org.name, title: "Team", greetName: "team", initials: orgInitials(org.name) },
        scenes: av.scenes?.length ? av.scenes : agencyScenes(org, sender, av.topic),
        sources: av.sources ?? org.facts.map((f) => f.source).filter(Boolean),
        folder: path.join(org.folder, folderName("00. Agency video (whole team)")),
      },
    };
  }
  const videos = [...(agency ? [agency.video] : []), ...contacts.filter((c) => c.video && !c.videoBlocked).map((c) => c.video)];
  return { sender, org, contacts, agency, videos };
}

// ---- the enforced writing rules ------------------------------------------------------
// From the playbook's email rules and the "Signs of AI writing" humanizer checklist.
// Problems block saving/rendering; warnings are reported.
const AI_TELLS = [
  [/\bdelv(e|es|ing)\b/i, "delve"], [/\btapestry\b/i, "tapestry"], [/\btestament to\b/i, "testament to"], [/\bpivotal\b/i, "pivotal"],
  [/\bseamless(ly)?\b/i, "seamless"], [/\brobust\b/i, "robust"], [/\bleverag(e|es|ing)\b/i, "leverage"], [/\belevat(e|es|ing)\b/i, "elevate"],
  [/\bempower(s|ing)?\b/i, "empower"], [/\bunlock(s|ing)?\b/i, "unlock"], [/\bgame[- ]?chang/i, "game-changing"], [/\bcutting[- ]edge\b/i, "cutting-edge"],
  [/\brevolutioni[sz]/i, "revolutionize"], [/\btransformative\b/i, "transformative"], [/\bsynerg/i, "synergy"], [/\bholistic\b/i, "holistic"],
  [/\bin today'?s\b/i, "in today's ..."], [/\bfast[- ]paced\b/i, "fast-paced"], [/\bnavigat(e|ing) the (complex|challeng)/i, "navigate the complexities"],
  [/\bever[- ]evolving\b/i, "ever-evolving"], [/\blandscape\b/i, "landscape"], [/\brealm\b/i, "realm"], [/\bembark/i, "embark"],
[/\bstreamlin(e|es|ed|ing)\b/i, "streamline"], [/\bharness(es|ing)?\b/i, "harness"], [/\bcrucial\b/i, "crucial"],
  [/\bfurthermore\b/i, "Furthermore"], [/\bmoreover\b/i, "Moreover"], [/\badditionally\b/i, "Additionally"], [/\bin conclusion\b/i, "In conclusion"],
  [/\bit'?s worth noting\b/i, "it's worth noting"], [/\bnot only\b[^.]*\bbut also\b/i, "not only ... but also"], [/\bit'?s not just\b/i, "it's not just X, it's Y"],
  [/\bat the end of the day\b/i, "at the end of the day"], [/\brest assured\b/i, "rest assured"], [/\bdon'?t hesitate\b/i, "don't hesitate"],
  [/\bhope (this|the) (email|message|note) finds you/i, "hope this finds you well"], [/\bi wanted to reach out\b/i, "I wanted to reach out"],
  [/\btouch(ing)? base\b/i, "touch base"], [/\bcircl(e|ing) back\b/i, "circle back"], [/\bjust following up\b/i, "just following up"], [/\bquick call\b/i, "quick call"],
  [/\bi'?m excited to\b/i, "I'm excited to"], [/\bperfect fit\b/i, "perfect fit"], [/\bplease find\b/i, "please find"], [/\bas an ai\b/i, "as an AI"],
];
const SPAM = [/\bfree\b/i, /\bguarantee/i, /\bact now\b/i, /\blimited time\b/i, /\b100%/, /\$\$/, /\bclick here\b/i, /\burgent\b/i, /\brisk[- ]free\b/i, /\bwinner\b/i];
const LIMITS = { video: [40, 140], text: [40, 140], bump: [10, 70], breakup: [15, 90], "agency-video": [40, 140] };
const words = (t) => (t.replace(/\[VIDEO\]/g, "").match(/[A-Za-z0-9'’-]+/g) ?? []).length;

export function lintEmail(e, { who, org }) {
  const where = `${who} email ${e.step} (${e.type ?? "?"})`;
  const problems = [];
  const warnings = [];
  const type = e.type ?? "text";
  const subject = (e.subject ?? "").trim();
  const body = (e.body ?? "").trim();
  if (!["video", "text", "bump", "breakup", "agency-video"].includes(type)) problems.push(`${where}: type must be video, text, bump, breakup or agency-video`);
  if (!body) problems.push(`${where}: empty body`);
  if (type !== "bump" && !subject) problems.push(`${where}: no subject`);
  const sw = subject.split(/\s+/).filter(Boolean).length;
  if (subject && (sw < 2 || sw > 10)) problems.push(`${where}: subject should be 2-10 words (has ${sw})`);
  if (/^re:/i.test(subject) && e.step === 1) problems.push(`${where}: no "Re:" on a new thread`);
  const text = `${subject}\n${body}`;
  for (const [re, label] of AI_TELLS) if (re.test(text)) problems.push(`${where}: AI-sounding phrase "${label}"; rewrite it plainly`);
  for (const re of SPAM) if (re.test(text)) warnings.push(`${where}: "${(text.match(re) ?? [""])[0]}" can trip spam filters; rephrase if you can`);
  if (/[—–]/.test(text)) problems.push(`${where}: no em/en dashes; use a comma, period or parentheses`);
  if (/!/.test(text)) problems.push(`${where}: no exclamation marks`);
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text)) problems.push(`${where}: no emoji`);
  if ((text.replace(/\[VIDEO\]/g, "").match(/\b[A-Z]{4,}\b/g) ?? []).filter((w) => !/^(VOCA|FVPSA|HHSC|VAWA|STOP|HMIS|CAPER|NECX|VCLG|DAL7|OVC|SASP|TANF|HUD|ESG|APR|PMT|CSV)$/.test(w)).length) problems.push(`${where}: no ALL-CAPS words`);
  if (/https?:\/\/|www\./i.test(body)) problems.push(`${where}: no links in the body; the only link is the video, placed with a [VIDEO] line`);
  const vids = (body.match(/^[ \t]*\[VIDEO\][ \t]*$/gm) ?? []).length;
  if (type === "video" || type === "agency-video") {
    if (vids !== 1) problems.push(`${where}: a video email needs exactly one line with only [VIDEO] (where the thumbnail goes)`);
  } else if (vids || /\[VIDEO\]/.test(body)) problems.push(`${where}: only video emails carry [VIDEO]`);
  const n = words(body);
  const [lo, hi] = LIMITS[type] ?? [10, 140];
  if (n > hi + 20) problems.push(`${where}: ${n} words; keep it under ${hi}`);
  else if (n > hi) warnings.push(`${where}: ${n} words; aim for ${hi} or fewer`);
  if (n && n < lo) warnings.push(`${where}: only ${n} words`);
  if (["video", "text", "agency-video"].includes(type) && !/\?/.test(body)) warnings.push(`${where}: end with one clear question`);
  if ((body.match(/\?/g) ?? []).length > 2) warnings.push(`${where}: more than two questions`);
  if (type === "video" && e.firstName && !body.includes(e.firstName)) warnings.push(`${where}: greet ${e.firstName} by name`);
  if (org && type !== "bump" && !body.includes(org) && !String(org).split(/\s+/).some((w) => w.length > 4 && body.includes(w))) warnings.push(`${where}: never mentions ${org}`);
  if (/^(dear sir|dear madam|to whom it may concern)/i.test(body)) problems.push(`${where}: address the person by first name`);
  return { problems, warnings };
}

export function lintOutreach(o) {
  const problems = [];
  const warnings = [];
  const seenBodies = new Map();
  const people = [...o.contacts.map((c) => [c.name || "(no name)", c, c.firstName]), ...(o.agency ? [[`${o.org.name} (agency)`, o.agency, null]] : [])];
  for (const [who, c, first] of people) {
    if (c.videoBlocked) problems.push(`${who}: gatekeepers (persona G) get no video; remove it`);
    const steps = new Set();
    for (const e of c.emails ?? []) {
      if (steps.has(e.step)) problems.push(`${who}: two emails numbered step ${e.step}`);
      steps.add(e.step);
      if (e.type === "video" && !c.video) problems.push(`${who} email ${e.step}: a video email but this contact has no video`);
      const r = lintEmail({ ...e, firstName: first }, { who, org: o.org.name });
      problems.push(...r.problems);
      warnings.push(...r.warnings);
      const key = (e.body ?? "").replace(/\s+/g, " ").replace(new RegExp(first ?? "\u0000", "g"), "").trim().toLowerCase();
      if (key.length > 40) {
        if (seenBodies.has(key)) problems.push(`${who} email ${e.step}: same body as ${seenBodies.get(key)}; write it for this person`);
        else seenBodies.set(key, `${who} email ${e.step}`);
      }
      if (e.sendAt && Number.isNaN(Date.parse(e.sendAt.replace(" ", "T")))) warnings.push(`${who} email ${e.step}: sendAt "${e.sendAt}" isn't a date (use YYYY-MM-DD HH:MM)`);
    }
    if (c !== o.agency && !(c.emails ?? []).length) warnings.push(`${who}: no emails drafted`);
  }
  if (!o.sender?.name || !o.sender?.email) warnings.push("no sender name/email; emails and videos need them (get_setup / save_profile)");
  return { problems, warnings };
}

// ---- email rendering -------------------------------------------------------------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const paras = (t) => t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
const signatureLines = (s) => [s.name, [s.title, "NECX"].filter(Boolean).join(", ").replace(/, NECX, NECX$/, ", NECX")].filter(Boolean);

// links: { videoUrl, thumbnailUrl, seconds }. Without a hosted video yet, the
// placeholders stay visible so nothing goes out half-finished.
export function emailText(e, sender, links = {}) {
  const url = links.videoUrl ?? "{{VIDEO_LINK}}";
  const len = links.seconds ? `${Math.round(links.seconds)}-second ` : "";
  const body = (e.body ?? "").replace(/^[ \t]*\[VIDEO\][ \t]*$/m, `Watch the ${len}video: ${url}`);
  return `${body.trim()}\n\n${signatureLines(sender).join("\n")}\n`;
}

// Standard, low-risk video email: a linked static thumbnail (with the play button
// drawn in) plus a plain text link under it. No <video>, iframes, scripts,
// background images, forms or attachments: those break in Outlook/Gmail or trip filters.
export function emailHtml(e, sender, links = {}, { firstName = "", orgName = "" } = {}) {
  const url = esc(links.videoUrl ?? "{{VIDEO_LINK}}");
  const thumb = esc(links.thumbnailUrl ?? "thumbnail.jpg");
  const len = links.seconds ? `${Math.round(links.seconds)}-second ` : "";
  const alt = esc(`Play: a ${len}video for ${firstName || `the team at ${orgName}`}`);
  const font = "font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1f2933;";
  const block = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px;border-collapse:collapse;"><tr><td><a href="${url}" target="_blank" style="text-decoration:none;"><img src="${thumb}" width="480" alt="${alt}" style="display:block;width:100%;max-width:480px;height:auto;border:0;border-radius:8px;"></a></td></tr><tr><td style="padding-top:8px;${font}font-size:13px;color:#52606d;">&#9654;&nbsp;<a href="${url}" target="_blank" style="color:#237886;">Watch the ${esc(len)}video</a></td></tr></table>`;
  const html = paras(e.body ?? "")
    .map((p) => (/^\[VIDEO\]$/.test(p) ? block : `<p style="margin:0 0 14px;">${esc(p).replace(/\n/g, "<br>")}</p>`))
    .join("\n");
  const sig = signatureLines(sender).map(esc).join("<br>");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(e.subject ?? "")}</title></head>
<body style="margin:0;padding:16px;background:#ffffff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;border-collapse:collapse;"><tr><td style="${font}">
${html}
<p style="margin:18px 0 0;">${sig}</p>
</td></tr></table>
</body></html>
`;
}

// ---- files -----------------------------------------------------------------------
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const fileFor = (e) => `email-${String(e.step).padStart(2, "0")}-${e.type ?? "text"}`;

// linksFor(videoId) → { videoUrl?, thumbnailUrl?, seconds?, videoFile? }
export function writeOutreach(o, baseDir, { linksFor = () => ({}), renderVoice = null } = {}) {
  const orgDir = path.join(baseDir, o.org.folder);
  mkdirSync(orgDir, { recursive: true });
  const rows = [];
  const people = [...(o.agency ? [o.agency] : []), ...o.contacts];
  for (const c of people) {
    const dir = path.join(orgDir, c.folder);
    mkdirSync(dir, { recursive: true });
    const links = c.video ? linksFor(c.video.videoId) : {};
    const meta = { firstName: c.firstName ?? "", orgName: o.org.name };
    for (const e of c.emails ?? []) {
      const base = fileFor(e);
      writeFileSync(path.join(dir, `${base}.txt`), `Subject: ${e.subject ?? "(reply in thread)"}\nTo: ${e.to ?? c.email ?? ""}\n${e.cc?.length ? `Cc: ${[].concat(e.cc).join(", ")}\n` : ""}${e.bcc?.length ? `Bcc: ${[].concat(e.bcc).join(", ")}\n` : ""}Send: ${e.sendAt ?? ""}\n\n${emailText(e, o.sender, links)}`);
      if (e.type === "video" || e.type === "agency-video") writeFileSync(path.join(dir, `${base}.html`), emailHtml(e, o.sender, links, meta));
      rows.push({
        org: o.org.name, rank: c.rank ?? 0, wave: c.wave ?? "", contact: c.name, title: c.title ?? "", email: c.email ?? "", persona: c.persona ?? "",
        step: e.step, type: e.type ?? "text", send_at: e.sendAt ?? "", to: e.to ?? c.email ?? "", cc: [].concat(e.cc ?? []).join("; "), bcc: [].concat(e.bcc ?? []).join("; "),
        subject: e.subject ?? "", body_text: emailText(e, o.sender, links), video_url: links.videoUrl ?? "", thumbnail_url: links.thumbnailUrl ?? "",
        video_file: links.videoFile ?? "", folder: path.join(o.org.folder, c.folder),
      });
    }
  }
  rows.sort((a, b) => String(a.send_at).localeCompare(String(b.send_at)) || a.rank - b.rank || a.step - b.step);
  const cols = ["org", "rank", "wave", "contact", "title", "email", "persona", "step", "type", "send_at", "to", "cc", "bcc", "subject", "body_text", "video_url", "thumbnail_url", "video_file", "folder"];
  writeFileSync(path.join(orgDir, "sequence.csv"), [cols.join(","), ...rows.map((r) => cols.map((k) => csvCell(r[k])).join(","))].join("\n") + "\n");
  const json = { ...o, generated: new Date().toISOString(), voice: renderVoice, schedule: rows.map(({ body_text, ...r }) => r) };
  writeFileSync(path.join(orgDir, "outreach.json"), JSON.stringify(json, (k, v) => (k === "audio" ? undefined : v), 2) + "\n");
  writeFileSync(path.join(orgDir, "outreach.md"), markdown(o, rows, linksFor));
  writeFileSync(path.join(orgDir, "HOW-TO-SEND.md"), HOW_TO_SEND);
  return { orgDir, emails: rows.length };
}

function markdown(o, rows, linksFor) {
  const L = [];
  L.push(`# ${o.org.name}: outreach plan`, "", `Generated ${new Date().toISOString().slice(0, 10)} · sender: ${[o.sender?.name, o.sender?.title, o.sender?.email].filter(Boolean).join(", ") || "(not set)"}`, "");
  if (o.org.facts?.length) {
    L.push("## Agency facts", "", "| Fact | Source |", "|---|---|", ...o.org.facts.map((f) => `| ${String(f.fact ?? "").replace(/\|/g, "/")} | ${f.source ?? ""} |`), "");
  }
  L.push("## Contacts", "", "| # | Name | Title | Persona | Wave | Video | Emails |", "|---|---|---|---|---|---|---|");
  for (const c of o.contacts) L.push(`| ${c.rank} | ${c.name} | ${c.title ?? ""} | ${c.persona ?? ""} | ${c.wave ?? ""} | ${c.video && !c.videoBlocked ? "yes" : "no"} | ${c.emails?.length ?? 0} |`);
  if (o.agency) L.push("", `Agency-wide video: yes (folder "${o.agency.folder}")`);
  L.push("", "## Send schedule", "", "| Send | To | Step | Type | Subject |", "|---|---|---|---|---|", ...rows.map((r) => `| ${r.send_at} | ${r.contact} | ${r.step} | ${r.type} | ${String(r.subject).replace(/\|/g, "/")} |`), "");
  for (const c of [...(o.agency ? [o.agency] : []), ...o.contacts]) {
    L.push(`## ${c.name}${c.title ? `, ${c.title}` : ""}`, "");
    if (c.video && !c.videoBlocked) {
      const l = linksFor(c.video.videoId);
      L.push(`**Video:** ${c.video.scenes.length} scenes${l.videoUrl ? ` · ${l.videoUrl}` : " · not hosted yet"}`, "");
    }
    for (const e of c.emails ?? []) {
      L.push(`### ${e.step}. ${e.type ?? "text"}${e.sendAt ? ` · ${e.sendAt}` : ""}`, "", `**Subject:** ${e.subject ?? "(reply in thread)"}`, "", "```", emailText(e, o.sender, c.video ? linksFor(c.video.videoId) : {}).trim(), "```", "");
    }
  }
  return L.join("\n");
}

const HOW_TO_SEND = `# How to send these emails

Each contact's folder has the video, its thumbnail, and one file per email:
- \`email-01-video.html\`: the formatted video email (thumbnail linked to the video)
- \`email-NN-*.txt\`: plain-text version of every email, with subject, recipients and send time

## 1. Host the video (once per video)
Email can't play video, so the email shows a thumbnail that links to the video.
Upload \`video.mp4\` somewhere that gives a viewing link (Google Drive "Anyone with the link",
Vimeo, Loom, YouTube unlisted, or the NECX video page if your team hosts one).
Then tell Claude: "the link for <name> is <url>". It fills the link into every email
(and the thumbnail URL too if you host the image).

## 2. Put it in your mail client
- **Gmail / Outlook (recommended):** open \`email-01-video.html\` in your browser, select all, copy,
  and paste into a new email. The thumbnail stays linked to the video.
  If the image doesn't paste (it's a local file), insert \`thumbnail.jpg\` with *Insert photo → Inline*,
  then select it and add the video link.
- **Outreach tools (Apollo, Outreach, HubSpot):** import \`sequence.csv\`; use \`body_text\`,
  which has the plain video link.

## Why it's built this way (deliverability)
- A linked image plus a text link works in every client; embedded players, GIF-only emails,
  attachments, link shorteners and multiple links hurt delivery, especially into agency
  mail filters (Proofpoint, Mimecast).
- One link per email, no attachments, no tracking pixels, plain two-line signature.
- Animated \`preview.gif\` is optional; Outlook desktop shows only its first frame, so the
  static thumbnail is the default.
`;
