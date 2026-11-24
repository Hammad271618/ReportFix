import { randomUUID } from "crypto";
import { CAMPUS_LOCATIONS } from "./campus-registry";
import type {
  ClientStatePayload,
  DatabaseState,
  FactualImpact,
  HazardType,
  HeldBrigadeAction,
  Issue,
  PriorityLevel,
  ProblemCategory,
  SecurityAlert,
  User,
  VotingProgress,
} from "./types";

export interface DirectiveSpan {
  start: number;
  end: number;
  kind: "rule_override" | "priority_hijack";
  text: string;
}

export interface SafetyKeywordMatch {
  keyword: string;
  index: number;
  insideDirective: boolean;
}

export interface PreScreenResult {
  directiveSpans: DirectiveSpan[];
  hasRuleOverrideAttack: boolean;
  hasPriorityHijackDirective: boolean;
  safetyKeywordMatches: SafetyKeywordMatch[];
  harassmentKeywordMatched: boolean;
  toneManipulationNote?: string;
}

const CATEGORY_LABELS: Record<ProblemCategory, string> = {
  electrical_fire_hazard: "Electrical / Fire Hazard",
  gas_leak: "Gas Leak",
  medical_emergency: "Medical Emergency",
  structural_hazard: "Structural Hazard",
  harassment_ragging: "Harassment / Ragging",
  hvac_ac: "HVAC / Air Conditioning",
  wifi_network: "Wi-Fi / Network",
  projector_av: "Projector / AV Equipment",
  lab_equipment: "Lab Equipment",
  power_lighting: "Power / Lighting",
  food_hygiene: "Food & Hygiene",
  plumbing_water: "Plumbing / Water",
  cleanliness_furniture: "Cleanliness / Furniture",
  other: "Other Campus Issue",
};

export function formatCategoryLabel(category: ProblemCategory): string {
  return CATEGORY_LABELS[category] ?? "Campus Issue";
}

export function getTrustWeight(score: number): number {
  if (score >= 80) return 1.0;
  if (score >= 60) return 0.8;
  if (score >= 45) return 0.55;
  if (score >= 25) return 0.35;
  return 0.15;
}

export function getTrustTierLabel(score: number): string {
  if (score >= 80) return "Trusted";
  if (score >= 60) return "Standard";
  if (score >= 45) return "Developing";
  if (score >= 25) return "Low trust";
  return "Restricted";
}

export function buildTrustExplanation(user: User): string {
  if (user.role === "staff") {
    return `${user.department ?? "Department"} staff account (fixed 100 standing for queue moderation).`;
  }
  if (user.role === "admin") {
    return "University Registrar Admin account (fixed 100 oversight standing).";
  }

  const tier = getTrustTierLabel(user.trustScore);
  const weight = getTrustWeight(user.trustScore).toFixed(2);
  const starter =
    user.id.startsWith("stu-new-") ||
    user.trustHistory.some((h) => h.newScore === 35 && h.delta === 0)
      ? 35
      : 60;

  const nonZeroEvents = user.trustHistory.filter((h) => h.delta !== 0);
  if (nonZeroEvents.length === 0) {
    if (starter === 35) {
      return `Brand-new account starter score 35${
        user.isNewAccount ? " (new-account burst guard active)" : ""
      } with no verified history yet -> ${user.trustScore} (${tier}, ${weight}x weight).`;
    }
    return `Established campus student baseline 60 with no penalties or bonuses recorded -> ${user.trustScore} (${tier}, ${weight}x weight).`;
  }

  const netDelta = nonZeroEvents.reduce((sum, ev) => sum + ev.delta, 0);
  const netStr = netDelta >= 0 ? `+${netDelta}` : `${netDelta}`;
  const recentReasons = nonZeroEvents
    .slice(0, 3)
    .map((ev) => `${ev.reason} (${ev.delta > 0 ? `+${ev.delta}` : ev.delta})`)
    .join("; ");
  const moreCount = nonZeroEvents.length > 3 ? ` (+${nonZeroEvents.length - 3} earlier)` : "";

  return `Started at ${starter} ${starter === 35 ? "starter" : "baseline"}; net ${netStr}: ${recentReasons}${moreCount} -> ${user.trustScore} (${tier}, ${weight}x weight).`;
}

export function adjustTrustScore(
  db: DatabaseState,
  userId: string,
  delta: number,
  reason: string,
  issueId?: string
): void {
  const user = db.users.find((u) => u.id === userId);
  if (!user) return;
  const newScore = Math.max(0, Math.min(100, user.trustScore + delta));
  user.trustScore = newScore;
  user.trustHistory.unshift({
    id: `te-${randomUUID().slice(0, 8)}`,
    timestamp: new Date().toISOString(),
    delta,
    newScore,
    reason,
    ...(issueId ? { issueId } : {}),
  });
}

const RULE_OVERRIDE_PATTERNS: RegExp[] = [
  /\bignore\s+(?:all\s+|previous\s+|prior\s+|your\s+|the\s+|system\s+)*(?:rules|instructions|prompts?|guidelines|policies)\b/gi,
  /\bsystem\s+prompt\b/gi,
  /\b(?:act|behave|pretend)\s+as\s+(?:an?\s+)?(?:admin|staff|system|moderator|root)\b/gi,
  /\boverride\s+(?:the\s+|all\s+)?(?:priority|rules|status|system)\b/gi,
  /\breveal\s+(?:the\s+|all\s+)?(?:reporter|confidential|hidden|identity|user)\b/gi,
  /\brules\s+bhool\s+jao\b/gi,
  /\binstructions\s+ignore\s+karo\b/gi,
  /\b(?:forget|disregard)\s+(?:all\s+|previous\s+|prior\s+|your\s+)*(?:rules|instructions|prompts?)\b/gi,
];

const PRIORITY_HIJACK_PATTERNS: RegExp[] = [
  /\b(?:mark|set|classify|label|make|treat|flag|put|upgrade|assign)\s+(?:me|this|it|the\s+report|report|the\s+issue|issue|priority)\s+(?:(?:as|to|like|at)\s+)?(?:an?\s+)?(?:critical|high(?:\s+priority)?|urgent|fire\s+hazard|emergency|safety\s+hazard|p0|p1)(?:\s+(?:and|or)\s+(?:as\s+)?(?:an?\s+)?(?:critical|high(?:\s+priority)?|urgent|fire\s+hazard|emergency|safety\s+hazard|p0|p1))*\b/gi,
  /\bforce\s+(?:priority|status)\s+(?:to\s+)?(?:an?\s+)?(?:critical|high|urgent|fire\s+hazard)\b/gi,
];

