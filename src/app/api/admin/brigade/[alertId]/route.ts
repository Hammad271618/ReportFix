import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveBrigadeAlert } from "@/lib/rules-engine";
import { mutateDb } from "@/lib/store";
import { jsonError, parseJsonBody } from "../../../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BrigadeDecisionSchema = z.object({
  userId: z.string().trim().min(1, "userId is required"),
  decision: z.enum(["confirm", "dismiss"]),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ alertId: string }> }
) {
  const { alertId } = await params;
  const parsed = await parseJsonBody(req, BrigadeDecisionSchema);
  if (!parsed.ok) return parsed.response;

  const { userId, decision } = parsed.data;

  const result = await mutateDb(async (db) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return { status: 404, body: { ok: false, message: "User not found." } };
    }
    if (user.role !== "admin") {
      return {
        status: 403,
        body: {
          ok: false,
          message: "Only Registrar Admin may resolve brigading alerts.",
        },
      };
    }

    const targetAlert = db.securityAlerts.find((a) => a.id === alertId);
    if (!targetAlert) {
      return {
        status: 404,
        body: { ok: false, message: "Security alert not found." },
      };
    }

    if (targetAlert.type !== "BRIGADING_SUSPECTED") {
      targetAlert.status = decision === "confirm" ? "CONFIRMED" : "DISMISSED";
      return {
        status: 200,
        body: {
          ok: true,
          alert: targetAlert,
          message:
            decision === "confirm"
              ? "Security alert acknowledged."
              : "Security alert dismissed.",
        },
      };
    }

    const alert = resolveBrigadeAlert(db, alertId, decision);
    if (!alert) {
      return {
        status: 404,
        body: { ok: false, message: "Brigading alert not found." },
      };
    }

    return {
      status: 200,
      body: {
        ok: true,
        alert,
        message:
          decision === "confirm"
            ? "Brigade confirmed (-10 trust applied & held actions discarded)."
            : "False alarm dismissed (held votes/actions released & recomputed).",
      },
    };
  });

  if (!result.body.ok && result.status >= 400) {
    return jsonError(result.body.message, result.status);
  }
  return NextResponse.json(result.body, { status: result.status });
}
