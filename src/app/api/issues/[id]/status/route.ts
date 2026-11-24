import { NextResponse } from "next/server";
import { z } from "zod";
import {
  adjustTrustScore,
  recomputeIssuePriority,
  sanitizeIssueForViewer,
} from "@/lib/rules-engine";
import { mutateDb } from "@/lib/store";
import { jsonError, parseJsonBody } from "../../../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const StatusSchema = z.object({
  userId: z.string().trim().min(1, "userId is required"),
  status: z.enum([
    "OPEN",
    "IN_PROGRESS",
    "RESOLVED",
    "REOPENED",
    "VERIFIED_RESOLVED",
    "DISMISSED_SPAM",
  ]),
  note: z.string().trim().max(500).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = await parseJsonBody(req, StatusSchema);
  if (!parsed.ok) return parsed.response;

  const { userId, status, note } = parsed.data;

  const result = await mutateDb(async (db) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return { status: 404, body: { ok: false, message: "User not found." } };
    }
    if (user.role === "student") {
      return {
        status: 403,
        body: { ok: false, message: "Students cannot change issue status." },
      };
    }

    const issue = db.issues.find((i) => i.id === id);
    if (!issue) {
      return { status: 404, body: { ok: false, message: "Issue not found." } };
    }

    if (user.role === "staff" && status === "VERIFIED_RESOLVED") {
      return {
        status: 403,
        body: {
          ok: false,
          message:
            "Staff cannot mark an issue VERIFIED_RESOLVED directly; affected students must confirm the fix.",
        },
      };
    }

    if (
      user.role === "staff" &&
      status === "RESOLVED" &&
      (!note || note.trim().length < 3)
    ) {
      return {
        status: 400,
        body: {
          ok: false,
          message:
            "A brief resolution note describing the fix is required when marking an issue RESOLVED.",
        },
      };
    }

    if (
      user.role === "staff" &&
      (issue.isConfidential || issue.department !== user.department)
    ) {
      return {
        status: 403,
        body: {
          ok: false,
          message: `Forbidden: ${user.department} staff may only update non-confidential issues assigned to ${user.department}.`,
        },
      };
    }

    const nowIso = new Date().toISOString();
    const prevStatus = issue.status;

    if (status === "RESOLVED" && prevStatus !== "RESOLVED") {
      issue.eligibleVoterIds = [...issue.activeSupporterIds];
      issue.resolvedAt = nowIso;
      issue.votes = [];
    }

    if (
      status === "DISMISSED_SPAM" &&
      prevStatus !== "DISMISSED_SPAM" &&
      !issue.isConfidential &&
      issue.reporterId
    ) {
      adjustTrustScore(
        db,
        issue.reporterId,
        -20,
        "Report dismissed as fake/spam by staff/admin",
        issue.id
      );
    }

    issue.status = status;
    issue.updatedAt = nowIso;
    if (note && note.length > 0) {
      issue.adminNotes.push(`${user.name}: ${note}`);
    }

    recomputeIssuePriority(db, issue);

    const sanitized = sanitizeIssueForViewer(db, issue, user) ?? issue;
    return {
      status: 200,
      body: {
        ok: true,
        issue: sanitized,
        message: `Issue status updated to ${status}.`,
      },
    };
  });

  if (!result.body.ok && result.status >= 400) {
    return jsonError(result.body.message, result.status);
  }
  return NextResponse.json(result.body, { status: result.status });
}