const SAFETY_KEYWORDS: string[] = [
  "electrical fire",
  "fire hazard",
  "short circuit",
  "burning smell",
  "jalne ki boo",
  "gas ki boo",
  "gas leak",
  "gas smell",
  "electric shock",
  "current lag",
  "live wire",
  "nangi taar",
  "ceiling collapse",
  "chemical spill",
  "medical emergency",
  "medical issue",
  "medical help",
  "breathing problem",
  "breathing difficulty",
  "chest pain",
  "stomach ache",
  "sore throat",
  "tabiyat kharab",
  "tabiat kharab",
  "tabiyat kharaab",
  "tabiat kharaab",
  "sir main dard",
  "sir mein dard",
  "sar main dard",
  "sar mein dard",
  "pet mein dard",
  "pet main dard",
  "unconscious",
  "fainted",
  "fainting",
  "bleeding",
  "seizure",
  "stomachache",
  "headache",
  "migraine",
  "vomiting",
  "dizziness",
  "fracture",
  "injured",
  "injury",
  "asthma",
  "allergy",
  "allergic",
  "medical",
  "fever",
  "bukhar",
  "bukhaar",
  "chakkar",
  "dizzy",
  "vomit",
  "ulti",
  "ultiyan",
  "nausea",
  "sardard",
  "sir dard",
  "sar dard",
  "pet dard",
  "bimar",
  "bimaar",
  "unwell",
  "sick",
  "sparking",
  "chingari",
  "flames",
  "sparks",
  "spark",
  "smoke",
  "dhuaan",
  "behosh",
  "khoon",
  "fire",
  "aag",
];

const HARASSMENT_REGEX =
  /\b(?:harass\w*|ragging|stalk\w*|molest\w*|bully\w*|bullied|bullies|sexual\w*|inappropriate\s+touch\w*|intimidat\w*|threaten\w*|blackmail\w*|verbal\s+abuse|physical\s+abuse|abusing\s+(?:me|us|students?|freshers?)|badtameezi|cherkhaani|tang\s+kar\s+rahe|tang\s+kr\s+rahe|tang\s+kar\s+rha|tang\s+kar\s+rhi)\b/i;

const FACILITY_EQUIPMENT_OR_HAZARD_REGEX =
  /\b(?:ac|a\.c\.|air\s*condition\w*|cooling|hvac|thermostat|wifi|wi-fi|wify|internet|network|netwrk|router|lms|portal|proj[eo]ct[eo]?r?|projektr|hdmi|mic|microphone|speaker|water\s*cooler|dispenser|flush|plumbing|drain|bulb|tube\s*light|socket|outlet|switch|live\s+wire|nangi\s+taar|bijli|pankha|oscilloscope|microscope|printer|lab\s+equipment|kursi|dustbin|whiteboard|cockroach|stale|expired|fire\s+hazard|electrical\s+fire|sparks?|sparking|chingari|flames|smoke|dhuaan|gas\s*leak|gas\s+ki\s+boo|gas\s+smell|short\s+circuit|electric\s+shock|current\s+lag|chemical\s+spill|ceiling\s+collapse)\b/i;

const WASHROOM_FACILITY_DEFECT_REGEX =
  /\b(?:washroom|toilet|restroom|bathroom)\b[\s\S]{0,60}\b(?:water|pani|paani|flush|clog\w*|block\w*|overflow\w*|leak\w*|dirty|ganda|gandi|gandagi|smell\w*|stink\w*|boo|broken|kharab|kharaab|toot\w*|door|lock|tap|sink|light|bulb|clean\w*|tissue|soap|not\s+working|band|nhi|nahi)\b|\b(?:water|pani|paani|flush|clog\w*|block\w*|overflow\w*|leak\w*|dirty|ganda|gandi|gandagi|smell\w*|stink\w*|boo|broken|kharab|kharaab|toot\w*|door|lock|tap|sink|light|bulb|clean\w*|tissue|soap|not\s+working|band)\b[\s\S]{0,60}\b(?:washroom|toilet|restroom|bathroom)\b/i;

const FACILITY_DEFECT_STATE_REGEX =
  /\b(?:broken|broke|not\s+working|doesn'?t\s+work|doesnt\s+work|isn'?t\s+working|isnt\s+working|chal\s+nhi|chal\s+nahi|damaged|flicker\w*|dim|slow|down|disconnect\w*|clog\w*|block\w*|overflow\w*|leak\w*|dirty|ganda|gandi|dusty|smell\w*|stink\w*|cockroach\w*|stale|expired|loose|wobbly|squeak\w*|torn|missing|no\s+water|no\s+power|no\s+light|fix|repair|sparks?|sparking|chingari|smoke|dhuaan|gas\s*leak|short\s+circuit|electric\s+shock|collapse\w*|spill|kharab|kharaab|band\s+hai|band\s+ho\s+gaya)\b/i;

const FACILITY_TARGET_NOUN_REGEX =
  /\b(?:ac|fan|pankha|light|bulb|power|chair|kursi|table|desk|bench|door|window|lock|ceiling|roof|wall|floor|stairs|elevator|lift|tap|sink|pipe|washroom|toilet|pc|computer|keyboard|mouse|monitor|screen|display|audio|books?|food|khana|plate|plates|water|pani|paani|garbage|trash|heater|projector|wifi|router)\b/i;

const MEDICAL_ISSUE_REGEX =
  /\b(?:medical(?:\s+(?:issue|emergency|help|attention|aid))?|first\s+aid|ambulance|clinic|unconscious|faint(?:ed|ing)?|seizure|bleed(?:ing)?|khoon|behosh|fracture|sprain|injur(?:y|ed)|wound|chot|zakhm|asthma|allergy|allergic|breath(?:ing)?\s+(?:issue|problem|difficulty|trouble)|chest\s+pain|choking|heat\s*stroke|dehydrat\w*|headache|migraine|stomach\s*ache|stomachache|belly\s*ache|tummy\s*ache|back\s*ache|backache|tooth\s*ache|toothache|ear\s*ache|earache|body\s*ache|sore\s*throat|fever|flu|nausea|nauseous|dizzy|dizziness|vomit(?:ing)?|diarrhea|constipation|loose\s+motions?|cramps|bukhar|bukhaar|zukaam|zukam|khansi|khaansi|chakkar|ulti|ultiyan|matli|bimar|bimaar|unwell|sick|ill|not\s+feeling\s+well|(?:sir|sar)\s+(?:main|mein|me|m)?\s*dard|(?:sir|sar)dard|(?:pet|pait|kamar|dant|daant|gala|seena|dil|taang|tang|paon|pair|hath|haath|badan|jism|ankh|aankh|kaan)\s+(?:main|mein|me|m)?\s*(?:dard|takleef)|dard\s+(?:ho\s*r(?:ha|aha|hi|ahi)|hai|h)|(?:tabiyat|tabiat)\s+(?:kharab|kharaab|theek\s+nahi|sahi\s+nahi)|(?:my|mere|meri|mera)\s+(?:head|stomach|tummy|belly|back|neck|shoulder|leg|arm|hand|foot|feet|knee|tooth|teeth|throat|ear|eye|eyes|body|sir|sar|pet|pait)\s+(?:is\s+)?(?:hurt(?:s|ing)?|ach(?:e|es|ing)|pain(?:ing|ful)?|sore|swollen))\b/i;

