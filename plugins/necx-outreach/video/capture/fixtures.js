// Fictional demo data for the real VS360 dashboard (vs360-webapp
// src/pages/Dashboard/NewDashboard). Every service function the page calls is
// stubbed by capture.mjs and answered from here; anything not listed returns an
// empty list. Shapes follow the dashboard's own `select:` mappers. All people,
// agencies, case numbers and figures are made up.
import SAGE_APR from "./sage-apr.json";
import FEDERAL from "./federal.json";
import FEDERAL_LOOKUPS from "./federal-lookups-vclg.json"; // the necx-1046 branch's value sets (a superset of necx-990's STOP / FVPSA ones)
import * as V from "./vclg-fixtures.js";
import VOCA_RESULT from "./voca-result.json";
import HHSC_RESULT from "./hhsc-result.json"; // the backend's own DAL7 builders + runHsccCsvValidation // the backend's own buildScreenSheet + runVocaValidation // FVPSA / VAWA reports over the real templates (necx-990 branch)
const now = Date.now();
const ago = (mins) => new Date(now - mins * 60_000).toISOString();
// local wall-clock "YYYY-MM-DDTHH:mm:ss" (the follow-ups widget reads the string as-is)
const local = (d) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
};
const todayAt = (h, m = 0) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return local(d);
};
const daysFromNow = (n, h = 10) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(h, 0, 0, 0);
  return local(d);
};
const ok = (data) => ({ data: { success: true, data } });
const person = (firstName, lastName, uid) => ({ uid, firstName, lastName });

// ---- My Cases: one client, many services, each with its own status ----
const CASES = [
  { victimUid: "v-1", victimName: "Elena Martinez", totalServices: 3, tagged: true, statusCounts: { in_progress: 1, approved: 1, pending: 1 },
    services: [{ claimId: "c-1", displayId: "24081", serviceName: "Legal Advocacy" }, { claimId: "c-2", displayId: "24082", serviceName: "Emergency Shelter" }, { claimId: "c-3", displayId: "24107", serviceName: "Crisis Counseling" }] },
  { victimUid: "v-2", victimName: "Tasha Williams", totalServices: 1, statusCounts: { pending: 1 }, services: [{ claimId: "c-4", displayId: "24090", serviceName: "Crisis Counseling" }] },
  { victimUid: "v-3", victimName: "Linh Nguyen", totalServices: 2, tagged: true, statusCounts: { pending_court_date: 1, resolved: 1 }, services: [{ claimId: "c-5", displayId: "24071", serviceName: "Protective Order Assistance" }, { claimId: "c-6", displayId: "24052", serviceName: "Transportation Assistance" }] },
  { victimUid: "v-4", victimName: "Fatima Haddad", totalServices: 1, statusCounts: { awaiting_client: 1 }, services: [{ claimId: "c-7", displayId: "24088", serviceName: "Medical Accompaniment" }] },
  { victimUid: "v-5", victimName: "Grace Okafor", totalServices: 2, statusCounts: { pending_review: 1, approved: 1 }, services: [{ claimId: "c-8", displayId: "24102", serviceName: "Financial Assistance" }, { claimId: "c-9", displayId: "24095", serviceName: "Housing Advocacy" }] },
  { victimUid: "v-6", victimName: "Sarah Mitchell", totalServices: 1, statusCounts: { resolved: 1 }, services: [{ claimId: "c-10", displayId: "24065", serviceName: "Transportation Assistance" }] },
];
const ELENA = { militaryStatus: "N", tanfStatus: "NA", uid: "v-1", firstName: "Elena", lastName: "Martinez", email: "elena.m@mail.example", phoneNumber: "+15125550412", isVerified: true, appLanguage: "es", gender: "Female", age: "25–59", raceEtnicity: "Hispanic/Latino" };
const pmt = { uid: "pmt-1", gender: "Female", age: "25–59", raceEtnicity: ["Hispanic/Latino"], programType: "NONRES", victimAbuserRelationship: "S", youthIpvVictimStatus: "N", hhscAbuseType: "P;E" };
const service = (uid, displayId, title, status, extra = {}) => ({
  uid, displayId, status, createdAt: ago(60 * 24 * (extra.days ?? 10)), grantId: 1, loginCode: "7KQ-4MX",
  serviceInfo: { uid: `s-${uid}`, title, categoryInfo: { name: "Victim Services" } },
  victimInfo: ELENA, pmtReportInfo: pmt, demographicEditConsent: true,
  taggedStaff: [{ uid: "st-3", fullName: "James Carter", firstName: "James", lastName: "Carter" }, { uid: "st-2", fullName: "Maria Lopez", firstName: "Maria", lastName: "Lopez" }],
  partnerIds: ["p-1"], partnerInfo: [{ uid: "p-1", name: "County Legal Aid" }],
  victimizationTypes: ["Domestic and/or Family Violence"], primaryVictimizationType: "Domestic and/or Family Violence",
  claimQuestions: [], referralData: { sentReferrals: [], receivedReferral: null },
  updates: [
    { uid: "u1", title: "Court date confirmed for Oct 28", description: "Hearing set at Travis County Courthouse, 9:00 AM.", createdAt: ago(60 * 26), isPublished: true },
    { uid: "u2", title: "Victim impact statement filed", description: "Filed with the DA's office; copy added to Documents.", createdAt: ago(60 * 24 * 3), isPublished: true },
    { uid: "u3", title: "Case approved", description: "Legal Advocacy approved and assigned to James Carter.", createdAt: ago(60 * 24 * 11), isPublished: false },
  ],
  notes: [
    { uid: "n1", title: "Safety plan reviewed", description: "Client confirmed a safe contact window, 9 AM to 12 PM.", createdAt: ago(41) },
    { uid: "n2", title: "Interpreter booked", description: "Spanish interpreter confirmed for the hearing.", createdAt: ago(60 * 30) },
  ],
  ...extra,
});
const ELENA_CLAIMS = [
  service("c-1", "24081", "Legal Advocacy", "in_progress", { days: 12,
    // VOCA / OVC PMT Q5A and Q5C, kept on the case
    victimizationTypes: ["Domestic and/or Family Violence", "Stalking/Harassment"], primaryVictimizationType: "Domestic and/or Family Violence",
    vocaSpecialClassifications: ["Victims with Limited English Proficiency"] }),
  // per-case demographic consent: on / approval required / awaiting the client
  service("c-2", "24082", "Emergency Shelter", "approved", { days: 11, demographicEditConsent: false,
    // answered by the client in the NECX app
    claimQuestions: [["Are you in immediate danger right now?", "true-false", "False"], ["How many people need shelter, including you?", "fill-in-the-blank", "3"],
      ["Will any children be staying with you?", "true-false", "True"], ["What kind of space do you need?", "multiple-choice", "Private family room"],
      ["Do you have a pet that needs a safe place?", "true-false", "False"], ["Is there anything else we should know before you arrive?", "fill-in-the-blank", "My son is 9 and has asthma. We can arrive after 6 PM."]]
      .map(([question, questionType, answer], i) => ({ id: 900 + i, answer, questionInfo: { id: 100 + i, question, questionType } })) }),
  service("c-3", "24107", "Crisis Counseling", "pending", { days: 1, demographicEditConsent: false, pmtReportInfo: { ...pmt, pendingStatus: "pending" } }),
];
const VICTIMS = {
  "v-1": {
    victim: ELENA,
    services: ELENA_CLAIMS.map((c) => ({ claimUid: c.uid, displayId: c.displayId, serviceName: c.serviceInfo.title, status: c.status })),
    claims: ELENA_CLAIMS,
  },
};

const claimByUid = (uid) => ELENA_CLAIMS.find((c) => c.uid === uid) ?? ELENA_CLAIMS[0];

const STAFF = [
  { uid: "st-1", firstName: "Jordan", lastName: "Avery", name: "Jordan Avery", email: "jordan.avery@harborlight.example" },
  { uid: "st-2", firstName: "Maria", lastName: "Lopez", name: "Maria Lopez", email: "maria.lopez@harborlight.example" },
  { uid: "st-3", firstName: "James", lastName: "Carter", name: "James Carter", email: "james.carter@harborlight.example" },
  { uid: "st-4", firstName: "Aisha", lastName: "Rahman", name: "Aisha Rahman", email: "aisha.rahman@harborlight.example" },
];
const msg = (content, mins, fromClient) => ({
  uid: `m-${mins}`, content, createdAt: ago(mins), files: [],
  ...(fromClient ? { victimSenderInfo: { firstName: "Elena", lastName: "Martinez" } } : { vsmsSenderId: "st-3", vsmsSenderInfo: { firstName: "James", lastName: "Carter" } }),
});

// ---- Hotline (fictional) ----
const HOTLINE_STAFF = [
  { id: "st-4", staffName: "Aisha Rahman", status: "on_call", currentCallId: "call-1", ringBrowser: true, ringPhone: true, hasHotlineAccess: true, hasPhoneOnFile: true, assignedLineIds: ["ln-1", "ln-2"] },
  { id: "st-2", staffName: "Maria Lopez", status: "available", ringBrowser: true, ringPhone: true, hasHotlineAccess: true, hasPhoneOnFile: true, assignedLineIds: ["ln-1", "ln-2"] },
  { id: "u-maria", staffName: "Jordan Avery", status: "available", ringBrowser: true, ringPhone: false, hasHotlineAccess: true, hasPhoneOnFile: true, assignedLineIds: ["ln-1"] },
  { id: "st-3", staffName: "James Carter", status: "available", ringBrowser: false, ringPhone: true, hasHotlineAccess: true, hasPhoneOnFile: true, assignedLineIds: ["ln-1"] },
  { id: "st-5", staffName: "Daniel Kim", status: "offline", ringBrowser: true, ringPhone: false, hasHotlineAccess: true, hasPhoneOnFile: false, assignedLineIds: ["ln-1"] },
  { id: "st-6", staffName: "Priya Patel", status: "offline", ringBrowser: true, ringPhone: false, hasHotlineAccess: true, hasPhoneOnFile: true, assignedLineIds: ["ln-2"] },
];
const call = (id, mins, callerName, callerPhone, callType, callCategory, disposition, dur, by, line = "Main Crisis Line", status = "completed") => ({
  id, uid: id, startTime: ago(mins), createdAt: ago(mins), callerName, callerPhone, callType, callCategory, disposition, durationSeconds: dur, answeredByName: by, answeredBy: by, hotlineName: line, status, isExistingClient: !!callerName,
});
const CALLS = [
  call("c101", 25, "Maya Thompson", "+15125550944", "inbound", "crisis", "created_case", 612, "Aisha Rahman"),
  call("c102", 70, "", "+15125550811", "inbound", "crisis", "callback_scheduled", 865, "Maria Lopez"),
  call("c103", 130, "Monica Reyes", "+15125550824", "outbound", "follow_up", "informational_only", 309, "Jordan Avery"),
  call("c104", 190, "Derek Shaw", "+15125550849", "inbound", "referral", "referral_request", 401, "James Carter"),
  call("c105", 250, "", "+15125550860", "inbound", "information", "informational_only", 214, "Maria Lopez", "Spanish Line"),
  call("c106", 320, "", "+15125550790", "inbound", "crisis", null, 0, null, "Main Crisis Line", "missed"),
];
const cb = (id, clientName, clientPhone, reason, scheduledDate, scheduledTime, assignedToName) => ({ id, clientName, clientPhone, reason, scheduledDate, scheduledTime, status: "scheduled", assignedToName, assignedTo: assignedToName, originalCallId: "c102" });
const day = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const CALLBACKS = [
  ["overdue", [cb("cb1", "Unknown caller", "+15125550790", "Check in after shelter referral", day(-1), "4:30 PM", "Aisha Rahman")]],
  ["today", [cb("cb2", "Monica Reyes", "+15125550824", "Send protective order packet details", day(0), "3:00 PM", "Jordan Avery"), cb("cb3", "Caller from 2:13 AM", "+15125550811", "Follow up on safe housing options", day(1), "9:00 AM", "Maria Lopez")]],
  ["upcoming", [cb("cb4", "Derek Shaw", "+15125550849", "Confirm second counseling session", day(2), "10:00 AM", "Maria Lopez")]],
];

