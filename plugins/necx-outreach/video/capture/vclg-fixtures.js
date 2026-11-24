// Texas OAG VCLG (feature/necx-1046-vclg-reporting) for the fictional Bluebonnet
// County District Attorney's Office. The template and value lists are the
// branch's own (vclg-template.json, federal-lookups-vclg.json); the quarter is
// vclg-data.js, the same numbers the real OAG workbook generator was run on
// (vclg-writes.json lists the cells it filled).
import TPL from "./vclg-template.json";
import WRITES from "./vclg-writes.json";
import { Q1, AGENCY, TARGETS, GOALS } from "./vclg-data.js";

export const VCLG_PROGRAM = TPL.program;
export const VCLG_GRANT = { id: 9, name: "VCLG FY 2026-27", program: VCLG_PROGRAM, contractStartDate: "2025-09-01", contractEndDate: "2027-08-31" };
export const BLUEBONNET = { id: 21, uid: "sc-21", name: AGENCY.granteeName, isVclgAgency: true, isVocaAgency: true, isHhscAgency: false, isHmisAgency: false, isFvpsaAgency: false, isVawaAgency: false, numberOfUsers: 15 };

const contact = (name, title, phone, email) => ({ name, title, phone, email });
const DANA = contact("Dana Whitfield", "Victim Assistance Coordinator", "+12545550148", "dana.whitfield@bluebonnetda.example");
const RAYMOND = contact("Raymond Okafor", "District Attorney", "+12545550100", "raymond.okafor@bluebonnetda.example");
const ELISE = contact("Elise Moreno", "First Assistant District Attorney", "+12545550102", "elise.moreno@bluebonnetda.example");
const PAUL = contact("Paul Bergstrom", "County Auditor", "+12545550190", "paul.bergstrom@bluebonnetcounty.example");

export const VCLG_STAFF = [
  { id: 301, firstName: "Dana", lastName: "Whitfield", email: DANA.email },
  { id: 302, firstName: "Marcus", lastName: "Lee", email: "marcus.lee@bluebonnetda.example" },
  { id: 303, firstName: "Raymond", lastName: "Okafor", email: RAYMOND.email },
  { id: 304, firstName: "Sofia", lastName: "Ramirez", email: "sofia.ramirez@bluebonnetda.example" },
];
export const GRANT_ROLES = [
  { uid: "gr-ao", grantId: 9, role: "authorized_official", userId: 303, ...RAYMOND },
  { uid: "gr-alt", grantId: 9, role: "alternate_designee", userId: null, ...ELISE },
  { uid: "gr-gc", grantId: 9, role: "grant_contact", userId: 301, ...DANA },
  { uid: "gr-fo", grantId: 9, role: "financial_officer", userId: null, ...PAUL },
  { uid: "gr-cc", grantId: 9, role: "corrections_contact", userId: 301, ...DANA },
];
export const GRANT_TARGETS = Object.entries(TARGETS).map(([metric, targetValue], i) => ({ uid: `gt-${i}`, grantId: 9, fiscalYear: 2027, metric, targetValue }));
export const STAFF_ALLOCATIONS = [
  { uid: "sa-1", id: 1, grantId: 9, userId: 301, functionCode: "direct", basis: "percent", percentTime: 100, annualHours: 2080, positionNo: "1", periodStart: "2025-09-01", periodEnd: "2027-08-31", positionTitle: "Victim Assistance Coordinator" },
  { uid: "sa-2", id: 2, grantId: 9, userId: 302, functionCode: "direct", basis: "percent", percentTime: 100, annualHours: 2080, positionNo: "2", periodStart: "2025-09-01", periodEnd: "2027-08-31", positionTitle: "Assistant Victim Assistance Coordinator" },
];
export const VCLG_PROFILE = { grantId: 9, legalName: AGENCY.granteeName, awardNumber: AGENCY.grantNumber, organizationType: "prosecutor", entityType: "local_government",
  savnsApplicable: true, projectGoals: GOALS, updatedAt: "2026-10-03T15:00:00Z" };

// ---- the Q1 FY2027 report
const pct = (a, b) => Math.round((a / b) * 1000) / 10;
const S = Q1["S4-SERVICES"];
const actual = { unique_victims: Q1["S4-VICTIMS"].new.quarter, public_speeches: Q1["S5-OUTREACH"].speeches.quarter, speech_participants: Q1["S5-OUTREACH"].speech_participants.quarter,
  information_booths: Q1["S5-OUTREACH"].booths.quarter, training_sessions: Q1["S5-TRAINING-SESSIONS"].sessions.quarter, "trained:law_enforcement": Q1["S5-TRAINED"].law_enforcement.quarter };
