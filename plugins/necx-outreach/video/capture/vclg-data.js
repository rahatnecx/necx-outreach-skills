// Made-up Q1 FY2027 (Sep–Nov 2026) for the fictional Bluebonnet County
// District Attorney's Office. Every 2.2/2.4 list totals New Victims per month.
const m = (a, b, c) => ({ m1: a, m2: b, m3: c, quarter: a + b + c });
const t = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, m(...v)]));
const withTotal = (o) => {
  const rows = t(o);
  const sum = (k) => Object.values(rows).reduce((n, r) => n + r[k], 0);
  return { ...rows, total: { m1: sum("m1"), m2: sum("m2"), m3: sum("m3"), quarter: sum("quarter") } };
};
export const Q1 = {
  "S4-VICTIMS": t({ new: [96, 41, 35], continuing: [0, 70, 74], total: [96, 111, 109] }),
  "S4-GENDER": withTotal({ female: [68, 30, 25], male: [26, 10, 9], unknown: [2, 1, 1] }),
  "S4-AGE": withTotal({ "0_12": [9, 5, 3], "13_17": [7, 4, 3], "18_24": [17, 8, 6], "25_59": [52, 20, 19], "60_plus": [8, 3, 3], unknown: [3, 1, 1] }),
  "S4-RACE": withTotal({ aian: [1, 1, 0], asian: [2, 1, 1], black: [20, 9, 7], hispanic: [35, 15, 13], nhpi: [1, 0, 1], white: [33, 13, 11], other: [2, 1, 1], unknown: [2, 1, 1] }),
  "S4-POPULATIONS": t({ disability: [7, 2, 4] }),
  "S4-VICTIMIZATION": withTotal({ assault: [18, 8, 6], dui_dwi: [4, 2, 1], family_violence: [38, 16, 14], hate_bias: [0, 0, 0], human_trafficking: [2, 0, 1],
    physical_abuse_child: [5, 3, 2], physical_abuse_elder: [2, 1, 1], sexual_assault_adult: [8, 4, 3], sexual_abuse_child: [8, 3, 3], sexual_abuse_elder: [0, 0, 0],
    homicide_survivors: [3, 1, 1], unknown: [1, 0, 0], other_violent: [7, 3, 3] }),
  "S4-SERVICES": withTotal({ accompaniment: [6, 7, 5], advocacy: [64, 71, 68], cvc: [22, 25, 21], restitution: [18, 20, 17], savns: [30, 33, 29],
    victim_impact_panels: [0, 2, 0], victim_impact_statements: [14, 16, 13], crisis_intervention: [9, 11, 8], emergency_funds: [2, 1, 2], follow_up: [58, 63, 60],
    groups: [0, 0, 0], individual_counseling: [0, 0, 0], information_referral: [96, 104, 99], legal_assistance: [0, 0, 0], lodging: [1, 0, 1],
    peer_support: [0, 0, 0], transportation: [3, 4, 3], other: [2, 1, 2] }),
  "S5-OUTREACH": t({ speeches: [2, 3, 1], speech_participants: [85, 120, 40], booths: [1, 1, 0], booth_attendees: [240, 180, 0] }),
  "S5-TRAINING-SESSIONS": t({ sessions: [1, 2, 1] }),
  "S5-TRAINED": t({ faith_based: [0, 0, 6], law_enforcement: [18, 24, 0], medical: [0, 0, 0], prosecution_judicial: [0, 12, 9], school_faculty: [0, 0, 15], volunteer: [0, 0, 0], other: [0, 0, 0] }),
  "S5-ASYNC": t({ sessions: [0, 1, 0], participants: [0, 56, 0] }),
  "S5-SOCIAL": t({ posts: [6, 8, 7] }),
  "S6-OUTCOME-DS": t({ given: [60, 41, 35], completed: [34, 25, 20], desired: [31, 23, 19] }),
  "S6-OUTCOME-OUTREACH": t({ given: [85, 120, 40], completed: [61, 88, 29], desired: [55, 80, 27] }),
  "S6-OUTCOME-TRAINING": t({ given: [18, 36, 30], completed: [18, 34, 30], desired: [17, 33, 28] }),
  "S4-OTHER-SERVICES": "Courtroom orientation tours for child witnesses and their caregivers (5).",
  "S5G-EXPENDITURES": "Grant funds paid the Victim Assistance Coordinator and Assistant Victim Assistance Coordinator salaries, which delivered every direct service counted in Section 2, plus booth materials for two community fairs.",
  "S7-ACTIVITIES": "Trained 24 patrol officers on Texas SAVNS registration and CVC referrals at the October in-service.",
  "S7-SUCCESSES": "Every new victim received CVC information within 7 days of case filing. Restitution assistance rose 18% over last quarter.",
  "S7-CHALLENGES": "Rural victims in the north of the county have limited transportation to court; two hearings were rescheduled.",
  "S7-PERSONNEL": "No changes in key personnel.",
  "S7-VACANCIES": "None.",
  "S6-NARRATIVE-DS": "Victims completing the exit survey reported knowing their rights and how to apply for compensation.",
  "S6-NARRATIVE-OUTREACH": "Post-presentation surveys show increased knowledge of local victim services.",
  "S6-NARRATIVE-TRAINING": "Trainees reported confidence explaining SAVNS and CVC to victims.",
};
export const AGENCY = {
  grantNumber: "2027-VCLG-0418",
  granteeName: "Bluebonnet County District Attorney's Office",
  grantContact: "Dana Whitfield",
  authorizedOfficial: "Raymond Okafor",
  corrections: { name: "Dana Whitfield", phone: "2545550148", email: "dana.whitfield@bluebonnetda.example" },
};
export const TARGETS = { unique_victims: 450, "service:information_referral": 1150, "service:cvc": 300, "service:restitution": 220, "service:savns": 380,
  "service:advocacy": 800, "service:follow_up": 700, public_speeches: 10, speech_participants: 400, information_booths: 4, training_sessions: 6, "trained:law_enforcement": 80 };
export const GOALS = "Provide timely, trauma-informed notification, accompaniment and advocacy to every victim of a violent crime prosecuted by the Bluebonnet County District Attorney's Office, and connect each one to Crime Victims' Compensation within 7 days of case filing.";
