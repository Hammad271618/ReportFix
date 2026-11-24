import { NextResponse } from "next/server";
import { z } from "zod";
import {
  detectAndHoldBrigading,
  evaluateResolutionVotes,
  getTrustWeight,
  recomputeIssuePriority,
  sanitizeIssueForViewer,
} from "@/lib/rules-engine";
import { mutateDb } from "@/lib/store";
import { jsonError, parseJsonBody } from "../../../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VoteSchema = z.object({
  userId: z.string().trim().min(1, "userId is required"),
  choice: z.enum(["CONFIRM", "DISPUTE"]),
  comment: z.string().trim().max(500).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = await parseJsonBody(req, VoteSchema);
  if (!parsed.ok) return parsed.response;

  const { userId, choice, comment } = parsed.data;

  const result = await mutateDb(async (db) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return { status: 404, body: { ok: false, message: "User not found." } };
    }
    if (user.role !== "student") {
      return {
        status: 403,
        body: { ok: false, message: "Only students may vote on resolution fixes." },
      };
    }

    const issue = db.issues.find((i) => i.id === id);
    if (!issue || (issue.isConfidential && issue.reporterId !== user.id)) {
      return { status: 404, body: { ok: false, message: "Issue not found." } };
    }

    if (issue.status !== "RESOLVED") {
      return {
        status: 400,
        body: {
          ok: false,
          message: "Voting is only allowed when the issue status is RESOLVED.",
        },
      };
    }

    if (!issue.eligibleVoterIds.includes(user.id)) {
      return {
        status: 403,
        body: {
          ok: false,
          message: "Only students affected before resolution may vote on this fix.",
        },
      };
    }

    const brigade = detectAndHoldBrigading(
      db,
      issue,
      user,
      choice === "CONFIRM" ? "VOTE_CONFIRM" : "VOTE_DISPUTE",
      comment
    );
    if (brigade.held) {
      const sanitized = sanitizeIssueForViewer(db, issue, user) ?? issue;
      return {
        status: 200,
        body: {
          ok: true,
          held: true,
          outcome: "HELD_BRIGADE",
          issue: sanitized,
          message: "Vote held for Admin brigade review (no auto-penalty).",
        },
      };
    }

    const nowIso = new Date().toISOString();
    const weightSnapshot = getTrustWeight(user.trustScore);
    const voteRecord = {
      userId: user.id,
      userName: user.name,
      choice,
      weightSnapshot,
      ...(comment && comment.length > 0 ? { comment } : {}),
      createdAt: nowIso,
    };

    const existingIdx = issue.votes.findIndex((v) => v.userId === user.id);
    if (existingIdx >= 0) {
      issue.votes[existingIdx] = voteRecord;
    } else {
      issue.votes.push(voteRecord);
    }

    const outcome = evaluateResolutionVotes(db, issue);
    recomputeIssuePriority(db, issue);

    const sanitized = sanitizeIssueForViewer(db, issue, user) ?? issue;
    const outcomeMessage =
      outcome === "REOPENED"
        ? "Weighted dispute threshold reached — issue REOPENED!"
        : outcome === "VERIFIED_RESOLVED"
        ? "Community confirmed fix — issue VERIFIED_RESOLVED!"
        : `Recorded ${choice} vote (weight ${weightSnapshot.toFixed(2)}).`;

    return {
      status: 200,
      body: {
        ok: true,
        held: false,
        outcome,
        issue: sanitized,
        message: outcomeMessage,
      },
    };
  });

  if (!result.body.ok && result.status >= 400) {
    return jsonError(result.body.message, result.status);
  }
  return NextResponse.json(result.body, { status: result.status });
}
