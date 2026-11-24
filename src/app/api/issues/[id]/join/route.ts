import { NextResponse } from "next/server";
import { z } from "zod";
import {
  detectAndHoldBrigading,
  recomputeIssuePriority,
  sanitizeIssueForViewer,
} from "@/lib/rules-engine";
import { mutateDb } from "@/lib/store";
import { jsonError, parseJsonBody } from "../../../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const JoinSchema = z.object({
  userId: z.string().trim().min(1, "userId is required"),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = await parseJsonBody(req, JoinSchema);
  if (!parsed.ok) return parsed.response;

  const { userId } = parsed.data;

  const result = await mutateDb(async (db) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return { status: 404, body: { ok: false, message: "User not found." } };
    }
    if (user.role !== "student") {
      return {
        status: 403,
        body: { ok: false, message: "Only students may join issues with Me Too." },
      };
    }

    const issue = db.issues.find((i) => i.id === id);
    if (!issue || issue.isConfidential) {
      return { status: 404, body: { ok: false, message: "Issue not found." } };
    }

    if (
      issue.status === "RESOLVED" ||
      issue.status === "VERIFIED_RESOLVED" ||
      issue.status === "DISMISSED_SPAM"
    ) {
      return {
        status: 400,
        body: {
          ok: false,
          message: "Cannot join an issue after it has been resolved",
        },
      };
    }

    if (issue.activeSupporterIds.includes(user.id)) {
      const sanitized = sanitizeIssueForViewer(db, issue, user) ?? issue;
      return {
        status: 200,
        body: {
          ok: true,
          held: false,
          alreadyJoined: true,
          message: "You have already joined this issue.",
          issue: sanitized,
        },
      };
    }

    const brigade = detectAndHoldBrigading(db, issue, user, "JOIN");
    if (brigade.held) {
      const sanitized = sanitizeIssueForViewer(db, issue, user) ?? issue;
      return {
        status: 200,
        body: {
          ok: true,
          held: true,
          alreadyJoined: false,
          message: "Action held for Admin brigade review (no auto-penalty).",
          issue: sanitized,
        },
      };
    }

    issue.activeSupporterIds.push(user.id);
    issue.updatedAt = new Date().toISOString();
    recomputeIssuePriority(db, issue);

    const sanitized = sanitizeIssueForViewer(db, issue, user) ?? issue;
    return {
      status: 200,
      body: {
        ok: true,
        held: false,
        alreadyJoined: false,
        message: "Added your Me Too confirmation.",
        issue: sanitized,
      },
    };
  });

  if (!result.body.ok && result.status >= 400) {
    return jsonError(result.body.message, result.status);
  }
  return NextResponse.json(result.body, { status: result.status });
}
