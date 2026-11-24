import type { CampusLocation, Department, LocationResolution } from "./types";

export const CAMPUS_LOCATIONS: CampusLocation[] = [
  // IS Department
  {
    id: "is-1",
    name: "IS 1",
    ownerDepartment: "IS",
    groupKey: "is_rooms",
    numbers: [1],
    aliases: ["is 1", "is1", "is one", "is ek", "is room 1"],
    description: "IS Department Classroom IS 1",
  },
  {
    id: "is-2",
    name: "IS 2",
    ownerDepartment: "IS",
    groupKey: "is_rooms",
    numbers: [2],
    aliases: ["is 2", "is2", "is two", "is do", "is room 2"],
    description: "IS Department Classroom IS 2",
  },
  {
    id: "is-3",
    name: "IS 3",
    ownerDepartment: "IS",
    groupKey: "is_rooms",
    numbers: [3],
    aliases: ["is 3", "is3", "is three", "is teen", "is room 3"],
    description: "IS Department Classroom IS 3",
  },
  {
    id: "is-4",
    name: "IS 4",
    ownerDepartment: "IS",
    groupKey: "is_rooms",
    numbers: [4],
    aliases: ["is 4", "is4", "is four", "is char", "is room 4"],
    description: "IS Department Classroom IS 4",
  },
  {
    id: "is-215",
    name: "IS 215",
    ownerDepartment: "IS",
    groupKey: "is_rooms",
    numbers: [215],
    aliases: ["is 215", "is215", "room 215", "is room 215"],
    description: "IS Department Classroom IS 215",
  },
  {
    id: "ns-auditorium",
    name: "NS Auditorium",
    ownerDepartment: "IS",
    numbers: [],
    aliases: ["ns auditorium", "auditorium", "ns audi", "ns hall"],
    description: "NS Main Campus Auditorium",
  },
  {
    id: "qasid-complex",
    name: "Qasid Complex",
    ownerDepartment: "IS",
    numbers: [],
    aliases: ["qasid complex", "qasid", "qasid block"],
    description: "Qasid Complex Academic & Student Area",
  },
  {
    id: "is-parking",
    name: "IS Parking",
    ownerDepartment: "IS",
    numbers: [],
    aliases: ["is parking", "parking", "parking lot", "parking area", "is parking lot"],
    description: "IS Department Parking Area",
  },

  // EE Department
  {
    id: "ee-cr-20",
    name: "CR 20",
    ownerDepartment: "EE",
    groupKey: "ee_rooms",
    numbers: [20],
    aliases: ["cr 20", "cr20", "classroom 20", "ee cr 20", "ee room 20", "room 20"],
    description: "EE Department Classroom CR 20",
  },
  {
    id: "ee-cr-21",
    name: "CR 21",
    ownerDepartment: "EE",
    groupKey: "ee_rooms",
    numbers: [21],
    aliases: ["cr 21", "cr21", "classroom 21", "ee cr 21", "ee room 21", "room 21"],
    description: "EE Department Classroom CR 21",
  },
  {
    id: "ee-cr-22",
    name: "CR 22",
    ownerDepartment: "EE",
    groupKey: "ee_rooms",
    numbers: [22],
    aliases: ["cr 22", "cr22", "classroom 22", "ee cr 22", "ee room 22", "room 22"],
    description: "EE Department Classroom CR 22",
  },
  {
    id: "ee-cr-23",
    name: "CR 23",
    ownerDepartment: "EE",
    groupKey: "ee_rooms",
    numbers: [23],
    aliases: ["cr 23", "cr23", "classroom 23", "ee cr 23", "ee room 23", "room 23"],
    description: "EE Department Classroom CR 23",
  },
  {
    id: "ee-cr-24",
    name: "CR 24",
    ownerDepartment: "EE",
    groupKey: "ee_rooms",
    numbers: [24],
    aliases: ["cr 24", "cr24", "classroom 24", "ee cr 24", "ee room 24", "room 24"],
    description: "EE Department Classroom CR 24",
  },
  {
    id: "ee-cr-25",
    name: "CR 25",
    ownerDepartment: "EE",
    groupKey: "ee_rooms",
    numbers: [25],
    aliases: ["cr 25", "cr25", "classroom 25", "ee cr 25", "ee room 25", "room 25"],
    description: "EE Department Classroom CR 25",
  },
  {
    id: "ee-cr-26",
    name: "CR 26",
    ownerDepartment: "EE",
    groupKey: "ee_rooms",
    numbers: [26],
    aliases: ["cr 26", "cr26", "classroom 26", "ee cr 26", "ee room 26", "room 26"],
    description: "EE Department Classroom CR 26",
  },
  {
    id: "ee-cr-27",
    name: "CR 27",
    ownerDepartment: "EE",
    groupKey: "ee_rooms",
    numbers: [27],
    aliases: ["cr 27", "cr27", "classroom 27", "ee cr 27", "ee room 27", "room 27"],
    description: "EE Department Classroom CR 27",
  },

  // CSE Department
  {
    id: "cse-cr-32",
    name: "CR 32",
    ownerDepartment: "CSE",
    groupKey: "cse_rooms",
    numbers: [32],
    aliases: ["cr 32", "cr32", "classroom 32", "cse cr 32", "cse room 32", "room 32"],
    description: "CSE Department Classroom CR 32",
  },
  {
    id: "cse-cr-33",
    name: "CR 33",
    ownerDepartment: "CSE",
    groupKey: "cse_rooms",
    numbers: [33],
    aliases: ["cr 33", "cr33", "classroom 33", "cse cr 33", "cse room 33", "room 33"],
    description: "CSE Department Classroom CR 33",
  },
  {
    id: "cse-cr-34",
    name: "CR 34",
    ownerDepartment: "CSE",
    groupKey: "cse_rooms",
    numbers: [34],
    aliases: ["cr 34", "cr34", "classroom 34", "cse cr 34", "cse room 34", "room 34"],
    description: "CSE Department Classroom CR 34",
  },
  {
    id: "cse-cr-35",
    name: "CR 35",
    ownerDepartment: "CSE",
    groupKey: "cse_rooms",
    numbers: [35],
    aliases: ["cr 35", "cr35", "classroom 35", "cse cr 35", "cse room 35", "room 35"],
    description: "CSE Department Classroom CR 35",
  },
  {
    id: "cse-cr-36",
    name: "CR 36",
    ownerDepartment: "CSE",
    groupKey: "cse_rooms",
    numbers: [36],
    aliases: ["cr 36", "cr36", "classroom 36", "cse cr 36", "cse room 36", "room 36"],
    description: "CSE Department Classroom CR 36",
  },
  {
    id: "cse-lec-hall",
    name: "Lec Hall CSE",
    ownerDepartment: "CSE",
    numbers: [],
    aliases: [
      "lec hall cse",
      "cse lec hall",
      "lecture hall cse",
      "cse lecture hall",
      "lec hall",
      "lecture hall",
    ],
    description: "CSE Department Lecture Hall",
  },

  // Library Department
  {
    id: "lib-main-room",
    name: "Library Main Room",
    ownerDepartment: "Library",
    numbers: [],
    aliases: [
      "library main room",
      "main library",
      "library",
      "libry",
      "libary",
      "librry",
      "lib",
      "reading hall",
      "main room",
    ],
    description: "Central Library Main Reading Room",
  },
  {
    id: "lib-internet-room",
    name: "Internet Room",
    ownerDepartment: "Library",
    numbers: [],
    aliases: ["internet room", "library internet room", "lib internet room"],
    description: "Library Internet & Research Terminal Room",
  },
  {
    id: "lib-conference-room",
    name: "Conference Room",
    ownerDepartment: "Library",
    numbers: [],
    aliases: ["conference room", "library conference room", "lib conference room"],
    description: "Library Discussion & Conference Room",
  },
  {
    id: "lib-male-study-room",
    name: "Male Study Room",
    ownerDepartment: "Library",
    groupKey: "lib_study_rooms",
    numbers: [],
    aliases: ["male study room", "boys study room", "library male study room"],
    description: "Library Male Study Room",
  },
  {
    id: "lib-female-study-room",
    name: "Female Study Room",
    ownerDepartment: "Library",
    groupKey: "lib_study_rooms",
    numbers: [],
    aliases: ["female study room", "girls study room", "library female study room"],
    description: "Library Female Study Room",
  },
  {
    id: "lib-ms-phd-room",
    name: "MS PhD Room",
    ownerDepartment: "Library",
    numbers: [],
    aliases: [
      "ms phd room",
      "ms/phd room",
      "phd room",
      "ms room",
      "library ms phd room",
    ],
    description: "Library MS & PhD Quiet Study Room",
  },

  // Cafeteria Department
  {
    id: "cafe-is",
    name: "IS Cafe",
    ownerDepartment: "Cafeteria",
    numbers: [],
    aliases: ["is cafe", "is cafeteria", "is canteen"],
    description: "IS Department Cafe & Refreshment Counter",
  },
  {
    id: "cafe-main-inner",
    name: "Main Cafe Inner",
    ownerDepartment: "Cafeteria",
    groupKey: "main_cafe",
    numbers: [],
    aliases: [
      "main cafe inner",
      "main cafeteria inner",
      "inner cafe",
      "main cafe inside",
      "inside main cafe",
    ],
    description: "Main Cafeteria Indoor Seating & Counter Area",
  },
  {
    id: "cafe-main-outer",
    name: "Main Cafe Outer",
    ownerDepartment: "Cafeteria",
    groupKey: "main_cafe",
    numbers: [],
    aliases: [
      "main cafe outer",
      "main cafeteria outer",
      "outer cafe",
      "main cafe outside",
      "outside main cafe",
    ],
    description: "Main Cafeteria Outdoor Seating Area",
  },

  // Labs Department
  {
    id: "lab-networking",
    name: "Networking Lab",
    ownerDepartment: "Labs",
    groupKey: "general_labs",
    numbers: [],
    aliases: ["networking lab", "network lab", "net lab", "networking laboratory"],
    description: "Computer Networking & Routing Laboratory",
  },
  {
    id: "lab-digital-design",
    name: "Digital Design Lab",
    ownerDepartment: "Labs",
    groupKey: "general_labs",
    numbers: [],
    aliases: [
      "digital design lab",
      "dd lab",
      "dld lab",
      "digital logic design lab",
    ],
    description: "Digital Logic & Hardware Design Laboratory",
  },
  {
    id: "lab-software-construction",
    name: "Software Construction Lab",
    ownerDepartment: "Labs",
    groupKey: "general_labs",
    numbers: [],
    aliases: ["software construction lab", "sc lab", "software lab"],
    description: "Software Construction & Engineering Laboratory",
  },
  {
    id: "lab-simulation",
    name: "Simulation Lab",
    ownerDepartment: "Labs",
    groupKey: "general_labs",
    numbers: [],
    aliases: ["simulation lab", "sim lab"],
    description: "Modeling & Simulation Laboratory",
  },
  {
    id: "lab-operating-system",
    name: "Operating System Lab",
    ownerDepartment: "Labs",
    groupKey: "general_labs",
    numbers: [],
    aliases: ["operating system lab", "operating systems lab", "os lab"],
    description: "Operating Systems & Kernel Computing Laboratory",
  },
  {
    id: "lab-database",
    name: "Database Lab",
    ownerDepartment: "Labs",
    groupKey: "general_labs",
    numbers: [],
    aliases: ["database lab", "db lab", "dbms lab"],
    description: "Database Management Systems Laboratory",
  },
];

