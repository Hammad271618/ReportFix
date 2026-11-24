export type Department = "EE" | "CSE" | "IS" | "Library" | "Cafeteria" | "Labs";
export const DEPARTMENTS: Department[] = ["EE", "CSE", "IS", "Library", "Cafeteria", "Labs"];

export type UserRole = "student" | "staff" | "admin";

export type IssueStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "REOPENED"
  | "VERIFIED_RESOLVED"
  | "DISMISSED_SPAM";

export type PriorityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type FactualImpact = "minor" | "moderate" | "high_functional";

export type ProblemCategory =
  | "electrical_fire_hazard"
  | "gas_leak"
  | "medical_emergency"
  | "structural_hazard"
  | "harassment_ragging"
  | "hvac_ac"
  | "wifi_network"
  | "projector_av"
  | "lab_equipment"
  | "power_lighting"
  | "food_hygiene"
  | "plumbing_water"
  | "cleanliness_furniture"
  | "other";

export type HazardType =
  | "fire"
  | "sparks_electrical"
  | "gas_leak"
  | "medical"
  | "structural_collapse"
  | "chemical_spill"
  | "none";

export interface TrustEvent {
  id: string;
  timestamp: string;
  delta: number;
  newScore: number;
  reason: string;
  issueId?: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  department?: Department;
  trustScore: number;
  trustExplanation?: string;
  isNewAccount: boolean;
  createdAt: string;
  trustHistory: TrustEvent[];
}

export interface CampusLocation {
  id: string;
  name: string;
  ownerDepartment: Department;
  groupKey?: string;
  numbers: number[];
  aliases: string[];
  description: string;
}

export interface LocationResolution {
  status: "MATCHED" | "AMBIGUOUS" | "NONEXISTENT" | "MISSING";
  location?: CampusLocation;
  candidates: CampusLocation[];
  reason: string;
  extractedMention: string;
}

export interface PriorityBreakdown {
  isSafetyHazard: boolean;
  hazardType: HazardType;
  safetyQuote?: string;
  factualImpact: FactualImpact;
  baseScore: number;
  activeSupporterCount: number;
  effectiveCrowdWeight: number;
  crowdBonus: number;
  computedScore: number;
  computedPriority: PriorityLevel;
  adminOverridePriority?: PriorityLevel;
  adminOverrideReason?: string;
  toneNote?: string;
}

export interface ResolutionVote {
  userId: string;
  userName?: string;
  choice: "CONFIRM" | "DISPUTE";
  weightSnapshot: number;
  comment?: string;
  createdAt: string;
}

export interface HeldBrigadeAction {
  id: string;
  userId: string;
  userName: string;
  actionType: "JOIN" | "VOTE_CONFIRM" | "VOTE_DISPUTE";
  comment?: string;
  createdAt: string;
  alertId: string;
}

export interface VotingProgress {
  eligibleCount: number;
  eligibleWeight: number;
  confirmWeight: number;
  disputeWeight: number;
  reopenThreshold: number;
  heldBrigadeCount: number;
  userCanVote?: boolean;
  userCurrentVote?: "CONFIRM" | "DISPUTE" | null;
}

export interface Issue {
  id: string;
  cleanSummary: string;
  oneLineReason: string;
  category: ProblemCategory;
  department: Department | "CONFIDENTIAL_VAULT";
  locationId: string;
  locationName: string;
  status: IssueStatus;
  priority: PriorityLevel;
  priorityScore: number;
  priorityBreakdown: PriorityBreakdown;
  isConfidential: boolean;
  reporterId?: string;
  activeSupporterIds: string[];
  meTooCount: number;
  eligibleVoterIds: string[];
  votes: ResolutionVote[];
  heldBrigadeActions: HeldBrigadeAction[];
  votingProgress: VotingProgress;
  reopenCount: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  adminNotes: string[];
  userHasJoined?: boolean;
  isOwnConfidentialReceipt?: boolean;
}