// ---- Shelters: three locations, Harbor Light House in detail ----
const LOC_STATS = {
  "sh-1": { totalBeds: 16, occupied: 11, available: 2, reserved: 1, maintenance: 1, out_of_service: 1, occupancyRate: 69, waitlistCount: 3 },
  "sh-2": { totalBeds: 8, occupied: 6, available: 2, reserved: 0, maintenance: 0, out_of_service: 0, occupancyRate: 75, waitlistCount: 1 },
  "sh-3": { totalBeds: 6, occupied: 4, available: 2, reserved: 0, maintenance: 0, out_of_service: 0, occupancyRate: 67 },
};
const LOCATIONS = [
  { uid: "sh-1", id: 1, name: "Harbor Light House", type: "family", hhscType: "RES", address: "1200 Harbor St, Austin, TX 78702", phone: "+15125550140",
    open247: true, accessible: true, acceptsFamilies: true, acceptsPets: false, confidentialLocation: false, hudProjectType: 1,
    policies: { max_stay_nights: 90 }, stats: LOC_STATS["sh-1"] },
  { uid: "sh-2", id: 2, name: "Riverside Transitional Housing", type: "emergency", address: "48 Riverside Dr, Austin, TX 78704", phone: "+15125550150",
    open247: true, accessible: true, acceptsFamilies: false, acceptsPets: true, confidentialLocation: false, stats: LOC_STATS["sh-2"] },
  { uid: "sh-3", id: 3, name: "Safe Haven", type: "safe_house", address: "", phone: "",
    open247: true, accessible: false, acceptsFamilies: true, acceptsPets: false, confidentialLocation: true, stats: LOC_STATS["sh-3"] },
];
const FLOORS = [
  { uid: "fl-1", id: 1, name: "Floor 1", floorNumber: 1 },
  { uid: "fl-2", id: 2, name: "Floor 2", floorNumber: 2 },
];
const ROOMS = [
  { uid: "rm-1", name: "Family Suite A", type: "family", floor: FLOORS[0] },
  { uid: "rm-2", name: "Family Suite B", type: "family", floor: FLOORS[0] },
  { uid: "rm-3", name: "Room 101", type: "shared", floor: FLOORS[0] },
  { uid: "rm-4", name: "Room 201", type: "shared", floor: FLOORS[1] },
  { uid: "rm-5", name: "Room 202", type: "shared", floor: FLOORS[1] },
];
// [bedNumber, room, status, type, familyCapacity]
const BED_ROWS = [
  ["A-1", 0, "occupied", "family_room", 4], ["A-2", 0, "occupied", "family_room", 3],
  ["B-1", 1, "occupied", "family_room", 4], ["B-2", 1, "available", "family_room", 4],
  ["101-1", 2, "occupied"], ["101-2", 2, "occupied"], ["101-3", 2, "reserved"], ["101-4", 2, "maintenance"],
  ["201-1", 3, "occupied"], ["201-2", 3, "occupied"], ["201-3", 3, "available"], ["201-4", 3, "out_of_service"],
  ["202-1", 4, "occupied"], ["202-2", 4, "occupied"], ["202-3", 4, "occupied"], ["202-4", 4, "occupied"],
];
const BEDS = BED_ROWS.map(([bedNumber, r, status, type = "individual", familyCapacity = 1], i) => ({
  id: i + 1, uid: `bed-${i + 1}`, bedNumber, status, type, familyCapacity, room: ROOMS[r],
}));
// [bed, client, days in, expected stay, family]
const STAY_ROWS = [
  ["A-1", "Hannah Price", 12, 60, [{ name: "Leo Price", relationship: "child", age: 7 }, { name: "Mia Price", relationship: "child", age: 4 }]],
  ["A-2", "Rosa Delgado", 26, 60, [{ name: "Daniel Delgado", relationship: "child", age: 10 }]],
  ["B-1", "Elena Morales", 3, 45, [{ name: "Sofia Morales", relationship: "child", age: 9 }, { name: "Mateo Morales", relationship: "child", age: 6 }]],
  ["101-1", "Grace Okafor", 41, 60], ["101-2", "Tanya Brooks", 8, 30],
  ["201-1", "Lena Novak", 19, 30], ["201-2", "Amira Haddad", 5, 30],
  ["202-1", "Joy Mensah", 33, 45], ["202-2", "Carla Ruiz", 14, 30], ["202-3", "Nadia Petrov", 2, 30], ["202-4", "Kim Tran", 22, 30],
];
const STAYS = STAY_ROWS.map(([bedNumber, clientName, days, expectedStayDays, familyMembers = []], i) => ({
  uid: `as-${i + 1}`, bedId: BEDS.find((b) => b.bedNumber === bedNumber).id, bedNumber, clientName,
  checkInDate: ago(60 * 24 * days), expectedStayDays, familyMembers, status: "active",
}));
const WAITLIST = [
  { uid: "wl-1", clientName: "Monica Reyes", clientPhone: "+15125550824", partyAdults: 1, partyChildren: 2, familySize: 3, priority: 1, urgency: "high",
    addedDate: ago(60 * 26), referralSource: "Hotline", bedTypePreference: "family_room", notes: "Needs a family room; two children, 5 and 8.", status: "waiting" },
  { uid: "wl-2", clientName: "Derek Shaw", clientPhone: "+15125550849", partyAdults: 1, partyChildren: 0, familySize: 1, priority: 2, urgency: "medium",
    addedDate: ago(60 * 50), referralSource: "Partner agency", bedTypePreference: "individual", notes: "", status: "waiting" },
  { uid: "wl-3", clientName: "Priya Nair", clientPhone: "+15125550866", partyAdults: 2, partyChildren: 1, familySize: 3, priority: 3, urgency: "low",
    addedDate: ago(60 * 80), referralSource: "Walk-in", bedTypePreference: "family_room", notes: "", status: "waiting" },
];
const MOBILE_REQUESTS = [
  { uid: "mr-1", client_name: "Aaliyah Grant", client_phone: "+15125550871", party_adults: 1, party_children: 2, priority: 1, urgency: "high",
    shelter_name: "Harbor Light House", room_name: "Family Suite B", bed_ids: [4], bed_type_preference: "family_room", status: "waiting",
    needs: ["Childcare", "Counseling"], notes: "Requested from the NECX app.", submitted_at: ago(42) },
  { uid: "mr-2", client_name: "Sara Lindqvist", client_phone: "+15125550877", party_adults: 1, party_children: 0, priority: 2, urgency: "medium",
    shelter_name: "Harbor Light House", room_name: "Room 201", bed_ids: [11], bed_type_preference: "individual", status: "waiting",
    needs: ["Legal Aid"], notes: "", submitted_at: ago(130) },
];
const PARTNERS = [
  { uid: "pa-1", name: "Hill Country Family Shelter", availableBeds: 4, totalBeds: 24, locations: 2 },
  { uid: "pa-2", name: "Lone Star Safe Housing", availableBeds: 2, totalBeds: 12, locations: 1 },
  { uid: "pa-3", name: "Bluebonnet Women's Center", availableBeds: 0, totalBeds: 10, locations: 1 },
];
const TRANSFERS_IN = [
  { uid: "tr-1", clientName: "Jasmine Cole", familySize: 3, familyMembers: [{ name: "Ava Cole", relationship: "child", age: 6 }, { name: "Noah Cole", relationship: "child", age: 3 }],
    urgency: "high", bedTypePreference: "family_room", message: "Family of three needs a safe placement tonight; our shelter is full.",
    status: "pending", createdAt: ago(35), sourceAgencyName: "Hill Country Family Shelter" },
];
const TRANSFERS_OUT = [
  { uid: "tr-2", clientName: "Kelly Moss", familySize: 1, familyMembers: [], urgency: "medium", bedTypePreference: "individual",
    message: "Client prefers a placement closer to work.", status: "accepted", createdAt: ago(60 * 30) },
];
const INCIDENTS = [
  { uid: "in-1", description: "Smoke alarm triggered in Room 201; building evacuated for 10 minutes, no injuries.", createdAt: ago(60 * 5),
    metadata: { severity: "Medium", incidentType: "Safety" } },
  { uid: "in-2", description: "Unknown visitor asked for a resident at the front door; staff did not confirm residence and called security.", createdAt: ago(60 * 30),
    metadata: { severity: "High", incidentType: "Security" } },
];
const SHELTER_HISTORY = [
  { id: "h1", eventType: "check_in", description: "Elena Morales checked in to Family Suite B · B-1", createdAt: ago(60 * 24 * 3) },
  { id: "h2", eventType: "transfer", description: "Lena Novak moved from 101-3 to 201-1", createdAt: ago(60 * 24 * 4) },
  { id: "h3", eventType: "status_change", description: "101-4 set to maintenance", createdAt: ago(60 * 24 * 5) },
  { id: "h4", eventType: "check_out", description: "Ana Ruiz checked out to transitional housing", createdAt: ago(60 * 24 * 6) },
];
const ROLL_CALL = {
  date: new Date().toISOString().slice(0, 10), recorded: false, project: { projectName: "Harbor Light Emergency Shelter" },
  people: STAYS.flatMap((a) => [
    { assignmentUid: a.uid, bedNumber: a.bedNumber, roomName: BEDS.find((b) => b.id === a.bedId).room.name, memberIndex: 0, name: a.clientName, relationship: "self", present: true },
    ...a.familyMembers.map((m, k) => ({ assignmentUid: a.uid, bedNumber: a.bedNumber, roomName: BEDS.find((b) => b.id === a.bedId).room.name, memberIndex: k + 1, name: m.name, relationship: m.relationship, present: true })),
  ]).map((p) => (p.name === "Tanya Brooks" ? { ...p, present: false } : p)),
};
const inv = (householdType, beds, units, extra = {}) => ({ householdType, bedInventory: beds, unitInventory: units, availability: "1", esBedType: "1", inventoryStartDate: "2024-10-01", inventoryEndDate: null, ...extra });
const HMIS_PROJECTS = [
  { uid: "hp-2", id: 2, hudProjectId: "HL-RRH-01", projectName: "Harbor Light Rapid Re-Housing", projectType: "13", rrhSubtype: "2", isActive: true, continuumProject: true,
    cocCode: "TX-503", geocode: "481488", geographyType: "1", hmisParticipationType: "2", housingType: "3", targetPopulation: "1", residentialAffiliation: null,
    operatingStartDate: "2024-10-01", operatingEndDate: null, shelterLocationId: null, ceParticipation: false,
    funders: [{ funder: "3", grantId: "TX0412L6E012500", startDate: "2025-10-01", endDate: "2026-09-30" }],
    inventory: [inv("3", 24, 8, { esBedType: null })],
    reportTypes: ["apr"], reportPeriods: { apr: { startDate: "2025-10-01", endDate: "2026-09-30" } } },
  { uid: "hp-1", id: 1, hudProjectId: "HL-ES-01", projectName: "Harbor Light Emergency Shelter", projectType: "1", trackingMethod: "3", isActive: true, continuumProject: true,
    cocCode: "TX-503", geocode: "481488", geographyType: "1", hmisParticipationType: "2", housingType: "1", targetPopulation: "1",
    operatingStartDate: "2019-01-01", operatingEndDate: null, shelterLocationId: 1, ceParticipation: false,
    funders: [{ funder: "8", grantId: "E-25-DC-48-0001", startDate: "2025-10-01", endDate: "2026-09-30" }],
    inventory: [inv("3", 12, 4), inv("1", 4, 4)],
    reportTypes: ["caper"], reportPeriods: { caper: { startDate: "2025-10-01", endDate: "2026-09-30" } } },
];
const HUD_WORKLIST = {
  project: { projectName: "Harbor Light Rapid Re-Housing" }, period: { startDate: "2025-10-01", endDate: "2026-09-30" }, projectWarnings: [],
  totals: { people: 46, withGaps: 3, missingRollCallNights: [] },
  rows: [
    { kind: "enrollment", enrollmentUid: "en-3", clientName: "Grace Okafor", personName: "Grace Okafor", memberIndex: 0, entryDate: "2026-06-02", exitDate: null,
      missing: [{ element: "3.08", label: "Disabling Condition", stage: "entry" }, { element: "4.04", label: "Health Insurance", stage: "entry" }] },
    { kind: "enrollment", enrollmentUid: "en-4", clientName: "Tanya Brooks", personName: "Tanya Brooks", memberIndex: 0, entryDate: "2026-07-19", exitDate: "2026-09-21",
      missing: [{ element: "3.12", label: "Exit Destination", stage: "exit" }] },
    { kind: "enrollment", enrollmentUid: "en-5", clientName: "Rosa Delgado", personName: "Daniel Delgado", memberIndex: 1, entryDate: "2026-08-30", exitDate: null,
      missing: [{ element: "3.03", label: "Date of Birth", stage: "entry" }] },
  ],
};
const HUD_ENROLLMENTS = [
  { uid: "en-1", status: "active", clientName: "Elena Martinez", project: { uid: "hp-2", name: "Harbor Light Rapid Re-Housing", type: "13", asksMoveIn: true },
    projectStartDate: "2026-08-12", moveInDate: "2026-09-03", exitDate: null, dateOfEngagement: null, movingOnAssistance: null,
    familyMembers: [{ name: "Sofia Martinez", relationship: "child", age: 9 }], contacts: [], logsContacts: false, joint: null },
];
const HUD_STAY = {
  uid: "as-1", clientName: "Hannah Price", checkInDate: STAYS[0].checkInDate.slice(0, 10), exitDate: null, projectType: "1", hohMemberIndex: 0, jointRrh: null, asksYouthEducation: false,
  members: [
    { memberIndex: 0, name: "Hannah Price", relationshipToHoh: "1", age: 34, startDate: STAYS[0].checkInDate.slice(0, 10) },
    { memberIndex: 1, name: "Leo Price", relationshipToHoh: "2", age: 7, startDate: STAYS[0].checkInDate.slice(0, 10) },
    { memberIndex: 2, name: "Mia Price", relationshipToHoh: "2", age: 4, startDate: STAYS[0].checkInDate.slice(0, 10) },
  ],
};

// ---- Notes Center: case notes across the caseload ----
const STAFF_TAG = (uid, fullName) => ({ uid, fullName });
const MARIA = STAFF_TAG("u-maria", "Maria Lopez");
const JAMES = STAFF_TAG("st-3", "James Carter");
const JORDAN = STAFF_TAG("st-2", "Jordan Avery");
const AISHA = STAFF_TAG("st-4", "Aisha Rahman");
// [title, type, minutes ago, client, case, service, author, html, tagged, updatedBy]
const NOTE_ROWS = [
  ["Safety plan reviewed", "Safety Concern", 41, "Elena Martinez", "24081", "Legal Advocacy", "Maria Lopez",
    "<p>Reviewed the safety plan with Elena. <mark>Safe contact window: 9 AM to 12 PM, weekdays only.</mark> Do not leave voicemails.</p><p>Children's school has the updated pickup list.</p>", [JAMES], JORDAN],
  ["Interpreter confirmed for hearing", "Court Update", 130, "Linh Nguyen", "24071", "Protective Order Assistance", "James Carter",
    "<p>Vietnamese interpreter confirmed for the Oct 28 hearing at 9:00 AM.</p>", [MARIA]],
  ["Counseling intake complete", "Service Note", 260, "Tasha Williams", "24090", "Crisis Counseling", "Jordan Avery",
    "<p>Intake complete; first session booked for Thursday.</p>", []],
  ["Follow-up on shelter placement", "Follow-up Note", 60 * 5, "Elena Martinez", "24082", "Emergency Shelter", "Aisha Rahman",
    "<p>Family room confirmed at Harbor Light House. <mark>Check in with Elena on Friday about school transport.</mark></p>", [MARIA, JORDAN]],
  ["Protective order granted", "Court Update", 60 * 20, "Linh Nguyen", "24071", "Protective Order Assistance", "James Carter",
    "<p>Judge granted a two-year protective order. Copy uploaded to Documents.</p>", [MARIA]],
  ["Medical accompaniment scheduled", "Case Update", 60 * 26, "Fatima Haddad", "24088", "Medical Accompaniment", "Maria Lopez",
    "<p>Advocate will accompany Fatima to the clinic on Monday at 2 PM.</p>", []],
  ["Concern raised about contact attempts", "Safety Concern", 60 * 30, "Grace Okafor", "24102", "Financial Assistance", "Jordan Avery",
    "<p><mark>Client reports two calls from an unknown number.</mark> Advised to document each call; safety plan updated.</p>", [JAMES, AISHA]],
  ["Housing application submitted", "Service Note", 60 * 50, "Grace Okafor", "24095", "Housing Advocacy", "Aisha Rahman",
    "<p>Application submitted to the county housing authority.</p>", []],
  ["Victim impact statement filed", "Court Update", 60 * 72, "Elena Martinez", "24081", "Legal Advocacy", "James Carter",
    "<p>Filed with the DA's office; copy added to Documents.</p>", [MARIA]],
  ["First check-in call", "General Note", 60 * 96, "Tasha Williams", "24090", "Crisis Counseling", "Maria Lopez",
    "<p>Tasha is settled and has transport to sessions.</p>", []],
];
const CASE_NOTES = NOTE_ROWS.map(([title, noteType, mins, clientName, caseDisplayId, service, createdBy, description, taggedStaff, updatedBy], i) => ({
  uid: `cn-${i + 1}`, caseId: `c-${caseDisplayId}`, title, noteType, createdAt: ago(mins), updatedAt: ago(updatedBy ? 12 : mins),
  clientName, caseDisplayId, service, createdBy, description, taggedStaff, updatedBy: updatedBy ?? null,
}));
const plain = (h) => h.replace(/<[^>]+>/g, " ").toLowerCase();