export function getCampusLocationById(id: string): CampusLocation | undefined {
  return CAMPUS_LOCATIONS.find((loc) => loc.id === id);
}

export function getCampusRegistryPromptSummary(): string {
  return CAMPUS_LOCATIONS.map(
    (loc) => `- ${loc.id}: ${loc.name} (${loc.ownerDepartment})`
  ).join("\n");
}

const NUMBER_WORD_MAP: Record<string, number> = {
  ground: 0,
  zero: 0,
  ek: 1,
  one: 1,
  first: 1,
  "1st": 1,
  pehli: 1,
  pehla: 1,
  do: 2,
  two: 2,
  second: 2,
  "2nd": 2,
  dusri: 2,
  doosri: 2,
  dusra: 2,
  teen: 3,
  three: 3,
  third: 3,
  "3rd": 3,
  teesri: 3,
  teesra: 3,
  char: 4,
  chaar: 4,
  four: 4,
  fourth: 4,
  "4th": 4,
  chauthi: 4,
  paanch: 5,
  panch: 5,
  five: 5,
  fifth: 5,
  "5th": 5,
  chhe: 6,
  cheh: 6,
  six: 6,
  sixth: 6,
  "6th": 6,
  saat: 7,
  sat: 7,
  seven: 7,
  seventh: 7,
  "7th": 7,
  aath: 8,
  ath: 8,
  eight: 8,
  eighth: 8,
  "8th": 8,
  nau: 9,
  nine: 9,
  ninth: 9,
  "9th": 9,
  das: 10,
  ten: 10,
  tenth: 10,
  "10th": 10,
};

