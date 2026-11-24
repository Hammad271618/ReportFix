import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { deterministicDuplicateMatch } from "@/lib/ai-triage";
import {
  areCategoriesDisjoint,
  detectAndHoldBrigading,
  evaluateResolutionVotes,
  getTrustWeight,
  recomputeIssuePriority,
  resolveDepartmentForIssue,
  sanitizeIssueForViewer,
  sanitizePublicSummary,
} from "@/lib/rules-engine";
import type {
  CampusLocation,
  DatabaseState,
  FactualImpact,
  HazardType,
  Issue,
  ProblemCategory,
  User,
} from "@/lib/types";

export async function parseJsonBody<T>(
  req: Request,
  schema: z.ZodType<T>
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, message: "Invalid JSON request body." },
        { status: 400 }
      ),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const field = firstIssue?.path?.length ? `${firstIssue.path.join(".")}: ` : "";
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          message: `${field}${firstIssue?.message ?? "Invalid request payload."}`,
        },
        { status: 400 }
      ),
    };
  }

  return { ok: true, data: parsed.data };
}

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ ok: false, message }, { status });
}

export function findActiveDedupCandidates(
  db: DatabaseState,
  locationId: string,
  category: ProblemCategory
): Issue[] {
  return db.issues.filter(
    (issue) =>
      !issue.isConfidential &&
      issue.locationId === locationId &&
      issue.status !== "RESOLVED" &&
      issue.status !== "VERIFIED_RESOLVED" &&
      issue.status !== "DISMISSED_SPAM" &&
      !areCategoriesDisjoint(issue.category, category)
  );
}

export function findResolvedDedupCandidates(
  db: DatabaseState,
  locationId: string,
  category: ProblemCategory
): Issue[] {
  return db.issues.filter(
    (issue) =>
      !issue.isConfidential &&
      issue.locationId === locationId &&
      issue.status === "RESOLVED" &&
      !areCategoriesDisjoint(issue.category, category)
  );
}

export interface MaterializeIssueInput {
  db: DatabaseState;
  user: User;
  location: CampusLocation;
  cleanSummary: string;
  category: ProblemCategory;
  factualImpact: FactualImpact;
  isConfidential: boolean;
  isVerifiedSafetyHazard: boolean;
  hazardType: HazardType;
  safetyQuote?: string;
  toneNote?: string;
  preMatchedIssueId?: string | null;
  dedupUsedFallback?: boolean;
  preMatchedResolvedId?: string | null;
}

export interface MaterializeIssueResult {
  outcome:
    | "CREATED"
    | "MERGED_ME_TOO"
    | "CONFIDENTIAL_CREATED"
    | "HELD_BRIGADE"
    | "DISPUTED_RESOLVED";
  issue?: Issue;
  cleanSummary: string;
  department: string;
  priority: Issue["priority"];
  priorityScore: number;
  oneLineReason: string;
  alreadyJoined?: boolean;
}

/**
 * Persists a location-resolved report item inside a database mutation lock:
 * creates an isolated confidential vault record, merges into an active issue
 * at the same location (with brigade screening), or opens a new public ticket.
 */
