import { NextResponse } from "next/server";
import { z } from "zod";
import {
  recomputeIssuePriority,
  sanitizeIssueForViewer,
} from "@/lib/rules-engine";
import { mutateDb } from "@/lib/store";
import { jsonError, parseJsonBody } from "../../../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const OverrideSchema = z.object({
  userId: z.string().trim().min(1, "userId is required"),
  department: z
    .enum(["EE", "CSE", "IS", "Library", "Cafeteria", "Labs"])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL", "CLEAR"]).optional(),
  reason: z.string().trim().min(1, "Override reason is required").max(500),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = await parseJsonBody(req, OverrideSchema);
  if (!parsed.ok) return parsed.response;

  const { userId, department, priority, reason } = parsed.data;

  const result = await mutateDb(async (db) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return { status: 404, body: { ok: false, message: "User not found." } };
    }
    if (user.role !== "admin") {
      return {
        status: 403,
        body: { ok: false, message: "Only Registrar Admin may override issues." },
      };
    }

    const issue = db.issues.find((i) => i.id === id);
    if (!issue) {
      return { status: 404, body: { ok: false, message: "Issue not found." } };
    }

    if (department) {
      if (issue.isConfidential) {
        return {
          status: 400,
          body: {
            ok: false,
            message:
              "Confidential Vault cases cannot be reassigned to a public department.",
          },
        };
      }
      issue.department = department;
    }

    if (priority) {
      if (priority === "CLEAR") {
        delete issue.priorityBreakdown.adminOverridePriority;
        delete issue.priorityBreakdown.adminOverrideReason;
      } else {
        issue.priorityBreakdown.adminOverridePriority = priority;
        issue.priorityBreakdown.adminOverrideReason = reason;
      }
    }

    issue.adminNotes.push(`Admin override (${user.name}): ${reason}`);
    issue.updatedAt = new Date().toISOString();
    recomputeIssuePriority(db, issue);

    const sanitized = sanitizeIssueForViewer(db, issue, user) ?? issue;
    return {
      status: 200,
      body: {
        ok: true,
        issue: sanitized,
        message: "Admin override applied.",
      },
    };
  });

  if (!result.body.ok && result.status >= 400) {
    return jsonError(result.body.message, result.status);
  }
  return NextResponse.json(result.body, { status: result.status });
}