// ---- NECX Drive: Harbor Light's files ----
const MB = 1024 * 1024;
const fo = (uid, name, days, extra = {}) => ({ uid, name, updatedAt: ago(60 * 24 * days), createdAt: ago(60 * 24 * (days + 30)), isStarred: false, ownerIsMe: true, ...extra });
const fi = (uid, name, mime, mb, days, extra = {}) => ({ uid, name, mime, sizeBytes: Math.round(mb * MB), updatedAt: ago(60 * 24 * days), createdAt: ago(60 * 24 * (days + 2)), isStarred: false, ownerIsMe: true, ...extra });
const PDF = "application/pdf";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const DRIVE = {
  my: {
    null: {
      folders: [
        fo("fd-1", "Grant Reports", 1, { isStarred: true }), fo("fd-2", "Court Documents", 2), fo("fd-3", "Shelter Operations", 3),
        fo("fd-4", "Training Materials", 6), fo("fd-5", "Board Meetings", 9),
      ],
      files: [
        fi("fl-1", "FY26 VOCA Budget.xlsx", XLSX, 1.2, 0.2, { isStarred: true }), fi("fl-2", "Safety Planning Guide.pdf", PDF, 3.4, 1),
        fi("fl-3", "Volunteer Handbook 2026.docx", DOCX, 0.8, 4), fi("fl-4", "Agency Policies.pdf", PDF, 2.1, 12),
      ],
    },
    "fd-1": {
      folders: [fo("fd-11", "VOCA", 1), fo("fd-12", "VAWA", 2), fo("fd-13", "HUD CoC", 5)],
      files: [
        fi("fl-11", "Q3 VOCA Performance Report.pdf", PDF, 1.6, 1, { isStarred: true }), fi("fl-12", "Grant Calendar FY26.xlsx", XLSX, 0.4, 3),
        fi("fl-13", "Match Documentation.pdf", PDF, 2.7, 8),
      ],
    },
  },
  "shared-with-me": { null: { folders: [fo("fd-21", "Hotline Scripts", 4, { ownerIsMe: false })], files: [fi("fl-21", "On-call Schedule November.xlsx", XLSX, 0.3, 1, { ownerIsMe: false }), fi("fl-22", "Interpreter Directory.pdf", PDF, 0.6, 7, { ownerIsMe: false })] } },
  agency: { null: { folders: [fo("fd-31", "Agency Forms", 2, { ownerIsMe: false }), fo("fd-32", "HR & Onboarding", 10, { ownerIsMe: false })], files: [fi("fl-31", "Emergency Contacts.pdf", PDF, 0.2, 1, { ownerIsMe: false }), fi("fl-32", "Holiday Coverage Plan.docx", DOCX, 0.5, 5, { ownerIsMe: false })] } },
  starred: { null: { folders: [fo("fd-1", "Grant Reports", 1, { isStarred: true })], files: [fi("fl-1", "FY26 VOCA Budget.xlsx", XLSX, 1.2, 0.2, { isStarred: true }), fi("fl-11", "Q3 VOCA Performance Report.pdf", PDF, 1.6, 1, { isStarred: true })] } },
  trash: { null: { folders: [fo("fd-41", "Old Templates", 2, { deletedAt: ago(60 * 26) })], files: [fi("fl-41", "Draft Flyer v1.pdf", PDF, 1.1, 3, { deletedAt: ago(60 * 5) }), fi("fl-42", "Meeting Notes Sept.docx", DOCX, 0.2, 9, { deletedAt: ago(60 * 50) })] } },
};
const CRUMBS = { null: [{ uid: null, name: "My Drive" }], "fd-1": [{ uid: null, name: "My Drive" }, { uid: "fd-1", name: "Grant Reports" }] };

// ---- Chat (colleagues + agencies) and Network ----
const ME = 101;
const CU = (id, firstName, lastName, email, jobTitle) => ({ id, uid: `u-${id}`, firstName, lastName, email, jobTitle, serviceCenterInfo: { id: 1, uid: "sc-1", name: "Harbor Light Victim Center" } });
const C_ME = CU(ME, "Maria", "Lopez", "maria.lopez@harborlight.example", "Case Manager");
const C_JAMES = CU(102, "James", "Carter", "james.carter@harborlight.example", "Legal Advocate");
const C_AISHA = CU(103, "Aisha", "Rahman", "aisha.rahman@harborlight.example", "Hotline Lead");
const C_JORDAN = CU(104, "Jordan", "Avery", "jordan.avery@harborlight.example", "Shelter Coordinator");
const C_DANIEL = CU(105, "Daniel", "Kim", "daniel.kim@harborlight.example", "Counselor");
const C_PRIYA = CU(106, "Priya", "Patel", "priya.patel@harborlight.example", "Program Director");
const C_SAM = CU(107, "Sam", "Ortiz", "sam.ortiz@harborlight.example", "Former Advocate");
const cmsg = (uid, sender, content, mins, files = []) => ({ id: uid, uid, content, translatedContent: content, createdAt: ago(mins), files, vsmsSenderId: sender.id, vsmsSenderInfo: sender });
const CHAT_MSGS = {
  "it-1": [
    cmsg("im-1", C_JAMES, "Morning! Elena's hearing moved to Thursday at 9.", 95),
    cmsg("im-2", C_ME, "Thanks. I'll update her safety plan and confirm transport.", 90),
    cmsg("im-3", C_JAMES, "Here's the updated protective order packet.", 34, [{ uid: "f-1", fileName: "Protective Order Packet.pdf", fileSize: 1.8 * 1024 * 1024, fileType: "application/pdf" }]),
    cmsg("im-4", C_ME, "Got it. I'll walk her through it this afternoon.", 30),
    cmsg("im-5", C_JAMES, "Can you also check the interpreter is booked?", 6),
  ],
};
const thread = (uid, other, last, mins, unread, extra = {}) => ({
  uid, vsmsId: ME, vsmsId2: other.id, vsmsUser1Info: C_ME, vsmsUser2Info: other, vsmsUser1InAgency: true, vsmsUser2InAgency: true,
  lastMessage: { content: last, createdAt: ago(mins), vsmsSenderId: other.id, vsmsSenderInfo: other, files: [] },
  lastActivityAt: ago(mins), createdAt: ago(60 * 24 * 30), unreadCount: unread, messageCount: 24, canReply: true, ...extra,
});
const INTERNAL_THREADS = [
  thread("it-1", C_JAMES, "Can you also check the interpreter is booked?", 6, 1),
  thread("it-2", C_AISHA, "Hotline handoff notes are in the drive folder.", 42, 2),
  thread("it-3", C_JORDAN, "Family room at Harbor Light is ready for tonight.", 130, 0),
  thread("it-4", C_PRIYA, "Board report draft attached, please review by Friday.", 60 * 20, 0),
  thread("it-5", C_DANIEL, "Session notes are updated.", 60 * 50, 0),
];
const STALE_THREADS = [
  { ...thread("it-9", C_SAM, "Handing my cases to James before I go.", 60 * 24 * 12, 0), vsmsId: 104, vsmsUser1Info: C_JORDAN, vsmsUser2InAgency: false, canReply: false },
];
const AG = (uid, id, name, city, state, cats, users, accepting = true) => ({
  uid, id, name, city, state, serviceCategories: cats, numberOfUsers: users, acceptingReferrals: accepting,
  description: `${name} serves survivors across ${city} and the surrounding counties.`, phoneNumber: "+15125550" + String(100 + id).slice(-3),
  email: `intake@${name.toLowerCase().replace(/[^a-z]/g, "")}.example`, website: `https://${name.toLowerCase().replace(/[^a-z]/g, "")}.example`, status: "active",
});
const AGENCIES = [
  AG("sc-2", 2, "County Legal Aid", "Austin", "Texas", ["Legal Assistance", "Protective Orders", "Immigration"], 24),
  AG("sc-3", 3, "Hill Country Family Shelter", "San Marcos", "Texas", ["Emergency Shelter", "Transitional Housing", "Children's Services"], 31),
  AG("sc-4", 4, "Riverside Counseling", "Round Rock", "Texas", ["Counseling", "Support Groups", "Trauma Therapy"], 12),
  AG("sc-5", 5, "Lone Star Safe Housing", "Georgetown", "Texas", ["Transitional Housing", "Financial Assistance"], 9),
  AG("sc-6", 6, "Bluebonnet Women's Center", "Austin", "Texas", ["Medical Advocacy", "Sexual Assault Services"], 17),
  AG("sc-7", 7, "Capital Area Interpreters", "Austin", "Texas", ["Language Access", "Interpretation"], 6, false),
];
const MY_SC = { uid: "sc-1", id: 1, name: "Harbor Light Victim Center" };
const PARTNERSHIPS = [
  { uid: "pp-2", createdAt: ago(60 * 24 * 120), updatedAt: ago(60 * 24 * 118), status: "accepted", requestingAgencyUid: "sc-1", requestingAgency: MY_SC, targetAgency: AGENCIES[0] },
  { uid: "pp-3", createdAt: ago(60 * 24 * 60), updatedAt: ago(60 * 24 * 59), status: "accepted", requestingAgencyUid: "sc-3", requestingAgency: AGENCIES[1], targetAgency: MY_SC },
  { uid: "pp-4", createdAt: ago(60 * 26), updatedAt: ago(60 * 26), status: "pending", requestingAgencyUid: "sc-1", requestingAgency: MY_SC, targetAgency: AGENCIES[2] },
  { uid: "pp-5", createdAt: ago(60 * 3), updatedAt: ago(60 * 3), status: "pending", requestingAgencyUid: "sc-6", requestingAgency: AGENCIES[4], targetAgency: MY_SC },
];
const AGENCY_CHATS = [
  { agency: AGENCIES[0], threadUid: "at-1", lastMessage: { content: "We can take the protective order case this week.", createdAt: ago(25), vsmsSenderId: 201, vsmsSenderInfo: { firstName: "Rebecca" }, files: [] }, lastActivityAt: ago(25), unreadCount: 1, partnershipStatus: "accepted" },
  { agency: AGENCIES[1], threadUid: "at-2", lastMessage: { content: "Two family rooms open tonight.", createdAt: ago(180), vsmsSenderId: ME, vsmsSenderInfo: C_ME, files: [] }, lastActivityAt: ago(180), unreadCount: 0, partnershipStatus: "accepted" },
  { agency: AGENCIES[2], threadUid: "at-3", lastMessage: { content: "Thanks for reaching out, reviewing your request now.", createdAt: ago(60 * 26), vsmsSenderId: 301, vsmsSenderInfo: { firstName: "Dr. Ellis" }, files: [] }, lastActivityAt: ago(60 * 26), unreadCount: 0, partnershipStatus: "pending" },
];
CHAT_MSGS["it-9"] = [
  cmsg("sm-1", C_SAM, "I'm handing my open cases to James before I go.", 60 * 24 * 12 + 30),
  cmsg("sm-2", C_JORDAN, "Thanks Sam. I'll make sure the shelter residents know who to contact.", 60 * 24 * 12),
];
const LEGAL = (id, firstName, lastName) => ({ id, firstName, lastName, serviceCenterInfo: { id: 2, uid: "sc-2", name: "County Legal Aid" } });
CHAT_MSGS["at-1"] = [
  cmsg("am-1", C_ME, "Hi Rebecca, do you have capacity for a protective order case next week?", 140),
  cmsg("am-2", LEGAL(201, "Rebecca", "Shah"), "We do. Our intake attorney can meet Tuesday or Wednesday.", 120),
  cmsg("am-3", C_PRIYA, "Wednesday works best. Sharing our intake checklist.", 60, [{ uid: "f-2", fileName: "Intake Checklist.pdf", fileSize: 0.4 * 1024 * 1024, fileType: "application/pdf" }]),
  cmsg("am-4", LEGAL(201, "Rebecca", "Shah"), "We can take the protective order case this week.", 25),
];

// ---- Reports Library ----
const GRANTS = [
  { id: 1, uid: "gr-1", name: "FY26 VOCA Victim Assistance", program: "VOCA", description: "Direct services to crime victims under the Victims of Crime Act.", questionnaireIds: [1], contractStartDate: "2025-10-01", contractEndDate: "2027-09-30",
    templateFile: { fileName: "VOCA Subrecipient Quarterly Report.xlsx" }, subgranteeProfile: { federalAwardNumber: "15POVC-25-GG-00412-ASSI", stateAssignedSubawardNumber: "TX-VOCA-26-0187", orgType: "Nonprofit Organization", projectStartDate: "2025-10-01", projectEndDate: "2027-09-30" } },
  { id: 2, uid: "gr-2", name: "FVPSA Shelter Services", program: "FVPSA", description: "Family Violence Prevention and Services Act shelter and supportive services.", questionnaireIds: [2], contractStartDate: "2025-10-01", contractEndDate: "2027-09-30",
    templateFile: null, subgranteeProfile: { federalAwardNumber: "2501TXFVPS", stateAssignedSubawardNumber: "HHSC-FV-26-044", orgType: "Nonprofit Organization", projectStartDate: "2025-10-01", projectEndDate: "2027-09-30" } },
  { id: 3, uid: "gr-3", name: "STOP Formula Subgrant FY25", program: "VAWA_STOP", description: "STOP Violence Against Women formula subgrant.", questionnaireIds: [], contractStartDate: "2025-01-01", contractEndDate: "2026-12-31",
    templateFile: null, subgranteeProfile: { federalAwardNumber: "15JOVW-24-GG-00733-STOP", stateAssignedSubawardNumber: "OOG-STOP-25-112", orgType: "Nonprofit Organization", projectStartDate: "2025-01-01", projectEndDate: "2026-12-31" } },
  { id: 5, uid: "gr-5", name: "HHSC Family Violence Program", program: "HHSC", description: "Texas HHSC Family Violence Program contract.", questionnaireIds: [3], contractStartDate: "2025-09-01", contractEndDate: "2027-08-31",
    templateFile: null, subgranteeProfile: { federalAwardNumber: "", stateAssignedSubawardNumber: "HHS000912600044", orgType: "Nonprofit Organization", projectStartDate: "2025-09-01", projectEndDate: "2027-08-31" } },
];
const QUESTIONNAIRES = [
  { id: 1, uid: "q-1", title: "VOCA Intake Questions", questionCount: 14 },
  { id: 2, uid: "q-2", title: "Shelter Stay Questions", questionCount: 9 },
  { id: 3, uid: "q-3", title: "HHSC Outcome Survey", questionCount: 6 },
];
const CUSTOM_REPORT = {
  id: "cr-1", title: "Grant Progress Report — FY26 Q4", status: "draft", updatedAt: ago(90), dateRange: { start: "2026-07-01", end: "2026-09-30" },
  reportData: {
    header: { orgName: "Harbor Light Victim Center", reportTitle: "Grant Progress Report", dateRange: "July – September 2026", subtitle: "FY26 VOCA Victim Assistance · Quarter 4" },
    sections: [
      { type: "kpi", metrics: [
        { label: "Victims served", value: 214, change: 12, changeLabel: "vs Q3" },
        { label: "New this quarter", value: 132 },
        { label: "Services delivered", value: 538, change: 9, changeLabel: "vs Q3" },
        { label: "Shelter nights", value: 1248 },
      ] },
      { type: "bar_chart", title: "People served by VOCA service category", orientation: "horizontal", showValues: true, data: [
        { name: "Information & Referral", value: VOCA_RESULT.screenSheet.q8ByCategory.A ?? 0 },
        { name: "Personal Advocacy/Accompaniment", value: VOCA_RESULT.screenSheet.q8ByCategory.B ?? 0 },
        { name: "Emotional Support or Safety Services", value: VOCA_RESULT.screenSheet.q8ByCategory.C ?? 0 },
        { name: "Shelter/Housing Services", value: VOCA_RESULT.screenSheet.q8ByCategory.D ?? 0 },
        { name: "Criminal/Civil Justice System Assistance", value: VOCA_RESULT.screenSheet.q8ByCategory.E ?? 0 },
      ] },
      { type: "pie_chart", title: "Victimization types", innerRadius: 60, showLabels: true, data: Object.entries(VOCA_RESULT.screenSheet.q5aByType).map(([name, value]) => ({ name, value })) },
      { type: "narrative", title: "Program highlights", body: "This quarter Harbor Light served **214 survivors**, **132 of them new**.\n- Evening advocacy hours cut the wait for a first appointment to two days.\n- A second family room opened at Harbor Light House.\n- Bilingual hotline coverage now runs 24/7." },
    ],
    footer: { orgName: "Harbor Light Victim Center", confidentialNotice: "Prepared for the Office of the Governor, Criminal Justice Division" },
    _accuracy: {
      accuracy: 100, verified: 11, totalFigures: 11, hasDb: true, hasFiles: false, missingFileWarning: false,
      sources: { database: 9, file: 0, calculated: 2, unverified: 0 },
      figures: [
        { label: "Victims served", value: 214, source: "database", expectedSource: "database" },
        { label: "New this quarter", value: 132, source: "database", expectedSource: "database" },
        { label: "Services delivered", value: 538, source: "database", expectedSource: "database" },
        { label: "Shelter nights", value: 1248, source: "database", expectedSource: "database" },
        { label: "Information & Referral", value: VOCA_RESULT.screenSheet.q8ByCategory.A ?? 0, source: "database", expectedSource: "database" },
        { label: "Personal Advocacy/Accompaniment", value: VOCA_RESULT.screenSheet.q8ByCategory.B ?? 0, source: "database", expectedSource: "database" },
        { label: "Emotional Support or Safety Services", value: VOCA_RESULT.screenSheet.q8ByCategory.C ?? 0, source: "database", expectedSource: "database" },
        { label: "Shelter/Housing Services", value: VOCA_RESULT.screenSheet.q8ByCategory.D ?? 0, source: "database", expectedSource: "database" },
        { label: "Criminal/Civil Justice System Assistance", value: VOCA_RESULT.screenSheet.q8ByCategory.E ?? 0, source: "database", expectedSource: "database" },
        { label: "Change in victims served vs Q3", value: "12%", source: "calculated", expectedSource: "database" },
        { label: "Change in services vs Q3", value: "9%", source: "calculated", expectedSource: "database" },
      ],
    },
  },
};