const PERSONAL_HEALTH_STATE_REGEX =
  /\b(?:mood|neend)\s+(?:kharab|kharaab|theek\s+nahi|sahi\s+nahi|upset)\b/i;

const PERSONAL_NON_FACILITY_PATTERNS: RegExp[] = [
  PERSONAL_HEALTH_STATE_REGEX,
  /\b(?:bhook|bhuk|pyaas|pyas|thakan|neend|hangover)\b/i,
  /\b(?:i\s+am|i'?m|im|i\s+feel|feeling|mujhe|mujh\s+ko|mjhe|mjhy)\s+(?:feeling\s+)?(?:tired|exhausted|sleepy|hungry|thirsty|bored|sad|depressed|lonely|anxious|stressed)\b/i,
  // Personal bodily urges / bathroom needs (not facility defects)
  /\b(?:tatti|tatty|potty|potti|susu|su\s*su|peshab|peshaab|hajat|poop|pee|shit|crap|fart)\b/i,
  /\b(?:need|have|got|gotta|want)\s+to\s+(?:use\s+(?:the\s+)?(?:washroom|bathroom|toilet|restroom)|go\s+(?:to\s+(?:the\s+)?)?(?:washroom|bathroom|toilet|restroom))\b/i,
  /\b(?:washroom|bathroom|toilet)\s+(?:jana|jaana|aa\s*r(?:ha|aha|hi|ahi))\b/i,
  // Personal relationship, family, academic, financial, or lost-item issues
  /\b(?:break\s*up|broke\s+up|girlfriend|boyfriend|heartbreak|dil\s+toot)\b/i,
  /\b(?:family\s+(?:issue|problem|matter)|personal\s+(?:issue|problem|matter|reason)|meri\s+zindagi|tension\s+ho\s*r(?:hi|ahi)|udasi)\b/i,
  /\b(?:failed\s+(?:my|the)\s+(?:exam|quiz|test|course)|homework\s+is\s+hard|assignment\s+(?:is\s+hard|nahi\s+ho\s+rha)|missed\s+(?:my|the)\s+bus|woke\s+up\s+late)\b/i,
  /\b(?:i\s+)?(?:forgot|lost|misplaced)\s+my\s+(?:pen|pencil|notebook|book|bag|wallet|keys?|phone|charger|id\s+card|bottle)\b/i,
  /\b(?:need\s+money|paise\s+(?:chahiye|khatam))\b/i,
];

export function hasMedicalIssueSignal(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return MEDICAL_ISSUE_REGEX.test(trimmed);
}

export function hasFacilityDefectSignal(text: string): boolean {
  const withoutPersonalHealth = text.replace(PERSONAL_HEALTH_STATE_REGEX, " ");
  if (WASHROOM_FACILITY_DEFECT_REGEX.test(withoutPersonalHealth)) {
    return true;
  }
  if (FACILITY_EQUIPMENT_OR_HAZARD_REGEX.test(withoutPersonalHealth)) {
    return true;
  }
  return (
    FACILITY_TARGET_NOUN_REGEX.test(withoutPersonalHealth) &&
    FACILITY_DEFECT_STATE_REGEX.test(withoutPersonalHealth)
  );
}

export function isPersonalNonFacilityIssue(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (HARASSMENT_REGEX.test(trimmed)) return false;
  if (hasMedicalIssueSignal(trimmed)) return false;
  if (hasFacilityDefectSignal(trimmed)) return false;
  return PERSONAL_NON_FACILITY_PATTERNS.some((pat) => pat.test(trimmed));
}

export function hasActionableFacilityOrHarassmentSignal(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (HARASSMENT_REGEX.test(trimmed)) return true;
  if (hasMedicalIssueSignal(trimmed)) return true;
  if (isPersonalNonFacilityIssue(trimmed)) return false;
  if (hasFacilityDefectSignal(trimmed)) return true;
  return (
    FACILITY_DEFECT_STATE_REGEX.test(trimmed) &&
    !/\b(?:mood|neend|tatti|potty|susu|peshab)\b/i.test(trimmed)
  );
}

function spansOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasExcessiveCaps(rawText: string): boolean {
  const letters = rawText.replace(/[^a-zA-Z]/g, "");
  if (letters.length >= 12) {
    const upper = letters.replace(/[^A-Z]/g, "").length;
    if (upper / letters.length > 0.5) return true;
  }
  const shoutWords = rawText.match(/\b[A-Z]{4,}\b/g) ?? [];
  const filteredShoutWords = shoutWords.filter(
    (w) => !["WIFI", "HDMI", "HVAC", "AC", "LAB", "CSE", "LMS"].includes(w)
  );
  return filteredShoutWords.length >= 2;
}

export function preScreenRawText(rawText: string): PreScreenResult {
  const directiveSpans: DirectiveSpan[] = [];

  for (const regex of RULE_OVERRIDE_PATTERNS) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(rawText)) !== null) {
      directiveSpans.push({
        start: match.index,
        end: match.index + match[0].length,
        kind: "rule_override",
        text: match[0],
      });
    }
  }

  for (const regex of PRIORITY_HIJACK_PATTERNS) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(rawText)) !== null) {
      directiveSpans.push({
        start: match.index,
        end: match.index + match[0].length,
        kind: "priority_hijack",
        text: match[0],
      });
    }
  }

  const hasRuleOverrideAttack = directiveSpans.some((s) => s.kind === "rule_override");
  const hasPriorityHijackDirective = directiveSpans.some((s) => s.kind === "priority_hijack");

  const safetyKeywordMatches: SafetyKeywordMatch[] = [];
  const coveredIntervals: Array<{ start: number; end: number }> = [];

  for (const kw of SAFETY_KEYWORDS) {
    const kwRegex = new RegExp(`\\b${escapeRegExp(kw)}\\b`, "gi");
    let match: RegExpExecArray | null;
    while ((match = kwRegex.exec(rawText)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (coveredIntervals.some((iv) => spansOverlap(start, end, iv.start, iv.end))) {
        continue;
      }
      coveredIntervals.push({ start, end });
      const insideDirective = directiveSpans.some((d) =>
        spansOverlap(start, end, d.start, d.end)
      );
      safetyKeywordMatches.push({
        keyword: match[0],
        index: start,
        insideDirective,
      });
    }
  }

  const harassmentKeywordMatched = HARASSMENT_REGEX.test(rawText);

  const hasExclamationFlood = /!{3,}/.test(rawText);
  const hasUrgencyWords = /\b(?:urgent|asap)\b/i.test(rawText) || /\bEMERGENCY\b/.test(rawText);
  const toneManipulationNote =
    hasExclamationFlood || hasUrgencyWords || hasExcessiveCaps(rawText)
      ? "Ignored shouting / urgency wording per Impact-over-Tone rule."
      : undefined;

  return {
    directiveSpans,
    hasRuleOverrideAttack,
    hasPriorityHijackDirective,
    safetyKeywordMatches,
    harassmentKeywordMatched,
    toneManipulationNote,
  };
}

