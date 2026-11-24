// ============================================================================
// ReportFix UI Contract — Pure, Display-Only View Types & Prop Interfaces
// ============================================================================
// Views are strictly pure and display-only: every score, weight, threshold,
// breakdown, status, and "why" string arrives pre-computed from the backend.
// Every callback returns Promise<void> so views can await it for per-button
// loading states and inline error handling.
// ============================================================================

export type UserRole = "STUDENT" | "STAFF" | "ADMIN";

export type Department =
  | "EE"
  | "CSE"
  | "IS"
  | "Library"
  | "Cafeteria"
  | "Labs";

export type TrustTier =
  | "High Trust"
  | "Trusted"
  | "Standard"
  | "Developing"
  | "Low Trust"
  | "New Account"
  | "Staff"
  | "Admin";

export type IssueStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "REOPENED"
  | "VERIFIED_RESOLVED"
  | "DISMISSED_SPAM";

export type IssuePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type VoteChoice = "CONFIRM" | "DISPUTE";

export type ResetMode = "clean" | "samples";

export type TriageOutcome =
  | "CREATED"
  | "MERGED_ME_TOO"
  | "CONFIDENTIAL_CREATED"
  | "NEEDS_CLARIFICATION"
  | "REJECTED";

export type TriageTag =
  | "SAFETY_VERIFIED"
  | "TONE_IGNORED"
  | "INSTRUCTION_IGNORED"
  | "TRUST_PENALTY"
  | "CONFIDENTIAL"
  | "FALLBACK_MODE";

export type ClarificationReason = "NONEXISTENT" | "AMBIGUOUS" | "MISSING";

export type BrigadeAlertStatus =
  | "PENDING_REVIEW"
  | "CONFIRMED_BRIGADE"
  | "DISMISSED_FALSE_ALARM";

export type BrigadeDecision = "confirm" | "dismiss";

export type SecurityEventType =
  | "PROMPT_INJECTION"
  | "TONE_IGNORED"
  | "SPAM_REJECTED"
  | "BRIGADING_SUSPECTED"
  | "BRIGADE_CONFIRMED"
  | "BRIGADE_DISMISSED"
  | "CONFIDENTIAL_ISOLATED"
  | "ADMIN_OVERRIDE"
  | "FALLBACK_MODE";

// ============================================================================
// Core Display Entities
// ============================================================================

export interface User {
  id: string;
  name: string;
  role: UserRole;
  department?: Department;
  trustScore: number;
  voteWeight: number;
  tier: TrustTier;
  isNewAccount: boolean;
  accountAgeMinutes: number;
}

export interface PriorityAdminOverride {
  priority: IssuePriority;
  score: number;
  reason: string;
  by?: string;
  at?: string;
}

export interface PriorityBreakdown {
  base: number;
  crowd: number;
  cap: number;
  isSafety: boolean;
  adminOverride?: PriorityAdminOverride;
}

export interface IssueTimelineEntry {
  at: string;
  label: string;
}

export interface IssueVoting {
  canVote: boolean;
  myVote?: VoteChoice;
  confirmWeight: number;
  disputeWeight: number;
  threshold: number;
  eligibleWeight: number;
  eligibleCount: number;
  ineligibleReason?: string;
}

export interface Issue {
  id: string;
  cleanSummary: string;
  oneLineReason: string;
  locationName: string;
  department: Department;
  status: IssueStatus;
  priority: IssuePriority;
  priorityScore: number;
  priorityBreakdown: PriorityBreakdown;
  meTooCount: number;
  alreadyJoined: boolean;
  canJoin: boolean;
  joinDisabledReason?: string;
  isConfidential: boolean;
  reopenCount: number;
  heldBrigadeCount: number;
  timeline: IssueTimelineEntry[];
  voting?: IssueVoting;
  /** Pre-computed note when Admin reassigned department from its original owner. */
  departmentOverrideNote?: string;
}

export interface TriageAiExtracted {
  category: string;
  impact: string;
  locationMention: string;
}

export interface TriageCodeEnforced {
  department: string;
  priorityRule: string;
}

export interface TriageItemResult {
  outcome: TriageOutcome;
  issueId?: string;
  cleanSummary: string;
  locationName?: string;
  department?: Department;
  priority?: IssuePriority;
  priorityScore?: number;
  oneLineReason: string;
  tags: TriageTag[];
  aiExtracted: TriageAiExtracted;
  codeEnforced: TriageCodeEnforced;
}

export interface SuggestedLocation {
  id: string;
  name: string;
}