const NONEXISTENT_PLACE_PATTERNS: RegExp[] = [
  /\bswimming\s*pool\b/i,
  /\bhelipad\b/i,
  /\bhostel\b/i,
  /\bdorm(?:itory)?\b/i,
  /\bgym(?:nasium)?\b/i,
  /\bblock\s+z\b/i,
  /\bbuilding\s+d\b/i,
  /\bstarbucks\b/i,
  /\broof(?:top)?\b/i,
  /\bstadium\b/i,
  /\bserver\s+room\b/i,
];

const STOPWORDS = new Set([
  "in",
  "at",
  "on",
  "the",
  "a",
  "an",
  "of",
  "near",
  "inside",
  "outside",
  "floor",
  "manzil",
  "block",
  "building",
  "area",
]);

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/([a-z])(\d)/gi, "$1 $2")
    .replace(/(\d)(?!(?:st|nd|rd|th)\b)([a-z])/gi, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[n];
}

function fuzzyTokenMatches(mentionTok: string, targetTok: string): boolean {
  if (mentionTok === targetTok) return true;
  if (/\d/.test(mentionTok) || /\d/.test(targetTok)) return false;
  if (mentionTok.length < 4 || targetTok.length < 4) return false;
  const maxDist = Math.min(mentionTok.length, targetTok.length) >= 6 ? 2 : 1;
  return levenshtein(mentionTok, targetTok) <= maxDist;
}

