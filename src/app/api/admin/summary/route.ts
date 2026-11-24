import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAdminBriefingWithAI } from "@/lib/ai-triage";
import { readDb } from "@/lib/store";
import { jsonError, parseJsonBody } from "../../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SummarySchema = z.object({
  userId: z.string().trim().min(1, "userId is required"),
});

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, SummarySchema);
  if (!parsed.ok) return parsed.response;

  const db = await readDb();
  const user = db.users.find((u) => u.id === parsed.data.userId);
  if (!user) {
    return jsonError("User not found.", 404);
  }
  if (user.role !== "admin") {
    return jsonError("Only Registrar Admin may generate executive briefings.", 403);
  }

  const summary = await generateAdminBriefingWithAI(db);

  return NextResponse.json({
    ok: true,
    summary,
    message: summary.usedFallback
      ? "Executive summary generated (deterministic fallback)."
      : "AI executive summary generated.",
  });
}
