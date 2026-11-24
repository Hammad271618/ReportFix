import { NextResponse } from "next/server";
import { z } from "zod";
import { matchSemanticDuplicateWithAI } from "@/lib/ai-triage";
import {
  getCampusLocationById,
  resolveCampusLocation,
} from "@/lib/campus-registry";
import { mutateDb, readDb } from "@/lib/store";
import type { LocationResolution, TriageItemTrace } from "@/lib/types";
import {
  findActiveDedupCandidates,
  jsonError,
  materializeMatchedLocationIssue,
  parseJsonBody,
} from "../../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ClarifySchema = z.object({
  userId: z.string().trim().min(1, "userId is required"),
  clarificationId: z.string().trim().min(1, "clarificationId is required"),
  locationId: z.string().trim().optional(),
  locationText: z.string().trim().optional(),
});

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, ClarifySchema);
  if (!parsed.ok) return parsed.response;

  const { userId, clarificationId, locationId, locationText } = parsed.data;

  const snapshotDb = await readDb();
  const snapUser = snapshotDb.users.find((u) => u.id === userId);
  if (!snapUser) {
    return jsonError("User not found.", 404);
  }
  if (snapUser.role !== "student") {
    return jsonError("Only students may clarify reports.", 403);
  }

  const snapClarification = snapshotDb.pendingClarifications.find(
    (c) => c.id === clarificationId && c.userId === userId
  );
  if (!snapClarification) {
    return jsonError("Pending clarification not found for this student.", 404);
  }

  let locRes: LocationResolution;
  if (locationId) {
    const exactLoc = getCampusLocationById(locationId);
    if (exactLoc) {
      locRes = {
        status: "MATCHED",
        location: exactLoc,
        candidates: [],
        reason: `Selected ${exactLoc.name}.`,
        extractedMention: exactLoc.name,
      };
    } else {
      locRes = resolveCampusLocation(locationText ?? "", locationId);
    }
  } else {
    locRes = resolveCampusLocation(locationText ?? "");
  }

  if (locRes.status !== "MATCHED" || !locRes.location) {
    const updatedClarification = await mutateDb(async (db) => {
      const clr = db.pendingClarifications.find(
        (c) => c.id === clarificationId && c.userId === userId
      );
      if (!clr) return null;
      clr.status = locRes.status === "MATCHED" ? "AMBIGUOUS" : locRes.status;
      clr.reason = locRes.reason;
      clr.extractedMention = locRes.extractedMention;
      clr.suggestedLocations = locRes.candidates;
      return clr;
    });

    return NextResponse.json(
      {
        ok: false,
        clarification: updatedClarification ?? snapClarification,
        message: locRes.reason,
      },
      { status: 400 }
    );
  }

  const resolvedLocation = locRes.location;

  // Semantic dedup outside lock
  let preMatchedIssueId: string | null = null;
  let dedupUsedFallback = false;
  if (!snapClarification.isConfidential) {
    const candidates = findActiveDedupCandidates(
      snapshotDb,
      resolvedLocation.id,
      snapClarification.category
    );
    if (candidates.length > 0) {
      const dedupRes = await matchSemanticDuplicateWithAI(
        snapClarification.cleanSummary,
        snapClarification.category,
        candidates
      );
      preMatchedIssueId = dedupRes.matchedIssueId;
      dedupUsedFallback = dedupRes.usedFallback;
    }
  }

  const result = await mutateDb(async (db) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return { status: 404, body: { ok: false, message: "User not found." } };
    }
    if (user.role !== "student") {
      return {
        status: 403,
        body: { ok: false, message: "Only students may clarify reports." },
      };
    }

    const clrIdx = db.pendingClarifications.findIndex(
      (c) => c.id === clarificationId && c.userId === userId
    );
    if (clrIdx === -1) {
      return {
        status: 404,
        body: {
          ok: false,
          message: "Pending clarification not found or already resolved.",
        },
      };
    }

    const clr = db.pendingClarifications[clrIdx];
    const materialized = materializeMatchedLocationIssue({
      db,
      user,
      location: resolvedLocation,
      cleanSummary: clr.cleanSummary,
      category: clr.category,
      factualImpact: clr.factualImpact,
      isConfidential: clr.isConfidential,
      isVerifiedSafetyHazard: clr.isVerifiedSafetyHazard,
      hazardType: clr.hazardType,
      safetyQuote: clr.safetyQuote,
      toneNote: clr.toneNote,
      preMatchedIssueId,
      dedupUsedFallback,
    });

    db.pendingClarifications.splice(clrIdx, 1);

    const trace: TriageItemTrace = {
      itemIndex: 0,
      outcome: materialized.outcome,
      cleanSummary: materialized.cleanSummary,
      aiExtracted: {
        category: clr.category,
        factualImpact: clr.factualImpact,
        rawLocationMention: resolvedLocation.name,
        safetyClaimed: clr.isVerifiedSafetyHazard,
        ...(clr.safetyQuote ? { safetyQuote: clr.safetyQuote } : {}),
        isHarassmentOrRagging: clr.isConfidential,
        usedFallback: false,
      },
      codeDecision: {
        department: materialized.department,
        locationName: resolvedLocation.name,
        priority: materialized.priority,
        priorityScore: materialized.priorityScore,
        oneLineReason: materialized.oneLineReason,
        safetyVerified: clr.isVerifiedSafetyHazard,
        safetySecondPassUsed: false,
        ...(clr.toneNote ? { toneIgnoredNote: clr.toneNote } : {}),
        injectionDetected: false,
        injectionPenalized: false,
        trustDelta: 0,
      },
      issue: materialized.issue,
    };

    return {
      status: 200,
      body: {
        ok: true,
        trace,
        message: `Clarified location to ${resolvedLocation.name} and routed report.`,
      },
    };
  });

  return NextResponse.json(result.body, { status: result.status });
}
