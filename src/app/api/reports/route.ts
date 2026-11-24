import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  extractReportItemsWithAI,
  matchSemanticDuplicateWithAI,
  verifyAmbiguousSafetyWithAI,
} from "@/lib/ai-triage";
import { resolveCampusLocation } from "@/lib/campus-registry";
import {
  adjustTrustScore,
  preScreenRawText,
  sanitizePublicSummary,
  shouldPenalizePromptInjection,
  verifySafetyEvidence,
} from "@/lib/rules-engine";
import { mutateDb, readDb } from "@/lib/store";
import type {
  ExtractedIssueCandidate,
  HazardType,
  LocationResolution,
  PendingClarification,
  SubmitReportResponse,
  TriageItemTrace,
} from "@/lib/types";
import {
  findActiveDedupCandidates,
  findResolvedDedupCandidates,
  jsonError,
  materializeMatchedLocationIssue,
  parseJsonBody,
} from "../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RATE_LIMIT_WINDOW_MS = 90_000;
const RATE_LIMIT_MAX_SUBMISSIONS = 4;

const SubmitReportSchema = z.object({
  userId: z.string().trim().min(1, "userId is required"),
  text: z
    .string()
    .refine((val) => val.trim().length > 0 && val.trim().length <= 2000, {
      message: "Report text must be between 1 and 2000 characters.",
    }),
});