function hasFuzzyWord(tokens: string[], targets: string[]): boolean {
  return tokens.some((tok) => targets.some((tgt) => fuzzyTokenMatches(tok, tgt)));
}

function tokenize(input: string): string[] {
  return normalizeText(input)
    .split(" ")
    .filter((t) => t.length > 0);
}

export function extractNumbersFromMention(rawMention: string): number[] {
  const norm = normalizeText(rawMention);
  const found = new Set<number>();

  const digitMatches = norm.match(/\b\d+(?:st|nd|rd|th)?\b/g) ?? [];
  for (const dm of digitMatches) {
    const parsed = Number.parseInt(dm, 10);
    if (!Number.isNaN(parsed)) {
      found.add(parsed);
    }
  }

  const tokens = norm.split(" ");
  for (const tok of tokens) {
    if (Object.prototype.hasOwnProperty.call(NUMBER_WORD_MAP, tok)) {
      found.add(NUMBER_WORD_MAP[tok]);
    }
  }

  return Array.from(found);
}

function detectExplicitDepartmentFilter(norm: string): Department | null {
  const toks = norm.split(" ").filter(Boolean);
  if (
    /\b(?:is\s+cafe|main\s+cafe|cafeteria|canteen|cafe|cafetaria|mess|food\s+court|dhaba)\b/.test(
      norm
    ) ||
    hasFuzzyWord(toks, ["cafeteria", "canteen", "cafetaria"])
  ) {
    return "Cafeteria";
  }
  if (
    /\b(?:cse|cs|computer\s+science|lec\s+hall|lecture\s+hall)\b/.test(norm) ||
    /\bcr\s+3[2-6]\b/.test(norm)
  ) {
    return "CSE";
  }
  if (
    /\b(?:ee|electrical)\b/.test(norm) ||
    /\bcr\s+2[0-7]\b/.test(norm) ||
    hasFuzzyWord(toks, ["electrical"])
  ) {
    return "EE";
  }
  if (
    /\b(?:is\s+(?:1|2|3|4|215|ek|do|teen|char|one|two|three|four|room|rooms|class|parking|dept|department)|information\s+systems|ns\s+auditorium|ns\s+audi|ns\s+hall|qasid(?:\s+complex|\s+block)?)\b/.test(
      norm
    )
  ) {
    return "IS";
  }
  if (
    /\b(?:library|libry|libary|librry|lib|reading\s+room|reading\s+hall|study\s+room|internet\s+room|conference\s+room|ms\s+phd\s+room|phd\s+room)\b/.test(
      norm
    ) ||
    hasFuzzyWord(toks, ["library", "conference"])
  ) {
    return "Library";
  }
  if (
    /\b(?:networking|network|digital\s+design|dld|dd|software\s+construction|software|simulation|sim|operating\s+systems?|os|database|dbms|db|sc)\s+lab\b/.test(
      norm
    ) ||
    hasFuzzyWord(toks, ["networking", "digital", "software", "simulation", "operating", "database"])
  ) {
    return "Labs";
  }
  return null;
}