const VOCA_EVENTS = [
  ["e-1", "B", "B4", 2, 1, true, false], ["e-2", "E", "E3", 1, 4, true, true], ["e-3", "C", "C1", 3, 9, true, false],
  ["e-4", "A", "A3", 1, 15, true, false], ["e-5", "E", "E5", 1, 22, false, false],
].map(([uid, vocaServiceCategory, vocaServiceSubCategory, units, days, isNewThisQuarter, isCompAppAssistance]) => ({
  uid, vocaServiceCategory, vocaServiceSubCategory, units, serviceDate: ago(60 * 24 * days), isNewThisQuarter, isCompAppAssistance, serviceRequestUnmet: false,
}));
// ---- Texas HHSC ----
const LK = (pairs) => pairs.map(([value, label]) => ({ value, label }));
const HHSC_LOOKUPS = {
  hhsc_abuse_type: LK([["P", "Physical"], ["E", "Emotional/Psychological/Verbal"], ["SK", "Stalking"], ["SX", "Sexual"], ["HT", "Human Trafficking"], ["EF", "Economic/Financial"], ["DND", "Did Not Disclose"]]),
  tanf_status: LK([["NA", "Not Applicable"], ["C", "Completed"], ["D", "Declined"]]),
  military_status: LK([["N", "Not Military Connected"], ["V", "Veteran"], ["A", "Active Duty"], ["F", "Military Family Member"]]),
  hhsc_type: LK([["RES", "HHSC Shelter"], ["NONRES", "HHSC Nonresidential"], ["RESHTL", "HHSC Hotel"], ["NHRES", "Non-HHSC Shelter"], ["SNRP", "HHSC SNRP"]]),
  education_type: LK([["CE", "Community Education"], ["PREVEN", "Prevention"]]),
  survey_type: LK([["SHLTR", "Shelter Survey"], ["SPTADV", "Support Services and Advocacy Survey"], ["COUNSL", "Counseling Survey"], ["SPTGRP", "Support Group Survey"]]),
  client_assistance_type: LK([["UTIL", "Utilities"], ["RMP", "Rent and Mortgage Payments"], ["IDVDR", "ID/Vital Document Replacement"], ["HSRA", "Home, Security, and Relocation Assistance"]]),
  referral_category: LK([["LAA_COUNT", "Legal Aid and Assistance"], ["PH_COUNT", "Housing"], ["MBHA_COUNT", "Mental and Behavioral Health Assistance"], ["FA_COUNT", "Financial Assistance"]]),
  service_type: LK([["CI", "Crisis Intervention"], ["CT", "Counseling/Therapy"], ["GA", "General Advocacy"], ["LAA", "Legal Advocacy and Accompaniment"], ["CA", "Client Assistance"]]),
  service_channel: LK([["FTF", "Face to Face"], ["FTFT", "Face to Face Technology"], ["TEL", "Telephone"], ["WRITE", "Written"]]),
  hotline_call_type: LK([["UHCALL_COUNT", "Unduplicated Hotline Calls"], ["SHLTRO", "Seeking Shelter - Shelter Obtained"], ["NRSRV", "Seeking Nonresidential Services"]]),
};
const AGENCY_LOOKUPS = {
  program_type: LK([["NONRES", "Nonresidential Services"], ["RES", "Shelter Services"]]),
  court: LK([["TCC", "Travis County Court"]]),
  collaborative_organization: LK([["CLA", "County Legal Aid"], ["HFS", "Hope Family Shelter"]]),
  reason_not_served: LK([["CAP", "At capacity"]]),
};
const d26 = (day) => `2026-09-${String(day).padStart(2, "0")}`;
const EDUCATION = [
  { uid: "ed-1", eventDate: d26(10), educationType: "CE", hhscType: "NONRES", totalAdultAttendance: 46, totalYouthAttendance: 0, eventCounty: "Travis", noOfSessions: 2 },
  { uid: "ed-2", eventDate: d26(17), educationType: "PREVEN", hhscType: "NONRES", totalAdultAttendance: 4, totalYouthAttendance: 88, eventCounty: "Williamson", noOfSessions: 3 },
  { uid: "ed-3", eventDate: d26(24), educationType: "CE", hhscType: "RES", totalAdultAttendance: 22, totalYouthAttendance: 6, eventCounty: "Hays", noOfSessions: 1 },
];
const SURVEYS = [
  { uid: "sv-1", surveyDate: d26(30), surveyType: "SHLTR", completedResourceOutcome: 14, yesResourceOutcome: 13, completedSafetyOutcome: 14, yesSafetyOutcome: 14 },
  { uid: "sv-2", surveyDate: d26(30), surveyType: "SPTADV", completedResourceOutcome: 21, yesResourceOutcome: 19, completedSafetyOutcome: 21, yesSafetyOutcome: 20 },
];
const ENC = (uid, victimName, day, extra) => ({ uid, victimName, serviceDate: d26(day), hhscType: "NONRES", inShelter: false, serviceCounty: "Travis", serviceChannel: "FTF", totalServiceContacts: 1, ...extra });
const ASSISTANCE = [ENC("ca-1", "Elena Martinez", 8, { clientAssistanceType: "UTIL", serviceTypeCode: "CA" }), ENC("ca-2", "Grace Okafor", 15, { clientAssistanceType: "IDVDR", serviceTypeCode: "CA" }), ENC("ca-3", "Hannah Price", 21, { clientAssistanceType: "HSRA", serviceTypeCode: "CA", inShelter: true, hhscType: "RES" })];
const REFERRALS = [ENC("rf-1", "Linh Nguyen", 4, { referralCategory: "LAA_COUNT", collaboratingOrganization: "CLA" }), ENC("rf-2", "Tasha Williams", 12, { referralCategory: "MBHA_COUNT", collaboratingOrganization: "HFS" }), ENC("rf-3", "Rosa Delgado", 19, { referralCategory: "PH_COUNT" })];
const VOLUNTEERS = [
  { uid: "vh-1", logDate: d26(6), volunteerName: "Carmen Diaz", hoursWorked: 16 }, { uid: "vh-2", logDate: d26(13), volunteerName: "Ben Walsh", hoursWorked: 12 },
  { uid: "vh-3", logDate: d26(20), volunteerName: "Priya Shah", hoursWorked: 18 }, { uid: "vh-4", logDate: d26(27), volunteerName: "Omar Haddad", hoursWorked: 9 },
];

// ---- Custom reports (board) + staff time ----
const BOARD_REPORT = {
  id: "cr-3", title: "Board Report — Q4 FY26", status: "draft", updatedAt: ago(20), dateRange: { start: "2026-07-01", end: "2026-09-30" },
  reportData: {
    header: { orgName: "Harbor Light Victim Center", reportTitle: "Board Report", dateRange: "July – September 2026", subtitle: "Quarter 4 · Fiscal Year 2026" },
    sections: [
      { type: "kpi", metrics: [
        { label: "Survivors served", value: 486, change: 14, changeLabel: "vs Q3" },
        { label: "Services delivered", value: "2,914", change: 9, changeLabel: "vs Q3" },
        { label: "Shelter nights", value: "4,812" },
        { label: "Hotline calls", value: "1,964", change: 31, changeLabel: "vs last year" },
      ] },
      { type: "narrative", title: "Executive summary", body: "Harbor Light served **486 survivors** this quarter, up 14% on Q3.\n- A second family room opened at Harbor Light House.\n- Evening advocacy hours cut the wait for a first appointment to two days.\n- Bilingual hotline coverage now runs 24/7." },
      { type: "line_chart", title: "Survivors served by month", xAxisKey: "month", dataKeys: ["New", "Returning"], showArea: true, data: [
        { month: "Apr", New: 98, Returning: 61 }, { month: "May", New: 104, Returning: 66 }, { month: "Jun", New: 111, Returning: 70 },
        { month: "Jul", New: 118, Returning: 74 }, { month: "Aug", New: 126, Returning: 79 }, { month: "Sep", New: 131, Returning: 83 },
      ] },
      { type: "bar_chart", title: "Services by program", orientation: "horizontal", showValues: true, data: [
        { name: "Crisis intervention", value: 812 }, { name: "Legal advocacy", value: 644 }, { name: "Counseling", value: 590 }, { name: "Shelter services", value: 538 }, { name: "Case management", value: 330 },
      ] },
      { type: "pie_chart", title: "Survivors by age", innerRadius: 60, showLabels: true, data: [
        { name: "18–24", value: 104 }, { name: "25–59", value: 331 }, { name: "60+", value: 22 }, { name: "Under 18", value: 29 },
      ] },
    ],
    footer: { orgName: "Harbor Light Victim Center", confidentialNotice: "CONFIDENTIAL - For Board Use Only" },
    _accuracy: {
      accuracy: 100, verified: 14, totalFigures: 14, hasDb: true, hasFiles: false, missingFileWarning: false,
      sources: { database: 11, file: 0, calculated: 3, unverified: 0 },
      figures: [
        ["Survivors served", 486], ["Services delivered", "2,914"], ["Shelter nights", "4,812"], ["Hotline calls", "1,964"],
        ["Crisis intervention", 812], ["Legal advocacy", 644], ["Counseling", 590], ["Shelter services", 538], ["Case management", 330], ["18–24", 104], ["25–59", 331],
      ].map(([label, value]) => ({ label, value, source: "database", expectedSource: "database" }))
        .concat([["Change in survivors vs Q3", "14%"], ["Change in services vs Q3", "9%"], ["Hotline calls vs last year", "31%"]].map(([label, value]) => ({ label, value, source: "calculated", expectedSource: "database" }))),
    },
  },
};
const BOARD_CHAT = [
  { role: "user", content: "Board report for Q4: KPIs, an executive summary, survivors by month, services by program and age breakdown. Keep it to one page." },
  { role: "assistant", content: "Done. I built a one-page board report for July to September 2026 from your live data: four KPI cards, a short executive summary, survivors by month, services by program, and survivors by age." },
  { role: "user", content: "Add the hotline growth compared with last year to the KPIs." },
  { role: "assistant", content: "Added a Hotline calls card: 1,964 this quarter, up 31% on the same quarter last year." },
];
const TIME_ENTRIES = [
  ["te-1", 0, 9, 30, 145, "PMT_GRANT", "FY26 VOCA Victim Assistance", "Court accompaniment and safety planning, Martinez case"],
  ["te-2", 0, 14, 0, 90, "PMT_GRANT", "FVPSA Shelter Services", "Shelter intake, two families"],
  ["te-3", 1, 10, 0, 120, "PMT_GRANT", "HHSC Family Violence Program", "Community education at Round Rock High School"],
  ["te-4", 1, 15, 30, 60, "CUSTOM_REPORT", "Board Report — Q4 FY26", "Reviewed board report draft"],
  ["te-5", 2, 9, 0, 180, "PMT_GRANT", "STOP Formula Subgrant FY25", "Protective order hearings"],
  ["te-6", 3, 13, 0, 75, "PMT_GRANT", "FY26 VOCA Victim Assistance", "Victim compensation application help"],
].map(([uid, days, h, m, durationMinutes, projectType, projectName, notes]) => {
  const d = new Date(now - days * 864e5); d.setHours(h, m, 0, 0);
  return { uid, startTime: d.toISOString(), durationMinutes, projectType, projectName, notes };
});

// ---- VAWA STOP: the case's federal section (necx-990 branch) ----
const STOP_GRANT = { id: 3, name: "STOP Formula Subgrant FY25", program: "VAWA_STOP" };
const FEDERAL_CASE = {
  grants: [STOP_GRANT],
  victimizations: [{ victimizationType: "dv_dating", isPresenting: true }, { victimizationType: "stalking", isPresenting: false }],
  relationships: [{ victimizationType: "dv_dating", relationshipCode: "spouse_partner" }, { victimizationType: "stalking", relationshipCode: "spouse_partner" }],
  demographics: { raceCodes: ["hispanic"], raceNotListed: "", sex: "female", dateOfBirth: "1991-04-12", ageBand: "25-59", isChild: false },
  householdMembers: [{ uid: "hm-1", id: 1, name: "Sofia M.", relationship: "child", age: 9, source: "case", demographics: { raceCodes: ["hispanic"], ageBand: "0-12", isChild: true } }],
  serviceEvents: [
    { uid: "fe-1", serviceCode: "crisis_intervention", serviceDate: "2026-08-12", units: 1, status: "provided", grantId: 3, recipientRole: "primary", isMatch: false },
    { uid: "fe-2", serviceCode: "safety_planning", serviceDate: "2026-08-12", units: 1, status: "provided", grantId: 3, recipientRole: "primary", isMatch: false },
    { uid: "fe-3", serviceCode: "victim_advocacy", serviceDate: "2026-09-03", units: 2, status: "provided", grantId: 3, recipientRole: "primary", isMatch: false },
    { uid: "fe-4", serviceCode: "counseling", serviceDate: "2026-09-18", units: 1, status: "provided", grantId: 3, recipientRole: "secondary", householdMemberUid: "hm-1", isMatch: false },
  ],
  legalMatters: [{ uid: "lm-1", id: 1, issueCategory: "protection_orders", issueDetail: null, openedOn: "2026-08-14", resolvedOn: "2026-09-02", providerRole: "attorney", outcome: "granted", reminderIds: [] }],
  protectionOrders: [{ uid: "po-1", orderKind: "civil", orderStage: "final", requestedOn: "2026-08-14", grantedOn: "2026-09-02", assistedBy: "victim_services", legalMatterId: 1 }],
  appointments: [],
  prefill: { hhscRelationship: "S", vocaVictimizations: ["Domestic and/or Family Violence", "Stalking/Harassment"] },
  exclusion: null,
};
// the same case on a VCLG grant: prosecutor services, minutes and who gave them
const VCLG_CASE = { ...FEDERAL_CASE, grants: [V.VCLG_GRANT], serviceEvents: [
  ["fe-v1", "information_and_referral", "2026-09-08", 20, 301], ["fe-v2", "compensation_application_help", "2026-09-08", 45, 301],
  ["fe-v3", "notification_registration", "2026-09-10", 15, 302], ["fe-v4", "court_accompaniment", "2026-10-14", 150, 301],
  ["fe-v5", "follow_up_contact", "2026-11-03", 25, 302],
].map(([uid, serviceCode, serviceDate, durationMinutes, performedBy]) => ({ uid, serviceCode, serviceDate, units: 1, durationMinutes, performedBy, status: "provided", grantId: 9, recipientRole: "primary", deliveryMode: "in_person", isMatch: false })) };
// the same case funded by FVPSA (the FVPSA video sets window.__fedFamily)
const FVPSA_CASE = { ...FEDERAL_CASE, grants: [{ id: 1, name: "FVPSA Shelter Services", program: "FVPSA" }], serviceEvents: FEDERAL_CASE.serviceEvents.map((e) => ({ ...e, grantId: 1 })) };