export interface PendingClarification {
  id: string;
  itemSummary: string;
  reason: ClarificationReason;
  mention: string;
  suggestedLocations: SuggestedLocation[];
}

export interface TrustEvent {
  at: string;
  delta: number;
  newScore: number;
  reason: string;
  issueId?: string;
}

export interface BrigadeAccount {
  name: string;
  ageMinutes: number;
  weight: number;
}

export interface BrigadeAlert {
  id: string;
  issueId: string;
  issueSummary: string;
  accounts: BrigadeAccount[];
  status: BrigadeAlertStatus;
}

export interface SecurityEvent {
  at: string;
  type: SecurityEventType;
  summary: string;
  userName: string;
}

export interface CampusLocation {
  id: string;
  name: string;
  department: Department;
}

export interface AdminKpis {
  totalIssues: number;
  openCount: number;
  criticalSafetyCount: number;
  confidentialCount: number;
  pendingBrigadeCount: number;
  securityEventCount: number;
}

export interface AdminSummary {
  generatedAt: string;
  headline: string;
  overview: string;
  highlights: string[];
  recommendedActions: string[];
  isFallback?: boolean;
}

export interface StaffQueueKpis {
  total: number;
  openCount: number;
  inProgressCount: number;
  resolvedCount: number;
  reopenedCount: number;
  safetyCount: number;
}

// ============================================================================
// The 4 View Prop Interfaces (Pure, Display-Only, Async Callbacks)
// ============================================================================

/**
 * View 1: JudgeBar
 * Always-visible sticky bar for 1-click user switching, instant student creation,
 * dual reset ("clean" vs "samples"), and the AI-vs-Code architecture drawer.
 */
export interface JudgeBarProps {
  activeUser: User;
  users: User[];
  onSwitchUser: (userId: string) => Promise<void>;
  onCreateStudent: (name?: string) => Promise<void>;
  onReset: (mode: ResetMode) => Promise<void>;
}

/**
 * View 2: StudentWorkspace
 * Plain-text multi-issue reporting, clarification resolution, per-item AI-vs-Code
 * triage trace, My Issues (incl. own confidential cases & Confirm/Dispute voting),
 * Public & Trending Board ("Me Too"), and personal Trust Audit Ledger.
 */
export interface StudentWorkspaceProps {
  activeUser: User;
  campusLocations: CampusLocation[];
  triageResults: TriageItemResult[];
  pendingClarifications: PendingClarification[];
  myIssues: Issue[];
  publicIssues: Issue[];
  trendingIssues: Issue[];
  trustEvents: TrustEvent[];
  onSubmitReport: (rawText: string) => Promise<void>;
  onResolveClarification: (
    clarificationId: string,
    locationInput: string,
  ) => Promise<void>;
  onDismissClarification: (clarificationId: string) => Promise<void>;
  onJoinIssue: (issueId: string) => Promise<void>;
  onVoteIssue: (issueId: string, vote: VoteChoice) => Promise<void>;
}

/**
 * View 3: StaffQueueView
 * Strictly scoped to activeUser.department, showing only sanitized English
 * summaries (zero confidential cases, zero raw student text) and status controls.
 */
export interface StaffQueueViewProps {
  activeUser: User;
  department: Department;
  kpis: StaffQueueKpis;
  issues: Issue[];
  onUpdateStatus: (issueId: string, status: IssueStatus) => Promise<void>;
}

/**
 * View 4: AdminOversightView
 * Full cross-department visibility, Department & Priority overrides, Confidential
 * Safety Vault (anonymous reporter), Trust Score Inspector, Security & Brigading
 * Hold Queue, and AI Executive Summary.
 */
export interface AdminOversightViewProps {
  activeUser: User;
  kpis: AdminKpis;
  issues: Issue[];
  confidentialIssues: Issue[];
  trendingIssues: Issue[];
  users: User[];
  trustEventsByUser: Record<string, TrustEvent[]>;
  brigadeAlerts: BrigadeAlert[];
  securityEvents: SecurityEvent[];
  campusLocations: CampusLocation[];
  aiSummary: AdminSummary | null;
  onUpdateStatus: (issueId: string, status: IssueStatus) => Promise<void>;
  onReassignDepartment: (
    issueId: string,
    department: Department,
    reason: string,
  ) => Promise<void>;
  onOverridePriority: (
    issueId: string,
    priority: IssuePriority,
    reason: string,
  ) => Promise<void>;
  onResolveBrigadeAlert: (
    alertId: string,
    decision: BrigadeDecision,
  ) => Promise<void>;
  onGenerateSummary: () => Promise<void>;
}