function detectFamilySuggestions(
  norm: string,
  explicitDept: Department | null
): {
  groupKey?: string;
  candidates: CampusLocation[];
  ambiguousLabel?: string;
} {
  if (/\b(?:ee|electrical)\s+(?:class)?rooms?\b/.test(norm) || /\bee\s+crs?\b/.test(norm)) {
    return {
      groupKey: "ee_rooms",
      candidates: CAMPUS_LOCATIONS.filter((l) => l.groupKey === "ee_rooms"),
      ambiguousLabel: "EE Classrooms (CR 20-27)",
    };
  }
  if (/\b(?:cse|cs)\s+(?:class)?rooms?\b/.test(norm) || /\bcse\s+crs?\b/.test(norm)) {
    return {
      groupKey: "cse_rooms",
      candidates: CAMPUS_LOCATIONS.filter((l) => l.groupKey === "cse_rooms"),
      ambiguousLabel: "CSE Classrooms (CR 32-36)",
    };
  }
  if (/\bis\s+(?:class)?rooms?\b/.test(norm)) {
    return {
      groupKey: "is_rooms",
      candidates: CAMPUS_LOCATIONS.filter((l) => l.groupKey === "is_rooms"),
      ambiguousLabel: "IS Classrooms",
    };
  }
  if (
    /\bstudy\s+rooms?\b/.test(norm) &&
    !/\b(?:male|female|boys|girls)\b/.test(norm)
  ) {
    return {
      groupKey: "lib_study_rooms",
      candidates: CAMPUS_LOCATIONS.filter((l) => l.groupKey === "lib_study_rooms"),
      ambiguousLabel: "Library Study Rooms",
    };
  }
  if (
    /\bmain\s+cafe(?:teria)?\b/.test(norm) &&
    !/\b(?:inner|inside|outer|outside)\b/.test(norm)
  ) {
    return {
      groupKey: "main_cafe",
      candidates: CAMPUS_LOCATIONS.filter((l) => l.groupKey === "main_cafe"),
      ambiguousLabel: "Main Cafe (Inner / Outer)",
    };
  }
  if (
    /\b(?:cafeteria|canteen|cafe|cafetaria)\b/.test(norm) &&
    !/\b(?:is|main|inner|inside|outer|outside)\b/.test(norm)
  ) {
    return {
      candidates: CAMPUS_LOCATIONS.filter((l) => l.ownerDepartment === "Cafeteria"),
      ambiguousLabel: "Cafeteria Locations",
    };
  }
  const hasSpecificLabKeyword =
    /\b(?:networking|network|net|digital|dd|dld|software|construction|sc|simulation|sim|operating|os|database|db|dbms)\b/.test(
      norm
    );
  if (/\blabs?\b/.test(norm) && !hasSpecificLabKeyword) {
    return {
      groupKey: "general_labs",
      candidates: CAMPUS_LOCATIONS.filter((l) => l.groupKey === "general_labs"),
      ambiguousLabel: "Campus Labs",
    };
  }
  if (
    /\b(?:crs?|class\s*rooms?|rooms?)\b/.test(norm) &&
    !/\b(?:study|internet|conference|ms|phd|main|lec|lecture)\b/.test(norm)
  ) {
    const rooms = CAMPUS_LOCATIONS.filter(
      (l) =>
        l.groupKey === "cse_rooms" ||
        l.groupKey === "ee_rooms" ||
        l.groupKey === "is_rooms"
    );
    return {
      candidates: rooms,
      ambiguousLabel: "Campus Classrooms",
    };
  }
  if (explicitDept) {
    return {
      candidates: CAMPUS_LOCATIONS.filter((l) => l.ownerDepartment === explicitDept),
    };
  }
  return { candidates: [] };
}