// ---- Services (the agency's own catalog) ----
// the agency's own intro video, shown as a poster (the page embeds videoUrl in an iframe)
const SERVICE_VIDEO = "data:text/html;charset=utf-8," + encodeURIComponent(`<html><body style="margin:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;font-family:Poppins,Arial,sans-serif;color:#fff;background:linear-gradient(135deg,#172631,#31A3B6)"><div style="width:84px;height:84px;border-radius:50%;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center"><div style="margin-left:8px;border-left:30px solid #172631;border-top:18px solid transparent;border-bottom:18px solid transparent"></div></div><div style="font-size:26px;font-weight:700">Emergency Shelter: what to expect</div><div style="font-size:15px;opacity:.85">Harbor Light Victim Center · 2:14</div></body></html>`);
const SERVICE_CATEGORIES = ["Legal Assistance", "Emergency Shelter", "Counseling", "Transitional Housing", "Medical Advocacy", "Language Access", "Basic Needs"].map((name, i) => ({ id: i + 1, uid: `cat-${i + 1}`, name }));
const q = (question, questionType, isRequired, options = []) => ({ question, questionText: question, questionType, type: questionType, isRequired, options });
const SHELTER_QUESTIONS = [
  q("Are you in immediate danger right now?", "true-false", true),
  q("How many people need shelter, including you?", "fill-in-the-blank", true),
  q("Will any children be staying with you?", "true-false", true),
  q("What kind of space do you need?", "multiple-choice", true, ["Private family room", "Shared room", "Accessible room", "Any available bed"]),
  q("Do you have a pet that needs a safe place?", "true-false", false),
  q("Is there anything else we should know before you arrive?", "fill-in-the-blank", false),
];
const svc = (n, title, categoryId, desc, questions, extra = {}) => ({
  id: n, uid: `svc-${n}`, title, categoryId, categoryInfo: { id: categoryId, name: SERVICE_CATEGORIES[categoryId - 1].name },
  description: desc, shortDescription: desc.replace(/<[^>]+>/g, "").slice(0, 120), isActive: true, videoUrl: "", serviceCode: `HL-${String(100 + n)}`,
  // totalCases adds up to the 128 cases on My Cases
  createdAt: ago(60 * 24 * (40 + n * 9)), totalCases: [0, 24, 29, 14, 38, 6, 4, 3, 5, 5, 0][n] ?? 0,
  claimQuestions: questions.map((x, i) => ({ id: n * 100 + i, ...x })), ...extra,
});
export const VICTIM_SERVICES = [
  svc(1, "Emergency Shelter", 2, "<p>Safe, confidential shelter for survivors and their children, open 24/7. Every family gets a private space, meals, and an advocate on site.</p><p>Tell us a little about who needs a bed, and an advocate will call you to arrange arrival.</p>", SHELTER_QUESTIONS, { videoUrl: SERVICE_VIDEO }),
  svc(2, "Legal Advocacy", 1, "<p>An advocate helps you understand your options, prepare paperwork, and stands beside you in court.</p>", [q("Do you have an upcoming court date?", "true-false", true), q("What do you need help with?", "multiple-choice", true, ["Protective order", "Custody", "Divorce", "Immigration", "Other"]), q("Which county is your case in?", "fill-in-the-blank", false)]),
  svc(3, "Protective Order Assistance", 1, "<p>Help applying for a protective order, from the first form to the hearing.</p>", [q("Has the person hurt or threatened you in the last 30 days?", "true-false", true), q("Do you already have an order in place?", "true-false", true)]),
  svc(4, "Crisis Counseling", 3, "<p>Free, confidential counseling with a trained crisis counselor, in person or by phone.</p>", [q("How would you like to meet?", "multiple-choice", true, ["In person", "Phone", "Video"]), q("What times work best for you?", "fill-in-the-blank", false)]),
  svc(5, "Support Group", 3, "<p>Weekly peer support groups led by a counselor. Childcare provided.</p>", [q("Which group would you like to join?", "multiple-choice", true, ["Monday evening", "Thursday morning", "Spanish-language group"])]),
  svc(6, "Transitional Housing Support", 4, "<p>Up to 24 months of housing support while you rebuild, with a case manager.</p>", [q("Do you have a source of income?", "true-false", true), q("How many people are in your household?", "fill-in-the-blank", true)]),
  svc(7, "Medical Accompaniment", 5, "<p>An advocate goes with you to medical exams and appointments.</p>", [q("Is this for a forensic exam?", "true-false", true)]),
  svc(8, "Interpreter Services", 6, "<p>Interpreters for every appointment, in more than 20 languages.</p>", [q("Which language do you prefer?", "fill-in-the-blank", true)]),
  svc(9, "Transportation Assistance", 7, "<p>Rides to court, medical appointments, and shelter.</p>", [q("Where do you need to go?", "fill-in-the-blank", true)]),
  svc(10, "Holiday Gift Program", 7, "<p>Seasonal gifts for families in our programs.</p>", [], { isActive: false }),
];

// ---- Calendar: appointments (court dates are appointments linked to the case) ----
const PAGELESS_CLAIMS = [...new Map(CASE_NOTES.map((n) => [n.caseId, { uid: n.caseId, displayId: n.caseDisplayId, victimInfo: person(...n.clientName.split(" "), n.caseId), serviceInfo: { title: n.service } }])).values()]
  .map((c, i) => ({ ...c, id: i + 1, status: "in_progress" }));