export interface PendingClarification {
  id: string;
  userId: string;
  createdAt: string;
  cleanSummary: string;
  category: ProblemCategory;
  factualImpact: FactualImpact;
  isConfidential: boolean;
  isVerifiedSafetyHazard: boolean;
  hazardType: HazardType;
  safetyQuote?: string;
  toneNote?: string;
  status: "AMBIGUOUS" | "NONEXISTENT" | "MISSING";
  reason: string;
  extractedMention: string;
  suggestedLocations: CampusLocation[];
}

export interface SecurityAlert {
  id: string;
  type: "PROMPT_INJECTION" | "BRIGADING_SUSPECTED" | "SPAM_FLOOD" | "SAFETY_UNROUTED";
  severity: "MEDIUM" | "HIGH";
  status: "OPEN" | "CONFIRMED" | "DISMISSED";
  title: string;
  detail: string;
  issueId?: string;
  involvedUserIds: string[];
  createdAt: string;
}

export interface ExtractedIssueCandidate {
  cleanEnglishSummary: string;
  problemCategory: ProblemCategory;
  factualImpact: FactualImpact;
  rawLocationMention: string;
  matchedLocationId: string | null;
  safetyClaimed: boolean;
  hazardType: HazardType;
  safetyVerbatimQuote: string;
  isHarassmentOrRagging: boolean;
}

export interface AIExtractionResult {
  items: ExtractedIssueCandidate[];
  aiDetectedRuleOverride: boolean;
  aiDetectedPriorityHijack: boolean;
  usedFallback: boolean;
  rejectedPersonalIssue?: boolean;
}

export interface TriageItemTrace {
  itemIndex: number;
  outcome:
    | "CREATED"
    | "MERGED_ME_TOO"
    | "CONFIDENTIAL_CREATED"
    | "NEEDS_CLARIFICATION"
    | "HELD_BRIGADE"
    | "REJECTED_INJECTION"
    | "REJECTED_NO_ISSUE"
    | "DISPUTED_RESOLVED";
  cleanSummary: string;
  aiExtracted: {
    category: ProblemCategory;
    factualImpact: FactualImpact;
    rawLocationMention: string;
    safetyClaimed: boolean;
    safetyQuote?: string;
    isHarassmentOrRagging: boolean;
    usedFallback: boolean;
  };
  codeDecision: {
    department?: string;
    locationName?: string;
    priority?: PriorityLevel;
    priorityScore?: number;
    oneLineReason?: string;
    safetyVerified: boolean;
    safetySecondPassUsed: boolean;
    toneIgnoredNote?: string;
    injectionDetected: boolean;
    injectionPenalized: boolean;
    trustDelta: number;
  };
  issue?: Issue;
  clarification?: PendingClarification;
}

export interface SubmitReportResponse {
  ok: boolean;
  items: TriageItemTrace[];
  rateLimited?: boolean;
  message?: string;
}

export interface AdminSummaryResult {
  generatedAt: string;
  usedFallback: boolean;
  headline: string;
  criticalAndSafety: string[];
  departmentBottlenecks: string[];
  communityAndTrustSignals: string[];
  recommendedActions: string[];
}

export interface DatabaseState {
  users: User[];
  issues: Issue[];
  pendingClarifications: PendingClarification[];
  securityAlerts: SecurityAlert[];
  submissionTimestampsByUser: Record<string, string[]>;
  lastResetMode: "clean" | "samples";
  updatedAt: string;
}

export interface ClientStatePayload {
  activeUser: User;
  users: User[];
  issues: Issue[];
  trendingIssues: Issue[];
  myIssues: Issue[];
  pendingClarifications: PendingClarification[];
  securityAlerts: SecurityAlert[];
  campusLocations: CampusLocation[];
  stats: {
    totalActivePublic: number;
    criticalSafetyCount: number;
    resolvedAwaitingVotes: number;
    reopenedCount: number;
    confidentialCount?: number;
    openSecurityAlertsCount?: number;
  };
}