function getLocationSearchTokens(loc: CampusLocation): Set<string> {
  const parts = [loc.name, ...loc.aliases, loc.ownerDepartment.toLowerCase()];
  const tokens = new Set<string>();
  for (const part of parts) {
    for (const t of tokenize(part)) {
      if (!STOPWORDS.has(t)) {
        tokens.add(t);
      }
    }
  }
  return tokens;
}

function hasMeaningfulLexicalOverlap(rawMention: string, loc: CampusLocation): boolean {
  const mentionTokens = tokenize(rawMention).filter((t) => !STOPWORDS.has(t));
  if (mentionTokens.length === 0) return false;
  const locTokens = Array.from(getLocationSearchTokens(loc));
  return mentionTokens.some((mt) =>
    locTokens.some((lt) => fuzzyTokenMatches(mt, lt))
  );
}

function matchesBuildingAndTypeKeywords(
  normMention: string,
  loc: CampusLocation,
  explicitDept: Department | null
): boolean {
  if (explicitDept && loc.ownerDepartment !== explicitDept) {
    return false;
  }
  const toks = normMention.split(" ").filter(Boolean);

  if (/\bcr\b/.test(normMention) && loc.groupKey !== "ee_rooms" && loc.groupKey !== "cse_rooms") {
    return false;
  }
  if (/\bis\s+\d+/.test(normMention) && loc.groupKey !== "is_rooms") {
    return false;
  }
  if (
    /\b(?:class)?room\b/.test(normMention) &&
    !/\b(?:study|internet|conference|ms|phd|main)\b/.test(normMention)
  ) {
    const isClassroom =
      loc.groupKey === "ee_rooms" ||
      loc.groupKey === "cse_rooms" ||
      loc.groupKey === "is_rooms" ||
      loc.name.toLowerCase().includes("room");
    if (!isClassroom) return false;
  }
  if (/\bstudy\b/.test(normMention) && loc.groupKey !== "lib_study_rooms") {
    return false;
  }
  if (/\binternet\b/.test(normMention) && loc.id !== "lib-internet-room") {
    return false;
  }
  if (/\bconference\b/.test(normMention) && loc.id !== "lib-conference-room") {
    return false;
  }
  if (/\b(?:ms|phd)\b/.test(normMention) && loc.id !== "lib-ms-phd-room") {
    return false;
  }
  if (/\b(?:lec|lecture)\b/.test(normMention) && loc.id !== "cse-lec-hall") {
    return false;
  }
  if (/\b(?:auditorium|audi)\b/.test(normMention) && loc.id !== "ns-auditorium") {
    return false;
  }
  if (/\bqasid\b/.test(normMention) && loc.id !== "qasid-complex") {
    return false;
  }
  if (/\bparking\b/.test(normMention) && loc.id !== "is-parking") {
    return false;
  }
  if (/\b(?:inner|inside)\b/.test(normMention) && loc.id !== "cafe-main-inner") {
    return false;
  }
  if (/\b(?:outer|outside)\b/.test(normMention) && loc.id !== "cafe-main-outer") {
    return false;
  }
  if (
    (/\b(?:networking|network|net)\b/.test(normMention) ||
      hasFuzzyWord(toks, ["networking", "network"])) &&
    loc.id !== "lab-networking"
  ) {
    return false;
  }
  if (
    (/\b(?:digital|dd|dld)\b/.test(normMention) ||
      hasFuzzyWord(toks, ["digital", "design"])) &&
    loc.id !== "lab-digital-design"
  ) {
    return false;
  }
  if (
    (/\b(?:software|construction|sc)\b/.test(normMention) ||
      hasFuzzyWord(toks, ["software", "construction"])) &&
    loc.id !== "lab-software-construction"
  ) {
    return false;
  }
  if (
    (/\b(?:simulation|sim)\b/.test(normMention) ||
      hasFuzzyWord(toks, ["simulation"])) &&
    loc.id !== "lab-simulation"
  ) {
    return false;
  }
  if (
    (/\b(?:operating|os)\b/.test(normMention) ||
      hasFuzzyWord(toks, ["operating"])) &&
    loc.id !== "lab-operating-system"
  ) {
    return false;
  }
  if (
    (/\b(?:database|db|dbms)\b/.test(normMention) ||
      hasFuzzyWord(toks, ["database"])) &&
    loc.id !== "lab-database"
  ) {
    return false;
  }

  return hasMeaningfulLexicalOverlap(normMention, loc);
}