interface PreparedItem {
  item: ExtractedIssueCandidate;
  isConfidential: boolean;
  safetyVerified: boolean;
  safetySecondPassUsed: boolean;
  safetyQuote?: string;
  hazardType: HazardType;
  locRes: LocationResolution;
  preMatchedIssueId: string | null;
  dedupUsedFallback: boolean;
  preMatchedResolvedId: string | null;
}

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, SubmitReportSchema);
  if (!parsed.ok) return parsed.response;

  const { userId, text } = parsed.data;

  // Quick pre-check outside lock for RBAC & obvious rate limit
  const initialDb = await readDb();
  const initialUser = initialDb.users.find((u) => u.id === userId);
  if (!initialUser) {
    return jsonError("User not found.", 404);
  }
  if (initialUser.role !== "student") {
    return jsonError("Only students may submit campus reports.", 403);
  }

  const nowCheckMs = Date.now();
  const priorRecent = (initialDb.submissionTimestampsByUser[userId] ?? []).filter(
    (ts) => nowCheckMs - Date.parse(ts) <= RATE_LIMIT_WINDOW_MS
  );
  if (priorRecent.length >= RATE_LIMIT_MAX_SUBMISSIONS) {
    const rateLimitedResp = await mutateDb(async (db) => {
      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const recent = (db.submissionTimestampsByUser[userId] ?? []).filter(
        (ts) => nowMs - Date.parse(ts) <= RATE_LIMIT_WINDOW_MS
      );
      recent.push(nowIso);
      db.submissionTimestampsByUser[userId] = recent;

      if (recent.length > RATE_LIMIT_MAX_SUBMISSIONS) {
        adjustTrustScore(
          db,
          userId,
          -10,
          "Rate limit exceeded: rapid spam flood (>4 reports in 90s)"
        );
        db.securityAlerts.unshift({
          id: `alt-${randomUUID().slice(0, 8)}`,
          type: "SPAM_FLOOD",
          severity: "MEDIUM",
          status: "OPEN",
          title: `Rapid spam flood detected for ${initialUser.name}`,
          detail: `${recent.length} submissions within 90 seconds. Applied -10 trust penalty.`,
          involvedUserIds: [userId],
          createdAt: nowIso,
        });
        const body: SubmitReportResponse = {
          ok: false,
          rateLimited: true,
          message:
            "Rate limit exceeded (>4 reports within 90s). -10 trust penalty applied.",
          items: [],
        };
        return body;
      }
      return null;
    });

    if (rateLimitedResp) {
      return NextResponse.json(rateLimitedResp, { status: 429 });
    }
  }

  // Run AI extraction, 2nd-pass safety verification, and semantic dedup OUTSIDE store lock
  const preScreen = preScreenRawText(text);
  const extracted = await extractReportItemsWithAI(text);

  const preparedItems: PreparedItem[] = [];
  for (const item of extracted.items.slice(0, 3)) {
    const isConfidential =
      item.isHarassmentOrRagging ||
      item.problemCategory === "harassment_ragging" ||
      (extracted.items.length === 1 && preScreen.harassmentKeywordMatched);

    let safetyVerified = false;
    let safetySecondPassUsed = false;
    let safetyQuote: string | undefined;
    let hazardType: HazardType = item.hazardType;

    if (item.safetyClaimed) {
      const ev = verifySafetyEvidence(
        text,
        item.safetyVerbatimQuote,
        preScreen.directiveSpans
      );
      if (ev.valid) {
        safetyVerified = true;
        safetyQuote = ev.cleanQuote;
      }
    }

    if (!safetyVerified && !isConfidential) {
      const nonDirectiveMatch = preScreen.safetyKeywordMatches.find(
        (m) => !m.insideDirective
      );
      if (nonDirectiveMatch) {
        safetySecondPassUsed = true;
        const secondPass = await verifyAmbiguousSafetyWithAI(
          text,
          nonDirectiveMatch.keyword
        );
        if (secondPass.isRealSafetyHazard) {
          const ev = verifySafetyEvidence(
            text,
            secondPass.verbatimQuote,
            preScreen.directiveSpans
          );
          if (ev.valid) {
            safetyVerified = true;
            safetyQuote = ev.cleanQuote;
            if (secondPass.hazardType !== "none") {
              hazardType = secondPass.hazardType;
            }
          }
        }
      }
    }

    const locRes = resolveCampusLocation(
      item.rawLocationMention,
      item.matchedLocationId
    );

    preparedItems.push({
      item,
      isConfidential,
      safetyVerified,
      safetySecondPassUsed,
      safetyQuote,
      hazardType: safetyVerified ? hazardType : "none",
      locRes,
      preMatchedIssueId: null,
      dedupUsedFallback: false,
      preMatchedResolvedId: null,
    });
  }

  const anyVerifiedSafetyInReport = preparedItems.some((p) => p.safetyVerified);
  const injectionDetected =
    preScreen.hasRuleOverrideAttack ||
    preScreen.hasPriorityHijackDirective ||
    extracted.aiDetectedRuleOverride;

  const injectionPenalized = shouldPenalizePromptInjection({
    hasRuleOverrideAttack: preScreen.hasRuleOverrideAttack,
    hasPriorityHijackDirective: preScreen.hasPriorityHijackDirective,
    aiDetectedRuleOverride: extracted.aiDetectedRuleOverride,
    aiDetectedPriorityHijack: extracted.aiDetectedPriorityHijack,
    anyVerifiedSafetyInReport,
  });

  // Semantic duplicate check outside lock against current DB snapshot
  const snapshotDb = await readDb();
  for (const prep of preparedItems) {
    if (!prep.isConfidential && prep.locRes.status === "MATCHED" && prep.locRes.location) {
      const loc = prep.locRes.location;
      const sanitizedCandidateSummary = sanitizePublicSummary(
        prep.item.cleanEnglishSummary,
        prep.item.problemCategory,
        loc.name
      );
      const candidates = findActiveDedupCandidates(
        snapshotDb,
        loc.id,
        prep.item.problemCategory
      );
      if (candidates.length > 0) {
        const dedupRes = await matchSemanticDuplicateWithAI(
          sanitizedCandidateSummary,
          prep.item.problemCategory,
          candidates
        );
        prep.preMatchedIssueId = dedupRes.matchedIssueId;
        prep.dedupUsedFallback = dedupRes.usedFallback;
      }
      if (!prep.preMatchedIssueId) {
        const resolvedCandidates = findResolvedDedupCandidates(
          snapshotDb,
          loc.id,
          prep.item.problemCategory
        ).filter((r) => r.eligibleVoterIds.includes(userId));
        if (resolvedCandidates.length > 0) {
          const resolvedDedup = await matchSemanticDuplicateWithAI(
            sanitizedCandidateSummary,
            prep.item.problemCategory,
            resolvedCandidates
          );
          prep.preMatchedResolvedId = resolvedDedup.matchedIssueId;
        }
      }
    }
  }

  // Persist atomically inside mutateDb lock
  const result = await mutateDb(async (db): Promise<{
    status: number;
    body: SubmitReportResponse;
  }> => {
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return {
        status: 404,
        body: { ok: false, message: "User not found.", items: [] },
      };
    }
    if (user.role !== "student") {
      return {
        status: 403,
        body: {
          ok: false,
          message: "Only students may submit campus reports.",
          items: [],
        },
      };
    }

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const recent = (db.submissionTimestampsByUser[userId] ?? []).filter(
      (ts) => nowMs - Date.parse(ts) <= RATE_LIMIT_WINDOW_MS
    );
    recent.push(nowIso);
    db.submissionTimestampsByUser[userId] = recent;

    if (recent.length > RATE_LIMIT_MAX_SUBMISSIONS) {
      adjustTrustScore(
        db,
        userId,
        -10,
        "Rate limit exceeded: rapid spam flood (>4 reports in 90s)"
      );
      db.securityAlerts.unshift({
        id: `alt-${randomUUID().slice(0, 8)}`,
        type: "SPAM_FLOOD",
        severity: "MEDIUM",
        status: "OPEN",
        title: `Rapid spam flood detected for ${user.name}`,
        detail: `${recent.length} submissions within 90 seconds. Applied -10 trust penalty.`,
        involvedUserIds: [userId],
        createdAt: nowIso,
      });
      return {
        status: 429,
        body: {
          ok: false,
          rateLimited: true,
          message:
            "Rate limit exceeded (>4 reports within 90s). -10 trust penalty applied.",
          items: [],
        },
      };
    }

    let trustDelta = 0;
    if (injectionPenalized) {
      adjustTrustScore(
        db,
        userId,
        -15,
        "Prompt injection or priority-hijack manipulation detected"
      );
      trustDelta = -15;
      db.securityAlerts.unshift({
        id: `alt-${randomUUID().slice(0, 8)}`,
        type: "PROMPT_INJECTION",
        severity: "HIGH",
        status: "OPEN",
        title: `Prompt injection attempt by ${user.name}`,
        detail:
          "Submission contained rule-override or ungrounded priority-hijack instructions. -15 trust penalty applied.",
        involvedUserIds: [userId],
        createdAt: nowIso,
      });
    }

    if (preparedItems.length === 0) {
      const isInjectionOnly = injectionPenalized || injectionDetected;
      const rejectedTrace: TriageItemTrace = {
        itemIndex: 0,
        outcome: isInjectionOnly ? "REJECTED_INJECTION" : "REJECTED_NO_ISSUE",
        cleanSummary: isInjectionOnly
          ? "Prompt-injection submission rejected (no valid campus issue found)."
          : "No actionable campus issue was found in this submission.",
        aiExtracted: {
          category: "other",
          factualImpact: "minor",
          rawLocationMention: "",
          safetyClaimed: false,
          isHarassmentOrRagging: false,
          usedFallback: extracted.usedFallback,
        },
        codeDecision: {
          safetyVerified: false,
          safetySecondPassUsed: false,
          toneIgnoredNote: preScreen.toneManipulationNote,
          injectionDetected,
          injectionPenalized,
          trustDelta,
        },
      };
      return {
        status: 200,
        body: {
          ok: true,
          items: [rejectedTrace],
          message: injectionPenalized
            ? "Prompt-injection attempt blocked (-15 trust)."
            : "No actionable campus issue found in submission.",
        },
      };
    }

    const traces: TriageItemTrace[] = [];

    for (let idx = 0; idx < preparedItems.length; idx++) {
      const prep = preparedItems[idx];
      const { item, locRes, isConfidential } = prep;
      const itemTrustDelta = idx === 0 ? trustDelta : 0;

      if (locRes.status !== "MATCHED" || !locRes.location) {
        const clarificationStatus =
          locRes.status === "MATCHED" ? "AMBIGUOUS" : locRes.status;
        const cleanSummary = isConfidential
          ? sanitizePublicSummary(
              item.cleanEnglishSummary,
              "harassment_ragging",
              "Campus"
            )
          : sanitizePublicSummary(
              item.cleanEnglishSummary,
              item.problemCategory,
              locRes.extractedMention || "Campus"
            );

        const clarification: PendingClarification = {
          id: `clr-${randomUUID().slice(0, 8)}`,
          userId: user.id,
          createdAt: nowIso,
          cleanSummary,
          category: isConfidential ? "harassment_ragging" : item.problemCategory,
          factualImpact: item.factualImpact,
          isConfidential,
          isVerifiedSafetyHazard: prep.safetyVerified,
          hazardType: prep.hazardType,
          ...(prep.safetyQuote ? { safetyQuote: prep.safetyQuote } : {}),
          ...(preScreen.toneManipulationNote
            ? { toneNote: preScreen.toneManipulationNote }
            : {}),
          status: clarificationStatus,
          reason: locRes.reason,
          extractedMention: locRes.extractedMention,
          suggestedLocations: locRes.candidates,
        };

        db.pendingClarifications.push(clarification);

        // D6: Unrouted physical safety hazard MUST alert Admin immediately
        if (prep.safetyVerified) {
          db.securityAlerts.unshift({
            id: `alt-${randomUUID().slice(0, 8)}`,
            type: "SAFETY_UNROUTED",
            severity: "HIGH",
            status: "OPEN",
            title: `Unrouted safety hazard at "${locRes.extractedMention || "Unspecified location"}"`,
            detail: `Verified hazard (${prep.hazardType}: "${prep.safetyQuote ?? ""}") could not auto-route (${locRes.status}). Summary: ${cleanSummary}`,
            involvedUserIds: [user.id],
            createdAt: nowIso,
          });
        }

        traces.push({
          itemIndex: idx,
          outcome: "NEEDS_CLARIFICATION",
          cleanSummary,
          aiExtracted: {
            category: item.problemCategory,
            factualImpact: item.factualImpact,
            rawLocationMention: item.rawLocationMention,
            safetyClaimed: item.safetyClaimed,
            ...(prep.safetyQuote || item.safetyVerbatimQuote
              ? { safetyQuote: prep.safetyQuote ?? item.safetyVerbatimQuote }
              : {}),
            isHarassmentOrRagging: item.isHarassmentOrRagging,
            usedFallback: extracted.usedFallback,
          },
          codeDecision: {
            safetyVerified: prep.safetyVerified,
            safetySecondPassUsed: prep.safetySecondPassUsed,
            ...(preScreen.toneManipulationNote
              ? { toneIgnoredNote: preScreen.toneManipulationNote }
              : {}),
            injectionDetected,
            injectionPenalized,
            trustDelta: itemTrustDelta,
          },
          clarification,
        });
        continue;
      }

      const materialized = materializeMatchedLocationIssue({
        db,
        user,
        location: locRes.location,
        cleanSummary: item.cleanEnglishSummary,
        category: item.problemCategory,
        factualImpact: item.factualImpact,
        isConfidential,
        isVerifiedSafetyHazard: prep.safetyVerified,
        hazardType: prep.hazardType,
        safetyQuote: prep.safetyQuote,
        toneNote: preScreen.toneManipulationNote,
        preMatchedIssueId: prep.preMatchedIssueId,
        dedupUsedFallback: prep.dedupUsedFallback,
        preMatchedResolvedId: prep.preMatchedResolvedId,
      });

      traces.push({
        itemIndex: idx,
        outcome: materialized.outcome,
        cleanSummary: materialized.cleanSummary,
        aiExtracted: {
          category: item.problemCategory,
          factualImpact: item.factualImpact,
          rawLocationMention: item.rawLocationMention,
          safetyClaimed: item.safetyClaimed,
          ...(prep.safetyQuote || item.safetyVerbatimQuote
            ? { safetyQuote: prep.safetyQuote ?? item.safetyVerbatimQuote }
            : {}),
          isHarassmentOrRagging: item.isHarassmentOrRagging,
          usedFallback: extracted.usedFallback,
        },
        codeDecision: {
          department: materialized.department,
          locationName: locRes.location.name,
          priority: materialized.priority,
          priorityScore: materialized.priorityScore,
          oneLineReason: materialized.oneLineReason,
          safetyVerified: prep.safetyVerified,
          safetySecondPassUsed: prep.safetySecondPassUsed,
          ...(preScreen.toneManipulationNote
            ? { toneIgnoredNote: preScreen.toneManipulationNote }
            : {}),
          injectionDetected,
          injectionPenalized,
          trustDelta: itemTrustDelta,
        },
        issue: materialized.issue,
      });
    }

    return {
      status: 200,
      body: {
        ok: true,
        items: traces,
        message: `Processed ${traces.length} report item(s).`,
      },
    };
  });

  return NextResponse.json(result.body, { status: result.status });
}