const claimOf = (name) => PAGELESS_CLAIMS.find((c) => `${c.victimInfo.firstName} ${c.victimInfo.lastName}` === name);
const appt = (uid, title, dayOffset, h, m, mins, priority, status, appointmentType, client, extra = {}) => {
  const start = daysFromNow(dayOffset, h);
  const s = new Date(start);
  s.setMinutes(m);
  const e = new Date(s.getTime() + mins * 60000);
  // local wall-clock time without a zone, as the API returns it
  const local = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`;
  const claim = client ? claimOf(client) : null;
  const [firstName, lastName] = (client ?? " ").split(" ");
  return { uid, id: Number(uid.slice(3)), title, message: extra.message ?? "", priority, status, startDate: local(s), endDate: local(e), appointmentType, type: "appointment",
    claimId: claim?.id ?? null, claimInfo: client ? { victimInfo: person(firstName, lastName) } : null, notifyBefore: 60, notifyStaff: true, notifyVictim: !!client,
    notificationChannelStaff: "in_app", notificationChannelVictim: "both", ...extra };
};
const REMINDERS = [
  appt("ap-1", "Intake appointment", -21, 9, 0, 60, "LOW", "DONE", "Onsite", "Rosa Delgado"),
  appt("ap-2", "Counseling session", -16, 10, 0, 60, "MEDIUM", "DONE", "Onsite", "Tasha Williams"),
  appt("ap-3", "Court: custody hearing", -14, 9, 30, 120, "HIGH", "DONE", "Onsite", "Linh Nguyen"),
  appt("ap-4", "Safety plan review", -9, 11, 0, 45, "MEDIUM", "DONE", "Virtual", "Elena Martinez", { meetingLink: "https://meet.harborlight.example/sp-review" }),
  appt("ap-5", "Housing advocacy", -7, 13, 0, 30, "LOW", "DONE", "Phone Call", "Grace Okafor"),
  appt("ap-6", "Transport voucher", -1, 10, 0, 30, "MEDIUM", "PENDING", "Phone Call", "Fatima Haddad"),
  appt("ap-7", "Court: protective order", 0, 9, 0, 120, "HIGH", "IN PROGRESS", "Onsite", "Elena Martinez",
    { message: "Travis County Courthouse, Room 4B. Advocate meets the client at 8:30. Bring the petition copy and photo ID." }),
  appt("ap-8", "Court prep call", 1, 15, 0, 30, "HIGH", "PENDING", "Phone Call", "Kim Tran"),
  appt("ap-9", "Shelter check-in", 2, 14, 0, 30, "HIGH", "PENDING", "Onsite", "Hannah Price"),
  appt("ap-10", "PO packet review", 3, 11, 0, 30, "LOW", "PENDING", "Virtual", "Monica Reyes", { meetingLink: "https://meet.harborlight.example/po-packet" }),
  appt("ap-11", "Support group intake", 6, 17, 30, 60, "LOW", "PENDING", "Onsite", "Tasha Williams"),
  appt("ap-12", "Court: custody hearing", 8, 13, 0, 120, "HIGH", "PENDING", "Onsite", "Linh Nguyen"),
  appt("ap-13", "Counseling session", 9, 10, 0, 60, "MEDIUM", "PENDING", "Virtual", "Rosa Delgado", { meetingLink: "https://meet.harborlight.example/counsel" }),
];

const F = {
  federalData: {
    GetFederalLookups: () => ok(FEDERAL_LOOKUPS),
    GetFederalCaseData: () => ok(typeof window !== "undefined" && window.__fedFamily === "VCLG" ? VCLG_CASE : typeof window !== "undefined" && window.__fedFamily === "FVPSA" ? FVPSA_CASE : FEDERAL_CASE),
    GetVclgCaseDetails: () => ok({ primaryVictimization: "family_violence", populations: ["disability"] }),
    GetFederalStaff: () => ok(V.VCLG_STAFF),
    GetFederalShelterLocations: () => ok(LOCATIONS.map((l) => ({ id: l.id, name: l.name, locationKind: l.type === "safe_house" ? "safe_house" : "emergency_shelter" }))),
    GetFederalHotlineLines: () => ok([{ id: 1, name: "Main Crisis Line", phoneNumber: "+15125550100" }, { id: 2, name: "Spanish Line", phoneNumber: "+15125550111" }]),
    GetFederalGrants: () => ok((typeof window !== "undefined" && window.__fedFamily === "VCLG") ? (window.__vclgNoGrant ? [] : [V.VCLG_GRANT]) : [{ id: 1, name: "FVPSA Shelter Services", program: "FVPSA" }, { id: 3, name: "STOP Victim Services", program: "VAWA_STOP" }]),
    GetHotlineContacts: () => ok(HOTLINE_CONTACTS),
  },
  hsccLookupValues: { GetHsccLookupValues: (category) => ok({ options: HHSC_LOOKUPS[category] ?? [] }) },
  agencyLookupValues: { GetAgencyLookupValues: (type) => ok({ options: AGENCY_LOOKUPS[type] ?? [] }) },
  educationPresentations: { GetEducationPresentations: () => ok(EDUCATION) },
  clientOutcomeSurveys: { GetClientOutcomeSurveys: () => ok(SURVEYS) },
  serviceEncounters: {
    GetClientAssistanceEncounters: () => ok(ASSISTANCE),
    GetReferralEncounters: () => ok(REFERRALS),
    GetGeneralServiceEncounters: () => ok([]),
  },
  hsccVolunteerLogs: { GetHsccVolunteerLogs: () => ok(VOLUNTEERS) },
  hsccMigration: {
    GenerateAndValidateHsccExport: () => ok({ ...HHSC_RESULT, clientNames: { HL1001: "Hannah Price", HL1002: "Rosa Delgado", HL1003: "Elena Martinez" } }),
  },
  vocaServiceEvents: {
    GetVocaServiceEvents: () => ok({ events: VOCA_EVENTS, suggestedCategory: "E", suggestedSubCategory: "E3" }),
  },
  threads: {
    GetInternalChatThreads: () => ok({ threads: INTERNAL_THREADS, pagination: { currentPage: 1, totalPages: 1, total: INTERNAL_THREADS.length } }),
    GetStaleInternalChats: () => ok({ threads: STALE_THREADS, pagination: { currentPage: 1, totalPages: 1, total: STALE_THREADS.length } }),
    GetAgencyChats: () => ok({ chats: AGENCY_CHATS, pagination: { currentPage: 1, pageSize: 20, total: AGENCY_CHATS.length, totalPages: 1 } }),
    GetThreadByUid: (uid) => ok({ thread: [...INTERNAL_THREADS, ...STALE_THREADS].find((t) => t.uid === uid) ?? { uid, myAgencyId: 1, canReply: true, agency: AGENCY_CHATS.find((c) => c.threadUid === uid)?.agency } }),
    GetThreadMessages: (uid) => ok({ messages: CHAT_MSGS[uid] ?? [], hasOlder: false, hasNewer: false, firstUnreadId: null }),
    GetInternalChatStaff: () => ok({
      staff: [C_JAMES, C_AISHA, C_JORDAN, C_DANIEL, C_PRIYA].map((u) => ({ ...u, threadUid: INTERNAL_THREADS.find((t) => t.vsmsId2 === u.id)?.uid ?? null })),
      pagination: { currentPage: 1, pageSize: 20, total: 5, totalPages: 1 },
    }),
  },
  serviceCenters: {
    GetServiceCenters: () => ok({ agencies: AGENCIES, pagination: { currentPage: 1, totalPages: 1, total: AGENCIES.length } }),
    GetServiceCenter: (uid) => ok(AGENCIES.find((a) => a.uid === uid)),
    GetMyAgencyProfile: () => ok({ uid: "sc-1", name: "Harbor Light Victim Center", email: "info@harborlight.example", phoneNumber: "+15125550100", address: "Confidential location", city: "Austin", state: "TX", zipCode: "78701", website: "https://harborlight.example", description: "Victim services for Central Texas.", isHhscAgency: true, isVocaAgency: true, isHmisAgency: true, isFvpsaAgency: true, isVawaAgency: true }),
  },
  services: {
    GetServiceCategories: () => ok({ victimServiceCategories: SERVICE_CATEGORIES, categories: SERVICE_CATEGORIES }),
    GetServices: (params = {}) => {
      const rows = VICTIM_SERVICES.filter((v) => (!params.categoryId || v.categoryId === Number(params.categoryId)) && (!params.searchKey || v.title.toLowerCase().includes(params.searchKey.toLowerCase())));
      return ok({ victimServices: rows, total: rows.length, pagination: { currentPage: 1, totalPages: 1, total: rows.length } });
    },
    GetService: (uid) => ok({ victimService: VICTIM_SERVICES.find((v) => v.uid === uid) ?? VICTIM_SERVICES[0] }),
  },
  geo: { GetStates: () => ok({ states: [{ id: 1, name: "Texas", abbreviation: "TX" }, { id: 2, name: "Oklahoma", abbreviation: "OK" }] }) },
  drive: {
    listDrive: ({ view = "my", parentId = null } = {}) => {
      const d = DRIVE[view]?.[parentId] ?? DRIVE[view]?.null ?? { folders: [], files: [] };
      return ok({ ...d, breadcrumbs: CRUMBS[parentId] ?? CRUMBS.null, pagination: { page: 1, pageSize: 50, total: d.folders.length + d.files.length, totalPages: 1 },
        agencyUsage: { bytesUsed: Math.round(4.3 * 1024 * MB), fileCount: 1284 } });
    },
    searchDrive: ({ q = "" } = {}) => {
      const all = [...DRIVE.my.null.folders, ...DRIVE.my["fd-1"].folders, ...DRIVE.my.null.files, ...DRIVE.my["fd-1"].files];
      const hit = (x) => x.name.toLowerCase().includes(q.toLowerCase());
      return ok({ folders: all.filter((x) => !x.mime && hit(x)), files: all.filter((x) => x.mime && hit(x)) });
    },
    listShares: () => ok({ shares: [
      { uid: "sh-a", shareKind: "agency" },
      { uid: "sh-u1", shareKind: "user", recipientUserUid: "st-3", recipientName: "James Carter", recipientEmail: "james.c@harborlight.example" },
      { uid: "sh-u2", shareKind: "user", recipientUserUid: "st-4", recipientName: "Aisha Rahman", recipientEmail: "aisha.r@harborlight.example" },
    ] }),
    listLinks: () => ok({ links: [
      { uid: "lk-1", targetKind: "file", expiresAt: new Date(now + 6 * 864e5).toISOString(), createdAt: ago(60 * 24) },
      { uid: "lk-2", targetKind: "file", expiresAt: new Date(now + 29 * 864e5).toISOString(), createdAt: ago(60 * 3) },
    ] }),
    // uploads: each file stops part-way so the capture shows the progress panel
    createFolder: ({ name }) => ok({ folder: { uid: `new-${name}`, name } }),
    requestUploadSas: ({ name = "" } = {}) => ok({ sasUrl: "https://blob.example/upload", blobName: `blob-${name}`, finalName: name, fileUid: `up-${name}`, expiresAt: ago(-15) }),
    putBlobToAzure: ({ file, onProgress }) => {
      const p = [0.92, 0.64, 0.38, 0.17, 1][(file?.name?.length ?? 0) % 5];
      onProgress?.(p);
      return new Promise(() => {});
    },
    getStorageBreakdown: () => ok({
      total: { bytesUsed: Math.round(4.3 * 1024 * MB), fileCount: 1284 },
      categories: [
        { label: "Documents", color: "blue", bytesUsed: Math.round(2.1 * 1024 * MB), fileCount: 812 },
        { label: "Images", color: "teal", bytesUsed: Math.round(1.3 * 1024 * MB), fileCount: 301 },
        { label: "Spreadsheets", color: "green", bytesUsed: Math.round(0.4 * 1024 * MB), fileCount: 118 },
        { label: "Videos", color: "violet", bytesUsed: Math.round(0.4 * 1024 * MB), fileCount: 9 },
        { label: "Other", color: "gray", bytesUsed: Math.round(0.1 * 1024 * MB), fileCount: 44 },
      ],
    }),
  },
  notification: { GetNotications: () => ok({ notifications: { results: [], total: 0 }, newClaims: 0 }) },
  users: { GetUsers: () => ok({ users: STAFF_USERS, data: STAFF_USERS, total: STAFF_USERS.length, pagination: { page: 1, totalPages: 1 } }) },
  roles: { GetRoles: () => ok({ roles: ROLES, total: ROLES.length }) },
  report: {
    GetGrants: () => ok({ grants: GRANTS }),
    GetQuestionnaires: () => ok({ questionnaires: QUESTIONNAIRES, data: QUESTIONNAIRES }),
    GetQuestionnaireAnswersMatrix: () => ok({ questions: [], answers: [], matrix: [], totalResponses: 0 }),
  },
  staffTime: {
    // header timer: idle ("Start Timer") unless a capture step sets window.__timerRunning
    GetActiveTimer: () => ok(typeof window !== "undefined" && window.__timerRunning
      ? { uid: "tm-1", projectName: "FY26 VOCA Victim Assistance", startTime: ago(47) } : null),
    GetCustomReports: () => ok([{ id: "cr-3", title: "Board Report — Q4 FY26" }, { id: "cr-1", title: "Grant Progress Report — FY26 Q4" }]),
    GetTimeEntries: () => ok(TIME_ENTRIES),
    GetStaffTimeFundingSourceReport: () => ok({
      totalHours: 3412.5,
      byFundingSource: [
        { grantId: 1, name: "FY26 VOCA Victim Assistance", program: "VOCA", hours: 1486.0, staffCount: 6, staff: [{ userId: 102, name: "James Carter", hours: 412 }, { userId: 101, name: "Maria Lopez", hours: 388.5 }, { userId: 103, name: "Aisha Rahman", hours: 301 }] },
        { grantId: 2, name: "FVPSA Shelter Services", program: "FVPSA", hours: 1104.5, staffCount: 5, staff: [{ userId: 104, name: "Jordan Avery", hours: 466 }, { userId: 105, name: "Daniel Kim", hours: 251.5 }] },
        { grantId: 3, name: "STOP Formula Subgrant FY25", program: "VAWA_STOP", hours: 512.0, staffCount: 3, staff: [{ userId: 102, name: "James Carter", hours: 220 }] },
        { grantId: 5, name: "HHSC Family Violence Program", program: "HHSC", hours: 310.0, staffCount: 4, staff: [{ userId: 103, name: "Aisha Rahman", hours: 140 }] },
      ],
    }),
  },
  vocaExport: {
    GetVocaValidationRuns: () => ok([
      { uid: "vr-5", createdAt: ago(9), source: "generate_pdf", verdict: "ready", isFinalizedRun: false },
      { uid: "vr-4", createdAt: ago(12), source: "preview", verdict: "ready", isFinalizedRun: false },
      { uid: "vr-3", createdAt: ago(60 * 26), source: "preview", verdict: "warnings", isFinalizedRun: false },
      { uid: "vr-2", createdAt: ago(60 * 24 * 95), source: "generate", verdict: "ready", isFinalizedRun: true },
      { uid: "vr-1", createdAt: ago(60 * 24 * 96), source: "preview", verdict: "not_ready", isFinalizedRun: false },
    ]),
    PreviewVocaReport: () => ok({ ...VOCA_RESULT, reportingPeriod: { uid: "vp-1", status: "draft" } }),
  },
  reportStorage: {
    getReports: () => [{ id: "cr-3", title: "Board Report — Q4 FY26", status: "draft", updatedAt: ago(20) }, { id: "cr-1", title: "Grant Progress Report — FY26 Q4", status: "final", updatedAt: ago(90) }, { id: "cr-2", title: "Annual Impact Report — FY25", status: "final", updatedAt: ago(60 * 24 * 300) }],
    getReport: (id) => (id === "cr-3" ? BOARD_REPORT : CUSTOM_REPORT),
    getAutosave: () => null,
    getChatHistory: (id) => (id === "cr-3" ? BOARD_CHAT : []),
  },
  partners: { GetPartnerTaggingOptions: () => ok({ agencies: [{ uid: "p-1", name: "County Legal Aid" }, { uid: "p-2", name: "Hope Family Shelter" }, { uid: "p-3", name: "Riverside Counseling" }] }) },
  chat: { getAllChatFiles: () => ok({ files: [
    { uid: "f1", fileName: "Police-report.pdf", fileSize: 412000, createdAt: ago(60 * 24 * 9) },
    { uid: "f2", fileName: "Protective-order-petition.pdf", fileSize: 268000, createdAt: ago(60 * 24 * 4) },
  ] }) },
  caseDocuments: { getCaseDocuments: () => ok({ documents: [
    { uid: "d1", title: "Consent to Release Information", fileName: "consent-release.pdf", mime: "application/pdf", documentCategory: "Consent", status: "signed", createdAt: ago(60 * 24 * 10), signatures: [{ signerRole: "client", status: "signed" }, { signerRole: "staff", status: "signed" }] },
    { uid: "d2", title: "Legal Advocacy Service Agreement", fileName: "service-agreement.pdf", mime: "application/pdf", documentCategory: "Agreement", status: "partially_signed", createdAt: ago(60 * 5), signatures: [{ signerRole: "staff", status: "signed" }, { signerRole: "client", status: "pending" }] },
  ] }) },
  intakeQuestions: { GetAllIntakeQuestionsManage: () => F.claims.GetIntakeQuestions() },
  partnerships: {
    getPartnerships: () => ok({ partnerships: PARTNERSHIPS, pagination: { total: PARTNERSHIPS.length, totalPages: 1 } }),
    // accepted partners the case can be referred to, with the services they take referrals for
    getReferralOptions: () => ok({ agencies: [
      [AGENCIES[1], "pp-3", [[31, "Emergency Shelter", "Safe, confidential shelter for survivors and their children."], [32, "Transitional Housing", "Up to 18 months of housing with case management."]]],
      [AGENCIES[0], "pp-2", [[21, "Protective Order Assistance", "Attorney help from petition to hearing."], [22, "Immigration Legal Services", "U-visa and VAWA self-petitions."]]],
      [AGENCIES[3], "pp-5", [[41, "Transitional Housing", "Scattered-site apartments with rent support."]]],
    ].map(([a, partnershipUid, svcs]) => ({ agencyUid: a.uid, agencyId: a.id, agencyName: a.name, agencyAcceptingReferrals: true, partnershipUid,
      targetAgency: { ...a, code: a.uid.toUpperCase().replace("-", "") }, services: svcs.map(([id, title, description]) => ({ id, title, description })) })) }),
  },
  "cases-actions": {
    GetAdditionalContacts: () => ok({
      phoneNumbers: [{ phoneNumber: "+15125550412", type: "Cell", isPrimary: true }, { phoneNumber: "+15125550198", type: "Work", isPrimary: false }],
      addresses: [{ address: "Safe mailing address on file (PO Box 2201, Austin, TX)", type: "Mailing", isPrimary: true }, { address: "Sister's home, Round Rock, TX", type: "Friends/Family", isPrimary: false }],
    }),
    GetServiceClaim: (uid) => ok({ claim: claimByUid(uid), claimChatThread: { uid: `t-${uid}` } }),
  },
  dashboard: {
    GetKpiData: () =>
      ok({
        totalClaims: 128,
        newClaims: 14,
        completedClaims: 21,
        avgResponseTime: "2.4 hours",
        totalInquiries: 9,
        currentMonth: { totalClaims: 128, newClaims: 14, completedClaims: 21, avgResponseTime: "2.4 hours" },
        lastMonth: { totalClaims: 116, newClaims: 11, completedClaims: 17, avgResponseTime: "3.1 hours" },
      }),
    GetTeamOverview: () =>
      ok({
        members: [
          { id: "st-2", name: "Maria Lopez", role: "Case Manager", activeCases: 24, resolvedThisMonth: 9, lastActiveAt: ago(4), trend7d: [3, 5, 4, 6, 5, 7, 8] },
          { id: "st-1", name: "Jordan Avery", role: "Victim Advocate", activeCases: 19, resolvedThisMonth: 6, lastActiveAt: ago(12), trend7d: [2, 3, 5, 4, 6, 5, 6] },
          { id: "st-4", name: "Aisha Rahman", role: "Hotline Lead", activeCases: 11, resolvedThisMonth: 4, lastActiveAt: ago(2), trend7d: [4, 4, 6, 7, 5, 8, 9] },
          { id: "st-3", name: "James Carter", role: "Legal Advocate", activeCases: 16, resolvedThisMonth: 5, lastActiveAt: ago(38), trend7d: [1, 2, 3, 3, 4, 3, 5] },
          { id: "st-5", name: "Daniel Kim", role: "Shelter Coordinator", activeCases: 8, resolvedThisMonth: 3, lastActiveAt: ago(65), trend7d: [2, 2, 3, 2, 4, 3, 4] },
        ],
      }),
    GetRecentActivity: () =>
      ok({
        activities: [
          { id: "a1", type: "case_created", description: "New case opened: Crisis Counseling", caseRef: "#24107", user: "Jordan Avery", createdAt: ago(6) },
          { id: "a2", type: "status_change", description: "Case moved to In Progress", caseRef: "#24081", user: "Maria Lopez", createdAt: ago(18) },
          { id: "a3", type: "note_added", description: "Safety plan reviewed with client", caseRef: "#24081", user: "Maria Lopez", createdAt: ago(41) },
          { id: "a4", type: "referral", description: "Referred to County Legal Aid", caseRef: "#24071", user: "James Carter", createdAt: ago(75) },
          { id: "a5", type: "document", description: "Consent to Release Information signed", caseRef: "#24090", user: "Tasha Williams", createdAt: ago(110) },
          { id: "a6", type: "inquiry", description: "New inquiry from the NECX app", caseRef: "", user: "Linh Nguyen", createdAt: ago(160) },
          { id: "a7", type: "case_created", description: "Case created from a hotline call", caseRef: "#24106", user: "Aisha Rahman", createdAt: ago(205) },
        ],
      }),
    GetDemoGraphicsAndClaimTrendsData: () =>
      ok({
        race: [
          { label: "Hispanic/Latino", count: 41, percentage: 32 },
          { label: "Black/African American", count: 35, percentage: 27 },
          { label: "White Non-Latino/Caucasian", count: 30, percentage: 23 },
          { label: "Asian", count: 12, percentage: 9 },
          { label: "Multiple Races", count: 10, percentage: 9 },
        ],
        gender: [
          { label: "Female", count: 96, percentage: 75 },
          { label: "Male", count: 27, percentage: 21 },
          { label: "Other", count: 5, percentage: 4 },
        ],
        service: [
          { label: "Crisis Counseling", count: 38 },
          { label: "Legal Advocacy", count: 29 },
          { label: "Emergency Shelter", count: 24 },
          { label: "Protective Order Assistance", count: 14 },
          { label: "Support Group", count: 6 },
          { label: "Interpreter Services", count: 5 },
          { label: "Transportation Assistance", count: 5 },
          { label: "Transitional Housing Support", count: 4 },
          { label: "Medical Accompaniment", count: 3 },
        ],
        county: [
          { label: "Travis County", count: 64, percentage: 50 },
          { label: "Williamson County", count: 31, percentage: 24 },
          { label: "Hays County", count: 18, percentage: 14 },
        ],
      }),
  },
  reminders: { GetReminders: (params = {}) => ok({ reminders: params.status ? REMINDERS.filter((r) => r.status === params.status) : REMINDERS }) },
  claims: {
    GetServiceCases: (params = {}) => {
      const list = params.onlyTaggedToMe ? CASES.filter((c) => c.tagged) : CASES;
      return ok({
        cases: list.map(({ tagged, ...c }) => c),
        stats: { totalVictims: 42, totalClaims: 128, totalNew: 14, todayNew: 2, totalApproved: 31, todayApproved: 1, totalResolved: 21, todayResolved: 1, totalRejected: 3, todayRejected: 0 },
        pagination: { page: 1, totalPages: 1 },
      });
    },
    GetCaseByVictimUid: (uid) => ok(VICTIMS[uid] ?? VICTIMS["v-1"]),
    GetServiceClaim: (uid) => ok({ claim: claimByUid(uid), claimChatThread: { uid: `t-${uid}` } }),
    GetAllChats: () => ok({ thread: [], messages: { total: 4, results: [
      msg("Thank you. I'll be there at 8:30.", 50, true),
      msg("I'll meet you at the courthouse at 8:30 on the 28th. Bring your ID.", 58, false),
      msg("Is my court date still on the 28th?", 75, true),
      msg("Hi Elena, your safety plan is saved to your case. Message me anytime.", 60 * 20, false),
    ] } }),
    GetIntakeQuestions: () => ok([
      { uid: "q1", question: "Are you safe right now?", questionType: "true-false", isRequired: true, isActive: true, category: "Safety" },
      { uid: "q2", question: "What kind of help do you need?", questionType: "multiple-choice", options: ["Shelter", "Legal help", "Counseling", "Transportation"], isRequired: true, isActive: true, category: "Needs" },
      { uid: "q3", question: "Is it safe to contact you at this number?", questionType: "true-false", isRequired: true, isActive: true, category: "Safety" },
      { uid: "q4", question: "Briefly describe your situation.", questionType: "text", isRequired: false, isActive: true, category: "Intake" },
    ]),
    ListIntakeSubmissions: () => ok({ total: 3, results: [
      { uid: "is1", status: "submitted", createdAt: ago(60 * 26), submittedAt: ago(60 * 3), submittedBy: "client", notes: "Referred by the hotline", appUserInfo: { uid: "au1", firstName: "Hannah", lastName: "Price", isVerified: true } },
      { uid: "is2", status: "pending", createdAt: ago(60 * 5), notes: "", appUserInfo: { uid: "au2", firstName: "Dana", lastName: "Morales", isVerified: false } },
      { uid: "is3", status: "converted", createdAt: ago(60 * 24 * 4), submittedAt: ago(60 * 24 * 3), submittedBy: "client", convertedClaimUid: "c-3", appUserInfo: { uid: "au3", firstName: "Elena", lastName: "Martinez", isVerified: true } },
    ] }),
    GetDeletedCases: () => ok({ pagination: { total: 1, page: 1, totalPages: 1 }, victims: [
      { victimUid: "v-6", victimName: "Sarah Mitchell", hasActiveCases: true, deletedCases: [{ claimUid: "c-11", serviceName: "Transportation Assistance", status: "pending", deletedAt: ago(60 * 24 * 2), deletedByName: "Maria Lopez" }] },
    ] }),
    GetServiceClaims: (params = {}) =>
      params.pageLess
        ? ok({ serviceClaims: PAGELESS_CLAIMS }) // Notes Center / appointment case pickers
        : ok({
        serviceClaims: [
          { uid: "c1", displayId: "24090", victimInfo: person("Tasha", "Williams", "v-2"), serviceInfo: { title: "Crisis Counseling" }, status: "pending", updatedAt: ago(60 * 24 * 2) },
          { uid: "c2", displayId: "24071", victimInfo: person("Linh", "Nguyen", "v-3"), serviceInfo: { title: "Protective Order Assistance" }, status: "pending_court_date", updatedAt: ago(60 * 24 * 6) },
          { uid: "c3", displayId: "24088", victimInfo: person("Fatima", "Haddad", "v-5"), serviceInfo: { title: "Medical Accompaniment" }, status: "awaiting_client", updatedAt: ago(60 * 24 * 4) },
          { uid: "c4", displayId: "24081", victimInfo: person("Elena", "Martinez", "v-1"), serviceInfo: { title: "Legal Advocacy" }, status: "in_progress", updatedAt: ago(60 * 24 * 1) },
          { uid: "c5", displayId: "24102", victimInfo: person("Grace", "Okafor", "v-6"), serviceInfo: { title: "Financial Assistance" }, status: "pending_review", updatedAt: ago(60 * 24 * 3) },
        ],
      }),
  },
  notes: {
    getCaseNotes: (params = {}) => {
      const q = (params.search ?? "").toLowerCase().replace("#", "");
      const notes = CASE_NOTES.filter((n) =>
        (!q || `${n.title} ${plain(n.description)} ${n.clientName} ${n.caseDisplayId}`.toLowerCase().includes(q)) &&
        (!params.types?.length || params.types.includes(n.noteType)) &&
        (!params.hasHighlight || n.description.includes("<mark")) &&
        (!params.taggedStaffUids?.length || n.taggedStaff.some((t) => params.taggedStaffUids.includes(t.uid))));
      return ok({ notes, pagination: { page: 1, pageSize: 50, total: notes.length, totalPages: 1 }, stats: { total: 248, today: 6, thisWeek: 37, thisMonth: 112, myTagged: 9 } });
    },
    // the backend prints this exact HTML to PDF; headless Chrome can't show a PDF
    // in an iframe, so the capture step shows the HTML itself (window.__pdfHtml)
    exportNotesPdf: ({ html }) => {
      window.__pdfHtml = html;
      return { data: new Blob(["%PDF-1.4"], { type: "application/pdf" }) };
    },
  },
  shelters: {
    GetShelterLocations: () => ok({ locations: LOCATIONS }),
    GetShelterLocation: (uid) => ok({ location: LOCATIONS.find((l) => l.uid === uid) ?? LOCATIONS[0] }),
    GetSystemStats: () => ok({ totalBeds: 30, occupied: 21, available: 6, reserved: 1, maintenance: 1, out_of_service: 1, occupancyRate: 70 }),
    GetLocationStats: (uid) => ok(LOC_STATS[uid] ?? LOC_STATS["sh-1"]),
    GetBedsByLocation: () => ok({ beds: BEDS }),
    GetAvailableBeds: (uid) => ok({
      beds: uid === "sh-2"
        ? [{ id: 101, uid: "bed-r3", bedNumber: "R-3", type: "individual", familyCapacity: 1, status: "available" }, { id: 102, uid: "bed-r7", bedNumber: "R-7", type: "individual", familyCapacity: 1, status: "available" }]
        : uid === "sh-3"
          ? [{ id: 201, uid: "bed-s2", bedNumber: "S-2", type: "family_room", familyCapacity: 3, status: "available" }]
          : BEDS.filter((b) => b.status === "available"),
    }),
    GetFloors: () => ok({ floors: FLOORS.map((f) => ({ ...f, rooms: ROOMS.filter((r) => r.floor.uid === f.uid) })) }),
    GetRooms: (floorUid) => ok({
      rooms: ROOMS.filter((r) => r.floor.uid === floorUid).map((r) => {
        const beds = BEDS.filter((b) => b.room === r);
        return { ...r, capacity: beds.length, bedCount: beds.length, isFull: beds.every((b) => b.status !== "available"), beds };
      }),
    }),
    GetAllWaitlist: () => ok({ waitlist: WAITLIST }),
    GetWaitlist: () => ok({ waitlist: WAITLIST }),
    GetMobileRequests: () => ok({ requests: MOBILE_REQUESTS, total: MOBILE_REQUESTS.length }),
    GetPartnerShelters: () => ok({ partners: PARTNERS }),
    GetPendingTransferCount: () => ok({ count: TRANSFERS_IN.length }),
    GetIncomingTransfers: () => ok({ transfers: TRANSFERS_IN }),
    GetOutgoingTransfers: () => ok({ transfers: TRANSFERS_OUT }),
    GetIncidents: () => ok({ incidents: INCIDENTS }),
    GetMaintenanceItems: () => ok({ items: [] }),
    SearchClients: () => ok({ clients: [] }),
    GetActiveAssignments: (uid) =>
      ok({
        assignments:
          uid === "sh-1"
            ? STAYS
            : [{ uid: "as-x", checkInDate: ago(60 * 24 * 20), expectedStayDays: 90 }],
      }),
    GetLocationHistory: (uid) => ok({ history: uid === "sh-1" ? SHELTER_HISTORY : [{ id: "h9", eventType: "check_in", description: "Carmen D. checked in to Unit 2", createdAt: ago(190) }] }),
  },
  hmisProjects: {
    GetActiveHmisProjects: () => ok({ projects: HMIS_PROJECTS, closedProjects: [] }),
    GetHmisProjects: () => ok({ projects: HMIS_PROJECTS, locations: LOCATIONS.map((l) => ({ id: l.id, uid: l.uid, name: l.name })) }),
    GetHmisAgencyIdentity: () => ok({ identity: { organizationId: "HLVC-0412", victimServiceProvider: 1, hmisAddress: "PO Box 2201", hmisCity: "Austin", hmisState: "TX", hmisPostalCode: "78768" } }),
  },
  hmisBedNights: {
    GetRollCall: () => ok(ROLL_CALL),
  },
  hmisClientData: {
    GetHudActiveStatus: () => ok({ stays: Object.fromEntries(STAYS.map((a, i) => [a.uid, i === 0 ? { entryMissing: true } : i === 3 ? { annualDue: true } : {}])) }),
    GetHudStayData: () => ok({ stay: HUD_STAY, details: [], annual: [], assessments: [] }),
  },
  hmisDataCompleteness: {
    GetHmisDataCompleteness: () => ok(HUD_WORKLIST),
  },
  hmisProgramEnrollments: {
    GetCaseHudPrograms: () => ok({ enrollments: HUD_ENROLLMENTS, projects: HMIS_PROJECTS.map((p) => ({ uid: p.uid, name: p.projectName, type: p.projectType })) }),
  },
  hmisExport: {
    // the backend's own runValidation (hmis-sage-validator.service.js) on a full 67-file APR package
    ValidateSageExport: () => ok({ apr: SAGE_APR }),
  },
  hotlineService: {
    GetHotlineLines: () => ok([
      { id: "ln-1", uid: "ln-1", name: "Main Crisis Line", phoneNumber: "+15125550100", twilioNumber: "+15125550100", isActive: true },
      { id: "ln-2", uid: "ln-2", name: "Spanish Line", phoneNumber: "+15125550111", twilioNumber: "+15125550111", isActive: true },
    ]),
    GetCallStats: () => ok({
      totalCalls: 23, avgDurationSeconds: 486, answeredCalls: 20, missedCalls: 3,
      byCategoryCount: { crisis: 9, information: 6, referral: 4, follow_up: 4 },
      byDisposition: { created_case: 5, callback_scheduled: 6, informational_only: 8, referral_request: 4 },
    }),
    GetActiveCalls: () => ok([{ id: "call-1", uid: "call-1", status: "in_progress", callType: "inbound", callerPhone: "+15125550187", hotlineName: "Main Crisis Line", hotlineLineId: "ln-1", startTime: ago(4), answeredByName: "Aisha Rahman" }]),
    GetHotlineStaff: () => ok(HOTLINE_STAFF),
    GetCallLog: () => ok({ results: CALLS, total: CALLS.length }),
    GetCallbacks: (params = {}) => {
      if (!params.tab) return ok(CALLBACKS.flatMap((c) => c[1])); // dashboard widget: plain list
      const list = params.tab === "all" ? CALLBACKS.flatMap((c) => c[1]) : (CALLBACKS.find(([t]) => t === params.tab) ?? [null, []])[1];
      return ok({ data: list, total: list.length });
    },
    GetMissedCallsUnseenCount: () => ok({ count: 2 }),
    GetMyHotlineLines: () => F.hotlineService.GetHotlineLines(),
  },
};

// The signed-in demo users. `caseWorker` is an agency user (the dashboard's
// case-worker layout: cases needing attention); `admin` is the platform super
// admin layout (team activity).
const allModules = ["dashboard", "claims", "cases_v2", "hotline", "inquiries", "shelters", "services", "user", "internal-chat", "agency-chat", "communities", "notes_center", "reports", "calendar", "time", "drive", "audit_log"];
const fullPerms = Object.fromEntries(allModules.map((m) => [m, { view: true, add: true, edit: true, delete: true }]));
fullPerms.role_management = { view: true, add: true, edit: true };
fullPerms.agency_profile = { view: true, add: true, edit: true };
fullPerms.reports = { view: true, add: true, edit: true, delete: true, pmt_reports: true, custom_reports: true, sage_validator: true, hscc_validator: true, tmwf_compliance_report: true, voca_pmt_report: true, staff_time_report: true, fvpsa_ppr_report: true, vawa_report: true, federal_report_certify: true };
fullPerms.internal_chat = { view: true, add: true, view_stale: true };
fullPerms.agency_chat = { view: true, add: true };
fullPerms.hotline = { view: true, add: true, edit: true, command_center: true, call_logs: true, callbacks: true, analytics: true, direct_call: true };
fullPerms.cases_v2 = { view: true, add: true, edit: true, delete: true, view_all: true, view_deleted: true, restore: true };
fullPerms.claims = { ...fullPerms.claims, view_all: true };
fullPerms.dashboard = { view: true, greeting: true, stats: true, quick_action: true, cases_needing_attention: true, team_overview: true, recent_activity: true, upcoming_follow_ups: true, case_notes: true, analytics_insights: true };

// Agency plan modules for the Roles & Permissions grid (login payload's vs360Modules)
export const MODULES = {
  vs360Modules: {
    dashboard: { view: true },
    cases_v2: { view: true, add: true, edit: true, delete: true, view_all: true, view_deleted: true, restore: true },
    hotline: { view: true, command_center: true, call_logs: true, callbacks: true, analytics: true, direct_call: true, add_staff: true, settings: true },
    inquiries: { view: true, add: true, edit: true },
    shelters: { view: true, add: true, edit: true, delete: true },
    services: { view: true, add: true, edit: true, delete: true },
    user: { view: true, add: true, edit: true, delete: true },
    internal_chat: { view: true, add: true, view_stale: true, delete_stale: true },
    agency_chat: { view: true, add: true },
    notes_center: { view: true, add: true, edit: true, delete: true },
    reports: { view: true, add: true, edit: true, pmt_reports: true, custom_reports: true, sage_validator: true, hscc_validator: true, voca_pmt_report: true, staff_time_report: true },
    calendar: { view: true, add: true, edit: true, delete: true },
    time: { view: true, add: true, edit: true },
    drive: { view: true, add: true, edit: true, delete: true },
    role_management: { necxOnly: true, view: true, add: true, edit: true },
    agency_profile: { necxOnly: true, view: true, edit: true },
  },
};

// Staff & roles video: what a case manager's role allows (no delete, no hotline,
// shelters, services, staff or reports)
const CASE_MANAGER_PERMS = {
  dashboard: { view: true },
  cases_v2: { view: true, add: true, edit: true },
  notes_center: { view: true, add: true, edit: true },
  internal_chat: { view: true, add: true },
  calendar: { view: true, add: true, edit: true },
  time: { view: true, add: true },
  drive: { view: true, add: true },
};
// what the signed-in case manager's session carries (the dashboard's widget toggles too)
const CASE_MANAGER_SESSION = { ...CASE_MANAGER_PERMS,
  dashboard: { view: true, greeting: true, stats: true, quick_action: true, cases_needing_attention: true, upcoming_follow_ups: true, case_notes: true } };
// agency-made roles carry serviceCenterId (editable); VSMS_ADMIN is NECX's base role
const ROLE = (id, roleName, description, platforms, permission, extra = {}) => ({ id, uid: `role-${id}`, roleName, description, platforms, permission, serviceCenterId: 1, createdAt: ago(60 * 24 * (200 - id * 20)), ...extra });
// a role's permissions as the role screens list them: every module of the catalog
const catalogPerms = (skip = []) => Object.fromEntries(Object.entries(MODULES.vs360Modules).filter(([m]) => !skip.includes(m))
  .map(([m, acts]) => [m, Object.fromEntries(Object.keys(acts).filter((a) => a !== "necxOnly").map((a) => [a, true]))]));
const ROLES = [
  ROLE(1, "VSMS_ADMIN", "Agency super admin: manages staff, roles and agency settings", ["vs360_web", "workspace_app"], catalogPerms(), { isAgencyAdmin: true, serviceCenterId: null }),
  ROLE(2, "Program Director", "Oversees every program; approves cases and reports", ["vs360_web", "workspace_app"], catalogPerms(["role_management", "agency_profile", "user"])),
  ROLE(3, "Case Manager", "Works their own cases, notes and follow-ups", ["vs360_web", "workspace_app"], CASE_MANAGER_PERMS),
  ROLE(4, "Hotline Advocate", "Answers the crisis line and opens cases from calls", ["vs360_web"], { dashboard: { view: true }, hotline: { view: true, call_logs: true, callbacks: true, direct_call: true }, cases_v2: { view: true, add: true } }),
  ROLE(5, "Shelter Coordinator", "Runs beds, check-ins and the waitlist", ["vs360_web", "workspace_app"], { dashboard: { view: true }, shelters: { view: true, add: true, edit: true }, cases_v2: { view: true } }),
  ROLE(6, "Grants & Reporting", "Prepares funder reports; no case editing", ["vs360_web"], { dashboard: { view: true }, reports: fullPerms.reports, time: { view: true } }),
  ROLE(7, "Volunteer", "Views assigned cases only", ["workspace_app"], { cases_v2: { view: true } }),
];
const STAFF_USERS = [
  ["st-0", "Priya", "Patel", "priya.patel", "+15125550101", 1, "EMAIL", false],
  ["st-1", "Jordan", "Avery", "jordan.avery", "+15125550102", 3, "SMS", false],
  ["st-2", "Maria", "Lopez", "maria.lopez", "+15125550103", 3, "EMAIL", false],
  ["st-3", "James", "Carter", "james.carter", "+15125550104", 2, "EMAIL", false],
  ["st-4", "Aisha", "Rahman", "aisha.rahman", "+15125550105", 4, "SMS", false],
  ["st-5", "Daniel", "Kim", "daniel.kim", "+15125550106", 5, "SMS", false],
  ["st-6", "Grace", "Liu", "grace.liu", "+15125550107", 6, "EMAIL", false],
  ["st-7", "Sam", "Rivera", "sam.rivera", "+15125550108", 7, "SMS", false],
  ["st-8", "Nadia", "Haddad", "nadia.haddad", "+15125550109", 3, "EMAIL", true],
].map(([uid, firstName, lastName, mail, phoneNumber, roleId, otpChannel, isArchived], i) => {
  const role = ROLES.find((r) => r.id === roleId);
  return { id: 200 + i, uid, firstName, lastName, name: `${firstName} ${lastName}`, fullName: `${firstName} ${lastName}`, email: `${mail}@harborlight.example`, phoneNumber, otpChannel, isArchived,
    roleInfo: { id: role.id, roleName: role.roleName }, roles: [{ id: role.id, roleName: role.roleName, isAgencyAdmin: !!role.isAgencyAdmin }],
    serviceCategoriesInfo: [], jobTitle: null, createdAt: ago(60 * 24 * (300 - i * 25)) };
});

export const USERS = {
  caseWorker: {
    id: 101,
    uid: "u-maria",
    firstName: "Maria",
    lastName: "Lopez",
    name: "Maria Lopez",
    email: "maria.lopez@harborlight.example",
    roleInfo: { roleName: "Case Manager", context: "AGENCY", permission: fullPerms },
    serviceCenterInfo: { id: 1, uid: "sc-1", name: "Harbor Light Victim Center", isHhscAgency: true, isVocaAgency: true, isHmisAgency: true, isFvpsaAgency: true, isVawaAgency: true },
  },
  // the agency super admin (VSMS_ADMIN): manages staff and roles
  agencyAdmin: {
    id: 200, uid: "st-0", firstName: "Priya", lastName: "Patel", name: "Priya Patel", email: "priya.patel@harborlight.example", isAgencySuperAdmin: true,
    roleInfo: { id: 1, roleName: "VSMS_ADMIN", context: "AGENCY", isAgencyAdmin: true, permission: { ...fullPerms, audit_log: undefined, communities: undefined, claims: undefined } },
    roles: [{ id: 1, roleName: "VSMS_ADMIN", isAgencyAdmin: true }],
    serviceCenterInfo: { id: 1, uid: "sc-1", numberOfUsers: 25, name: "Harbor Light Victim Center", isHhscAgency: true, isVocaAgency: true, isHmisAgency: true, isFvpsaAgency: true, isVawaAgency: true },
  },
  // the same agency, signed in with the Case Manager role
  caseManager: {
    id: 201, uid: "st-1", firstName: "Jordan", lastName: "Avery", name: "Jordan Avery", email: "jordan.avery@harborlight.example",
    roleInfo: { id: 3, roleName: "Case Manager", context: "AGENCY", permission: CASE_MANAGER_SESSION },
    roles: [{ id: 3, roleName: "Case Manager" }],
    serviceCenterInfo: { id: 1, uid: "sc-1", name: "Harbor Light Victim Center", isHhscAgency: true, isVocaAgency: true, isHmisAgency: true, isFvpsaAgency: true, isVawaAgency: true },
  },
  // the VCLG video: the Victim Assistance Coordinator at a (fictional) DA's office
  vclg: {
    id: 301, uid: "st-dw", firstName: "Dana", lastName: "Whitfield", name: "Dana Whitfield", email: "dana.whitfield@bluebonnetda.example",
    roleInfo: { roleName: "Victim Assistance Coordinator", context: "AGENCY", permission: { ...fullPerms, reports: { ...fullPerms.reports, vclg_report: true } } },
    serviceCenterInfo: V.BLUEBONNET,
  },
  admin: {
    uid: "u-priya",
    firstName: "Priya",
    lastName: "Patel",
    name: "Priya Patel",
    email: "priya.patel@harborlight.example",
    roleInfo: { roleName: "Super Admin", context: "ADMIN", permission: fullPerms },
    serviceCenterInfo: { uid: "sc-1", name: "Harbor Light Victim Center", isHhscAgency: true, isVocaAgency: true, isHmisAgency: true, isFvpsaAgency: true, isVawaAgency: true },
  },
};

// FVPSA / VAWA "Data entry" tabs (necx-990 branch)
const EDUCATION_EVENTS = [
  ["2026-09-24", "Healthy relationships, Eastside High", "prevention", 0, 64, 2],
  ["2026-09-18", "Faith leaders roundtable", "community_education", 22, 0, 1],
  ["2026-09-11", "Dating violence awareness, Travis Middle", "prevention", 0, 118, 3],
  ["2026-08-28", "Workplace safety for HR teams", "community_education", 35, 0, 1],
  ["2026-08-20", "Community health fair", "exhibit_tabling", 140, 26, 1],
  ["2026-08-06", "Neighborhood association meeting", "community_education", 41, 0, 1],
].map(([eventDate, title, educationKind, adultParticipants, youthParticipants, sessions], i) =>
  ({ uid: `ed-${i}`, eventDate, title, educationKind, adultParticipants, youthParticipants, sessions, grantId: 1, fundedSharePct: 100, audienceGroups: [] }));
const OUTCOME_SURVEYS = [
  ["2026-09-30", "shelter", 38, 35, 38, 37], ["2026-09-30", "support_advocacy", 52, 48, 52, 47], ["2026-09-30", "counseling", 24, 23, 24, 22],
  ["2026-09-30", "support_group", 16, 15, 16, 15], ["2026-08-31", "shelter", 35, 32, 35, 33], ["2026-08-31", "support_advocacy", 49, 46, 49, 44],
].map(([surveyDate, serviceRow, resourcesAnswered, resourcesYes, safetyAnswered, safetyYes], i) =>
  ({ uid: `os-${i}`, surveyDate, serviceRow, resourcesAnswered, resourcesYes, safetyAnswered, safetyYes }));
const HOTLINE_CONTACTS = {
  callTotal: 1964, threadTotal: 312, pageSize: 100,
  calls: [
    [12, "Main Crisis Line", "Shelter request", "primary_victim", true, true],
    [55, "Main Crisis Line", "Safety planning", "primary_victim", true, false],
    [140, "Spanish Line", "Shelter request", "primary_victim", true, false],
    [260, "Main Crisis Line", "Information and referral", "third_party", true, false],
    [410, "Main Crisis Line", "Shelter request", "primary_victim", true, true],
    [655, "Spanish Line", "Crisis support", "primary_victim", true, false],
    [900, "Main Crisis Line", "Crisis support", "unknown", false, false],
  ].map(([m, lineName, callCategory, callerType, callerIsAdult, shelterDeclinedForCapacity], i) =>
    ({ id: 9000 + i, startTime: ago(m), lineName, callType: "inbound", callCategory, tag: { callerType, callerIsAdult, shelterDeclinedForCapacity, isQualifying: null } })),
  threads: [
    [30, "Main Crisis Line", "primary_victim"], [190, "Main Crisis Line", "primary_victim"], [720, "Spanish Line", "unknown"],
  ].map(([m, lineName, callerType], i) => ({ id: 7000 + i, updatedAt: ago(m), lineName, tag: { callerType, isQualifying: null } })),
};
const crud = (rows) => ({ list: () => Promise.resolve(ok(rows)), create: () => Promise.resolve(ok({})), update: () => Promise.resolve(ok({})), remove: () => Promise.resolve(ok({})) });

// non-API exports (factories, constants) a fixture replaces outright, keyed "service.name"
const fed = (family) => {
  const P = (data) => Promise.resolve(ok(data));
  return {
    // the step-by-step guide: window.__vclgNoGrant = a brand-new agency (no grant yet)
    listTypes: () => P(family === "VCLG" ? [window.__vclgNoGrant ? { ...V.VCLG_TYPE, available: false, grants: [] } : V.VCLG_TYPE] : FEDERAL.types[family]),
    listReports: () => P(family === "VCLG" ? (window.__vclgNoGrant ? [] : V.VCLG_REPORTS) : FEDERAL.reports[family]),
    getTemplate: (program) => P(program === V.VCLG_PROGRAM ? V.VCLG_DETAIL.template : FEDERAL.templates[program]),
    // window.__vclgStatus = "approved" / "submitted": the same report after sign-off
    getReport: (uid) => P(uid.startsWith("vq-") ? (window.__vclgStatus ? V.vclgDetailAt(window.__vclgStatus) : window.__vclgAcked ? V.VCLG_DETAIL_ACKED : V.VCLG_DETAIL) : FEDERAL.details[uid]),
    getGrantProfile: () => P(window.__noProfile ? { profile: null } : { profile: window.__noGoals ? { ...V.VCLG_PROFILE, projectGoals: "" } : V.VCLG_PROFILE }),
    findingCases: (uid, id) => P(V.findingClients(id)),
    previewOagWorkbook: () => P(V.OAG_PREVIEW),
    previewYearWorkbook: () => P(V.OAG_PREVIEW),
    priorYear: () => P({ priorValues: { "C-01": 4390, "C-02": 71, "C-03": 1498, "C-04": 214, "B-LANGUAGE": 121, "B-LGBTQ": 30 } }),
    audit: () => P([
      { uid: "ev-1", action: "calculated", actorName: "Maria Lopez", createdAt: ago(62), detail: "Every value was recalculated from your records." },
      { uid: "ev-2", action: "created", actorName: "Priya Patel", createdAt: ago(60 * 24 * 25) },
    ]),
    lineage: (uid, key) => family === "VCLG" ? P(V.vclgLineage(key)) : P({
      formula: key === "C-03" ? "Crisis and hotline contacts on FVPSA-funded lines during the period"
        : key?.startsWith("VS-") ? "Unduplicated primary victims who received STOP-funded victim services during the period, by presenting victimization"
        : "Person-nights in FVPSA-funded shelters during the period, from the nightly roll call",
      calculation: family === "VAWA"
        ? { periodStart: "2026-01-01", periodEnd: "2026-12-31", timezone: "America/Chicago", sourceCutoffAt: "2026-10-27T12:58:00", templateVersion: "stop-sub-2025-11-20" }
        : { periodStart: "2025-10-01", periodEnd: "2026-09-30", timezone: "America/Chicago", sourceCutoffAt: "2026-10-27T12:58:00", templateVersion: "fvpsa-ppr-state-tribe-2024-2027" },
      includedCount: family === "VAWA" ? 271 : key === "C-03" ? 1964 : 4812, excludedCount: family === "VAWA" ? 20 : 23, pageSize: 100,
      included: Array.from({ length: 12 }, (_, i) => ({ key: `s-${i}`, category: family === "VAWA" ? ["Domestic violence/dating violence", "Sexual assault", "Stalking"][i % 3] : i % 3 ? "Adult" : "Child",
        reason: family === "VAWA" ? "STOP-funded service in the period" : "Stayed in a funded bed", source: family === "VAWA" ? "Case service event" : "Roll call", date: new Date(now - (i + 1) * 864e5 * 9).toISOString().slice(0, 10) })),
      excluded: [{ key: "x-1", code: "OUTSIDE_PERIOD", explanation: "Stay began after the period ended" }],
    }),
    calculate: () => P({}), validate: () => P({}), refresh: () => P({ changed: false }),
  };
};
const OVERRIDES = {
  "federalReports.federalReportsApi": fed,
  "federalData.EducationEventsApi": crud(EDUCATION_EVENTS),
  "federalData.OutcomeSurveysApi": crud(OUTCOME_SURVEYS),
  "federalData.GrantRolesApi": { ...crud(V.GRANT_ROLES), list: () => (window.__rolesPending ? new Promise(() => {}) : Promise.resolve(ok(V.GRANT_ROLES))) },
  "federalData.GrantTargetsApi": crud(V.GRANT_TARGETS),
  "federalData.StaffAllocationsApi": crud(V.STAFF_ALLOCATIONS),
};
export const override = (service, name) => OVERRIDES[`${service}.${name}`];

export function fixture(service, name, args) {
  if (typeof window !== "undefined") (window.__calls ??= []).push({ call: `${service}.${name}`, args: JSON.stringify(args).slice(0, 160), stubbed: !F[service]?.[name] });
  const fn = F[service]?.[name];
  const res = fn ? fn(...args) : { data: { success: true, data: [] } };
  return Promise.resolve(res);
}