export function resolveCampusLocation(
  rawMention: string,
  aiMatchedLocationId?: string | null
): LocationResolution {
  const mention = (rawMention ?? "").trim();
  const norm = normalizeText(mention);

  if (
    !norm ||
    norm === "none" ||
    norm === "unknown" ||
    norm === "unspecified" ||
    norm === "not mentioned" ||
    norm === "n a"
  ) {
    return {
      status: "MISSING",
      candidates: [],
      reason: "No campus location was mentioned.",
      extractedMention: "",
    };
  }

  for (const pattern of NONEXISTENT_PLACE_PATTERNS) {
    if (pattern.test(mention)) {
      return {
        status: "NONEXISTENT",
        candidates: [],
        reason: `"${mention}" does not exist in the campus location registry.`,
        extractedMention: mention,
      };
    }
  }

  const extractedNumbers = extractNumbersFromMention(mention);
  const explicitDept = detectExplicitDepartmentFilter(norm);
  const familyInfo = detectFamilySuggestions(norm, explicitDept);

  if (extractedNumbers.length > 0) {
    const exactMatches = CAMPUS_LOCATIONS.filter(
      (loc) =>
        loc.numbers.length > 0 &&
        extractedNumbers.every((n) => loc.numbers.includes(n)) &&
        matchesBuildingAndTypeKeywords(norm, loc, explicitDept)
    );

    if (exactMatches.length === 1) {
      return {
        status: "MATCHED",
        location: exactMatches[0],
        candidates: [],
        reason: `Matched "${mention}" to ${exactMatches[0].name} (number & room verified).`,
        extractedMention: mention,
      };
    }

    if (exactMatches.length > 1) {
      if (aiMatchedLocationId) {
        const aiLoc = exactMatches.find((l) => l.id === aiMatchedLocationId);
        if (aiLoc) {
          return {
            status: "MATCHED",
            location: aiLoc,
            candidates: [],
            reason: `Matched "${mention}" to ${aiLoc.name}.`,
            extractedMention: mention,
          };
        }
      }
      return {
        status: "AMBIGUOUS",
        candidates: exactMatches,
        reason: `Multiple campus locations match "${mention}". Please select the exact room.`,
        extractedMention: mention,
      };
    }

    const fallbackSuggestions =
      familyInfo.candidates.length > 0
        ? familyInfo.candidates
        : CAMPUS_LOCATIONS.filter((l) => l.numbers.length > 0).slice(0, 6);

    return {
      status: "NONEXISTENT",
      candidates: fallbackSuggestions,
      reason: `No campus location matching "${mention}" (number ${extractedNumbers.join(", ")}) exists in the registry.`,
      extractedMention: mention,
    };
  }

  if (familyInfo.ambiguousLabel && familyInfo.candidates.length > 1) {
    return {
      status: "AMBIGUOUS",
      candidates: familyInfo.candidates,
      reason: `"${mention}" is ambiguous across multiple ${familyInfo.ambiguousLabel}. Please pick the specific location.`,
      extractedMention: mention,
    };
  }

  const exactTextMatch = CAMPUS_LOCATIONS.find((loc) => {
    if (loc.numbers.length > 0) return false;
    if (normalizeText(loc.name) === norm) return true;
    return loc.aliases.some((alias) => normalizeText(alias) === norm);
  });

  if (exactTextMatch) {
    return {
      status: "MATCHED",
      location: exactTextMatch,
      candidates: [],
      reason: `Matched "${mention}" directly to ${exactTextMatch.name}.`,
      extractedMention: mention,
    };
  }

  if (aiMatchedLocationId) {
    const aiLoc = getCampusLocationById(aiMatchedLocationId);
    if (
      aiLoc &&
      aiLoc.numbers.length === 0 &&
      matchesBuildingAndTypeKeywords(norm, aiLoc, explicitDept)
    ) {
      return {
        status: "MATCHED",
        location: aiLoc,
        candidates: [],
        reason: `Matched "${mention}" to ${aiLoc.name}.`,
        extractedMention: mention,
      };
    }
  }

  const mentionTokens = tokenize(mention).filter((t) => !STOPWORDS.has(t));
  let bestScore = 0;
  let bestMatches: CampusLocation[] = [];

  for (const loc of CAMPUS_LOCATIONS) {
    if (loc.numbers.length > 0) continue;
    if (!matchesBuildingAndTypeKeywords(norm, loc, explicitDept)) continue;

    const locTokens = Array.from(getLocationSearchTokens(loc));
    let score = 0;
    for (const tok of mentionTokens) {
      if (locTokens.includes(tok)) {
        score += 1;
      } else if (locTokens.some((lt) => fuzzyTokenMatches(tok, lt))) {
        score += 0.8;
      }
    }
    if (
      loc.aliases.some((a) => norm.includes(normalizeText(a))) ||
      norm.includes(normalizeText(loc.name))
    ) {
      score += 2;
    } else if (
      loc.aliases.some((a) => {
        const na = normalizeText(a);
        return (
          !na.includes(" ") &&
          mentionTokens.some((mt) => fuzzyTokenMatches(mt, na))
        );
      })
    ) {
      score += 1.5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatches = [loc];
    } else if (Math.abs(score - bestScore) < 0.01 && score > 0) {
      bestMatches.push(loc);
    }
  }

  if (bestMatches.length === 1 && bestScore >= 0.75) {
    return {
      status: "MATCHED",
      location: bestMatches[0],
      candidates: [],
      reason: `Matched "${mention}" to ${bestMatches[0].name}.`,
      extractedMention: mention,
    };
  }

  if (bestMatches.length > 1) {
    return {
      status: "AMBIGUOUS",
      candidates: bestMatches,
      reason: `"${mention}" matches multiple campus locations. Please choose one.`,
      extractedMention: mention,
    };
  }

  return {
    status: "NONEXISTENT",
    candidates: familyInfo.candidates.slice(0, 6),
    reason: `"${mention}" could not be matched to any known campus location.`,
    extractedMention: mention,
  };
}