for (const k of Object.keys(TARGETS)) if (k.startsWith("service:")) actual[k] = S[k.slice(8)].quarter;
const S4_TARGETS = Object.fromEntries(Object.entries(TARGETS).map(([k, t]) => [k, { target: t, quarter: actual[k], quarter_pct: pct(actual[k], t), ytd: actual[k], ytd_pct: pct(actual[k], t) }]));
const metricValues = {
  "GI-NAME": AGENCY.granteeName, "GI-CONTRACT": AGENCY.grantNumber, "GI-FY": 2027, "GI-QUARTER": 1, "GI-ORG-TYPE": "prosecutor", "GI-ENTITY-TYPE": "local_government",
  "GI-NONPROFIT": false, "GI-SAVNS": true, // Section 1 shows phones the way the OAG workbook prints them
  ...Object.fromEntries([["GI-AO", RAYMOND], ["GI-ALT", ELISE], ["GI-CONTACT", DANA], ["GI-FINANCIAL", PAUL], ["GI-CORRECTIONS", DANA]]
    .map(([k, c]) => [k, { ...c, phone: c.phone.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3") }])),
  "GI-SIGNERS": [{ userId: 301, role: "grant_contact" }, { userId: 303, role: "authorized_official" }],
  ...Object.fromEntries(Object.entries(Q1).filter(([k, v]) => typeof v === "object" && !k.startsWith("S6-"))),
  "S4-UNIQUE-YTD": 172, "S4-UNIQUE-TARGET": TARGETS.unique_victims, "S4-TARGETS": S4_TARGETS, "S4-EMERGENCY-FUNDS": 1450, "S4-EMERGENCY-FUNDS-YTD": 1450,
  "S5G-GOALS": GOALS,
};
const answers = Object.entries(Q1).filter(([k, v]) => k.startsWith("S6-") || typeof v === "string")
  .map(([questionKey, value]) => ({ questionKey, value, source: "manual", reason: null, evidenceFileId: null }));
const finding = (id, ruleKey, severity, sectionKey, questionKey, message) => ({ id, ruleKey, severity, sectionKey, questionKey, status: "open", message, waivable: severity !== "error", acknowledgementReason: null });
const FINDINGS = [
  finding(1, "VCLG_V7", "warning", "VICTIMS", "S4-SERVICES", "1 accompaniment — hospital under 45 minutes will not count."),
  finding(2, "VCLG_V9", "warning", "VICTIMS", "S4-VICTIMS", "2 services on this grant excluded: the staff member who gave it is not funded on VCLG that day (check \"Given by\" on the service, or add the position on Staff time)."),
  finding(3, "VCLG_V8", "warning", "VICTIMS", "S4-AGE", "Some new victims will count in the Unknown rows: 5 without date of birth / age, 4 without gender, 4 without race/ethnicity, 1 without victimization type."),
  finding(4, "VCLG_V12", "advisory", "VICTIMS", "S4-UNIQUE-YTD",
    `Unique victims served: 172 of 450 (38%), on pace; Information and Referral: ${S.information_referral.quarter} of 1150 (26%), on pace; Assistance with Crime Victims' Compensation: ${S.cvc.quarter} of 300 (23%), on pace; Assistance with Texas SAVNS: ${S.savns.quarter} of 380 (24%), on pace — quarter 1 of 4.`),
];
export const VCLG_TYPE = { ...TPL.type, available: true, grants: [VCLG_GRANT] };
const report = (uid, q, start, end, status, due, extra = {}) => ({ uid, program: VCLG_PROGRAM, grantId: 9, templateVersion: TPL.template.version, periodKind: "quarterly", reportingYear: q.fy,
  quarter: q.q, periodStart: start, periodEnd: end, status, dueDate: due, dueDateConfirmed: true, isFinalReport: false, approvedAt: null, submittedAt: null, amendmentOfId: null,
  createdAt: "2026-09-02T15:00:00Z", updatedAt: "2026-11-04T13:00:00Z", applicability: {}, selectedLocationIds: [], singleUserMode: false, certification: null, snapshotHash: null,
  submissionChannel: null, submissionReference: null, amendmentReason: null, ...extra });
export const VCLG_REPORTS = [
  report("vq-1", { fy: 2027, q: 1 }, "2026-09-01", "2026-11-30", "needs_review", "2026-12-30"),
  report("vq-0", { fy: 2026, q: 4 }, "2026-06-01", "2026-08-31", "submitted", "2026-09-30", { approvedAt: "2026-09-22T15:00:00Z", submittedAt: "2026-09-23T15:00:00Z" }),
];
export const VCLG_DETAIL = {
  evidence: [], report: VCLG_REPORTS[0], template: TPL.template, grant: VCLG_GRANT, profile: VCLG_PROFILE, answers, findings: FINDINGS, comments: [], canSign: true, afterSignOff: [],
  latestRun: { uid: "run-v1", status: "completed", verdict: "needs_review", errorCount: 0, warningCount: 3, metricValues, sourceCutoffAt: "2026-11-04T08:58:00", completedAt: "2026-11-04T08:58:00", outputHash: "x" },
};
// the drill-down: the records behind "New Victims Served" (case-access names)
const CLIENTS = ["Elena Martinez", "Tasha Williams", "Linh Nguyen", "Fatima Haddad", "Grace Okafor", "Monica Reyes", "Hannah Price", "Rosa Delgado", "Kim Tran", "Derek Shaw", "Ana Ruiz", "James Holt"];
export const vclgLineage = (key) => ({
  formula: key === "S4-SERVICES" ? "Services given during grant-funded hours by staff funded on this VCLG grant, each counted as an instance" :
    "Victims with a VCLG-countable service this month: New the first month this fiscal year, Continuing after that",
  calculation: { periodStart: "2026-09-01", periodEnd: "2026-11-30", timezone: "America/Chicago", sourceCutoffAt: "2026-11-04T08:58:00", templateVersion: TPL.template.version },
  includedCount: 172, excludedCount: 2, pageSize: 100, categories: ["m1:new", "m2:new", "m3:new", "m2:continuing", "m3:continuing"],
  included: CLIENTS.map((name, i) => ({ key: `C-${24081 + i * 7}`, clientName: name, label: name, category: ["m1:new", "m2:new", "m3:new"][i % 3],
    reason: "VCLG-countable service in the month", source: ["Information and Referral", "Assistance with CVC", "Advocacy", "Assistance with Texas SAVNS"][i % 4],
    date: ["2026-09-0", "2026-10-1", "2026-11-1"][i % 3] + ((i % 8) + 1) })),
  excluded: [{ key: "C-24133", code: "UNFUNDED_STAFF", explanation: "Given by staff not funded on VCLG that day" }, { key: "C-24151", code: "UNFUNDED_STAFF", explanation: "Given by staff not funded on VCLG that day" }],
});
// what the "OAG Excel workbook" window lists before download
export const OAG_PREVIEW = { fiscalYear: 2027, problems: [], notes: [], writes: WRITES,
  quarters: [{ quarter: 1, start: "2026-09-01", end: "2026-11-30", source: "signed" }, { quarter: 2, start: "2026-12-01", end: "2027-02-28", source: "none" },
    { quarter: 3, start: "2027-03-01", end: "2027-05-31", source: "none" }, { quarter: 4, start: "2027-06-01", end: "2027-08-31", source: "none" }] };

// the same report once the coordinator has acknowledged each warning
export const VCLG_DETAIL_ACKED = { ...VCLG_DETAIL, findings: FINDINGS.map((f) => (f.severity === "advisory" ? f : { ...f, status: "acknowledged",
  acknowledgementReason: "Reviewed with the Victim Assistance Coordinator: the numbers are right as they are." })) };
// "Show clients" on a finding: the clients behind it (names only for staff who may see every case)
const FINDING_CLIENTS = {
  1: [["Ana Ruiz", "c-24117", "24117"]],
  2: [["James Holt", "c-24133", "24133"], ["Derek Shaw", "c-24151", "24151"]],
  3: [["Kim Tran", "c-24088", "24088"], ["Monica Reyes", "c-24095", "24095"], ["Rosa Delgado", "c-24102", "24102"], ["Hannah Price", "c-24109", "24109"]],
};
export const findingClients = (id) => {
  const people = (FINDING_CLIENTS[id] || []).map(([clientName, uid, displayId]) => ({ clientName, cases: [{ uid, displayId }] }));
  return { restricted: false, total: people.length, people };
};

// the step-by-step guide: the same report signed off (approved), then recorded as submitted
export const vclgDetailAt = (status) => {
  const submitted = status === "submitted";
  return { ...VCLG_DETAIL_ACKED, report: { ...VCLG_REPORTS[0], status, approvedAt: "2026-12-08T16:20:00Z", snapshotHash: "9f2c41ab7e05",
    certification: { name: "Dana Whitfield", title: "Victim Assistance Coordinator", certifiedAt: "2026-12-08T16:20:00Z", singleUserException: false },
    submittedAt: submitted ? "2026-12-09T15:00:00Z" : null, submissionChannel: submitted ? "OAG Grants Portal" : null, submissionReference: submitted ? "OAG-QPR-41872" : null } };
};