const FIGURATIVE_JOKE_PATTERNS: RegExp[] = [
  /\b(?:lol|lmao|rofl|haha|hehe|jk|just\s+kidding|kidding|metaphorically|figuratively|joking|sarcasm|not\s+literally)\b/i,
  /\bso\s+(?:slow|bad|terrible|horrible|laggy|awful|hot)\s+(?:it'?s|its|it\s+is)\s+(?:basically\s+|literally\s+)?a\s+fire\s+hazard\b/i,
  /\bno\s+(?:fire|smoke|sparks?|gas\s+leak|bleeding)\b/i,
  /\bfire\s+safety\s+(?:poster|drill|sign|brochure|notice|alarm\s+test)\b/i,
  /\b(?:biryani|food|chai|pizza|burger|song|track|meme)\s+(?:is\s+|bhi\s+)?(?:fire|lit)\b/i,
  /\bfire\s+hai\b/i,
];

export function verifySafetyEvidence(
  rawText: string,
  quote: string | undefined,
  directiveSpans: Array<{ start: number; end: number }>
): { valid: boolean; cleanQuote?: string } {
  const trimmed = (quote ?? "").trim();
  if (trimmed.length < 3) {
    return { valid: false };
  }

  const lowerRaw = rawText.toLowerCase();
  const lowerQuote = trimmed.toLowerCase();
  let searchFrom = 0;

  while (searchFrom < lowerRaw.length) {
    const idx = lowerRaw.indexOf(lowerQuote, searchFrom);
    if (idx === -1) break;
    const end = idx + lowerQuote.length;

    const overlapsDirective = directiveSpans.some((span) =>
      spansOverlap(idx, end, span.start, span.end)
    );

    if (!overlapsDirective) {
      const ctxStart = Math.max(0, idx - 80);
      const ctxEnd = Math.min(rawText.length, end + 80);
      const contextWindow = rawText.slice(ctxStart, ctxEnd);

      const isFigurativeOrNegated = FIGURATIVE_JOKE_PATTERNS.some((pat) =>
        pat.test(contextWindow)
      );

      // Fail closed if the quote sits in the same sentence/clause as a directive span
      const sentStart = Math.max(
        rawText.lastIndexOf(".", idx),
        rawText.lastIndexOf("\n", idx)
      ) + 1;
      const nextDot = rawText.indexOf(".", end);
      const nextNl = rawText.indexOf("\n", end);
      const sentEndCandidates = [rawText.length, nextDot, nextNl].filter((v) => v >= 0);
      const sentEnd = Math.min(...sentEndCandidates);
      const directiveInSameSentence = directiveSpans.some((span) =>
        spansOverlap(sentStart, sentEnd, span.start, span.end)
      );

      if (!isFigurativeOrNegated && !directiveInSameSentence) {
        return {
          valid: true,
          cleanQuote: rawText.slice(idx, end),
        };
      }
    }

    searchFrom = idx + 1;
  }

  return { valid: false };
}

export function shouldPenalizePromptInjection(opts: {
  hasRuleOverrideAttack: boolean;
  hasPriorityHijackDirective: boolean;
  aiDetectedRuleOverride: boolean;
  aiDetectedPriorityHijack: boolean;
  anyVerifiedSafetyInReport: boolean;
}): boolean {
  if (opts.hasRuleOverrideAttack || opts.aiDetectedRuleOverride) {
    return true;
  }
  // Honest urgency ("EMERGENCY ASAP life or death") must NOT be penalized:
  // only penalize priority hijacks backed by an explicit directive pattern
  if (opts.hasPriorityHijackDirective && !opts.anyVerifiedSafetyInReport) {
    return true;
  }
  return false;
}

export function resolveDepartmentForIssue(
  category: ProblemCategory,
  location: { name: string; ownerDepartment: "EE" | "CSE" | "IS" | "Library" | "Cafeteria" | "Labs" }
): { department: "EE" | "CSE" | "IS" | "Library" | "Cafeteria" | "Labs"; ruleLabel: string } {
  if (category === "wifi_network") {
    return {
      department: "IS",
      ruleLabel: "Category-First Rule: Wi-Fi / Network & IT issues route to IS",
    };
  }
  if (category === "electrical_fire_hazard" || category === "power_lighting") {
    return {
      department: "EE",
      ruleLabel: "Category-First Rule: Electrical, Spark & Power issues route to EE",
    };
  }
  if (category === "food_hygiene") {
    return {
      department: "Cafeteria",
      ruleLabel: "Category-First Rule: Food & Hygiene issues route to Cafeteria",
    };
  }
  return {
    department: location.ownerDepartment,
    ruleLabel: `Location Owner Rule: ${location.name} is managed by ${location.ownerDepartment}`,
  };
}

const SANITIZE_STRIP_PATTERNS: RegExp[] = [
  /\b(?:harass\w*|ragging|stalk\w*|molest\w*|bully\w*|bullied|bullies|sexual\w*|inappropriate\s+touch\w*|intimidat\w*|threaten\w*|blackmail\w*|verbal\s+abuse|physical\s+abuse|badtameezi|cherkhaani|tang\s+kar\s+rahe|tang\s+kr\s+rahe|tang\s+kar\s+rha|tang\s+kar\s+rhi)\b/gi,
  /\bignore\s+(?:all\s+|previous\s+|prior\s+|your\s+|the\s+|system\s+)*(?:rules|instructions|prompts?|guidelines|policies)\b/gi,
  /\bsystem\s+prompt\b/gi,
  /\b(?:act|behave|pretend)\s+as\s+(?:an?\s+)?(?:admin|staff|system|moderator|root)\b/gi,
  /\boverride\s+(?:the\s+|all\s+)?(?:priority|rules|status|system)\b/gi,
  /\breveal\s+(?:the\s+|all\s+)?(?:reporter|confidential|hidden|identity|user)\b/gi,
  /\brules\s+bhool\s+jao\b/gi,
  /\binstructions\s+ignore\s+karo\b/gi,
  /\b(?:mark|set|classify|label|make|treat|flag)\s+(?:this|it|the\s+report|report|the\s+issue|issue|priority)\s+(?:as\s+|to\s+)?(?:critical|high(?:\s+priority)?|urgent|fire\s+hazard|emergency|safety\s+hazard|p0|p1)\b/gi,
];

export function sanitizePublicSummary(
  cleanSummary: string,
  category: ProblemCategory,
  locationName: string
): string {
  if (category === "harassment_ragging") {
    return `Confidential student welfare report (${locationName}).`;
  }
  let sanitized = cleanSummary ?? "";
  for (const pat of SANITIZE_STRIP_PATTERNS) {
    sanitized = sanitized.replace(pat, "");
  }
  sanitized = sanitized
    .replace(/\s*[,;:]\s*([.;,]|$)/g, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/^[.,;:\s-]+|[.,;:\s-]+$/g, "")
    .trim();

  if (sanitized.length < 8) {
    return `${formatCategoryLabel(category)} reported at ${locationName}`;
  }
  return sanitized;
}

export function buildDeterministicOneLineReason(opts: {
  isMedicalTopPriority?: boolean;
  isSafetyHazard: boolean;
  hazardType?: HazardType;
  safetyQuote?: string;
  isConfidential?: boolean;
  factualImpact: FactualImpact;
  baseScore: number;
  crowdBonus: number;
  activeSupporterCount: number;
  computedPriority: PriorityLevel;
  adminOverridePriority?: PriorityLevel;
  adminOverrideReason?: string;
  toneNote?: string;
}): string {
  if (opts.isConfidential) {
    return "Confidential safety report isolated to Admin Safety Vault (reporter identity protected).";
  }
  if (opts.isMedicalTopPriority) {
    const quotePart = opts.safetyQuote ? `: "${opts.safetyQuote}"` : "";
    const overridePart = opts.adminOverridePriority
      ? `; Admin override -> ${opts.adminOverridePriority}`
      : "";
    return `Medical issue (${opts.hazardType ?? "medical"}${quotePart}) — top priority CRITICAL (100)${overridePart}.`;
  }
  if (opts.isSafetyHazard) {
    const quotePart = opts.safetyQuote ? `: "${opts.safetyQuote}"` : "";
    const overridePart = opts.adminOverridePriority
      ? `; Admin override -> ${opts.adminOverridePriority}`
      : "";
    return `Verified safety hazard (${opts.hazardType ?? "hazard"}${quotePart}) — forced CRITICAL (98)${overridePart}.`;
  }
  const impactLabel =
    opts.factualImpact === "high_functional"
      ? "High functional impact"
      : opts.factualImpact === "moderate"
      ? "Moderate impact"
      : "Minor impact";
  const supLabel =
    opts.activeSupporterCount === 1
      ? "1 supporter"
      : `${opts.activeSupporterCount} supporters`;
  const overridePart = opts.adminOverridePriority
    ? `; Admin override -> ${opts.adminOverridePriority}`
    : "";
  const tonePart = opts.toneNote ? " [Tone ignored]" : "";

  return `${impactLabel} (base ${opts.baseScore}) + ${supLabel} (+${opts.crowdBonus}, capped at 84) -> ${opts.computedPriority}${overridePart}${tonePart}.`;
}

function getBaseScoreForImpact(impact: FactualImpact): number {
  switch (impact) {
    case "high_functional":
      return 56;
    case "moderate":
      return 38;
    case "minor":
    default:
      return 18;
  }
}

function getOverrideScore(priority: PriorityLevel, computedScore: number): number {
  switch (priority) {
    case "CRITICAL":
      return 96;
    case "HIGH":
      return Math.max(computedScore, 72);
    case "MEDIUM":
      return 48;
    case "LOW":
    default:
      return 20;
  }
}

export function computeVotingProgress(
  db: DatabaseState,
  issue: Issue,
  viewerId?: string
): VotingProgress {
  const eligibleIds = issue.eligibleVoterIds ?? [];
  const getUserWeight = (uid: string): number => {
    const u = db.users.find((x) => x.id === uid);
    return u ? getTrustWeight(u.trustScore) : 0.35;
  };

  const eligibleWeight = Number(
    eligibleIds.reduce((sum, uid) => sum + getUserWeight(uid), 0).toFixed(2)
  );

  let confirmWeightRaw = 0;
  let disputeWeightRaw = 0;
  for (const vote of issue.votes) {
    if (!eligibleIds.includes(vote.userId)) continue;
    if (vote.choice === "CONFIRM") {
      confirmWeightRaw += vote.weightSnapshot;
    } else if (vote.choice === "DISPUTE") {
      disputeWeightRaw += vote.weightSnapshot;
    }
  }

  const confirmWeight = Number(confirmWeightRaw.toFixed(2));
  const disputeWeight = Number(disputeWeightRaw.toFixed(2));
  const reopenThreshold = Number(Math.min(2.0, 0.5 * eligibleWeight).toFixed(2));
  const heldBrigadeCount = (issue.heldBrigadeActions ?? []).length;

  if (!viewerId) {
    return {
      eligibleCount: eligibleIds.length,
      eligibleWeight,
      confirmWeight,
      disputeWeight,
      reopenThreshold,
      heldBrigadeCount,
    };
  }

  const isHeldVoter = (issue.heldBrigadeActions ?? []).some(
    (h) =>
      h.userId === viewerId &&
      (h.actionType === "VOTE_CONFIRM" || h.actionType === "VOTE_DISPUTE")
  );
  const userCanVote =
    issue.status === "RESOLVED" && eligibleIds.includes(viewerId) && !isHeldVoter;
  const userVote = issue.votes.find((v) => v.userId === viewerId)?.choice ?? null;

  return {
    eligibleCount: eligibleIds.length,
    eligibleWeight,
    confirmWeight,
    disputeWeight,
    reopenThreshold,
    heldBrigadeCount,
    userCanVote,
    userCurrentVote: userVote,
  };
}

export function recomputeIssuePriority(db: DatabaseState, issue: Issue): void {
  const pb = issue.priorityBreakdown;
  const supporterIds = Array.from(new Set(issue.activeSupporterIds));
  issue.activeSupporterIds = supporterIds;
  issue.meTooCount = supporterIds.length;

  let effectiveCrowdWeightRaw = 0;
  for (const uid of supporterIds) {
    const u = db.users.find((x) => x.id === uid);
    effectiveCrowdWeightRaw += u ? getTrustWeight(u.trustScore) : 0.35;
  }
  const effectiveCrowdWeight = Number(effectiveCrowdWeightRaw.toFixed(2));

  let baseScore: number;
  let crowdBonus: number;
  let computedScore: number;
  let computedPriority: PriorityLevel;
  const isMedicalTopPriority =
    issue.category === "medical_emergency" || pb.hazardType === "medical";

  if (isMedicalTopPriority) {
    baseScore = 100;
    crowdBonus = 0;
    computedScore = 100;
    computedPriority = "CRITICAL";
  } else if (pb.isSafetyHazard) {
    baseScore = 98;
    crowdBonus = 0;
    computedScore = 98;
    computedPriority = "CRITICAL";
  } else {
    baseScore = getBaseScoreForImpact(pb.factualImpact);
    // Anti-VIP rule: 1 supporter => 0 crowd bonus regardless of reporter trust
    if (supporterIds.length <= 1) {
      crowdBonus = 0;
    } else {
      crowdBonus = Math.min(
        48,
        Math.round(16 * Math.log2(effectiveCrowdWeight + 1))
      );
    }
    computedScore = Math.min(84, baseScore + crowdBonus);
    computedPriority =
      computedScore >= 62 ? "HIGH" : computedScore >= 36 ? "MEDIUM" : "LOW";
  }

  issue.priorityBreakdown = {
    ...pb,
    baseScore,
    activeSupporterCount: supporterIds.length,
    effectiveCrowdWeight,
    crowdBonus,
    computedScore,
    computedPriority,
  };

  if (pb.adminOverridePriority) {
    issue.priority = pb.adminOverridePriority;
    issue.priorityScore = getOverrideScore(pb.adminOverridePriority, computedScore);
  } else {
    issue.priority = computedPriority;
    issue.priorityScore = computedScore;
  }

  issue.oneLineReason = buildDeterministicOneLineReason({
    isMedicalTopPriority,
    isSafetyHazard: pb.isSafetyHazard,
    hazardType: pb.hazardType,
    safetyQuote: pb.safetyQuote,
    isConfidential: issue.isConfidential,
    factualImpact: pb.factualImpact,
    baseScore,
    crowdBonus,
    activeSupporterCount: supporterIds.length,
    computedPriority,
    adminOverridePriority: pb.adminOverridePriority,
    adminOverrideReason: pb.adminOverrideReason,
    toneNote: pb.toneNote,
  });

  issue.votingProgress = computeVotingProgress(db, issue);
}

export function evaluateResolutionVotes(
  db: DatabaseState,
  issue: Issue
): "UNCHANGED" | "REOPENED" | "VERIFIED_RESOLVED" {
  if (issue.status !== "RESOLVED") {
    issue.votingProgress = computeVotingProgress(db, issue);
    return "UNCHANGED";
  }

  const progress = computeVotingProgress(db, issue);
  const { eligibleWeight: E, confirmWeight: C, disputeWeight: D, reopenThreshold } = progress;
  const eligibleIds = issue.eligibleVoterIds ?? [];
  const eligibleSet = new Set(eligibleIds);
  const votedIds = new Set(
    issue.votes.filter((v) => eligibleSet.has(v.userId)).map((v) => v.userId)
  );
  const allEligibleVoted = eligibleIds.length > 0 && votedIds.size >= eligibleIds.length;

  if (D > 0 && D >= reopenThreshold && D > C) {
    issue.status = "REOPENED";
    issue.reopenCount += 1;
    issue.updatedAt = new Date().toISOString();

    if (!issue.isConfidential) {
      for (const vote of issue.votes) {
        if (!eligibleSet.has(vote.userId)) continue;
        if (vote.choice === "DISPUTE") {
          adjustTrustScore(
            db,
            vote.userId,
            4,
            "Verified dispute reopened unresolved issue",
            issue.id
          );
        } else if (vote.choice === "CONFIRM") {
          adjustTrustScore(
            db,
            vote.userId,
            -3,
            "Confirm vote overruled by reopened dispute",
            issue.id
          );
        }
      }
    }

    issue.votes = [];
    issue.votingProgress = computeVotingProgress(db, issue);
    return "REOPENED";
  }

  // Confirmations require unanimous completion for <=2 voters or >50% of total eligible weight E for 3+ voters
  const confirmMajorityReached =
    C > 0 &&
    C > D &&
    (eligibleIds.length <= 2 ? allEligibleVoted : C > 0.5 * E);

  if (confirmMajorityReached) {
    issue.status = "VERIFIED_RESOLVED";
    issue.updatedAt = new Date().toISOString();

    if (!issue.isConfidential) {
      if (issue.reporterId) {
        adjustTrustScore(
          db,
          issue.reporterId,
          6,
          "Reported issue verified resolved by campus community",
          issue.id
        );
      }
      for (const vote of issue.votes) {
        if (!eligibleSet.has(vote.userId)) continue;
        if (vote.choice === "CONFIRM") {
          adjustTrustScore(
            db,
            vote.userId,
            4,
            "Confirmed fix worked on resolved issue",
            issue.id
          );
        } else if (vote.choice === "DISPUTE") {
          adjustTrustScore(
            db,
            vote.userId,
            -3,
            "Dispute vote overruled by community verification",
            issue.id
          );
        }
      }
    }

    issue.votingProgress = computeVotingProgress(db, issue);
    return "VERIFIED_RESOLVED";
  }

  issue.votingProgress = progress;
  return "UNCHANGED";
}

function isNewAccountUser(user: User, nowMs = Date.now()): boolean {
  if (user.isNewAccount) return true;
  const createdMs = Date.parse(user.createdAt);
  if (Number.isNaN(createdMs)) return false;
  return nowMs - createdMs < 15 * 60 * 1000;
}

export function detectAndHoldBrigading(
  db: DatabaseState,
  issue: Issue,
  actingUser: User,
  actionType: "JOIN" | "VOTE_CONFIRM" | "VOTE_DISPUTE",
  comment?: string
): { held: boolean; alert?: SecurityAlert } {
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  if (!isNewAccountUser(actingUser, nowMs)) {
    return { held: false };
  }

  const fiveMinAgoMs = nowMs - 5 * 60 * 1000;
  const distinctNewAccountIds = new Set<string>();
  if (actingUser.id !== issue.reporterId) {
    distinctNewAccountIds.add(actingUser.id);
  }

  for (const h of issue.heldBrigadeActions ?? []) {
    const hMs = Date.parse(h.createdAt);
    if (!Number.isNaN(hMs) && hMs >= fiveMinAgoMs && h.userId !== issue.reporterId) {
      distinctNewAccountIds.add(h.userId);
    }
  }

  for (const v of issue.votes) {
    const vMs = Date.parse(v.createdAt);
    if (Number.isNaN(vMs) || vMs < fiveMinAgoMs || v.userId === issue.reporterId) continue;
    const u = db.users.find((x) => x.id === v.userId);
    if (u && isNewAccountUser(u, nowMs)) {
      distinctNewAccountIds.add(u.id);
    }
  }

  for (const uid of issue.activeSupporterIds) {
    if (uid === issue.reporterId) continue;
    const u = db.users.find((x) => x.id === uid);
    if (!u || !isNewAccountUser(u, nowMs)) continue;
    const uCreatedMs = Date.parse(u.createdAt);
    if (!Number.isNaN(uCreatedMs) && uCreatedMs >= fiveMinAgoMs) {
      distinctNewAccountIds.add(u.id);
    } else if (u.isNewAccount) {
      distinctNewAccountIds.add(u.id);
    }
  }

  const existingOpenAlert = db.securityAlerts.find(
    (a) =>
      a.type === "BRIGADING_SUSPECTED" &&
      a.status === "OPEN" &&
      a.issueId === issue.id
  );

  if (distinctNewAccountIds.size < 3 && !existingOpenAlert) {
    return { held: false };
  }

  let alert = existingOpenAlert;
  if (!alert) {
    alert = {
      id: `alt-${randomUUID().slice(0, 8)}`,
      type: "BRIGADING_SUSPECTED",
      severity: "HIGH",
      status: "OPEN",
      title: `Possible brigading on "${issue.locationName}"`,
      detail: `${distinctNewAccountIds.size} new accounts interacted with issue ${issue.id} within 5 minutes. Actions held pending admin review (no auto-penalty).`,
      issueId: issue.id,
      involvedUserIds: Array.from(distinctNewAccountIds),
      createdAt: nowIso,
    };
    db.securityAlerts.unshift(alert);
  } else {
    const union = new Set([...alert.involvedUserIds, ...distinctNewAccountIds]);
    alert.involvedUserIds = Array.from(union);
    alert.detail = `${alert.involvedUserIds.length} new accounts interacted with issue ${issue.id} within 5 minutes. Actions held pending admin review (no auto-penalty).`;
  }

  const alertId = alert.id;
  if (!issue.heldBrigadeActions) {
    issue.heldBrigadeActions = [];
  }

  // Move recent non-creator new-account actions of matching category into heldBrigadeActions
  if (actionType === "JOIN") {
    const keptSupporters: string[] = [];
    for (const uid of issue.activeSupporterIds) {
      if (uid !== issue.reporterId && distinctNewAccountIds.has(uid)) {
        const u = db.users.find((x) => x.id === uid);
        const alreadyHeld = issue.heldBrigadeActions.some(
          (h) => h.userId === uid && h.actionType === "JOIN"
        );
        if (!alreadyHeld) {
          issue.heldBrigadeActions.push({
            id: `hba-${randomUUID().slice(0, 8)}`,
            userId: uid,
            userName: u?.name ?? uid,
            actionType: "JOIN",
            createdAt: nowIso,
            alertId,
          });
        }
      } else {
        keptSupporters.push(uid);
      }
    }
    issue.activeSupporterIds = keptSupporters;
  } else {
    const keptVotes = [];
    for (const v of issue.votes) {
      const vMs = Date.parse(v.createdAt);
      const isRecentNew =
        !Number.isNaN(vMs) &&
        vMs >= fiveMinAgoMs &&
        v.userId !== issue.reporterId &&
        distinctNewAccountIds.has(v.userId);
      if (isRecentNew) {
        const u = db.users.find((x) => x.id === v.userId);
        issue.heldBrigadeActions.push({
          id: `hba-${randomUUID().slice(0, 8)}`,
          userId: v.userId,
          userName: u?.name ?? v.userName ?? v.userId,
          actionType: v.choice === "CONFIRM" ? "VOTE_CONFIRM" : "VOTE_DISPUTE",
          ...(v.comment ? { comment: v.comment } : {}),
          createdAt: v.createdAt,
          alertId,
        });
      } else {
        keptVotes.push(v);
      }
    }
    issue.votes = keptVotes;
  }

  // Hold the actingUser's current action
  const heldAction: HeldBrigadeAction = {
    id: `hba-${randomUUID().slice(0, 8)}`,
    userId: actingUser.id,
    userName: actingUser.name,
    actionType,
    ...(comment ? { comment } : {}),
    createdAt: nowIso,
    alertId,
  };
  issue.heldBrigadeActions.push(heldAction);
  issue.updatedAt = nowIso;

  recomputeIssuePriority(db, issue);
  return { held: true, alert };
}

export function resolveBrigadeAlert(
  db: DatabaseState,
  alertId: string,
  decision: "confirm" | "dismiss"
): SecurityAlert | null {
  const alert = db.securityAlerts.find((a) => a.id === alertId);
  if (!alert || alert.type !== "BRIGADING_SUSPECTED") {
    return null;
  }
  if (alert.status !== "OPEN") {
    return alert;
  }

  const issue = alert.issueId
    ? db.issues.find((i) => i.id === alert.issueId)
    : undefined;

  if (decision === "confirm") {
    alert.status = "CONFIRMED";
    const involvedIds = new Set<string>(alert.involvedUserIds);
    if (issue) {
      for (const h of issue.heldBrigadeActions ?? []) {
        if (h.alertId === alert.id) {
          involvedIds.add(h.userId);
        }
      }
      issue.heldBrigadeActions = (issue.heldBrigadeActions ?? []).filter(
        (h) => h.alertId !== alert.id
      );
    }

    for (const uid of involvedIds) {
      adjustTrustScore(
        db,
        uid,
        -10,
        "Confirmed coordinated brigading activity by Admin",
        alert.issueId
      );
    }

    if (issue) {
      recomputeIssuePriority(db, issue);
      if (issue.status === "RESOLVED") {
        evaluateResolutionVotes(db, issue);
        recomputeIssuePriority(db, issue);
      }
    }
    return alert;
  }

  // decision === "dismiss" (False alarm: release held actions & recompute)
  alert.status = "DISMISSED";
  if (issue) {
    const actionsToRelease = (issue.heldBrigadeActions ?? []).filter(
      (h) => h.alertId === alert.id
    );
    issue.heldBrigadeActions = (issue.heldBrigadeActions ?? []).filter(
      (h) => h.alertId !== alert.id
    );

    for (const h of actionsToRelease) {
      if (h.actionType === "JOIN") {
        if (
          issue.status !== "RESOLVED" &&
          issue.status !== "VERIFIED_RESOLVED" &&
          issue.status !== "DISMISSED_SPAM" &&
          !issue.activeSupporterIds.includes(h.userId)
        ) {
          issue.activeSupporterIds.push(h.userId);
        }
      } else if (
        (h.actionType === "VOTE_CONFIRM" || h.actionType === "VOTE_DISPUTE") &&
        issue.status === "RESOLVED" &&
        issue.eligibleVoterIds.includes(h.userId)
      ) {
        const u = db.users.find((x) => x.id === h.userId);
        const weight = u ? getTrustWeight(u.trustScore) : 0.35;
        const choice = h.actionType === "VOTE_CONFIRM" ? "CONFIRM" : "DISPUTE";
        const existingIdx = issue.votes.findIndex((v) => v.userId === h.userId);
        const voteObj = {
          userId: h.userId,
          userName: u?.name ?? h.userName,
          choice: choice as "CONFIRM" | "DISPUTE",
          weightSnapshot: weight,
          ...(h.comment ? { comment: h.comment } : {}),
          createdAt: h.createdAt,
        };
        if (existingIdx >= 0) {
          issue.votes[existingIdx] = voteObj;
        } else {
          issue.votes.push(voteObj);
        }
      }
    }

    issue.updatedAt = new Date().toISOString();
    recomputeIssuePriority(db, issue);
    if (issue.status === "RESOLVED") {
      evaluateResolutionVotes(db, issue);
      recomputeIssuePriority(db, issue);
    }
  }

  return alert;
}

const COMPATIBLE_CATEGORY_PAIRS = new Set<string>([
  "electrical_fire_hazard|power_lighting",
  "electrical_fire_hazard|lab_equipment",
  "power_lighting|lab_equipment",
  "projector_av|lab_equipment",
  "wifi_network|lab_equipment",
  "plumbing_water|cleanliness_furniture",
  "food_hygiene|cleanliness_furniture",
  "structural_hazard|cleanliness_furniture",
]);

export function areCategoriesDisjoint(
  a: ProblemCategory,
  b: ProblemCategory
): boolean {
  if (a === "harassment_ragging" || b === "harassment_ragging") {
    return true;
  }
  if (a === b) return false;
  if (a === "other" || b === "other") return false;
  const pairKey1 = `${a}|${b}`;
  const pairKey2 = `${b}|${a}`;
  return (
    !COMPATIBLE_CATEGORY_PAIRS.has(pairKey1) &&
    !COMPATIBLE_CATEGORY_PAIRS.has(pairKey2)
  );
}

export function sanitizeIssueForViewer(
  db: DatabaseState,
  issue: Issue,
  viewer: User
): Issue | null {
  if (issue.isConfidential) {
    if (viewer.role === "staff") {
      return null;
    }
    if (viewer.role === "student") {
      if (issue.reporterId !== viewer.id) {
        return null;
      }
      return {
        ...issue,
        votingProgress: computeVotingProgress(db, issue, viewer.id),
        userHasJoined: true,
        isOwnConfidentialReceipt: true,
      };
    }
    // Admin sees confidential vault cases WITHOUT reporter identity
    return {
      ...issue,
      reporterId: undefined,
      activeSupporterIds: [],
      eligibleVoterIds: [],
      votes: [],
      votingProgress: computeVotingProgress(db, issue),
      userHasJoined: false,
      isOwnConfidentialReceipt: false,
    };
  }

  // Non-confidential public issue
  if (viewer.role === "staff" && issue.department !== viewer.department) {
    return null;
  }

  return {
    ...issue,
    reporterId: undefined,
    meTooCount: issue.activeSupporterIds.length,
    votingProgress: computeVotingProgress(db, issue, viewer.id),
    userHasJoined: issue.activeSupporterIds.includes(viewer.id),
    isOwnConfidentialReceipt: false,
  };
}

export function buildClientStatePayload(
  db: DatabaseState,
  viewerId?: string
): ClientStatePayload {
  const activeUser =
    db.users.find((u) => u.id === viewerId) ??
    db.users.find((u) => u.id === "stu-ayesha") ??
    db.users[0];

  const sortedIssues = [...db.issues].sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    return b.updatedAt.localeCompare(a.updatedAt);
  });

  const visibleIssues: Issue[] = [];
  for (const raw of sortedIssues) {
    if (activeUser.role === "student") {
      if (raw.isConfidential || raw.status === "DISMISSED_SPAM") continue;
    }
    const sanitized = sanitizeIssueForViewer(db, raw, activeUser);
    if (sanitized) visibleIssues.push(sanitized);
  }

  const trendingIssues = visibleIssues
    .filter(
      (i) =>
        !i.isConfidential &&
        i.status !== "DISMISSED_SPAM" &&
        i.status !== "VERIFIED_RESOLVED"
    )
    .sort((a, b) => {
      if (b.meTooCount !== a.meTooCount) {
        return b.meTooCount - a.meTooCount;
      }
      return b.priorityScore - a.priorityScore;
    });

  const myIssues: Issue[] =
    activeUser.role === "student"
      ? sortedIssues
          .filter(
            (raw) =>
              raw.reporterId === activeUser.id ||
              raw.activeSupporterIds.includes(activeUser.id)
          )
          .map((raw) => sanitizeIssueForViewer(db, raw, activeUser))
          .filter((i): i is Issue => i !== null)
      : [];

  const pendingClarifications =
    activeUser.role === "student"
      ? db.pendingClarifications.filter((c) => c.userId === activeUser.id)
      : [];

  const securityAlerts =
    activeUser.role === "admin"
      ? [...db.securityAlerts].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt)
        )
      : [];

  const totalActivePublic = db.issues.filter(
    (i) =>
      !i.isConfidential &&
      i.status !== "VERIFIED_RESOLVED" &&
      i.status !== "DISMISSED_SPAM"
  ).length;

  const criticalSafetyCount = db.issues.filter(
    (i) =>
      !i.isConfidential &&
      i.priority === "CRITICAL" &&
      i.status !== "VERIFIED_RESOLVED" &&
      i.status !== "DISMISSED_SPAM"
  ).length;

  const resolvedAwaitingVotes = db.issues.filter(
    (i) => !i.isConfidential && i.status === "RESOLVED"
  ).length;

  const reopenedCount = db.issues.filter(
    (i) => !i.isConfidential && i.status === "REOPENED"
  ).length;

  const stats: ClientStatePayload["stats"] = {
    totalActivePublic,
    criticalSafetyCount,
    resolvedAwaitingVotes,
    reopenedCount,
    ...(activeUser.role === "admin"
      ? {
          confidentialCount: db.issues.filter((i) => i.isConfidential).length,
          openSecurityAlertsCount: db.securityAlerts.filter(
            (a) => a.status === "OPEN"
          ).length,
        }
      : {}),
  };

  const enrichedUsers = db.users.map((u) => ({
    ...u,
    trustExplanation: buildTrustExplanation(u),
  }));

  const enrichedActiveUser =
    enrichedUsers.find((u) => u.id === activeUser.id) ?? {
      ...activeUser,
      trustExplanation: buildTrustExplanation(activeUser),
    };

  return {
    activeUser: enrichedActiveUser,
    users: enrichedUsers,
    issues: visibleIssues,
    trendingIssues,
    myIssues,
    pendingClarifications,
    securityAlerts,
    campusLocations: CAMPUS_LOCATIONS,
    stats,
  };
}