export function materializeMatchedLocationIssue(
  input: MaterializeIssueInput
): MaterializeIssueResult {
  const {
    db,
    user,
    location,
    cleanSummary,
    category,
    factualImpact,
    isConfidential,
    isVerifiedSafetyHazard,
    hazardType,
    safetyQuote,
    toneNote,
    preMatchedIssueId,
    dedupUsedFallback,
    preMatchedResolvedId,
  } = input;

  const nowIso = new Date().toISOString();

  if (isConfidential) {
    const confidentialCategory: ProblemCategory = "harassment_ragging";
    const confidentialSummary = sanitizePublicSummary(
      cleanSummary,
      confidentialCategory,
      location.name
    );

    const newIssue: Issue = {
      id: `iss-${randomUUID().slice(0, 8)}`,
      cleanSummary: confidentialSummary,
      oneLineReason: "",
      category: confidentialCategory,
      department: "CONFIDENTIAL_VAULT",
      locationId: location.id,
      locationName: location.name,
      status: "OPEN",
      priority: "MEDIUM",
      priorityScore: 56,
      priorityBreakdown: {
        isSafetyHazard: false,
        hazardType: "none",
        factualImpact: "high_functional",
        baseScore: 56,
        activeSupporterCount: 1,
        effectiveCrowdWeight: 0,
        crowdBonus: 0,
        computedScore: 56,
        computedPriority: "MEDIUM",
      },
      isConfidential: true,
      reporterId: user.id,
      activeSupporterIds: [user.id],
      meTooCount: 1,
      eligibleVoterIds: [],
      votes: [],
      heldBrigadeActions: [],
      votingProgress: {
        eligibleCount: 0,
        eligibleWeight: 0,
        confirmWeight: 0,
        disputeWeight: 0,
        reopenThreshold: 0,
        heldBrigadeCount: 0,
      },
      reopenCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
      adminNotes: [],
    };

    recomputeIssuePriority(db, newIssue);
    db.issues.push(newIssue);

    const sanitized = sanitizeIssueForViewer(db, newIssue, user) ?? newIssue;
    return {
      outcome: "CONFIDENTIAL_CREATED",
      issue: sanitized,
      cleanSummary: newIssue.cleanSummary,
      department: newIssue.department,
      priority: newIssue.priority,
      priorityScore: newIssue.priorityScore,
      oneLineReason: newIssue.oneLineReason,
    };
  }

  const publicSummary = sanitizePublicSummary(cleanSummary, category, location.name);
  const candidates = findActiveDedupCandidates(db, location.id, category);

  // D1: Only merge when AI explicitly matched, or via keyword-overlap fallback when AI failed
  let matchedExisting: Issue | undefined;
  if (preMatchedIssueId) {
    matchedExisting = candidates.find((c) => c.id === preMatchedIssueId);
  } else if (dedupUsedFallback && candidates.length > 0) {
    const fb = deterministicDuplicateMatch(publicSummary, category, candidates);
    if (fb.matchedIssueId) {
      matchedExisting = candidates.find((c) => c.id === fb.matchedIssueId);
    }
  }

  // D8: If student re-reports a RESOLVED issue they were originally affected by, record as a DISPUTE vote
  if (!matchedExisting && preMatchedResolvedId) {
    const resolvedCandidates = findResolvedDedupCandidates(db, location.id, category);
    const resolvedMatch = resolvedCandidates.find(
      (c) => c.id === preMatchedResolvedId && c.eligibleVoterIds.includes(user.id)
    );
    if (resolvedMatch) {
      const brigade = detectAndHoldBrigading(
        db,
        resolvedMatch,
        user,
        "VOTE_DISPUTE",
        publicSummary
      );
      if (brigade.held) {
        const sanitized = sanitizeIssueForViewer(db, resolvedMatch, user) ?? resolvedMatch;
        return {
          outcome: "HELD_BRIGADE",
          issue: sanitized,
          cleanSummary: resolvedMatch.cleanSummary,
          department: resolvedMatch.department,
          priority: resolvedMatch.priority,
          priorityScore: resolvedMatch.priorityScore,
          oneLineReason: resolvedMatch.oneLineReason,
        };
      }
      const voteObj = {
        userId: user.id,
        userName: user.name,
        choice: "DISPUTE" as const,
        weightSnapshot: getTrustWeight(user.trustScore),
        comment: publicSummary,
        createdAt: nowIso,
      };
      const existingVoteIdx = resolvedMatch.votes.findIndex((v) => v.userId === user.id);
      if (existingVoteIdx >= 0) resolvedMatch.votes[existingVoteIdx] = voteObj;
      else resolvedMatch.votes.push(voteObj);

      evaluateResolutionVotes(db, resolvedMatch);
      recomputeIssuePriority(db, resolvedMatch);
      const sanitized = sanitizeIssueForViewer(db, resolvedMatch, user) ?? resolvedMatch;
      return {
        outcome: "DISPUTED_RESOLVED",
        issue: sanitized,
        cleanSummary: resolvedMatch.cleanSummary,
        department: resolvedMatch.department,
        priority: resolvedMatch.priority,
        priorityScore: resolvedMatch.priorityScore,
        oneLineReason: resolvedMatch.oneLineReason,
      };
    }
  }

  if (matchedExisting) {
    if (matchedExisting.activeSupporterIds.includes(user.id)) {
      if (isVerifiedSafetyHazard && !matchedExisting.priorityBreakdown.isSafetyHazard) {
        matchedExisting.priorityBreakdown = {
          ...matchedExisting.priorityBreakdown,
          isSafetyHazard: true,
          hazardType,
          ...(safetyQuote ? { safetyQuote } : {}),
        };
        matchedExisting.updatedAt = nowIso;
        recomputeIssuePriority(db, matchedExisting);
      }
      const sanitized =
        sanitizeIssueForViewer(db, matchedExisting, user) ?? matchedExisting;
      return {
        outcome: "MERGED_ME_TOO",
        issue: sanitized,
        cleanSummary: matchedExisting.cleanSummary,
        department: matchedExisting.department,
        priority: matchedExisting.priority,
        priorityScore: matchedExisting.priorityScore,
        oneLineReason: matchedExisting.oneLineReason,
        alreadyJoined: true,
      };
    }

    const brigade = detectAndHoldBrigading(db, matchedExisting, user, "JOIN");
    if (brigade.held) {
      const sanitized =
        sanitizeIssueForViewer(db, matchedExisting, user) ?? matchedExisting;
      return {
        outcome: "HELD_BRIGADE",
        issue: sanitized,
        cleanSummary: matchedExisting.cleanSummary,
        department: matchedExisting.department,
        priority: matchedExisting.priority,
        priorityScore: matchedExisting.priorityScore,
        oneLineReason: matchedExisting.oneLineReason,
      };
    }

    matchedExisting.activeSupporterIds.push(user.id);
    matchedExisting.updatedAt = nowIso;
    if (isVerifiedSafetyHazard && !matchedExisting.priorityBreakdown.isSafetyHazard) {
      matchedExisting.priorityBreakdown = {
        ...matchedExisting.priorityBreakdown,
        isSafetyHazard: true,
        hazardType,
        ...(safetyQuote ? { safetyQuote } : {}),
      };
    }
    if (toneNote && !matchedExisting.priorityBreakdown.toneNote) {
      matchedExisting.priorityBreakdown.toneNote = toneNote;
    }
    recomputeIssuePriority(db, matchedExisting);

    const sanitized =
      sanitizeIssueForViewer(db, matchedExisting, user) ?? matchedExisting;
    return {
      outcome: "MERGED_ME_TOO",
      issue: sanitized,
      cleanSummary: matchedExisting.cleanSummary,
      department: matchedExisting.department,
      priority: matchedExisting.priority,
      priorityScore: matchedExisting.priorityScore,
      oneLineReason: matchedExisting.oneLineReason,
    };
  }

  const deptResolution = resolveDepartmentForIssue(category, location);

  const newIssue: Issue = {
    id: `iss-${randomUUID().slice(0, 8)}`,
    cleanSummary: publicSummary,
    oneLineReason: "",
    category,
    department: deptResolution.department,
    locationId: location.id,
    locationName: location.name,
    status: "OPEN",
    priority: "LOW",
    priorityScore: 18,
    priorityBreakdown: {
      isSafetyHazard: isVerifiedSafetyHazard,
      hazardType: isVerifiedSafetyHazard ? hazardType : "none",
      ...(isVerifiedSafetyHazard && safetyQuote ? { safetyQuote } : {}),
      factualImpact,
      baseScore: 0,
      activeSupporterCount: 1,
      effectiveCrowdWeight: 0,
      crowdBonus: 0,
      computedScore: 0,
      computedPriority: "LOW",
      ...(toneNote ? { toneNote } : {}),
    },
    isConfidential: false,
    reporterId: user.id,
    activeSupporterIds: [user.id],
    meTooCount: 1,
    eligibleVoterIds: [],
    votes: [],
    heldBrigadeActions: [],
    votingProgress: {
      eligibleCount: 0,
      eligibleWeight: 0,
      confirmWeight: 0,
      disputeWeight: 0,
      reopenThreshold: 0,
      heldBrigadeCount: 0,
    },
    reopenCount: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
    adminNotes: [],
  };

  recomputeIssuePriority(db, newIssue);
  db.issues.push(newIssue);

  const sanitized = sanitizeIssueForViewer(db, newIssue, user) ?? newIssue;
  return {
    outcome: "CREATED",
    issue: sanitized,
    cleanSummary: newIssue.cleanSummary,
    department: newIssue.department,
    priority: newIssue.priority,
    priorityScore: newIssue.priorityScore,
    oneLineReason: newIssue.oneLineReason,
  };
}
